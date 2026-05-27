import { Router } from "express";
import { getOpenAIClient } from "../lib/openai";
import { logger } from "../lib/logger";

const router = Router();

const LANGUAGE_NAMES: Record<"en" | "es" | "pt", string> = {
  en: "English",
  es: "Spanish (Español)",
  pt: "Portuguese (Português)",
};

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function normalizeDataUrl(input: string): string | null {
  if (typeof input !== "string" || input.length < 32) return null;
  if (input.startsWith("data:image/")) return input;
  const cleaned = input.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/=]+$/.test(cleaned)) return null;
  return `data:image/jpeg;base64,${cleaned}`;
}

function approxBase64Bytes(dataUrl: string): number {
  const idx = dataUrl.indexOf("base64,");
  const b64 = idx >= 0 ? dataUrl.slice(idx + 7) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

router.post("/ai/photo-estimate", async (req, res) => {
  try {
    const {
      images,
      serviceHint: rawServiceHint,
      language: rawLang,
      notes: rawNotes,
    } = req.body as {
      images?: unknown;
      serviceHint?: unknown;
      language?: unknown;
      notes?: unknown;
    };

    if (!Array.isArray(images) || images.length === 0) {
      res.status(400).json({ error: "images array is required" });
      return;
    }
    if (images.length > MAX_IMAGES) {
      res.status(400).json({ error: `max ${MAX_IMAGES} images allowed` });
      return;
    }

    const MAX_SERVICE_HINT = 80;
    const MAX_NOTES = 300;
    const serviceHint =
      typeof rawServiceHint === "string" && rawServiceHint.length <= MAX_SERVICE_HINT
        ? rawServiceHint.trim()
        : undefined;
    if (rawServiceHint !== undefined && serviceHint === undefined) {
      res.status(400).json({ error: "invalid serviceHint" });
      return;
    }
    const notes =
      typeof rawNotes === "string" && rawNotes.length <= MAX_NOTES
        ? rawNotes.trim()
        : undefined;
    if (rawNotes !== undefined && notes === undefined) {
      res.status(400).json({ error: "invalid notes (max 300 chars)" });
      return;
    }

    const normalizedImages: string[] = [];
    for (const raw of images) {
      if (typeof raw !== "string") {
        res.status(400).json({ error: "each image must be a string" });
        return;
      }
      const url = normalizeDataUrl(raw);
      if (!url) {
        res.status(400).json({ error: "invalid image format" });
        return;
      }
      if (approxBase64Bytes(url) > MAX_IMAGE_BYTES) {
        res.status(413).json({ error: "image too large (max 8 MB each)" });
        return;
      }
      normalizedImages.push(url);
    }

    const language: "en" | "es" | "pt" =
      rawLang === "en" || rawLang === "es" || rawLang === "pt" ? rawLang : "es";

    const client = getOpenAIClient();
    if (!client) {
      res.status(503).json({
        error: "AI service not configured",
        code: "AI_NOT_CONFIGURED",
      });
      return;
    }

    const systemPrompt = `You are a senior estimator at Kimdasa Construction, a NJ/PA exterior + interior remodeling company. You analyze homeowner-submitted photos and produce a PRELIMINARY cost range in USD for the work that appears needed.

REFERENCE PRICING (NJ/PA 2025 market, installed):
- Architectural asphalt roofing: $5.50–$9 / sq ft (typical home roof: 1,500–3,000 sq ft)
- Vinyl siding: $4–$7 / sq ft (typical home: 1,500–2,500 sq ft of wall)
- James Hardie fiber cement siding: $7–$12 / sq ft
- Seamless aluminum gutters: $8–$15 / linear ft
- Window replacement: $650–$1,400 per window installed
- Entry door replacement: $1,200–$3,500
- Bathroom remodel (full): $12,000–$35,000
- Kitchen remodel (full): $20,000–$70,000
- Interior painting: $3–$6 / sq ft of floor area
- Hardwood flooring: $9–$15 / sq ft installed
- Tile work: $10–$20 / sq ft installed

RULES:
1. Identify the service category visible in the photo(s) (roofing, siding, gutters, windows, doors, kitchen, bathroom, painting, flooring, etc.).
2. Estimate visible scope (approximate sq ft, linear ft, number of units, condition).
3. Give a realistic LOW and HIGH dollar range based on the reference pricing and what you see.
4. Be conservative — when uncertain, widen the range and flag low confidence.
5. Always include the standard disclaimer that this is preliminary and a free on-site visit is required for a final written quote.
6. Respond in ${LANGUAGE_NAMES[language]}. Never mix languages.
7. Output STRICT JSON only — no markdown, no code fences, no commentary.

JSON SHAPE (keys MUST match exactly):
{
  "serviceDetected": string,
  "summary": string,                  // 1–2 sentences, what you see + condition
  "scopeBullets": string[],           // 2–5 short bullets (visible measurements/issues)
  "lowEstimate": number,              // USD, integer
  "highEstimate": number,             // USD, integer
  "unit": string,                     // "job" | "sq ft" | "linear ft" | "room" | "window"
  "confidence": "low" | "medium" | "high",
  "recommendation": string,           // 1 sentence next step
  "disclaimer": string                // standard disclaimer
}`;

    const userText = [
      serviceHint ? `Visitor selected service: ${serviceHint}` : null,
      notes ? `Visitor notes: ${notes}` : null,
      `Analyze these photo(s) and produce the JSON estimate as specified.`,
    ]
      .filter(Boolean)
      .join("\n");

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            ...normalizedImages.map((url) => ({
              type: "image_url" as const,
              image_url: { url, detail: "low" as const },
            })),
          ],
        },
      ],
      max_tokens: 700,
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      logger.warn({ raw }, "AI photo estimate returned non-JSON");
      res.status(502).json({ error: "AI returned malformed response" });
      return;
    }

    const num = (v: unknown, fallback: number): number => {
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
    };
    const str = (v: unknown, fallback = ""): string =>
      typeof v === "string" ? v : fallback;
    const arr = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
    const conf = (v: unknown): "low" | "medium" | "high" =>
      v === "high" || v === "medium" ? v : "low";

    const defaultDisclaimer: Record<"en" | "es" | "pt", string> = {
      en: "This is a preliminary AI estimate based on your photo. A final written quote requires a free on-site visit.",
      es: "Este es un estimado preliminar generado por IA a partir de su foto. Una cotización final por escrito requiere una visita gratuita en su hogar.",
      pt: "Este é um orçamento preliminar gerado por IA a partir da sua foto. Um orçamento final por escrito exige uma visita gratuita à sua casa.",
    };

    const response = {
      serviceDetected: str(parsed.serviceDetected, serviceHint ?? "general"),
      summary: str(parsed.summary, ""),
      scopeBullets: arr(parsed.scopeBullets),
      lowEstimate: num(parsed.lowEstimate, 0),
      highEstimate: num(parsed.highEstimate, 0),
      unit: str(parsed.unit, "job"),
      confidence: conf(parsed.confidence),
      recommendation: str(parsed.recommendation, ""),
      disclaimer: str(parsed.disclaimer, defaultDisclaimer[language]),
      language,
    };

    if (response.lowEstimate <= 0 || response.highEstimate <= 0 || !response.summary) {
      logger.warn({ raw }, "AI photo estimate response missing required fields");
      res.status(502).json({ error: "AI returned incomplete response" });
      return;
    }
    if (response.highEstimate < response.lowEstimate) {
      const swapped = response.lowEstimate;
      response.lowEstimate = response.highEstimate;
      response.highEstimate = swapped;
    }

    res.json(response);
  } catch (err) {
    logger.error({ err }, "AI photo estimate failed");
    res.status(500).json({ error: "AI photo estimate failed" });
  }
});

export default router;
