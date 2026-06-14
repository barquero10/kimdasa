import { Router } from "express";
import { db } from "@workspace/db";
import { appointmentsTable, insertAppointmentSchema, siteConfigTable } from "@workspace/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { sendAppointmentConfirmation, sendAppointmentOwnerNotification } from "../lib/notifyLead";
import { addAppointmentToCalendar } from "../lib/googleCalendar";
import { sendAppointmentSmsToCustomer, sendAppointmentSmsToOwner } from "../lib/sms";
import { logger } from "../lib/logger";

const router = Router();

function getConfigMap(rows: { key: string; value: string | null }[]) {
  return new Map(rows.map((r) => [r.key, r.value ?? ""]));
}

function generateSlots(startHour: number, endHour: number, durationMin: number): string[] {
  const slots: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += durationMin) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      const endMin = m + durationMin;
      const endH = endMin >= 60 ? h + 1 : h;
      const endM = endMin >= 60 ? endMin - 60 : endMin;
      const eHH = String(endH).padStart(2, "0");
      const eMM = String(endM).padStart(2, "0");
      slots.push(`${hh}:${mm}–${eHH}:${eMM}`);
    }
  }
  return slots;
}

router.get("/appointments/slots", async (req, res) => {
  try {
    const { date } = req.query as { date?: string };
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: "date query param required (YYYY-MM-DD)" });
      return;
    }

    const configRows = await db.select().from(siteConfigTable);
    const cfg = getConfigMap(configRows);

    const availableDays = (cfg.get("availableDays") || "1,2,3,4,5")
      .split(",").map((d) => parseInt(d.trim(), 10));
    const startHour = parseInt(cfg.get("startHour") || "8", 10);
    const endHour = parseInt(cfg.get("endHour") || "17", 10);
    const durationMin = parseInt(cfg.get("slotDurationMinutes") || "60", 10);

    const dayOfWeek = new Date(date + "T12:00:00Z").getUTCDay();
    if (!availableDays.includes(dayOfWeek)) {
      res.json({ date, slots: [], unavailable: true });
      return;
    }

    const allSlots = generateSlots(startHour, endHour, durationMin);

    const booked = await db
      .select({ timeSlot: appointmentsTable.timeSlot })
      .from(appointmentsTable)
      .where(
        and(
          eq(appointmentsTable.preferredDate, date),
          eq(appointmentsTable.status, "confirmed"),
        ),
      );
    const bookedSet = new Set(booked.map((b) => b.timeSlot));
    const available = allSlots.filter((s) => !bookedSet.has(s));

    res.json({ date, slots: available });
  } catch (err) {
    logger.error({ err }, "GET /appointments/slots failed");
    res.status(500).json({ error: "Failed to fetch slots" });
  }
});

router.get("/appointments", requireAuth, async (_req, res) => {
  try {
    const appointments = await db
      .select()
      .from(appointmentsTable)
      .orderBy(desc(appointmentsTable.preferredDate), desc(appointmentsTable.timeSlot));
    res.json(appointments);
  } catch (err) {
    logger.error({ err }, "GET /appointments failed");
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

router.post("/appointments", async (req, res) => {
  try {
    const parsed = insertAppointmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
      return;
    }
    const [appt] = await db.insert(appointmentsTable).values({
      ...parsed.data,
      status: "confirmed",
    }).returning();
    res.status(201).json(appt);
    void sendAppointmentConfirmation(appt);
    void sendAppointmentOwnerNotification(appt);
    void addAppointmentToCalendar(appt);
    void sendAppointmentSmsToCustomer(appt);
    void sendAppointmentSmsToOwner(appt);
  } catch (err) {
    logger.error({ err }, "POST /appointments failed");
    res.status(500).json({ error: "Failed to create appointment" });
  }
});

router.patch("/appointments/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, notes } = req.body as { status?: string; notes?: string };
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (status) updates["status"] = status;
    if (notes !== undefined) updates["notes"] = notes;

    const [updated] = await db
      .update(appointmentsTable)
      .set(updates)
      .where(eq(appointmentsTable.id, id))
      .returning();

    if (!updated) { res.status(404).json({ error: "Appointment not found" }); return; }
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "PATCH /appointments/:id failed");
    res.status(500).json({ error: "Failed to update appointment" });
  }
});

router.delete("/appointments/:id", requireAuth, async (req, res) => {
  try {
    const [deleted] = await db
      .update(appointmentsTable)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(appointmentsTable.id, Number(req.params.id)))
      .returning();
    if (!deleted) { res.status(404).json({ error: "Appointment not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "DELETE /appointments/:id failed");
    res.status(500).json({ error: "Failed to cancel appointment" });
  }
});

export default router;
