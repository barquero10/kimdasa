import { Router } from "express";
import { db } from "@workspace/db";
import { marketPricesTable, insertMarketPriceSchema } from "@workspace/db/schema";
import { eq, lt } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/market-prices", async (_req, res) => {
  try {
    const prices = await db.select().from(marketPricesTable).orderBy(marketPricesTable.category);
    res.json(prices);
  } catch {
    res.status(500).json({ error: "Failed to fetch market prices" });
  }
});

router.get("/market-prices/staleness", requireAuth, async (_req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const stale = await db
      .select()
      .from(marketPricesTable)
      .where(lt(marketPricesTable.updatedAt, thirtyDaysAgo));
    res.json({
      staleCount: stale.length,
      staleItems: stale.map((p) => ({ id: p.id, category: p.category, region: p.region, updatedAt: p.updatedAt })),
    });
  } catch {
    res.status(500).json({ error: "Failed to check price staleness" });
  }
});

router.get("/market-prices/:id", async (req, res) => {
  try {
    const [price] = await db
      .select()
      .from(marketPricesTable)
      .where(eq(marketPricesTable.id, Number(req.params.id)))
      .limit(1);
    if (!price) { res.status(404).json({ error: "Price not found" }); return; }
    res.json(price);
  } catch {
    res.status(500).json({ error: "Failed to fetch price" });
  }
});

router.post("/market-prices", requireAuth, async (req, res) => {
  try {
    const parsed = insertMarketPriceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }
    const [price] = await db.insert(marketPricesTable).values(parsed.data).returning();
    res.status(201).json(price);
  } catch {
    res.status(500).json({ error: "Failed to create price" });
  }
});

router.patch("/market-prices/:id", requireAuth, async (req, res) => {
  try {
    const parsed = insertMarketPriceSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }
    const [updated] = await db
      .update(marketPricesTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(marketPricesTable.id, Number(req.params.id)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Price not found" }); return; }
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update price" });
  }
});

router.delete("/market-prices/:id", requireAuth, async (req, res) => {
  try {
    const [deleted] = await db
      .delete(marketPricesTable)
      .where(eq(marketPricesTable.id, Number(req.params.id)))
      .returning();
    if (!deleted) { res.status(404).json({ error: "Price not found" }); return; }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete price" });
  }
});

export default router;
