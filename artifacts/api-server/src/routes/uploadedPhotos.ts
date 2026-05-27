import { Router } from "express";
import { db } from "@workspace/db";
import { uploadedPhotosTable, insertUploadedPhotoSchema } from "@workspace/db/schema";
import { eq, desc, and, SQL } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/photos", requireAuth, async (req, res) => {
  try {
    const { leadId, customerId, jobId } = req.query;
    const conditions: SQL[] = [];
    if (leadId) conditions.push(eq(uploadedPhotosTable.leadId, Number(leadId)));
    if (customerId) conditions.push(eq(uploadedPhotosTable.customerId, Number(customerId)));
    if (jobId) conditions.push(eq(uploadedPhotosTable.jobId, Number(jobId)));
    const items = await db
      .select()
      .from(uploadedPhotosTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(uploadedPhotosTable.createdAt));
    res.json(items);
  } catch {
    res.status(500).json({ error: "Failed to fetch photos" });
  }
});

router.post("/photos", async (req, res) => {
  try {
    const parsed = insertUploadedPhotoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }
    const [item] = await db.insert(uploadedPhotosTable).values(parsed.data).returning();
    res.status(201).json(item);
  } catch {
    res.status(500).json({ error: "Failed to save photo record" });
  }
});

router.delete("/photos/:id", requireAuth, async (req, res) => {
  try {
    const [deleted] = await db
      .delete(uploadedPhotosTable)
      .where(eq(uploadedPhotosTable.id, Number(req.params.id)))
      .returning();
    if (!deleted) { res.status(404).json({ error: "Photo not found" }); return; }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete photo" });
  }
});

export default router;
