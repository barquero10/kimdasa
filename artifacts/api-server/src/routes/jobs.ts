import { Router } from "express";
import { db } from "@workspace/db";
import { jobsTable, insertJobSchema, customersTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { sendReviewRequest } from "../lib/notifyLead";
import { logger } from "../lib/logger";

const router = Router();

router.get("/jobs", requireAuth, async (_req, res) => {
  try {
    const jobs = await db.select().from(jobsTable).orderBy(desc(jobsTable.createdAt));
    res.json(jobs);
  } catch {
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

router.get("/jobs/:id", requireAuth, async (req, res) => {
  try {
    const [job] = await db
      .select()
      .from(jobsTable)
      .where(eq(jobsTable.id, Number(req.params.id)))
      .limit(1);
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }
    res.json(job);
  } catch {
    res.status(500).json({ error: "Failed to fetch job" });
  }
});

router.post("/jobs", requireAuth, async (req, res) => {
  try {
    const parsed = insertJobSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }
    const [job] = await db.insert(jobsTable).values(parsed.data).returning();
    res.status(201).json(job);
  } catch {
    res.status(500).json({ error: "Failed to create job" });
  }
});

router.patch("/jobs/:id", requireAuth, async (req, res) => {
  try {
    const parsed = insertJobSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }

    const [existing] = await db
      .select()
      .from(jobsTable)
      .where(eq(jobsTable.id, Number(req.params.id)))
      .limit(1);

    const [updated] = await db
      .update(jobsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(jobsTable.id, Number(req.params.id)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Job not found" }); return; }

    if (
      existing &&
      existing.status !== "completed" &&
      updated.status === "completed" &&
      updated.customerId
    ) {
      db.select()
        .from(customersTable)
        .where(eq(customersTable.id, updated.customerId))
        .limit(1)
        .then(([customer]) => {
          if (customer?.email) {
            sendReviewRequest({
              customerName: customer.name,
              customerEmail: customer.email,
              jobTitle: updated.title,
            }).catch((err) => {
              logger.error({ err, jobId: updated.id }, "jobs: sendReviewRequest failed");
            });
          } else {
            logger.warn({ jobId: updated.id, customerId: updated.customerId }, "jobs: customer has no email, review request skipped");
          }
        })
        .catch((err) => {
          logger.error({ err, jobId: updated.id, customerId: updated.customerId }, "jobs: customer lookup for review request failed");
        });
    }

    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update job" });
  }
});

router.delete("/jobs/:id", requireAuth, async (req, res) => {
  try {
    const [deleted] = await db
      .delete(jobsTable)
      .where(eq(jobsTable.id, Number(req.params.id)))
      .returning();
    if (!deleted) { res.status(404).json({ error: "Job not found" }); return; }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete job" });
  }
});

export default router;
