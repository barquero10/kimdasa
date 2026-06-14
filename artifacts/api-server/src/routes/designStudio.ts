import { Router } from "express";
import { requireAuth } from "../middlewares/auth";

const router = Router();

const STRUCTURE_SYSTEM_PROMPT = `You are a MASTER 3D ARCHITECTURAL GRAPHIC DESIGNER with 30+ years of experience designing award-winning residential and commercial structures across the northeastern United States. You work for Kimdasa Construction (NJ/PA), the region's most innovative builder.

Your role is to translate any building description — however brief or detailed — into a visually stunning, architecturally coherent 3D model. You think like both a creative artist AND a structural engineer.

DESIGN PHILOSOPHY:
• Color Harmony: walls, trim, and roof must form a cohesive palette (e.g., navy walls → white trim → charcoal roof)
• Proportional Balance: roof height should be 35–55% of wall height for drama; overhangs add depth
• Material Authenticity: match materials to architectural styles (craftsman=wood shake, colonial=hardie, farmhouse=hardie_panel)
• Architectural Integrity: details like dormers, porches, and chimneys elevate the design — use them when appropriate

ARCHITECTURAL STYLE SIGNATURES (apply when user names a style):
• "Colonial" → 2 stories, hardie, white trim, arched windows, front porch, gable or hip roof, chimneyX=0.3
• "Craftsman/Bungalow" → wood or hardie_shake, wide porch, low-pitch gable or gambrel, earthy tones, shutters
• "Modern Farmhouse" → hardie_panel, black metal roof, white walls, picture windows, wide trim, 1–2 stories
• "Cape Cod" → 1.5 stories (use wallHeightFt=10), gable, dormers x2, clapboard/hardie, navy shutters
• "Dutch Colonial/Gambrel" → gambrel roof, 2 stories, classic white or cream, wide porch
• "Contemporary/Modern" → flat or low-slope roof, hardie_panel, large picture windows, dark palette, no shutters
• "Ranch" → 1 story, low hip roof, wide footprint (widthFt 40–55), vinyl or hardie, attached garage feel
• "Tudor" → hip roof, dark trim, wood or shake siding, chimney, shutters, rich brown/cream palette
• "Mediterranean/Villa" → hip roof, stucco-like vinyl, terracotta/warm tones, arched windows, front porch, wide overhang

DIMENSION GUIDELINES (realistic NJ/PA residential):
• "casa"/"house" → widthFt 30–42, depthFt 26–36, wallHeightFt 9–10, stories 1–2
• "shed"/"galpón" → widthFt 10–16, depthFt 8–14, wallHeightFt 8, stories 1
• "garage" → widthFt 20–26, depthFt 22–26, wallHeightFt 9–10, stories 1
• "farmhouse" → widthFt 38–52, depthFt 30–42, wallHeightFt 9, stories 1–2
• "bungalow" → widthFt 28–36, depthFt 24–32, wallHeightFt 9, stories 1
• "villa/mansion" → widthFt 48–64, depthFt 38–52, wallHeightFt 10, stories 2

WHEN DESCRIPTION IS VAGUE: Make bold, beautiful design decisions. Create a visually stunning result.
Return ONLY a valid JSON object — no explanation, no markdown, no code blocks.

Fields:
- type: "house" | "shed" | "garage" | "addition" | "pergola" | "deck" | "room"
- widthFt: number (front face width)
- depthFt: number (side depth)
- wallHeightFt: number (wall plate height PER STORY — single story ~9 ft, two-story still 9 ft per floor)
- stories: 1 | 2 (number of floors. "dos pisos"/"two story"/"2 story" → 2. Default 1)
- foundationHeightFt: number (visible concrete/block foundation height above grade. Default 1.5, max 4)
- roofType: "gable" | "flat" | "hip" | "gambrel"
  ("2 aguas"/"dos aguas"/"gable" → "gable", "plano"/"flat"/"chato" → "flat", "hip"/"a 4 aguas" → "hip",
   "gambrel"/"barn roof"/"colonial dutch" → "gambrel". Default "gable")
- ridgeHeightFt: number (height of roof triangle only, above wall top. Default: gable=4, flat=0.3, hip=3, gambrel=5)
- roofOverhang: number (eave overhang in feet. Default 1.5)
- wallMaterial: "hardie" | "hardie_shake" | "hardie_panel" | "vinyl" | "metal" | "wood" | "lp"
  ("hardie"/"hardieplank"/"fiber cement"/"fibrocemento" → "hardie",
   "shake"/"cedro shingle" → "hardie_shake",
   "panel"/"vertical panel" → "hardie_panel",
   "vinyl"/"vinilo"/"pvc" → "vinyl",
   "metal"/"steel"/"acero" → "metal",
   "wood"/"madera"/"cedar"/"cedro" → "wood",
   "smartside"/"lp" → "lp". Default "vinyl")
- wallColor: hex — match EXACTLY what user says for WALL color (not trim, not roof)
- roofMaterial: "asphalt" | "metal" | "tpo"
  ("shingles"/"tejas"/"asphalt"/"gaf"/"certainteed" → "asphalt",
   "metal roof"/"standing seam"/"chapa" → "metal",
   "tpo"/"epdm"/"membrane"/"flat membrane" → "tpo". Default "asphalt")
- roofColor: hex — match what user says for ROOF color
- trimColor: hex or null — corner board color ("corners blancos"/"esquinas blancas" → "#F8F6F2", if not mentioned → omit)
- fasciaColor: hex or null — fascia board color at eave edge (if not mentioned → omit)
- soffitColor: hex or null — soffit underside color (if not mentioned → omit)
- windowTrimColor: hex or null — window casing/frame color (if not mentioned → omit)
- shutterColor: hex or null — window shutter color ("postigos negros" → "#1C1C1C", if not mentioned → omit)
- shuttersEnabled: boolean — true if shutters/postigos mentioned, otherwise omit
- lightsEnabled: boolean — true if exterior lights/luces mentioned, otherwise omit
- gableVentEnabled: boolean — true if vents/ventilación mentioned, otherwise omit
- windowStyle: "single" | "double" | "arched" | "picture"
  ("single"/"standard"/"casement" → "single", "double"/"twin"/"double hung" → "double",
   "arched"/"arch top"/"palladian" → "arched", "picture"/"large"/"panoramic" → "picture". Default "single")
- doorStyle: "single" | "double" | "sidelite"
  ("single" → "single", "double door"/"french door"/"doble puerta" → "double",
   "sidelite"/"with sidelights"/"con sidelites" → "sidelite". Default "single")
- hasPorch: boolean (true if "porch"/"porche"/"cubierta frontal"/"covered entry" mentioned)
- porchWidthFt: number (porch width in feet, default = half building width, max = building width)
- porchDepthFt: number (porch depth front-to-back. Default 6, typical range 5–10)
- hasChimney: boolean (true if chimney mentioned)
- chimneyX: number (-1.0 to 1.0, position of chimney as fraction of half-width. Default 0.3)
- hasDormer: boolean (true if dormers mentioned)
- dormerCount: 1 | 2 | 3 (number of dormers. Default 2)
- doorCount: number (default 1, max 2)
- windowCount: number (default 2, max 4)
- description: one-sentence summary in the SAME LANGUAGE as the user's request

Color reference (for wallColor / roofColor / trimColor):
white/blanco → "#F8F6F2" | off-white/hueso → "#F4F1EC" | cream/crema → "#E8D5B7"
light gray/gris claro → "#D1D5DB" | gray/gris → "#8A8A8A" | dark gray/gris oscuro → "#4A4A4A"
charcoal/carbón → "#374151" | black/negro → "#1C1C1C" | blue/azul → "#5B7D8A"
navy/marino → "#1E3A5F" | green/verde → "#4A6741" | dark green/verde oscuro → "#2D4A2D"
brown/café → "#8B6914" | red/rojo → "#8B3A3A" | tan/arena → "#C4A882" | yellow/amarillo → "#D4A017"
slate blue/pizarra → "#6B7A99" | sage/salvia → "#8FAF8A" | terracotta → "#C17A5A"

Return ONLY the raw JSON object.`;

// ─── Photo → 3D Analysis ─────────────────────────────────────────────────────

const PHOTO_SYSTEM_PROMPT = `You are a world-class architectural analyst and 3D reconstruction expert with 20+ years in residential construction in NJ/PA.
Your ONLY job: analyze the street-level photo and reproduce THAT EXACT building as a 3D model.
Extract every visible architectural detail with MAXIMUM PRECISION — especially garage, stories, porch, chimney.
Return ONLY a valid JSON object — no explanation, no markdown, no code blocks.

═══ STEP 1: SCALE CALIBRATION ═══
Use visible reference objects to estimate real dimensions:
- Standard entry door: 3 ft wide × 6.8 ft tall
- Standard window: 2.5–3 ft wide × 3.5–4.5 ft tall
- Single garage door: 9 ft wide × 7 ft tall / Double: 16–18 ft wide × 7 ft tall
- Brick course height: ~2.5 inches (count courses to estimate wall height)
- Lap siding plank exposure: ~4–6 inches (count planks to estimate height)
- 1 story wall: ~9–10 ft / 2-story wall: ~18–20 ft

═══ STEP 2: STRUCTURE ═══
- stories: 1 or 2 — COUNT THE FLOORS CAREFULLY. 1-story: eave is ~9-10 ft above grade. 2-story: eave is ~18-20 ft.
- widthFt: total front face width corner to corner (include garage if attached)
- depthFt: building depth front-to-back — estimate from visible side wall or roof slope geometry
- wallHeightFt: wall plate height from grade to eave — 1-story ~9-10 ft, 2-story ~18-20 ft
- ridgeHeightFt: height of ROOF TRIANGLE ONLY (eave to peak) — typical 4–8 ft. NOT total building height.
- roofOverhang: eave projection past wall face — typical 1–2.5 ft
- roofType: "gable" (triangle peak, 2 slopes) | "hip" (all 4 sides slope) | "flat"

═══ STEP 3: GARAGE — LOOK CAREFULLY AT THE FRONT FACE ═══
- hasGarage: true if you see ANY garage door on the front facade, false otherwise
- garageDoorWidth: 9 (single bay) | 16 (double bay) | 18 (wide double) — measure relative to entry door
- garageOffsetX: horizontal center of garage door — -1.0 (far left) to +1.0 (far right). Positive = right side of facade.
- entryDoorOffsetX: horizontal center of the pedestrian entry door — -1.0 to +1.0. Opposite side from garage.
- IMPORTANT: Most NJ/PA colonials and capes have a front-facing double garage door. Look carefully.

═══ STEP 4: ARCHITECTURAL FEATURES ═══
- hasPorch: true if there is a covered front porch or stoop visible
- hasChimney: true if a chimney is visible above the roofline
- hasDormer: true if there are dormer windows protruding from the roof
- dormerCount: 1, 2, or 3 (how many dormers if hasDormer is true)
- shuttersEnabled: true if decorative vertical panels beside windows
- lightsEnabled: true if wall-mounted sconce lights beside doors/garage
- gableVentEnabled: true if vent/louver in triangular gable end
- windowCount: count ALL windows on front facade (NOT garage door, NOT entry door) — typically 2–6
- windowStyle: "single" (one pane) | "double" (two panes side by side) | "arched" (curved top) | "picture" (large panoramic)
- doorStyle: "single" | "double" (double entry doors) | "sidelite" (entry door with glass panels on sides)

═══ STEP 5: MATERIALS ═══
wallMaterial (look at surface texture):
- "hardie": horizontal lapped planks, fibrous/rigid matte texture — HardiePlank fiber cement
- "vinyl": horizontal planks, smooth/slightly glossy, plastic sheen with locking seams
- "hardie_shake": staggered shingle pattern on walls, rough textured edges
- "hardie_panel": large vertical grooved panels, clean lines
- "metal": flat or corrugated panels, visible seams/ribs
- "wood": natural wood grain, cedar shake or board/batten
- "lp": engineered wood, smooth with subtle grain — LP SmartSide
roofMaterial: "asphalt" (granular shingles) | "metal" (standing seam/ribbed) | "tpo" (flat membrane)

═══ STEP 6: EXACT COLORS FROM PHOTO ═══
- wallColor: dominant siding color exact hex (e.g. "#B5C4C1" not "gray")
- roofColor: roof color exact hex (e.g. "#2C2C2C" for charcoal)
- trimColor: corner board/trim color hex
- fasciaColor: fascia board at eave edge hex
- soffitColor: underside of overhang hex
- windowTrimColor: window casing/frame color hex
- shutterColor: shutter color hex (null if no shutters)
- garageColor: garage door color hex (null if no garage)

═══ JSON OUTPUT — return ALL fields ═══
{
  "type": "house" | "shed" | "garage" | "addition",
  "stories": 1 | 2,
  "widthFt": <number>,
  "depthFt": <number>,
  "wallHeightFt": <number>,
  "roofType": "gable" | "flat" | "hip",
  "ridgeHeightFt": <number>,
  "roofOverhang": <number>,
  "hasGarage": <true | false>,
  "garageDoorWidth": <9 | 16 | 18 | null>,
  "garageOffsetX": <-1.0 to 1.0 | null>,
  "entryDoorOffsetX": <-1.0 to 1.0>,
  "hasPorch": <true | false>,
  "hasChimney": <true | false>,
  "hasDormer": <true | false>,
  "dormerCount": <1 | 2 | 3 | null>,
  "shuttersEnabled": <true | false>,
  "lightsEnabled": <true | false>,
  "gableVentEnabled": <true | false>,
  "windowCount": <1–6>,
  "windowStyle": "single" | "double" | "arched" | "picture",
  "doorStyle": "single" | "double" | "sidelite",
  "wallMaterial": "hardie" | "hardie_shake" | "hardie_panel" | "vinyl" | "metal" | "wood" | "lp",
  "wallColor": "<#hexcode>",
  "roofMaterial": "asphalt" | "metal" | "tpo",
  "roofColor": "<#hexcode>",
  "trimColor": "<#hexcode | null>",
  "fasciaColor": "<#hexcode | null>",
  "soffitColor": "<#hexcode | null>",
  "windowTrimColor": "<#hexcode | null>",
  "shutterColor": "<#hexcode | null>",
  "garageColor": "<#hexcode | null>",
  "description": "<one-sentence: building type, stories, garage yes/no, roof type, materials, colors, porch/chimney/dormers if present>"
}

CRITICAL RULES:
- ALWAYS set stories (1 or 2) — this is the most important dimension.
- ALWAYS check for garage doors on the front — this is the second most important feature.
- Extract exact hex colors, not generic names.
- hasPorch/hasChimney/hasDormer: look carefully — these define the house silhouette.
- Your goal: someone looks at the 3D model and immediately recognizes their house.
Return ONLY the raw JSON object.`;

router.post("/ai/design-structure", requireAuth, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string") {
      res.status(400).json({ error: "prompt is required" });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(503).json({ error: "AI not configured" });
      return;
    }

    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: STRUCTURE_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 400,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      res.status(500).json({ error: "AI returned invalid JSON", raw });
      return;
    }

    res.json(parsed);
  } catch (err) {
    console.error("design-structure error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/ai/analyze-photo", requireAuth, async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = req.body;
    if (!imageBase64 || typeof imageBase64 !== "string") {
      res.status(400).json({ error: "imageBase64 is required" });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(503).json({ error: "AI not configured" });
      return;
    }

    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: PHOTO_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: "high",
              },
            },
            {
              type: "text",
              text: "Analyze this building photo with maximum precision and return the complete JSON. Extract EVERY visible detail — exact colors, all dimensions, all trim/accent colors, all boolean features.",
            },
          ],
        },
      ],
      temperature: 0.05,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : {};
    }

    res.json(parsed);
  } catch (err) {
    console.error("analyze-photo error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Image URL → 3D (fetch any image URL + GPT-4o vision, same as photo upload) ─

router.post("/ai/analyze-image-url", requireAuth, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "url is required" });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(503).json({ error: "AI not configured" });
      return;
    }

    // Fetch the image from the URL server-side (avoids CORS)
    const imgRes = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; KimdasaDesignStudio/1.0)" },
      signal: AbortSignal.timeout(12000),
    });

    if (!imgRes.ok) {
      res.status(400).json({ error: `No se pudo descargar la imagen (HTTP ${imgRes.status})` });
      return;
    }

    const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) {
      res.status(400).json({ error: "La URL no apunta a una imagen válida" });
      return;
    }

    const buffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = contentType.split(";")[0];

    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: PHOTO_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" },
            },
            {
              type: "text",
              text: "Analyze this building photo with maximum precision and return the complete JSON. Extract EVERY visible detail — exact colors, all dimensions, all trim/accent colors, all boolean features.",
            },
          ],
        },
      ],
      temperature: 0.05,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
      const m = raw.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : {};
      if (!parsed) { res.status(500).json({ error: "AI returned invalid JSON", raw }); return; }
    }

    res.json(parsed);
  } catch (err) {
    console.error("analyze-image-url error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Address → 3D (free: OpenStreetMap Nominatim geocoding + GPT-4o) ──────────

const ADDRESS_DESIGN_PROMPT = `You are a master residential architect with deep knowledge of NJ/PA housing stock.

Given a property address, generate a realistic 3D building model as if you were looking at a typical house at that location.
Use your knowledge of:
- Neighborhood type (suburban NJ → colonial/ranch; urban NJ → rowhouse/brownstone; rural PA → farmhouse/cape cod)
- Zip code regional character
- Typical construction era for the area
- Standard NJ/PA residential styles

Return ONLY a raw JSON object (no markdown) matching this exact schema:
{
  "description": "brief description of what the building likely looks like",
  "type": "house",
  "widthFt": <number 28-45>,
  "depthFt": <number 24-36>,
  "wallHeightFt": <number 8-11>,
  "stories": <1 or 2>,
  "foundationHeightFt": <number 1-3>,
  "roofType": <"gable"|"hip"|"gambrel"|"flat">,
  "ridgeHeightFt": <number 4-9>,
  "roofOverhang": <number 0.5-1.5>,
  "wallMaterial": <"hardie"|"hardie_shake"|"vinyl"|"hardie_panel"|"wood">,
  "wallColor": "<hex color>",
  "roofMaterial": <"asphalt"|"metal">,
  "roofColor": "<hex color>",
  "trimColor": "<hex color>",
  "fasciaColor": "<hex color>",
  "soffitColor": "<hex color>",
  "windowTrimColor": "<hex color>",
  "shutterColor": "<hex color or null>",
  "shuttersEnabled": <true|false>,
  "lightsEnabled": false,
  "gableVentEnabled": <true|false>,
  "windowStyle": <"double"|"single"|"picture"|"arched">,
  "windowCount": <1-4>,
  "doorStyle": <"panel"|"craftsman"|"modern">,
  "doorWall": "front",
  "doorOffsetX": 0,
  "hasPorch": <true|false>,
  "porchWidthFt": <number 8-16 or 0>,
  "porchDepthFt": <number 4-8 or 0>,
  "hasChimney": <true|false>,
  "chimneyX": <number -0.3 to 0.3>,
  "hasDormer": false,
  "dormerCount": 0
}`;

router.post("/ai/analyze-address", requireAuth, async (req, res) => {
  try {
    const { address } = req.body;
    if (!address || typeof address !== "string") {
      res.status(400).json({ error: "address is required" });
      return;
    }

    const oaiKey = process.env.OPENAI_API_KEY;
    if (!oaiKey) {
      res.status(503).json({ error: "AI not configured" });
      return;
    }

    // 1. Free geocoding via OpenStreetMap Nominatim (no API key, no billing)
    //    Cascade: full address → city+state → zip only
    type NominatimResult = Array<{
      display_name: string;
      lat: string;
      lon: string;
      address: {
        postcode?: string; city?: string; town?: string; village?: string;
        state?: string; country?: string; road?: string; house_number?: string;
        suburb?: string; neighbourhood?: string; county?: string;
      };
    }>;

    const nominatimHeaders = { "User-Agent": "KimdasaDesignStudio/1.0 (kimdasa.com)" };

    const tryGeocode = async (q: string): Promise<NominatimResult> => {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=1`;
      const r = await fetch(url, { headers: nominatimHeaders });
      return r.json() as Promise<NominatimResult>;
    };

    // Build fallback queries from the original address
    const parts = address.split(",").map(s => s.trim()).filter(Boolean);
    const queries = [
      address,                                  // full address
      parts.slice(-2).join(", "),               // last 2 parts (city, state/zip)
      parts.slice(-1)[0],                       // last part only (zip or state)
    ].filter((q, i, arr) => q && arr.indexOf(q) === i);

    let geoData: NominatimResult = [];
    for (const q of queries) {
      geoData = await tryGeocode(q);
      if (geoData.length) break;
    }

    if (!geoData.length) {
      res.status(404).json({ error: "Ubicación no encontrada. Probá con ciudad + estado (ej: Paramus, NJ) o solo el zip code." });
      return;
    }

    const place = geoData[0];
    const formattedAddress = place.display_name;
    const zip = place.address.postcode ?? "";
    const city = place.address.city ?? place.address.town ?? place.address.village ?? "";
    const state = place.address.state ?? "";
    const neighbourhood = place.address.suburb ?? place.address.neighbourhood ?? "";
    const county = place.address.county ?? "";

    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);

    // 2. Query OpenStreetMap Overpass API for real building footprint (free, no key)
    let osmWidthFt: number | null = null;
    let osmDepthFt: number | null = null;
    let osmStories: number | null = null;
    let osmHeightFt: number | null = null;
    let osmRoofShape: string | null = null;
    let osmBuildingType: string | null = null;

    try {
      const overpassQuery = `[out:json][timeout:15];(way["building"](around:60,${lat},${lng}););out geom;`;
      const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
      const ovRes = await fetch(overpassUrl, { headers: { "User-Agent": "KimdasaDesignStudio/1.0" } });
      if (ovRes.ok) {
        const ovData = await ovRes.json() as {
          elements: Array<{
            tags?: Record<string, string>;
            geometry?: Array<{ lat: number; lon: number }>;
          }>;
        };

        if (ovData.elements?.length) {
          // Pick the closest building element
          const el = ovData.elements[0];
          const tags = el.tags ?? {};

          // Compute bounding box from polygon geometry → width + depth in feet
          if (el.geometry?.length) {
            const lats = el.geometry.map(p => p.lat);
            const lons = el.geometry.map(p => p.lon);
            const latSpan = Math.max(...lats) - Math.min(...lats);
            const lonSpan = Math.max(...lons) - Math.min(...lons);
            const avgLat = (Math.max(...lats) + Math.min(...lats)) / 2;
            // Convert degrees → meters → feet
            const depthM  = latSpan * 110574;
            const widthM  = lonSpan * 111320 * Math.cos((avgLat * Math.PI) / 180);
            // Minimum 8 ft to avoid noise; cap at 120 ft
            if (depthM > 2.4 && depthM < 36.5) osmDepthFt  = Math.round(depthM * 3.28084);
            if (widthM > 2.4 && widthM < 36.5) osmWidthFt  = Math.round(widthM * 3.28084);
          }

          // Parse building tags
          const levels = parseInt(tags["building:levels"] ?? tags["levels"] ?? "0", 10);
          if (levels > 0 && levels <= 4) osmStories = levels;

          const heightM = parseFloat(tags["building:height"] ?? tags["height"] ?? "0");
          if (heightM > 0) osmHeightFt = Math.round(heightM * 3.28084);

          if (tags["roof:shape"]) {
            const rmap: Record<string, string> = {
              gabled: "gable", pyramidal: "hip", hipped: "hip",
              gambrel: "gambrel", flat: "flat", mansard: "gambrel",
            };
            osmRoofShape = rmap[tags["roof:shape"]] ?? null;
          }

          osmBuildingType = tags["building"] ?? null;
        }
      }
    } catch {
      // Overpass failure is non-fatal — fall through to GPT-only generation
    }

    // 3. Auto-search for real property photos: KartaView + Zillow + Redfin (all free, no login)
    let kartaPhotoBase64: string | null = null;
    let kartaPhotoMime = "image/jpeg";
    let kartaPhotoSource = "none";

    // Helper: download an image URL → base64
    const fetchImageBase64 = async (url: string): Promise<{ b64: string; mime: string } | null> => {
      try {
        const r = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "image/*,*/*;q=0.8",
          },
          signal: AbortSignal.timeout(10000),
        });
        if (!r.ok) return null;
        const ct = r.headers.get("content-type") ?? "image/jpeg";
        if (!ct.startsWith("image/")) return null;
        return { b64: Buffer.from(await r.arrayBuffer()).toString("base64"), mime: ct.split(";")[0] };
      } catch { return null; }
    };

    // Helper: extract og:image from an HTML page
    const fetchOgImage = async (pageUrl: string): Promise<string | null> => {
      try {
        const r = await fetch(pageUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
          },
          signal: AbortSignal.timeout(12000),
        });
        if (!r.ok) return null;
        const html = await r.text();
        const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                   ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
        return match?.[1] ?? null;
      } catch { return null; }
    };

    // ── Priority 1: Google Street View (best quality, uses saved API key) ──
    const googleMapsKey = process.env.GOOGLE_MAPS_API_KEY;
    let streetViewFound = false;

    if (googleMapsKey) {
      try {
        // First check metadata (free, no billing) to see if imagery exists
        const metaUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${googleMapsKey}`;
        const meta = await fetch(metaUrl, { signal: AbortSignal.timeout(6000) });
        if (meta.ok) {
          const metaData = await meta.json() as { status: string };
          if (metaData.status === "OK") {
            // Imagery exists — fetch it (requires billing but worth trying)
            const svUrl = `https://maps.googleapis.com/maps/api/streetview?size=640x480&location=${lat},${lng}&fov=90&pitch=5&key=${googleMapsKey}`;
            const svRes = await fetch(svUrl, { signal: AbortSignal.timeout(10000) });
            if (svRes.ok && svRes.headers.get("content-type")?.startsWith("image/")) {
              kartaPhotoBase64 = Buffer.from(await svRes.arrayBuffer()).toString("base64");
              kartaPhotoMime = "image/jpeg";
              kartaPhotoSource = "google_street_view";
              streetViewFound = true;
            }
          }
        }
      } catch {
        // Street View failure is non-fatal
      }
    }

    // ── Priority 2–4: Zillow + KartaView + Redfin (all free, run in parallel) ──
    if (!streetViewFound) {
      const [kartaResult, zillowResult, redfinResult] = await Promise.allSettled([

        // A: KartaView (street-level community photos)
        (async () => {
          const kRes = await fetch(
            `https://api.openstreetcam.org/1.0/list/nearby-photos/?lat=${lat}&lng=${lng}&page=1&distance=0.1`,
            { headers: { "User-Agent": "KimdasaDesignStudio/1.0", "Accept": "application/json" },
              signal: AbortSignal.timeout(8000) }
          );
          if (!kRes.ok) return null;
          const kData = await kRes.json() as {
            currentPageItems?: Array<{ fileurlProc?: string; fileurlLth?: string; fileurl?: string }>;
          };
          const photo = kData?.currentPageItems?.[0];
          const photoUrl = photo?.fileurlProc ?? photo?.fileurlLth ?? photo?.fileurl;
          if (!photoUrl) return null;
          return fetchImageBase64(photoUrl);
        })(),

        // B: Zillow property listing (public, no login required)
        (async () => {
          const zUrl = `https://www.zillow.com/homes/${encodeURIComponent(formattedAddress.split(",").slice(0, 3).join(",").trim())}_rb/`;
          const ogImg = await fetchOgImage(zUrl);
          if (!ogImg || ogImg.includes("logo") || ogImg.includes("icon")) return null;
          return fetchImageBase64(ogImg);
        })(),

        // C: Redfin property listing (public, no login required)
        (async () => {
          const rfUrl = `https://www.redfin.com/city/${encodeURIComponent(city || formattedAddress.split(",")[0].trim())}/filter/location=${encodeURIComponent(formattedAddress.split(",")[0].trim())}`;
          const ogImg = await fetchOgImage(rfUrl);
          if (!ogImg || ogImg.includes("logo") || ogImg.includes("icon")) return null;
          return fetchImageBase64(ogImg);
        })(),
      ]);

      // Pick the first successful result
      const sourceNames = ["kartaview", "zillow", "redfin"];
      const results = [kartaResult, zillowResult, redfinResult];
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (r.status === "fulfilled" && r.value) {
          kartaPhotoBase64 = r.value.b64;
          kartaPhotoMime = r.value.mime;
          kartaPhotoSource = sourceNames[i];
          break;
        }
      }
    }

    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: oaiKey });

    let buildingAnalysis: Record<string, unknown> = {};

    if (kartaPhotoBase64) {
      // ── Path A: Real street photo found → analyze with GPT-4o Vision ──────
      const osmHint = [
        osmWidthFt  ? `Measured building width: ${osmWidthFt} ft` : "",
        osmDepthFt  ? `Measured building depth: ${osmDepthFt} ft` : "",
        osmStories  ? `Measured stories: ${osmStories}` : "",
      ].filter(Boolean).join("; ");

      const visionCompletion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: PHOTO_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${kartaPhotoMime};base64,${kartaPhotoBase64}`, detail: "high" },
              },
              {
                type: "text",
                text: `Analyze this street-level photo of the property at ${formattedAddress}. Extract all visible building details with maximum precision.${osmHint ? ` Use these measured dimensions: ${osmHint}` : ""} Return the complete JSON.`,
              },
            ],
          },
        ],
        temperature: 0.05,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      });

      const raw = visionCompletion.choices[0]?.message?.content ?? "{}";
      try {
        buildingAnalysis = JSON.parse(raw.replace(/```json|```/g, "").trim());
      } catch {
        const m = raw.match(/\{[\s\S]*\}/);
        buildingAnalysis = m ? JSON.parse(m[0]) : {};
      }
    }

    // ── Path B (or fallback): Text-based generation with OSM data ─────────
    if (!kartaPhotoBase64 || !Object.keys(buildingAnalysis).length) {
      const osmFacts: string[] = [];
      if (osmWidthFt)    osmFacts.push(`REAL building width from OpenStreetMap: ${osmWidthFt} ft — use this EXACTLY`);
      if (osmDepthFt)    osmFacts.push(`REAL building depth from OpenStreetMap: ${osmDepthFt} ft — use this EXACTLY`);
      if (osmStories)    osmFacts.push(`REAL number of stories from OpenStreetMap: ${osmStories} — use this EXACTLY`);
      if (osmHeightFt)   osmFacts.push(`REAL total height from OpenStreetMap: ${osmHeightFt} ft — use this EXACTLY`);
      if (osmRoofShape)  osmFacts.push(`Roof shape from OpenStreetMap: ${osmRoofShape}`);
      if (osmBuildingType) osmFacts.push(`Building type from OpenStreetMap: ${osmBuildingType}`);

      const locationContext = [
        `Address: ${formattedAddress}`,
        zip ? `Zip code: ${zip}` : "",
        city ? `City/Town: ${city}` : "",
        state ? `State: ${state}` : "",
        neighbourhood ? `Neighborhood: ${neighbourhood}` : "",
        county ? `County: ${county}` : "",
      ].filter(Boolean).join("\n");

      const userPrompt = osmFacts.length
        ? `Generate a 3D building model for this property.\n\nLOCATION:\n${locationContext}\n\nREAL MEASURED DATA (override your estimates with these):\n${osmFacts.join("\n")}\n\nFor unlisted fields, infer from the area's architectural character.`
        : `Generate a realistic 3D building model for this property:\n\n${locationContext}\n\nBase your design on the typical architectural character of this specific area.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: ADDRESS_DESIGN_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      try {
        buildingAnalysis = JSON.parse(raw.replace(/```json|```/g, "").trim());
      } catch {
        res.status(500).json({ error: "AI returned invalid JSON", raw });
        return;
      }
    }

    // ── Fetch real property data from public sources (Zillow / Redfin) ──────
    let propertyData: {
      sqft: number | null; beds: number | null; baths: number | null;
      yearBuilt: number | null; lotSqft: number | null; propertyType: string | null;
      source: string;
    } = { sqft: null, beds: null, baths: null, yearBuilt: null, lotSqft: null, propertyType: null, source: "none" };

    const fetchPropertyText = async (url: string): Promise<string | null> => {
      try {
        const r = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36", Accept: "text/html,application/xhtml+xml" },
          signal: AbortSignal.timeout(10000),
        });
        return r.ok ? r.text() : null;
      } catch { return null; }
    };

    const extractNumber = (html: string, patterns: RegExp[]): number | null => {
      for (const p of patterns) {
        const m = html.match(p);
        if (m?.[1]) { const n = parseFloat(m[1].replace(/,/g, "")); if (!isNaN(n)) return n; }
      }
      return null;
    };

    // Try Zillow first
    try {
      const zAddr = formattedAddress.replace(/,\s*USA$/, "").replace(/[,\s]+/g, "-").replace(/-+/g, "-").toLowerCase();
      const zUrl = `https://www.zillow.com/homes/${encodeURIComponent(zAddr)}_rb/`;
      const html = await fetchPropertyText(zUrl);
      if (html) {
        const sqft = extractNumber(html, [
          /"livingArea":(\d[\d,]*)/i, /(\d[\d,]+)\s*sq\s*ft/i, /"sqft":(\d[\d,]*)/i,
          /(\d[\d,]+)\s*square\s*feet/i, /"floorSize":(\d[\d,]*)/i,
        ]);
        const beds = extractNumber(html, [/"bedrooms":(\d+)/i, /(\d+)\s*bed/i, /"beds":(\d+)/i]);
        const baths = extractNumber(html, [/"bathrooms":([\d.]+)/i, /([\d.]+)\s*bath/i]);
        const yearBuilt = extractNumber(html, [/"yearBuilt":(\d{4})/i, /built\s+in\s+(\d{4})/i, /"year_built":(\d{4})/i]);
        const lotSqft = extractNumber(html, [/"lotSize":(\d[\d,]*)/i, /(\d[\d,]+)\s*sq\s*ft\s*lot/i]);
        const propTypeM = html.match(/"homeType":"([^"]+)"/i) ?? html.match(/property type[^:]*:\s*([A-Za-z\s]+)/i);
        if (sqft || yearBuilt) {
          propertyData = {
            sqft, beds: beds ? Math.round(beds) : null, baths,
            yearBuilt: yearBuilt ? Math.round(yearBuilt) : null,
            lotSqft, propertyType: propTypeM?.[1] ?? null, source: "zillow",
          };
        }
      }
    } catch { /* Zillow failure is non-fatal */ }

    // Fall back to Redfin if Zillow gave nothing
    if (!propertyData.sqft && !propertyData.yearBuilt) {
      try {
        const rfAddr = formattedAddress.split(",").slice(0,2).join(",").trim();
        const rfUrl = `https://www.redfin.com/city/33062/NJ/Ewing-Township/filter/location=${encodeURIComponent(rfAddr)}`;
        const html = await fetchPropertyText(rfUrl);
        if (html) {
          const sqft = extractNumber(html, [/"sqFt":(\d[\d,]*)/i, /(\d[\d,]+)\s*sq\.?\s*ft/i]);
          const yearBuilt = extractNumber(html, [/"yearBuilt":(\d{4})/i]);
          if (sqft || yearBuilt) {
            propertyData = { ...propertyData, sqft, yearBuilt: yearBuilt ? Math.round(yearBuilt) : null, source: "redfin" };
          }
        }
      } catch { /* Redfin failure is non-fatal */ }
    }

    // Use real sqft to improve dimension estimates
    // Typical ranch: width ≈ sqft^0.6  depth ≈ sqft^0.45 (heuristic)
    if (propertyData.sqft && propertyData.sqft > 400 && propertyData.sqft < 8000) {
      const s = propertyData.sqft;
      const stories = Number(buildingAnalysis.stories) || 1;
      const sqftPerFloor = s / stories;
      // Estimate footprint: assume width:depth ratio ~1.4:1 for ranch, ~1.2:1 for 2-story
      const ratio = stories === 1 ? 1.5 : 1.25;
      const depthEst = Math.round(Math.sqrt(sqftPerFloor / ratio));
      const widthEst = Math.round(sqftPerFloor / depthEst);
      if (!osmWidthFt && widthEst > 18 && widthEst < 80) buildingAnalysis.widthFt = widthEst;
      if (!osmDepthFt && depthEst > 16 && depthEst < 60) buildingAnalysis.depthFt = depthEst;
    }

    // ── Apply OSM measurements (verified from satellite footprint) ───────────
    if (osmWidthFt)   buildingAnalysis.widthFt = osmWidthFt;
    if (osmDepthFt)   buildingAnalysis.depthFt = osmDepthFt;
    // CRITICAL FIX: When we have a real Street View photo, trust the photo for stories.
    // OSM building:levels is often wrong or missing. Only use OSM stories when no photo.
    if (osmStories && !kartaPhotoBase64) buildingAnalysis.stories = osmStories;
    if (osmHeightFt && !kartaPhotoBase64) buildingAnalysis.wallHeightFt = Math.round(Math.min(osmHeightFt * 0.75, 14));
    if (osmRoofShape) buildingAnalysis.roofType = osmRoofShape;

    // ── Sanitize / normalize AI output ──────────────────────────────────────
    // wallMaterial: map generic/invalid strings to valid renderer values
    const VALID_MATERIALS = ["hardie","hardie_shake","hardie_panel","vinyl","metal","wood","lp"];
    if (!VALID_MATERIALS.includes(buildingAnalysis.wallMaterial as string)) {
      const mat = String(buildingAnalysis.wallMaterial ?? "").toLowerCase();
      if (mat.includes("vinyl") || mat.includes("aluminum"))          buildingAnalysis.wallMaterial = "vinyl";
      else if (mat.includes("wood") || mat.includes("cedar"))         buildingAnalysis.wallMaterial = "wood";
      else if (mat.includes("metal") || mat.includes("steel"))        buildingAnalysis.wallMaterial = "metal";
      else if (mat.includes("panel") || mat.includes("vertical"))     buildingAnalysis.wallMaterial = "hardie_panel";
      else if (mat.includes("shake") || mat.includes("shingle"))      buildingAnalysis.wallMaterial = "hardie_shake";
      else if (mat.includes("lp") || mat.includes("smart"))           buildingAnalysis.wallMaterial = "lp";
      else                                                             buildingAnalysis.wallMaterial = "vinyl"; // default
    }
    // stories: enforce 1 or 2
    const stNum = Number(buildingAnalysis.stories);
    buildingAnalysis.stories = (stNum === 2 ? 2 : 1);
    // wallHeightFt: clamp to realistic range
    const wh = Number(buildingAnalysis.wallHeightFt) || 9;
    buildingAnalysis.wallHeightFt = Math.min(Math.max(wh, 7), 20);
    // ridgeHeightFt: for single-story, cap at 8ft; for 2-story cap at 10ft
    const maxRidge = buildingAnalysis.stories === 2 ? 10 : 8;
    const rh = Number(buildingAnalysis.ridgeHeightFt) || 5;
    buildingAnalysis.ridgeHeightFt = Math.min(Math.max(rh, 2), maxRidge);
    // widthFt / depthFt: sanity clamp
    if (buildingAnalysis.widthFt)  buildingAnalysis.widthFt  = Math.min(Math.max(Number(buildingAnalysis.widthFt),  18), 80);
    if (buildingAnalysis.depthFt)  buildingAnalysis.depthFt  = Math.min(Math.max(Number(buildingAnalysis.depthFt),  16), 60);
    // roofType: enforce valid values
    if (!["gable","hip","flat","gambrel"].includes(buildingAnalysis.roofType as string)) buildingAnalysis.roofType = "gable";
    // hex color basic validation
    const isHex = (v: unknown) => typeof v === "string" && /^#[0-9a-fA-F]{3,8}$/.test(v);
    if (!isHex(buildingAnalysis.wallColor))  buildingAnalysis.wallColor  = "#D4C9B0";
    if (!isHex(buildingAnalysis.roofColor))  buildingAnalysis.roofColor  = "#2C2C2C";
    if (!isHex(buildingAnalysis.trimColor))  buildingAnalysis.trimColor  = "#F0EDE8";

    const hasOsmData = !!(osmWidthFt || osmDepthFt || osmStories);
    const dataSource = kartaPhotoSource === "kartaview"
      ? (hasOsmData ? "photo+measurements" : "photo")
      : (hasOsmData ? "measurements" : "estimate");

    res.json({
      formattedAddress,
      zip,
      city,
      state,
      neighbourhood,
      county,
      lat,
      lng,
      hasStreetView: !!kartaPhotoBase64,
      photoSource: kartaPhotoSource,
      streetViewBase64: kartaPhotoBase64,
      streetViewMimeType: kartaPhotoMime,
      osmData: {
        widthFt: osmWidthFt,
        depthFt: osmDepthFt,
        stories: osmStories,
        heightFt: osmHeightFt,
        roofShape: osmRoofShape,
        buildingType: osmBuildingType,
        source: dataSource,
      },
      propertyData,
      building: buildingAnalysis,
    });

  } catch (err) {
    console.error("analyze-address error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Conversational Design Chat ──────────────────────────────────────────────

const DESIGN_CHAT_SYSTEM_PROMPT = `You are a conversational 3D architectural design assistant for Kimdasa Construction (NJ/PA).
The user already has a 3D building model rendered in the browser. Here are its CURRENT settings:

{CURRENT_PARAMS}

The user will ask you to change specific things (colors, materials, add features, change roof, etc.).
Make ONLY the changes they request. Respond naturally and concisely.

Return ONLY a raw JSON object (no markdown, no explanation, no code block) with exactly two keys:
- "message": 1-2 sentence response in the SAME LANGUAGE as the user
- "updates": an object containing ONLY the fields that need to change (partial update — omit unchanged fields)

VALID FIELD NAMES for updates:
type, widthFt, depthFt, wallHeightFt, stories, foundationHeightFt, roofType, ridgeHeightFt, roofOverhang,
wallMaterial, wallColor, roofMaterial, roofColor, trimColor, fasciaColor, soffitColor,
windowTrimColor, shutterColor, shuttersEnabled, lightsEnabled, gableVentEnabled,
windowStyle, doorStyle, hasPorch, porchWidthFt, porchDepthFt,
hasChimney, chimneyX, hasDormer, dormerCount, doorCount, windowCount

roofType values: "gable" | "flat" | "hip" | "gambrel"
wallMaterial values: "hardie" | "hardie_shake" | "hardie_panel" | "vinyl" | "metal" | "wood" | "lp"
roofMaterial values: "asphalt" | "metal" | "tpo"
windowStyle values: "single" | "double" | "arched" | "picture"
doorStyle values: "single" | "double" | "sidelite"

Color reference (always return hex):
white/blanco → "#F8F6F2" | cream/crema → "#E8D5B7" | light gray → "#D1D5DB" | gray/gris → "#8A8A8A"
dark gray/gris oscuro → "#4A4A4A" | charcoal/carbón → "#374151" | black/negro → "#1C1C1C"
blue/azul → "#5B7D8A" | navy/marino → "#1E3A5F" | green/verde → "#4A6741"
dark green → "#2D4A2D" | brown/café → "#8B6914" | red/rojo → "#8B3A3A"
tan/arena → "#C4A882" | terracotta → "#C17A5A" | sage/salvia → "#8FAF8A"

Examples:
User: "cambia el techo a rojo"
→ {"message":"¡Listo! Cambié el color del techo a rojo.","updates":{"roofColor":"#8B3A3A"}}

User: "add a front porch"
→ {"message":"Added a front porch to your design!","updates":{"hasPorch":true,"porchWidthFt":16,"porchDepthFt":6}}

User: "ponle 2 pisos"
→ {"message":"Perfecto, ahora la casa tiene dos pisos.","updates":{"stories":2}}

User: "change siding to wood shake brown"
→ {"message":"Changed the siding to cedar wood shake in brown tones!","updates":{"wallMaterial":"hardie_shake","wallColor":"#8B6914"}}

User: "make it a gambrel roof"
→ {"message":"Switched to a gambrel (Dutch colonial) roof!","updates":{"roofType":"gambrel","ridgeHeightFt":5}}

User: "add 3 dormers"
→ {"message":"Added 3 dormers to the roof!","updates":{"hasDormer":true,"dormerCount":3}}

User: "remove the porch"
→ {"message":"Removed the front porch.","updates":{"hasPorch":false}}

User: "change windows to arched"
→ {"message":"Changed all windows to arched Palladian style!","updates":{"windowStyle":"arched"}}

User: "make the walls navy blue with white trim"
→ {"message":"Navy walls with white trim — classic look!","updates":{"wallColor":"#1E3A5F","trimColor":"#F8F6F2"}}

Return ONLY the raw JSON object.`;

router.post("/ai/design-chat", requireAuth, async (req, res) => {
  try {
    const { message, currentParams, history = [] } = req.body;
    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "message is required" });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(503).json({ error: "AI not configured" });
      return;
    }

    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey });

    // Inject current params into system prompt
    const systemContent = DESIGN_CHAT_SYSTEM_PROMPT.replace(
      "{CURRENT_PARAMS}",
      JSON.stringify(currentParams ?? {}, null, 2)
    );

    // Build messages: system + conversation history + new user message
    const historyMsgs = Array.isArray(history)
      ? (history as Array<{ role: string; content: string }>)
          .slice(-10) // keep last 10 messages to stay within context limits
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
      : [];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemContent },
        ...historyMsgs,
        { role: "user", content: message },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { message?: string; updates?: Record<string, unknown> };
    try {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // If JSON parse fails, return a friendly message with no updates
      parsed = {
        message: "Entendido, pero no pude aplicar los cambios. ¿Podés ser más específico?",
        updates: {},
      };
    }

    res.json({
      message: parsed.message ?? "¡Cambios aplicados!",
      updates: parsed.updates ?? {},
    });
  } catch (err) {
    console.error("design-chat error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Multi-Photo → 3D: up to 8 angles analyzed together by GPT-4o ──────────────
router.post("/ai/analyze-multi-photo", requireAuth, async (req, res) => {
  try {
    const { images } = req.body as { images: Array<{ base64: string; mimeType: string; label: string }> };
    if (!Array.isArray(images) || images.length === 0) {
      res.status(400).json({ error: "images array is required (1–8 photos)" });
      return;
    }
    if (images.length > 8) {
      res.status(400).json({ error: "Maximum 8 photos allowed" });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) { res.status(503).json({ error: "AI not configured" }); return; }

    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey });

    // Build content array: text introduction + all images with labels
    type ContentPart =
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string; detail: "high" } };

    const contentParts: ContentPart[] = [
      {
        type: "text",
        text: `I am sending you ${images.length} photos of the SAME house taken from different angles: ${images.map(i => i.label).join(", ")}. 
Use ALL photos together to reconstruct the most accurate possible 3D model — each angle gives you information others can't:
- Front photo: facade width, entry door, garage, front windows, porch
- Side photos: building depth, wall height, roof pitch, side windows  
- Back/diagonal photos: overall shape, chimney placement, additions
Cross-reference all angles to get the most accurate dimensions and features.
Return the complete JSON following your system prompt exactly.`,
      },
    ];

    for (const img of images) {
      contentParts.push({
        type: "text",
        text: `[Photo: ${img.label}]`,
      });
      contentParts.push({
        type: "image_url",
        image_url: {
          url: `data:${img.mimeType};base64,${img.base64}`,
          detail: "high",
        },
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: PHOTO_SYSTEM_PROMPT },
        { role: "user", content: contentParts },
      ],
      temperature: 0.05,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); } catch { parsed = {}; }
      } else {
        parsed = {};
      }
    }

    res.json({ ...parsed as object, photoCount: images.length, angles: images.map(i => i.label) });
  } catch (err) {
    console.error("analyze-multi-photo error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── AI Photo Visualization: Street View + selected materials → DALL-E 3 render ─
router.post("/ai/visualize-materials", requireAuth, async (req, res) => {
  try {
    const { lat, lng, address, wallColor, wallProductName, roofColor, roofProductName, stories, roofType } = req.body;

    const oaiKey = process.env.OPENAI_API_KEY;
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!oaiKey) { res.status(503).json({ error: "AI not configured" }); return; }

    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: oaiKey });

    // 1. Fetch Street View photo
    let photoBase64: string | null = null;
    if (mapsKey && lat && lng) {
      const svUrl = `https://maps.googleapis.com/maps/api/streetview?size=640x480&location=${lat},${lng}&fov=90&pitch=5&source=outdoor&key=${mapsKey}`;
      const svRes = await fetch(svUrl);
      if (svRes.ok) {
        const buf = await svRes.arrayBuffer();
        photoBase64 = Buffer.from(buf).toString("base64");
      }
    }

    if (!photoBase64) {
      res.status(400).json({ error: "No se pudo obtener la foto de Street View. Verificá que la dirección tenga foto disponible." });
      return;
    }

    // 2. GPT-4o: describe the house in detail for DALL-E 3
    const descriptionCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an architectural photographer's assistant. Describe houses in extreme detail for AI image generation. 
Focus on: exact house style (ranch, colonial, cape cod, etc.), number of stories, roof shape (gable, hip, flat), 
approximate proportions (wide/narrow, single/double story), visible features (porch, attached/detached garage, 
chimney, dormers), landscaping, street setting, camera angle and distance, time of day/lighting. 
Be factual and specific. Do NOT mention colors. Output 2-3 sentences maximum.`,
        },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${photoBase64}`, detail: "high" } },
            { type: "text", text: "Describe this house's architecture and setting in detail (no colors). This description will be used as a base for DALL-E 3." },
          ],
        },
      ],
      max_tokens: 200,
      temperature: 0.1,
    });

    const houseDescription = descriptionCompletion.choices[0]?.message?.content?.trim() ?? 
      `A ${stories ?? 1}-story ${roofType === "hip" ? "hip-roof" : "gable-roof"} house on a residential street`;

    // 3. Build DALL-E 3 prompt combining house description + selected materials
    const wallDesc = wallProductName ? `${wallProductName} siding in color ${wallColor}` : `siding in color ${wallColor}`;
    const roofDesc = roofProductName ? `${roofProductName} roofing in color ${roofColor}` : `roofing in color ${roofColor}`;

    const dallePrompt = `Photorealistic exterior photo of ${houseDescription} The house has been renovated with ${wallDesc} and ${roofDesc}. Professional real estate photography, same street-level camera angle as if standing on the sidewalk, natural daylight, sharp focus, highly detailed. Do not change the shape, size, or layout of the house — only change the exterior materials and colors.`;

    // 4. Generate with DALL-E 3
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: dallePrompt,
      n: 1,
      size: "1792x1024",
      quality: "hd",
    });

    const imageUrl = imageResponse.data[0]?.url;
    if (!imageUrl) { res.status(500).json({ error: "DALL-E no generó imagen" }); return; }

    res.json({ imageUrl, houseDescription, prompt: dallePrompt });

  } catch (err: unknown) {
    console.error("visualize-materials error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
