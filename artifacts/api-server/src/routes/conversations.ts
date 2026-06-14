import { Router } from "express";
import { db } from "@workspace/db";
import { conversationsTable, insertConversationSchema } from "@workspace/db/schema";
import { eq, desc, and, SQL } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/conversations", requireAuth, async (req, res) => {
  try {
    const { leadId, customerId } = req.query;
    const conditions: SQL[] = [];
    if (leadId) conditions.push(eq(conversationsTable.leadId, Number(leadId)));
    if (customerId) conditions.push(eq(conversationsTable.customerId, Number(customerId)));
    const items = await db
      .select()
      .from(conversationsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(conversationsTable.createdAt));
    res.json(items);
  } catch {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

router.post("/conversations", async (req, res) => {
  try {
    const parsed = insertConversationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }
    const [item] = await db.insert(conversationsTable).values(parsed.data).returning();
    res.status(201).json(item);
  } catch {
    res.status(500).json({ error: "Failed to save conversation" });
  }
});

export default router;
