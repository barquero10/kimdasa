import { Router } from "express";
import { db } from "@workspace/db";
import { leadsTable, insertLeadSchema } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { notifyNewLead, sendLeadConfirmation } from "../lib/notifyLead";

const router = Router();

router.get("/leads", requireAuth, async (_req, res) => {
  try {
    const leads = await db
      .select()
      .from(leadsTable)
      .orderBy(desc(leadsTable.createdAt));
    res.json(leads);
  } catch {
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

router.get("/leads/:id", requireAuth, async (req, res) => {
  try {
    const [lead] = await db
      .select()
      .from(leadsTable)
      .where(eq(leadsTable.id, Number(req.params.id)))
      .limit(1);
    if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }
    res.json(lead);
  } catch {
    res.status(500).json({ error: "Failed to fetch lead" });
  }
});

router.post("/leads", async (req, res) => {
  try {
    const parsed = insertLeadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }
    const [lead] = await db.insert(leadsTable).values(parsed.data).returning();
    res.status(201).json(lead);
    void notifyNewLead(lead);
    void sendLeadConfirmation(lead);
  } catch {
    res.status(500).json({ error: "Failed to create lead" });
  }
});

router.patch("/leads/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const parsed = insertLeadSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }
    const [updated] = await db
      .update(leadsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(leadsTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Lead not found" }); return; }
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update lead" });
  }
});

router.delete("/leads/:id", requireAuth, async (req, res) => {
  try {
    const [deleted] = await db
      .delete(leadsTable)
      .where(eq(leadsTable.id, Number(req.params.id)))
      .returning();
    if (!deleted) { res.status(404).json({ error: "Lead not found" }); return; }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete lead" });
  }
});

export default router;
