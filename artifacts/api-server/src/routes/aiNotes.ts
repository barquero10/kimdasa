import { Router } from "express";
import { db } from "@workspace/db";
import { aiNotesTable, insertAiNoteSchema } from "@workspace/db/schema";
import { eq, desc, and, SQL } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/ai-notes", requireAuth, async (req, res) => {
  try {
    const { leadId, customerId } = req.query;
    const conditions: SQL[] = [];
    if (leadId) conditions.push(eq(aiNotesTable.leadId, Number(leadId)));
    if (customerId) conditions.push(eq(aiNotesTable.customerId, Number(customerId)));
    const items = await db
      .select()
      .from(aiNotesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(aiNotesTable.createdAt));
    res.json(items);
  } catch {
    res.status(500).json({ error: "Failed to fetch AI notes" });
  }
});

router.post("/ai-notes", requireAuth, async (req, res) => {
  try {
    const parsed = insertAiNoteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }
    const [item] = await db.insert(aiNotesTable).values(parsed.data).returning();
    res.status(201).json(item);
  } catch {
    res.status(500).json({ error: "Failed to create AI note" });
  }
});

router.delete("/ai-notes/:id", requireAuth, async (req, res) => {
  try {
    const [deleted] = await db
      .delete(aiNotesTable)
      .where(eq(aiNotesTable.id, Number(req.params.id)))
      .returning();
    if (!deleted) { res.status(404).json({ error: "Note not found" }); return; }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete note" });
  }
});

export default router;
