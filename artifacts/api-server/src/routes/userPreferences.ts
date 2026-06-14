import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middlewares/auth";

const VALID_GUIDE_LANGS = ["en", "es", "pt"] as const;
const VALID_DASHBOARD_LANGS = ["en", "es", "pt"] as const;
type GuideLang = (typeof VALID_GUIDE_LANGS)[number];
type DashboardLang = (typeof VALID_DASHBOARD_LANGS)[number];

const router = Router();

router.get("/me/preferences", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db
      .select({ guideLanguage: usersTable.guideLanguage, dashboardLanguage: usersTable.dashboardLanguage })
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ guideLanguage: user.guideLanguage ?? null, dashboardLanguage: user.dashboardLanguage ?? null });
  } catch {
    res.status(500).json({ error: "Failed to fetch preferences" });
  }
});

router.patch("/me/preferences", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { guideLanguage, dashboardLanguage } = req.body as { guideLanguage?: unknown; dashboardLanguage?: unknown };

    if (guideLanguage === undefined && dashboardLanguage === undefined) {
      res.status(400).json({ error: "Provide at least one of: guideLanguage, dashboardLanguage" });
      return;
    }

    if (guideLanguage !== undefined && !VALID_GUIDE_LANGS.includes(guideLanguage as GuideLang)) {
      res.status(400).json({ error: "guideLanguage must be one of: en, es, pt" });
      return;
    }

    if (dashboardLanguage !== undefined && !VALID_DASHBOARD_LANGS.includes(dashboardLanguage as DashboardLang)) {
      res.status(400).json({ error: "dashboardLanguage must be one of: en, es, pt" });
      return;
    }

    const updates: Partial<typeof usersTable.$inferInsert> & { updatedAt: Date } = { updatedAt: new Date() };
    if (guideLanguage !== undefined) updates.guideLanguage = guideLanguage as GuideLang;
    if (dashboardLanguage !== undefined) updates.dashboardLanguage = dashboardLanguage as DashboardLang;

    const [updated] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, req.user!.userId))
      .returning({ guideLanguage: usersTable.guideLanguage, dashboardLanguage: usersTable.dashboardLanguage });

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ guideLanguage: updated.guideLanguage ?? null, dashboardLanguage: updated.dashboardLanguage ?? null });
  } catch {
    res.status(500).json({ error: "Failed to update preferences" });
  }
});

export default router;
