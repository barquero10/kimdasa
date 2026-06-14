import { db } from "@workspace/db";
import { leadsTable, appointmentsTable } from "@workspace/db/schema";
import { eq, and, gte, lte, isNull, sql } from "drizzle-orm";
import { sendLeadFollowUp, sendAppointmentReminder } from "./notifyLead";
import { logger } from "./logger";

const INTERVAL_MS = 15 * 60 * 1000;

async function runScheduledTasks() {
  try {
    await sendPendingFollowUps();
    await sendPendingAppointmentReminders();
  } catch (err) {
    logger.error({ err }, "scheduler: unexpected error");
  }
}

async function sendPendingFollowUps() {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 25 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() - 22 * 60 * 60 * 1000);

    const leads = await db
      .select()
      .from(leadsTable)
      .where(
        and(
          eq(leadsTable.status, "new_lead"),
          gte(leadsTable.createdAt, windowStart),
          lte(leadsTable.createdAt, windowEnd),
          sql`${leadsTable.email} IS NOT NULL AND ${leadsTable.email} != ''`,
        ),
      );

    for (const lead of leads) {
      if (!lead.email) continue;
      logger.info({ leadId: lead.id }, "scheduler: sending 24h follow-up");
      await sendLeadFollowUp(lead);
      await db
        .update(leadsTable)
        .set({ status: "contacted", updatedAt: new Date() })
        .where(eq(leadsTable.id, lead.id));
    }
  } catch (err) {
    logger.error({ err }, "scheduler: sendPendingFollowUps failed");
  }
}

async function sendPendingAppointmentReminders() {
  try {
    const nowNY = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
    const tomorrowNY = new Date(nowNY);
    tomorrowNY.setDate(tomorrowNY.getDate() + 1);
    const tomorrowStr = `${tomorrowNY.getFullYear()}-${String(tomorrowNY.getMonth() + 1).padStart(2, "0")}-${String(tomorrowNY.getDate()).padStart(2, "0")}`;

    const appts = await db
      .select()
      .from(appointmentsTable)
      .where(
        and(
          eq(appointmentsTable.preferredDate, tomorrowStr),
          eq(appointmentsTable.status, "confirmed"),
          isNull(appointmentsTable.reminderSent),
          sql`${appointmentsTable.email} IS NOT NULL AND ${appointmentsTable.email} != ''`,
        ),
      );

    for (const appt of appts) {
      if (!appt.email) continue;
      logger.info({ apptId: appt.id }, "scheduler: sending appointment reminder");
      await sendAppointmentReminder(appt);
      await db
        .update(appointmentsTable)
        .set({ reminderSent: new Date().toISOString(), updatedAt: new Date() })
        .where(eq(appointmentsTable.id, appt.id));
    }
  } catch (err) {
    logger.error({ err }, "scheduler: sendPendingAppointmentReminders failed");
  }
}

export function startScheduler() {
  logger.info("scheduler: started");
  void runScheduledTasks();
  setInterval(() => void runScheduledTasks(), INTERVAL_MS);
}
