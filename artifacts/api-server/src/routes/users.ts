import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, insertUserSchema } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin, AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/users", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const users = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      dashboardLanguage: usersTable.dashboardLanguage,
      createdAt: usersTable.createdAt,
      updatedAt: usersTable.updatedAt,
    }).from(usersTable);
    res.json(users);
  } catch {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.post("/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const parsed = insertUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }
    const hashed = await bcrypt.hash(parsed.data.passwordHash, 12);
    const [user] = await db
      .insert(usersTable)
      .values({ ...parsed.data, passwordHash: hashed })
      .returning({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        role: usersTable.role,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt,
      });
    res.status(201).json(user);
  } catch {
    res.status(500).json({ error: "Failed to create user" });
  }
});

router.patch("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    const updateData: Partial<typeof usersTable.$inferInsert> = rest;
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }
    const [updated] = await db
      .update(usersTable)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(usersTable.id, Number(req.params.id)))
      .returning({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        role: usersTable.role,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt,
      });
    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update user" });
  }
});

router.delete("/users/:id", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    if (req.user?.userId === Number(req.params.id)) {
      res.status(400).json({ error: "Cannot delete your own account" });
      return;
    }
    const [deleted] = await db
      .delete(usersTable)
      .where(eq(usersTable.id, Number(req.params.id)))
      .returning({ id: usersTable.id });
    if (!deleted) { res.status(404).json({ error: "User not found" }); return; }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;
