import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable, insertCustomerSchema } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/customers", requireAuth, async (_req, res) => {
  try {
    const customers = await db
      .select()
      .from(customersTable)
      .orderBy(desc(customersTable.createdAt));
    res.json(customers);
  } catch {
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

router.get("/customers/:id", requireAuth, async (req, res) => {
  try {
    const [customer] = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.id, Number(req.params.id)))
      .limit(1);
    if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }
    res.json(customer);
  } catch {
    res.status(500).json({ error: "Failed to fetch customer" });
  }
});

router.post("/customers", requireAuth, async (req, res) => {
  try {
    const parsed = insertCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }
    const [customer] = await db.insert(customersTable).values(parsed.data).returning();
    res.status(201).json(customer);
  } catch {
    res.status(500).json({ error: "Failed to create customer" });
  }
});

router.patch("/customers/:id", requireAuth, async (req, res) => {
  try {
    const parsed = insertCustomerSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }
    const [updated] = await db
      .update(customersTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(customersTable.id, Number(req.params.id)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Customer not found" }); return; }
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update customer" });
  }
});

router.delete("/customers/:id", requireAuth, async (req, res) => {
  try {
    const [deleted] = await db
      .delete(customersTable)
      .where(eq(customersTable.id, Number(req.params.id)))
      .returning();
    if (!deleted) { res.status(404).json({ error: "Customer not found" }); return; }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete customer" });
  }
});

export default router;
