// Google Calendar integration via Replit connectors proxy
// Adds a calendar event automatically when a new appointment is booked.
import { ReplitConnectors } from "@replit/connectors-sdk";
import { logger } from "./logger";

const connectors = new ReplitConnectors();

type Appointment = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  service: string;
  preferredDate: string;
  timeSlot: string;
  notes: string | null;
};

function parseTimeSlot(date: string, slot: string): { start: string; end: string } {
  const [startPart, endPart] = slot.split("–");
  const toISO = (d: string, t: string) => {
    const [h, m] = t.trim().split(":").map(Number);
    const dt = new Date(`${d}T00:00:00`);
    dt.setHours(h, m, 0, 0);
    return dt.toISOString();
  };
  return {
    start: toISO(date, startPart ?? "09:00"),
    end: toISO(date, endPart ?? "10:00"),
  };
}

export async function addAppointmentToCalendar(appt: Appointment): Promise<void> {
  try {
    const { start, end } = parseTimeSlot(appt.preferredDate, appt.timeSlot);

    const event = {
      summary: `Kimdasa — ${appt.service} | ${appt.name}`,
      description: [
        `Cliente: ${appt.name}`,
        `Email: ${appt.email}`,
        appt.phone ? `Teléfono: ${appt.phone}` : null,
        `Servicio: ${appt.service}`,
        appt.notes ? `Notas: ${appt.notes}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      start: { dateTime: start, timeZone: "America/New_York" },
      end: { dateTime: end, timeZone: "America/New_York" },
      attendees: appt.email ? [{ email: appt.email, displayName: appt.name }] : [],
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 60 },
        ],
      },
    };

    const response = await connectors.proxy(
      "google-calendar",
      "/calendars/primary/events",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      logger.error({ status: response.status, body: text }, "Google Calendar event creation failed");
      return;
    }

    const data = await response.json() as { id?: string; htmlLink?: string };
    logger.info({ eventId: data.id, apptId: appt.id }, "Google Calendar event created");
  } catch (err) {
    logger.error({ err }, "addAppointmentToCalendar threw");
  }
}
