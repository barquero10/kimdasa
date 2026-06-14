import { Router } from "express";
import { db } from "@workspace/db";
import { virtualAgentsTable, insertVirtualAgentSchema } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/virtual-agents", requireAuth, async (_req, res) => {
  try {
    const agents = await db.select().from(virtualAgentsTable);
    res.json(agents);
  } catch {
    res.status(500).json({ error: "Failed to fetch virtual agents" });
  }
});

router.get("/virtual-agents/:id", requireAuth, async (req, res) => {
  try {
    const [agent] = await db
      .select()
      .from(virtualAgentsTable)
      .where(eq(virtualAgentsTable.id, Number(req.params.id)))
      .limit(1);
    if (!agent) { res.status(404).json({ error: "Agent not found" }); return; }
    res.json(agent);
  } catch {
    res.status(500).json({ error: "Failed to fetch agent" });
  }
});

router.post("/virtual-agents", requireAuth, async (req, res) => {
  try {
    const parsed = insertVirtualAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }
    const [agent] = await db.insert(virtualAgentsTable).values(parsed.data).returning();
    res.status(201).json(agent);
  } catch {
    res.status(500).json({ error: "Failed to create virtual agent" });
  }
});

router.patch("/virtual-agents/:id", requireAuth, async (req, res) => {
  try {
    const parsed = insertVirtualAgentSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }
    const [updated] = await db
      .update(virtualAgentsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(virtualAgentsTable.id, Number(req.params.id)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Agent not found" }); return; }
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update virtual agent" });
  }
});

export default router;
