import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import {
  conversationsTable,
  leadsTable,
  marketPricesTable,
  estimatesTable,
  jobsTable,
} from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getOpenAIClient } from "../lib/openai";
import { detectLanguageFromMessages } from "../lib/languageDetection";
import { buildSystemPrompt, type AgentType } from "../lib/systemPrompts";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";

// ---------------------------------------------------------------------------
// FUTURE VIDEO AVATAR INTEGRATION MARKERS
// ---------------------------------------------------------------------------
// HeyGen API (https://docs.heygen.com/reference/create-video)
//   → POST /v2/video/generate with avatar_id + voice_id + script
//   → Replace AI text reply with a streaming video URL for immersive chat
//
// Synthesia API (https://docs.synthesia.io/#create-video)
//   → POST /v1/videos with template + avatar + script
//   → Alternative photorealistic avatar for virtual seller Sofia
//
// Runway ML (https://docs.runwayml.com) — video generation from text/image
// Kling AI (https://www.klingai.com/api) — cinematic video from text prompts
// Pika Labs (https://pika.art/api) — short-form promo video generation
// Sora (OpenAI) — when API becomes available, hyper-realistic video creation
//
// Integration point in POST /api/ai/chat (seller agentType):
//   if (agentType === 'seller' && process.env.HEYGEN_API_KEY) {
//     const videoUrl = await generateHeyGenVideo(reply, process.env.HEYGEN_API_KEY);
//     return res.json({ reply, videoUrl, agentType, language: detectedLanguage });
//   }
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Geo & Zone Pricing Helpers (used by Kim / seller agent)
// ---------------------------------------------------------------------------

interface ZipLocation {
  city: string;
  state: string;
  stateAbbr: string;
  multiplier: number;
}

/** Returns a local market pricing multiplier based on city/state. */
function getZonePricingMultiplier(city: string, stateAbbr: string): number {
  const c = city.toLowerCase();
  if (stateAbbr === "NJ") {
    // Premium zones: Bergen, Hudson, Essex (Hoboken, Jersey City, Fort Lee, etc.)
    if (["hoboken", "jersey city", "fort lee", "englewood", "hackensack",
         "teaneck", "bergenfield", "paramus", "ridgewood", "montclair",
         "bloomfield", "nutley", "clifton", "passaic", "paterson",
         "east rutherford", "rutherford", "lyndhurst", "north bergen",
         "union city", "weehawken", "guttenberg"].some((k) => c.includes(k))) return 1.18;
    // High zones: Morris, Somerset, Monmouth
    if (["morristown", "parsippany", "madison", "summit", "westfield",
         "bridgewater", "somerville", "red bank", "freehold", "ocean"].some((k) => c.includes(k))) return 1.10;
    // Standard NJ
    return 1.03;
  }
  if (stateAbbr === "PA") {
    // Philly metro: Philadelphia, Bucks, Montgomery, Chester, Delaware counties
    if (["philadelphia", "newtown", "doylestown", "media", "west chester",
         "norristown", "king of prussia", "lansdale", "blue bell", "willow grove"].some((k) => c.includes(k))) return 1.0;
    // Cheaper PA markets
    return 0.88;
  }
  return 1.0;
}

/** Silently looks up a US zip code and returns location + pricing multiplier. */
async function lookupZipCode(zip: string): Promise<ZipLocation | null> {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      places?: Array<{ "place name": string; state: string; "state abbreviation": string }>;
    };
    const place = data.places?.[0];
    if (!place) return null;
    return {
      city: place["place name"],
      state: place["state"],
      stateAbbr: place["state abbreviation"],
      multiplier: getZonePricingMultiplier(place["place name"], place["state abbreviation"]),
    };
  } catch {
    return null; // silent fail — never block the conversation
  }
}

const router = Router();

const PUBLIC_AGENT_TYPES: AgentType[] = ["seller"];
const INTERNAL_AGENT_TYPES: AgentType[] = [
  "sales",
  "estimator",
  "project_manager",
  "admin",
  "marketing",
];
const ALL_AGENT_TYPES: AgentType[] = [...PUBLIC_AGENT_TYPES, ...INTERNAL_AGENT_TYPES];

function isValidAgentType(v: unknown): v is AgentType {
  return typeof v === "string" && (ALL_AGENT_TYPES as string[]).includes(v);
}

/**
 * Middleware that enforces auth only for internal agent types.
 * Virtual Seller (agentType=seller) is public. All internal assistants require a JWT.
 */
function conditionalAuth(req: Request, res: Response, next: NextFunction): void {
  const { agentType = "seller" } = req.body as { agentType?: string };
  if ((INTERNAL_AGENT_TYPES as string[]).includes(agentType)) {
    requireAuth(req as AuthRequest, res, next);
  } else {
    next();
  }
}

/**
 * Fetch lead + related estimates and jobs context for a given leadId.
 * Used to inject relevant DB context into internal assistant prompts.
 */
async function buildLeadContext(leadId: number): Promise<string> {
  const [lead] = await db
    .select()
    .from(leadsTable)
    .where(eq(leadsTable.id, leadId))
    .limit(1);
  if (!lead) return "";

  const lines: string[] = [
    `Lead #${lead.id}: ${lead.name}`,
    `  Status: ${lead.status}`,
    `  Phone: ${lead.phone ?? "N/A"} | Email: ${lead.email ?? "N/A"}`,
    `  Service: ${lead.serviceType ?? "Unknown"} | Urgency: ${lead.urgency ?? "N/A"}`,
    `  Address: ${lead.address ?? "N/A"}`,
    `  Language: ${lead.language} | Source: ${lead.source ?? "N/A"}`,
    `  Comments: ${lead.comments ?? "None"}`,
  ];

  const estimates = await db
    .select()
    .from(estimatesTable)
    .where(eq(estimatesTable.leadId, leadId))
    .orderBy(desc(estimatesTable.createdAt))
    .limit(5);

  if (estimates.length > 0) {
    lines.push(`  Estimates (${estimates.length}):`);
    for (const e of estimates) {
      lines.push(
        `    - ${e.serviceType} | status: ${e.status} | recommended: $${e.recommendedPrice ?? "TBD"} | created: ${e.createdAt.toISOString().slice(0, 10)}`
      );
    }
  }

  return lines.join("\n");
}

/**
 * Fetch customer + related jobs and estimates context for a given customerId.
 */
async function buildCustomerContext(customerId: number): Promise<string> {
  const jobs = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.customerId, customerId))
    .orderBy(desc(jobsTable.createdAt))
    .limit(5);

  const estimates = await db
    .select()
    .from(estimatesTable)
    .where(eq(estimatesTable.customerId, customerId))
    .orderBy(desc(estimatesTable.createdAt))
    .limit(5);

  const lines: string[] = [`Customer #${customerId} context:`];

  if (jobs.length > 0) {
    lines.push(`  Jobs (${jobs.length}):`);
    for (const j of jobs) {
      lines.push(
        `    - [${j.status}] ${j.title} | service: ${j.serviceType ?? "N/A"} | start: ${j.startDate ?? "TBD"} | end: ${j.endDate ?? "TBD"}`
      );
    }
  }

  if (estimates.length > 0) {
    lines.push(`  Estimates (${estimates.length}):`);
    for (const e of estimates) {
      lines.push(
        `    - ${e.serviceType} | status: ${e.status} | recommended: $${e.recommendedPrice ?? "TBD"}`
      );
    }
  }

  if (jobs.length === 0 && estimates.length === 0) {
    lines.push("  No jobs or estimates on file.");
  }

  return lines.join("\n");
}

// POST /api/ai/chat
// - seller agent: public (no auth required)
// - all internal agents (sales, estimator, project_manager, admin, marketing): requireAuth
router.post("/ai/chat", conditionalAuth, async (req, res) => {
  try {
    const {
      agentType: rawAgentType = "seller",
      messages = [],
      leadId: rawLeadId,
      customerId: rawCustomerId,
      language: clientLanguage,
      images: rawImages,
    } = req.body;

    // images: base64 data URLs sent from the chat widget (photos from client)
    const incomingImages: string[] = Array.isArray(rawImages)
      ? rawImages.filter((img: unknown) => typeof img === "string" && img.startsWith("data:image")).slice(0, 4)
      : [];

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages array is required and must not be empty" });
      return;
    }

    const agentType: AgentType = isValidAgentType(rawAgentType) ? rawAgentType : "seller";

    // SECURITY: Only authenticated internal agents can link a conversation to an
    // existing leadId/customerId. Public (seller) callers cannot supply IDs —
    // otherwise an anonymous visitor could poison any lead/customer record by
    // attaching arbitrary chat messages to it.
    const isInternalAgent = (INTERNAL_AGENT_TYPES as AgentType[]).includes(agentType);
    const leadId = isInternalAgent ? rawLeadId : undefined;
    const customerId = isInternalAgent ? rawCustomerId : undefined;

    const client = getOpenAIClient();
    if (!client) {
      res.status(503).json({
        error: "AI service not configured. Please add OPENAI_API_KEY to environment secrets.",
        code: "AI_NOT_CONFIGURED",
      });
      return;
    }

    // --- Language auto-detection ---
    const detectedLanguage: "en" | "es" | "pt" =
      clientLanguage === "en" || clientLanguage === "es" || clientLanguage === "pt"
        ? clientLanguage
        : detectLanguageFromMessages(messages);

    // --- Build system prompt ---
    // Market prices are injected for both the internal estimator AND the public seller (Sofia)
    // so Sofia can give preliminary estimates after qualifying the visitor.
    let marketPricesContext: string | undefined;
    if (agentType === "estimator" || agentType === "seller") {
      try {
        const prices = await db
          .select()
          .from(marketPricesTable)
          .orderBy(marketPricesTable.category);
        if (prices.length > 0) {
          marketPricesContext = prices
            .map(
              (p) =>
                `${p.category} [${p.region}] — min: $${p.minPrice}, avg: $${p.avgPrice}, premium: $${p.premiumPrice} (${p.unit})`
            )
            .join("\n");
        }
      } catch (err) {
        logger.warn({ err, agentType }, "Failed to fetch market prices for prompt");
      }
    }

    let systemPrompt = buildSystemPrompt(agentType, marketPricesContext);

    // --- Inject explicit language directive based on client/detected language ---
    const LANGUAGE_NAMES: Record<"en" | "es" | "pt", string> = {
      en: "English",
      es: "Spanish (Español)",
      pt: "Portuguese (Português)",
    };
    systemPrompt += `\n\nLANGUAGE DIRECTIVE: The user's preferred language is ${LANGUAGE_NAMES[detectedLanguage]}. Respond entirely in ${LANGUAGE_NAMES[detectedLanguage]} unless the user clearly switches languages mid-conversation. Never mix languages in a single response.`;

    // --- Zip code geo-lookup: silently inject location + zone pricing into the prompt ---
    if (agentType === "seller") {
      const allUserText = messages
        .filter((m: { role: string }) => m.role === "user")
        .map((m: { content: unknown }) => (typeof m.content === "string" ? m.content : ""))
        .join(" ");
      const zipMatch = allUserText.match(/\b(\d{5})\b/);
      if (zipMatch) {
        const location = await lookupZipCode(zipMatch[1]);
        if (location) {
          const inService = location.stateAbbr === "NJ" || location.stateAbbr === "PA";
          systemPrompt += `\n\n--- CLIENT LOCATION (auto-detected from zip ${zipMatch[1]}) ---
City: ${location.city}, ${location.state} (${location.stateAbbr})
Service area: ${inService ? "YES — within Kimdasa coverage" : "NO — outside coverage area"}
Zone pricing multiplier: ${location.multiplier}x
INSTRUCTION: Apply the ${location.multiplier}x multiplier to ALL material and labor costs from the market data when calculating estimates for this client. ${!inService ? "This client is outside our service area — inform them politely and end the conversation." : ""}
--- END CLIENT LOCATION ---`;
        }
      }
    }

    // --- Inject relevant DB context for internal assistants ---
    const contextLines: string[] = [];

    if (leadId && (INTERNAL_AGENT_TYPES as AgentType[]).includes(agentType)) {
      try {
        const leadCtx = await buildLeadContext(Number(leadId));
        if (leadCtx) contextLines.push("--- LEAD CONTEXT ---\n" + leadCtx);
      } catch (err) {
        logger.warn({ err, leadId }, "Failed to fetch lead context for AI prompt");
      }
    }

    if (customerId && (INTERNAL_AGENT_TYPES as AgentType[]).includes(agentType)) {
      try {
        const customerCtx = await buildCustomerContext(Number(customerId));
        if (customerCtx) contextLines.push("--- CUSTOMER CONTEXT ---\n" + customerCtx);
      } catch (err) {
        logger.warn({ err, customerId }, "Failed to fetch customer context for AI prompt");
      }
    }

    if (contextLines.length > 0) {
      systemPrompt += "\n\n" + contextLines.join("\n\n");
    }

    // --- Build OpenAI message list, injecting images into the last user message ---
    type OAIContent =
      | string
      | Array<
          | { type: "text"; text: string }
          | { type: "image_url"; image_url: { url: string; detail: "auto" } }
        >;

    const oaiMessages: Array<{ role: "system" | "user" | "assistant"; content: OAIContent }> = [
      { role: "system", content: systemPrompt },
    ];

    const msgArray = messages as Array<{ role: string; content: string }>;
    msgArray.forEach((m, idx) => {
      const isLastUser = m.role === "user" && idx === msgArray.length - 1;
      if (isLastUser && incomingImages.length > 0) {
        // Attach images to the last user message as vision content parts
        const parts: OAIContent = [
          { type: "text", text: m.content || "See attached photos." },
          ...incomingImages.map((url) => ({
            type: "image_url" as const,
            image_url: { url, detail: "auto" as const },
          })),
        ];
        oaiMessages.push({ role: "user", content: parts });
      } else {
        oaiMessages.push({
          role: m.role as "user" | "assistant",
          content: m.content,
        });
      }
    });

    // Use gpt-4o when images are present (vision), gpt-4o-mini otherwise
    const model = incomingImages.length > 0 ? "gpt-4o" : "gpt-4o-mini";

    // --- Estimator: add web_search tool for materials not in the DB ---
    const estimatorTools: Parameters<typeof client.chat.completions.create>[0]["tools"] =
      agentType === "estimator"
        ? [
            {
              type: "function",
              function: {
                name: "search_material_prices",
                description:
                  "Search the web for current market prices of construction materials or services not found in the company database. Use this when the user asks about a material, product, or service that is not covered by the provided market pricing data.",
                parameters: {
                  type: "object",
                  properties: {
                    query: {
                      type: "string",
                      description:
                        "The search query, e.g. 'composite decking cost per square foot NJ 2025' or 'spray foam insulation price per board foot'",
                    },
                  },
                  required: ["query"],
                },
              },
            },
          ]
        : undefined;

    // --- Call OpenAI (first pass) ---
    const firstCompletion = await client.chat.completions.create({
      model,
      messages: oaiMessages as Parameters<typeof client.chat.completions.create>[0]["messages"],
      max_tokens: incomingImages.length > 0 ? 1500 : 1000,
      temperature: 0.7,
      ...(estimatorTools ? { tools: estimatorTools, tool_choice: "auto" } : {}),
    });

    const firstChoice = firstCompletion.choices[0];
    let reply = firstChoice?.message?.content ?? "";

    // --- Handle tool call: web search for estimator ---
    if (
      agentType === "estimator" &&
      firstChoice?.finish_reason === "tool_calls" &&
      firstChoice.message.tool_calls?.length
    ) {
      const toolCall = firstChoice.message.tool_calls[0];
      let searchResult = "";

      try {
        const args = JSON.parse(toolCall.function.arguments ?? "{}") as { query?: string };
        const query = args.query ?? "";
        if (query) {
          // DuckDuckGo Instant Answer API (free, no key required)
          const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query + " price cost")}&format=json&no_html=1&skip_disambig=1`;
          const ddgRes = await fetch(ddgUrl, { signal: AbortSignal.timeout(5000) });
          if (ddgRes.ok) {
            const ddgData = (await ddgRes.json()) as {
              AbstractText?: string;
              Answer?: string;
              RelatedTopics?: Array<{ Text?: string }>;
            };
            const snippets: string[] = [];
            if (ddgData.Answer) snippets.push(ddgData.Answer);
            if (ddgData.AbstractText) snippets.push(ddgData.AbstractText);
            ddgData.RelatedTopics?.slice(0, 3).forEach((t) => {
              if (t.Text) snippets.push(t.Text);
            });
            searchResult = snippets.join("\n") || "No specific pricing data found for this query.";
          }
        }
      } catch {
        searchResult = "Web search unavailable at this time. Provide an estimate based on typical market ranges.";
      }

      // Second pass: feed search result back and get final answer
      const secondMessages = [
        ...(oaiMessages as Parameters<typeof client.chat.completions.create>[0]["messages"]),
        firstChoice.message,
        {
          role: "tool" as const,
          tool_call_id: toolCall.id,
          content: searchResult || "No results found.",
        },
      ];

      const secondCompletion = await client.chat.completions.create({
        model,
        messages: secondMessages,
        max_tokens: 1000,
        temperature: 0.7,
      });

      reply = secondCompletion.choices[0]?.message?.content ?? reply;
    }

    // --- Detect signals ---
    const sellerCapturedLead = agentType === "seller" && reply.includes("[LEAD_CAPTURED]");
    const contractOffered = agentType === "seller" && reply.includes("[CONTRACT_OFFERED]");
    reply = reply
      .replace("[LEAD_CAPTURED]", "")
      .replace("[CONTRACT_OFFERED]", "")
      .trim();

    // --- Virtual Seller: auto-capture lead when name + phone + serviceType collected ---
    // Persistence model: only the last user message and the assistant reply for this turn are
    // persisted per request. Full conversation history is the caller's responsibility to supply
    // in the `messages` array on each request (stateless per-turn design).
    const lastUserMsg = [...messages]
      .reverse()
      .find((m: { role: string }) => m.role === "user");

    let resolvedLeadId = leadId ? Number(leadId) : null;
    let leadSaved = false;

    if (agentType === "seller" && !resolvedLeadId) {
      const allText = messages.map((m: { content: string }) => m.content).join(" ");

      const phoneMatch = allText.match(
        /\b(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})\b/
      );
      const nameMatch = allText.match(
        /(?:my name is|I'm|I am|soy|me llamo|mi nombre es)\s+([A-ZÁÉÍÓÚ][a-záéíóú]+(?:\s+[A-ZÁÉÍÓÚ][a-záéíóú]+)?)/i
      );
      const serviceMatch = allText.match(
        /\b(roof(?:ing)?|siding|gutter|window|door|soffit|fascia|exterior|techo|tejado|cubierta|ventana|puerta|canaleta)\b/i
      );

      // Phone is always required for lead capture (phone is the primary contact for the sales team).
      // name + phone + serviceType are the three required fields per task spec.
      // [LEAD_CAPTURED] from the model is an additional trigger signal, but phone must be present.
      const hasAllRequired = Boolean(phoneMatch && nameMatch && serviceMatch);
      const triggerCapture = hasAllRequired || (sellerCapturedLead && Boolean(phoneMatch));

      if (triggerCapture && phoneMatch) {
        try {
          const [newLead] = await db
            .insert(leadsTable)
            .values({
              name: nameMatch?.[1] ?? "Website Visitor",
              phone: phoneMatch[1].replace(/[^\d+]/g, ""),
              email: null,
              serviceType: serviceMatch?.[1] ?? null,
              source: "chatbot",
              language: detectedLanguage,
              status: "new_lead",
            })
            .returning();
          resolvedLeadId = newLead?.id ?? null;
          leadSaved = Boolean(resolvedLeadId);
          logger.info({ leadId: resolvedLeadId }, "Virtual Seller auto-captured new lead");
        } catch (err) {
          logger.error({ err }, "Failed to auto-save lead from Virtual Seller conversation");
          leadSaved = false;
        }
      }
    }

    // --- Persist user message ---
    if (lastUserMsg) {
      try {
        await db.insert(conversationsTable).values({
          leadId: resolvedLeadId,
          customerId: customerId ? Number(customerId) : null,
          agentType,
          language: detectedLanguage,
          role: "user",
          content: lastUserMsg.content,
        });
      } catch (err) {
        logger.error({ err }, "Failed to persist user message to conversations table");
      }
    }

    // --- Persist assistant reply ---
    try {
      await db.insert(conversationsTable).values({
        leadId: resolvedLeadId,
        customerId: customerId ? Number(customerId) : null,
        agentType,
        language: detectedLanguage,
        role: "assistant",
        content: reply,
      });
    } catch (err) {
      logger.error({ err }, "Failed to persist assistant reply to conversations table");
    }

    res.json({
      reply,
      agentType,
      language: detectedLanguage,
      leadCaptureIntent: sellerCapturedLead,
      leadSaved,
      leadId: resolvedLeadId,
      contractOffered,
      tokensUsed: firstCompletion.usage?.total_tokens ?? null,
    });
  } catch (err) {
    logger.error({ err }, "AI chat request failed");
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: "AI request failed", detail: message });
  }
});

// POST /api/ai/tts — Text-to-speech for Sofia's replies (public, used by chat widget)
// Body: { text: string, lang?: 'en' | 'es' }
// Returns: audio/mpeg (mp3) binary stream
router.post("/ai/tts", async (req, res) => {
  try {
    const { text, lang } = req.body as { text?: string; lang?: string };
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      res.status(400).json({ error: "text is required" });
      return;
    }
    if (text.length > 4000) {
      res.status(400).json({ error: "text too long (max 4000 chars)" });
      return;
    }
    const client = getOpenAIClient();
    if (!client) {
      res.status(503).json({ error: "AI service not configured", code: "AI_NOT_CONFIGURED" });
      return;
    }
    // Strip markdown bold (**text**) so TTS doesn't read asterisks aloud
    const cleanText = text.replace(/\*+/g, "").replace(/\[(.*?)\]/g, "$1").trim();
    const speech = await client.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: cleanText,
      response_format: "mp3",
    });
    const buffer = Buffer.from(await speech.arrayBuffer());
    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": buffer.length.toString(),
      "Cache-Control": "no-store",
    });
    res.send(buffer);
  } catch (err) {
    logger.error({ err }, "TTS request failed");
    res.status(500).json({ error: "TTS failed", detail: err instanceof Error ? err.message : "Unknown" });
  }
});

// POST /api/ai/transcribe — Speech-to-text for visitor voice input (public, used by chat widget)
// Body: { audioBase64: string, mimeType?: string, lang?: 'en' | 'es' }
// Returns: { text: string }
router.post("/ai/transcribe", async (req, res) => {
  try {
    const { audioBase64, mimeType, lang } = req.body as {
      audioBase64?: string;
      mimeType?: string;
      lang?: string;
    };
    if (!audioBase64 || typeof audioBase64 !== "string") {
      res.status(400).json({ error: "audioBase64 is required" });
      return;
    }
    const client = getOpenAIClient();
    if (!client) {
      res.status(503).json({ error: "AI service not configured", code: "AI_NOT_CONFIGURED" });
      return;
    }
    const buffer = Buffer.from(audioBase64, "base64");
    if (buffer.length === 0) {
      res.status(400).json({ error: "empty audio" });
      return;
    }
    if (buffer.length > 25 * 1024 * 1024) {
      res.status(413).json({ error: "audio too large (max 25 MB)" });
      return;
    }
    // Pick a sensible filename extension based on mimeType (Whisper uses ext to infer codec)
    const mt = (mimeType ?? "audio/webm").toLowerCase();
    let filename = "voice.webm";
    if (mt.includes("mp4") || mt.includes("m4a")) filename = "voice.mp4";
    else if (mt.includes("mpeg") || mt.includes("mp3")) filename = "voice.mp3";
    else if (mt.includes("wav")) filename = "voice.wav";
    else if (mt.includes("ogg")) filename = "voice.ogg";

    const { toFile } = await import("openai");
    const file = await toFile(buffer, filename, { type: mt });
    const transcription = await client.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: lang === "es" || lang === "en" ? lang : undefined,
    });
    res.json({ text: transcription.text });
  } catch (err) {
    logger.error({ err }, "Transcription request failed");
    res.status(500).json({ error: "Transcription failed", detail: err instanceof Error ? err.message : "Unknown" });
  }
});

// GET /api/ai/conversations — retrieve conversation history (auth required for all)
router.get("/ai/conversations", requireAuth, async (req, res) => {
  try {
    const { leadId, customerId, agentType, limit = "50" } = req.query;

    const conditions = [];
    if (leadId) conditions.push(eq(conversationsTable.leadId, Number(leadId)));
    if (customerId) conditions.push(eq(conversationsTable.customerId, Number(customerId)));
    if (agentType && isValidAgentType(agentType)) {
      conditions.push(eq(conversationsTable.agentType, agentType));
    }

    const rows = await db
      .select()
      .from(conversationsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(conversationsTable.createdAt))
      .limit(Math.min(Number(limit) || 50, 200));

    res.json(rows);
  } catch (err) {
    logger.error({ err }, "Failed to fetch AI conversation history");
    res.status(500).json({ error: "Failed to fetch AI conversation history" });
  }
});

export default router;
