import { Router } from "express";
import { db } from "@workspace/db";
import { siteConfigTable, insertSiteConfigSchema } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

const PRIVATE_CONFIG_PREFIX = "gb";

router.get("/site-config", async (_req, res) => {
  try {
    const configs = await db.select().from(siteConfigTable);
    const map: Record<string, string | null> = {};
    for (const c of configs) {
      if (!c.key.startsWith(PRIVATE_CONFIG_PREFIX)) {
        map[c.key] = c.value ?? null;
      }
    }
    res.json(map);
  } catch {
    res.status(500).json({ error: "Failed to fetch site config" });
  }
});

router.put("/site-config/:key", requireAuth, async (req, res) => {
  try {
    const key = String(req.params.key);
    if (key.startsWith(PRIVATE_CONFIG_PREFIX)) {
      res.status(403).json({ error: "Forbidden: this config key is not writable via this endpoint" });
      return;
    }
    const { value, description } = req.body;
    const [existing] = await db
      .select()
      .from(siteConfigTable)
      .where(eq(siteConfigTable.key, key))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(siteConfigTable)
        .set({ value, description, updatedAt: new Date() })
        .where(eq(siteConfigTable.key, key))
        .returning();
      res.json(updated);
    } else {
      const [created] = await db
        .insert(siteConfigTable)
        .values({ key, value, description })
        .returning();
      res.status(201).json(created);
    }
  } catch {
    res.status(500).json({ error: "Failed to update config" });
  }
});

export default router;
