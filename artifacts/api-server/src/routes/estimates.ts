import { Router } from "express";
import { db } from "@workspace/db";
import {
  estimatesTable,
  insertEstimateSchema,
  marketPricesTable,
} from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/estimates", requireAuth, async (_req, res) => {
  try {
    const estimates = await db
      .select()
      .from(estimatesTable)
      .orderBy(desc(estimatesTable.createdAt));
    res.json(estimates);
  } catch {
    res.status(500).json({ error: "Failed to fetch estimates" });
  }
});

// IMPORTANT: /estimates/calculate must be defined BEFORE /estimates/:id
// so Express does not treat "calculate" as an :id param
router.post("/estimates/calculate", requireAuth, async (req, res) => {
  try {
    const {
      serviceType,
      squareFootage = 0,
      difficulty = "medium",
      region = "new_jersey",
      height = 1,         // number of stories: 1 | 2 | 3
      pitch = "medium",   // "low" | "medium" | "steep" — roof pitch
      materialGrade = "standard", // "economy" | "standard" | "premium"
      overheadPercent,    // optional override (default 12%)
      profitPercent,      // optional override (default 20%)
    } = req.body;

    if (!serviceType) {
      res.status(400).json({ error: "serviceType is required" });
      return;
    }

    const sqft = Math.max(0, Number(squareFootage));

    // --- Look up base price from market_prices table ---
    const prices = await db
      .select()
      .from(marketPricesTable)
      .where(
        and(
          eq(marketPricesTable.category, serviceType),
          eq(marketPricesTable.region, region)
        )
      )
      .limit(1);

    // Choose base price per grade; fall back to defaults if no DB entry
    let basePricePerSqft = 10; // fallback default
    let priceSource: { category: string; region: string; avgPrice: string | null } | null = null;

    if (prices[0]) {
      priceSource = { category: prices[0].category, region: prices[0].region, avgPrice: prices[0].avgPrice };
      if (materialGrade === "economy") {
        basePricePerSqft = Number(prices[0].minPrice ?? prices[0].avgPrice ?? 10);
      } else if (materialGrade === "premium") {
        basePricePerSqft = Number(prices[0].premiumPrice ?? prices[0].avgPrice ?? 10);
      } else {
        basePricePerSqft = Number(prices[0].avgPrice ?? 10);
      }
    }

    // --- Difficulty multiplier (applied to total) ---
    const difficultyMultiplier =
      difficulty === "hard" ? 1.3 : difficulty === "easy" ? 0.85 : 1.0;

    // --- Height surcharge on labor ---
    let heightSurcharge = 0;
    const stories = Number(height);
    if (stories >= 3) {
      heightSurcharge = 0.18;
    } else if (stories === 2) {
      heightSurcharge = 0.08;
    }

    // --- Roof pitch surcharge on labor (only relevant for roofing) ---
    const isRoofingService = /roof/i.test(serviceType);
    let pitchSurcharge = 0;
    if (isRoofingService) {
      if (pitch === "steep") pitchSurcharge = 0.25;
      else if (pitch === "medium") pitchSurcharge = 0.10;
    }

    const laborSurchargeMultiplier = 1 + heightSurcharge + pitchSurcharge;

    // --- Core calculations ---
    const rawMaterialCost = basePricePerSqft * sqft * difficultyMultiplier;
    const rawLaborCost = rawMaterialCost * 0.4 * laborSurchargeMultiplier;

    const overheadRate = overheadPercent != null
      ? Math.max(0, Math.min(100, Number(overheadPercent))) / 100
      : 0.12;

    const profitRate = profitPercent != null
      ? Math.max(0, Math.min(100, Number(profitPercent))) / 100
      : 0.20;

    const overhead = (rawMaterialCost + rawLaborCost) * overheadRate;
    const subtotal = rawMaterialCost + rawLaborCost + overhead;
    const profitAmount = subtotal * profitRate;
    const internalCost = subtotal;
    const recommendedPrice = subtotal + profitAmount;
    const marginPercent = recommendedPrice > 0
      ? (profitAmount / recommendedPrice) * 100
      : 0;

    // Range: ±10% (field conditions may vary)
    const rangeLow = recommendedPrice * 0.90;
    const rangeHigh = recommendedPrice * 1.10;

    const fmt = (n: number) => Number(n.toFixed(2));

    res.json({
      // Inputs
      serviceType,
      squareFootage: sqft,
      difficulty,
      region,
      height: stories,
      pitch: isRoofingService ? pitch : "n/a",
      materialGrade,

      // Rates applied
      difficultyMultiplier,
      heightSurcharge: `+${(heightSurcharge * 100).toFixed(0)}%`,
      pitchSurcharge: isRoofingService ? `+${(pitchSurcharge * 100).toFixed(0)}%` : "n/a",
      overheadPercent: overheadRate * 100,
      profitPercent: profitRate * 100,

      // Cost breakdown
      materialCost: fmt(rawMaterialCost),
      laborCost: fmt(rawLaborCost),
      overhead: fmt(overhead),
      profitMargin: fmt(profitAmount),

      // Totals
      internalCost: fmt(internalCost),
      recommendedPrice: fmt(recommendedPrice),
      marginPercent: Number(marginPercent.toFixed(1)),

      // Client-facing price range (always present estimates as a range)
      clientPriceRangeLow: fmt(rangeLow),
      clientPriceRangeHigh: fmt(rangeHigh),

      // Price source
      priceSource,
      basePricePerSqft: fmt(basePricePerSqft),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: "Failed to calculate estimate", detail: msg });
  }
});

router.get("/estimates/:id", requireAuth, async (req, res) => {
  try {
    const [estimate] = await db
      .select()
      .from(estimatesTable)
      .where(eq(estimatesTable.id, Number(req.params.id)))
      .limit(1);
    if (!estimate) { res.status(404).json({ error: "Estimate not found" }); return; }
    res.json(estimate);
  } catch {
    res.status(500).json({ error: "Failed to fetch estimate" });
  }
});

router.post("/estimates", requireAuth, async (req, res) => {
  try {
    const parsed = insertEstimateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }
    const [estimate] = await db.insert(estimatesTable).values(parsed.data).returning();
    res.status(201).json(estimate);
  } catch {
    res.status(500).json({ error: "Failed to create estimate" });
  }
});

router.patch("/estimates/:id", requireAuth, async (req, res) => {
  try {
    const parsed = insertEstimateSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }
    const [updated] = await db
      .update(estimatesTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(estimatesTable.id, Number(req.params.id)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Estimate not found" }); return; }
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update estimate" });
  }
});

router.delete("/estimates/:id", requireAuth, async (req, res) => {
  try {
    const [deleted] = await db
      .delete(estimatesTable)
      .where(eq(estimatesTable.id, Number(req.params.id)))
      .returning();
    if (!deleted) { res.status(404).json({ error: "Estimate not found" }); return; }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete estimate" });
  }
});

export default router;
