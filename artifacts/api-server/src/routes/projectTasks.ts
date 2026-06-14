import { Router } from "express";
import { db } from "@workspace/db";
import { projectTasksTable, insertProjectTaskSchema } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/tasks", requireAuth, async (_req, res) => {
  try {
    const tasks = await db
      .select()
      .from(projectTasksTable)
      .orderBy(desc(projectTasksTable.createdAt));
    res.json(tasks);
  } catch {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

router.get("/tasks/:id", requireAuth, async (req, res) => {
  try {
    const [task] = await db
      .select()
      .from(projectTasksTable)
      .where(eq(projectTasksTable.id, Number(req.params.id)))
      .limit(1);
    if (!task) { res.status(404).json({ error: "Task not found" }); return; }
    res.json(task);
  } catch {
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

router.post("/tasks", requireAuth, async (req, res) => {
  try {
    const parsed = insertProjectTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }
    const [task] = await db.insert(projectTasksTable).values(parsed.data).returning();
    res.status(201).json(task);
  } catch {
    res.status(500).json({ error: "Failed to create task" });
  }
});

router.patch("/tasks/:id", requireAuth, async (req, res) => {
  try {
    const parsed = insertProjectTaskSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }
    const [updated] = await db
      .update(projectTasksTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(projectTasksTable.id, Number(req.params.id)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Task not found" }); return; }
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update task" });
  }
});

router.delete("/tasks/:id", requireAuth, async (req, res) => {
  try {
    const [deleted] = await db
      .delete(projectTasksTable)
      .where(eq(projectTasksTable.id, Number(req.params.id)))
      .returning();
    if (!deleted) { res.status(404).json({ error: "Task not found" }); return; }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete task" });
  }
});

export default router;
