// SMS notifications via Twilio
// Sends confirmation to the customer and a notification to the owner when an appointment is booked.
import twilio from "twilio";
import { db } from "@workspace/db";
import { siteConfigTable } from "@workspace/db/schema";
import { logger } from "./logger";

const FALLBACK_OWNER_PHONE = process.env["TWILIO_PHONE_NUMBER"] ?? "";

function getClient() {
  const sid = process.env["TWILIO_ACCOUNT_SID"];
  const token = process.env["TWILIO_AUTH_TOKEN"];
  const from = process.env["TWILIO_PHONE_NUMBER"];
  if (!sid || !token || !from) return null;
  return { client: twilio(sid, token), from };
}

async function getOwnerPhone(): Promise<string> {
  try {
    const rows = await db.select().from(siteConfigTable);
    const map = new Map(rows.map((r) => [r.key, r.value ?? ""]));
    return map.get("notify_phone") || map.get("owner_phone") || FALLBACK_OWNER_PHONE;
  } catch {
    return FALLBACK_OWNER_PHONE;
  }
}

function normalizeToE164(phone: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (phone.startsWith("+") && digits.length >= 11) return `+${digits}`;
  return null;
}

async function sendSms(to: string, body: string): Promise<void> {
  const twilio = getClient();
  if (!twilio) {
    logger.warn("Twilio not configured — skipping SMS");
    return;
  }
  const normalized = normalizeToE164(to);
  if (!normalized) {
    logger.warn({ to }, "Invalid phone number for SMS — skipping");
    return;
  }
  to = normalized;
  try {
    const msg = await twilio.client.messages.create({ from: twilio.from, to, body });
    logger.info({ sid: msg.sid, to }, "SMS sent");
  } catch (err) {
    logger.error({ err, to }, "SMS send failed");
  }
}

type Appointment = {
  id: number;
  name: string;
  phone: string | null;
  service: string;
  preferredDate: string;
  timeSlot: string;
};

export async function sendAppointmentSmsToCustomer(appt: Appointment): Promise<void> {
  if (!appt.phone) return;
  const body =
    `Kimdasa Construction: Tu cita está confirmada.\n` +
    `Servicio: ${appt.service}\n` +
    `Fecha: ${appt.preferredDate} a las ${appt.timeSlot}\n` +
    `¿Preguntas? Llámanos al (201) 555-0100`;
  await sendSms(appt.phone, body);
}

export async function sendAppointmentSmsToOwner(appt: Appointment): Promise<void> {
  const ownerPhone = await getOwnerPhone();
  if (!ownerPhone || !ownerPhone.startsWith("+")) return;
  const body =
    `Nueva cita — Kimdasa\n` +
    `Cliente: ${appt.name}\n` +
    `Servicio: ${appt.service}\n` +
    `Fecha: ${appt.preferredDate} a las ${appt.timeSlot}\n` +
    `Tel: ${appt.phone || "no indicado"}`;
  await sendSms(ownerPhone, body);
}
