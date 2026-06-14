import { Router } from "express";
import { db } from "@workspace/db";
import { followUpsTable, insertFollowUpSchema } from "@workspace/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/follow-ups", requireAuth, async (_req, res) => {
  try {
    const items = await db
      .select()
      .from(followUpsTable)
      .orderBy(asc(followUpsTable.scheduledAt));
    res.json(items);
  } catch {
    res.status(500).json({ error: "Failed to fetch follow-ups" });
  }
});

router.get("/follow-ups/:id", requireAuth, async (req, res) => {
  try {
    const [item] = await db
      .select()
      .from(followUpsTable)
      .where(eq(followUpsTable.id, Number(req.params.id)))
      .limit(1);
    if (!item) { res.status(404).json({ error: "Follow-up not found" }); return; }
    res.json(item);
  } catch {
    res.status(500).json({ error: "Failed to fetch follow-up" });
  }
});

router.post("/follow-ups", requireAuth, async (req, res) => {
  try {
    const parsed = insertFollowUpSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }
    const [item] = await db.insert(followUpsTable).values(parsed.data).returning();
    res.status(201).json(item);
  } catch {
    res.status(500).json({ error: "Failed to create follow-up" });
  }
});

router.patch("/follow-ups/:id", requireAuth, async (req, res) => {
  try {
    const parsed = insertFollowUpSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }
    const [updated] = await db
      .update(followUpsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(followUpsTable.id, Number(req.params.id)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Follow-up not found" }); return; }
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update follow-up" });
  }
});

router.delete("/follow-ups/:id", requireAuth, async (req, res) => {
  try {
    const [deleted] = await db
      .delete(followUpsTable)
      .where(eq(followUpsTable.id, Number(req.params.id)))
      .returning();
    if (!deleted) { res.status(404).json({ error: "Follow-up not found" }); return; }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete follow-up" });
  }
});

export default router;
