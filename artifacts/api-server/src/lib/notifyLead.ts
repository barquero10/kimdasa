// Sends a "new lead arrived" email via the Replit-managed Gmail connector
// to the company inbox so they can react instantly.
import { ReplitConnectors } from "@replit/connectors-sdk";
import { db } from "@workspace/db";
import { siteConfigTable } from "@workspace/db/schema";
import { logger } from "./logger";
import type { Lead } from "@workspace/db/schema";

const FALLBACK_TO = "constructionkimdasa@gmail.com";

const connectors = new ReplitConnectors();

function escapeHtml(s: string | null | undefined): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function urgencyBadge(urgency: string | null | undefined): string {
  const u = (urgency || "").toLowerCase();
  if (u.includes("emerg") || u.includes("urgen") || u.includes("asap"))
    return "🔴 URGENT";
  if (u.includes("week") || u.includes("month")) return "🟡 SOON";
  return "🟢 PLANNING";
}

async function getNotifyEmail(): Promise<string> {
  try {
    const rows = await db.select().from(siteConfigTable);
    const map = new Map(rows.map((r) => [r.key, r.value]));
    return map.get("notify_email") || map.get("company_email") || FALLBACK_TO;
  } catch {
    return FALLBACK_TO;
  }
}

function buildRawEmail(opts: {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
}): string {
  const boundary = "----=_NextLeadBoundary_" + Date.now().toString(36);
  const headers = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: =?UTF-8?B?${Buffer.from(opts.subject, "utf-8").toString("base64")}?=`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].join("\r\n");

  const body = [
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    opts.text,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    opts.html,
    "",
    `--${boundary}--`,
  ].join("\r\n");

  const raw = `${headers}\r\n\r\n${body}`;
  return Buffer.from(raw, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getSiteConfigMap(): Promise<Map<string, string>> {
  try {
    const rows = await db.select().from(siteConfigTable);
    return new Map(rows.map((r) => [r.key, r.value ?? ""]));
  } catch {
    return new Map();
  }
}

export async function sendReviewRequest(opts: {
  customerName: string;
  customerEmail: string;
  jobTitle: string;
}): Promise<void> {
  try {
    const config = await getSiteConfigMap();

    const reviewEnabled = config.get("googleReviewEmailEnabled");
    if (reviewEnabled === "false") {
      logger.info({ customerEmail: opts.customerEmail }, "sendReviewRequest: disabled by config, skipping");
      return;
    }

    const reviewUrl = config.get("googleReviewUrl");
    if (!reviewUrl) {
      logger.warn({ customerEmail: opts.customerEmail }, "sendReviewRequest: no googleReviewUrl configured, skipping");
      return;
    }

    if (!opts.customerEmail) {
      logger.warn({ jobTitle: opts.jobTitle }, "sendReviewRequest: customer has no email, skipping");
      return;
    }

    const businessName = config.get("businessName") || "Kimdasa Construction";
    const from = "me";
    const to = opts.customerEmail;
    const subject = `Thank you for choosing ${businessName}!`;

    const text = [
      `Hi ${opts.customerName},`,
      ``,
      `Thank you for trusting ${businessName} with your project: ${opts.jobTitle}.`,
      ``,
      `We hope you're happy with the results! If you have a moment, we'd really appreciate it if you could leave us a Google review — it takes less than a minute and helps us a lot.`,
      ``,
      `Leave a review here: ${reviewUrl}`,
      ``,
      `Thank you so much for your support!`,
      ``,
      `– The ${businessName} Team`,
    ].join("\n");

    const html = `<!doctype html><html><body style="margin:0;background:#f9fafb;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#15803d,#22c55e);color:#fff;padding:28px 24px;">
        <div style="font-size:28px;margin-bottom:6px;">✅</div>
        <div style="font-size:22px;font-weight:700;">Job Complete — Thank You!</div>
        <div style="font-size:15px;opacity:.9;margin-top:4px;">${escapeHtml(opts.jobTitle)}</div>
      </div>
      <div style="padding:28px 24px;">
        <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi <strong>${escapeHtml(opts.customerName)}</strong>,</p>
        <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
          Thank you for trusting <strong>${escapeHtml(businessName)}</strong> with your project. We hope you're thrilled with the results!
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
          If you have a moment, we'd love to hear your feedback. A quick Google review makes a huge difference for our small business — it takes less than a minute.
        </p>
        <div style="text-align:center;margin:0 0 28px;">
          <a href="${reviewUrl}" style="display:inline-block;background:#4285F4;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">
            ⭐ Leave a Google Review
          </a>
        </div>
        <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">
          Thank you so much for your support — it means everything to us!
        </p>
        <p style="margin:16px 0 0;font-size:14px;color:#374151;font-weight:600;">– The ${escapeHtml(businessName)} Team</p>
      </div>
      <div style="padding:14px 20px;background:#f9fafb;color:#9ca3af;font-size:12px;text-align:center;border-top:1px solid #f3f4f6;">
        ${escapeHtml(businessName)} · Licensed &amp; Insured · Serving NJ &amp; PA
      </div>
    </div>
  </div>
</body></html>`;

    const raw = buildRawEmail({ to, from, subject, html, text });

    const response = await connectors.proxy(
      "google-mail",
      "/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      },
    );

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      logger.error(
        { customerEmail: opts.customerEmail, status: response.status, body: errBody.slice(0, 500) },
        "sendReviewRequest: Gmail send failed",
      );
      return;
    }
    logger.info({ customerEmail: opts.customerEmail, jobTitle: opts.jobTitle }, "sendReviewRequest: email sent");
  } catch (err) {
    logger.error({ err, customerEmail: opts.customerEmail }, "sendReviewRequest: unexpected error");
  }
}

export async function sendLeadConfirmation(lead: Lead): Promise<void> {
  if (!lead.email) return;
  try {
    const config = await getSiteConfigMap();
    const businessName = config.get("businessName") || "Kimdasa Construction";
    const phone = config.get("phone") || "";
    const subject = `We received your request — ${businessName}`;
    const bookingUrl = config.get("siteUrl") || "https://kimdasa.com";

    const text = [
      `Hi ${lead.name},`,
      ``,
      `Thank you for contacting ${businessName}! We've received your request${lead.serviceType ? ` for ${lead.serviceType}` : ""} and a specialist will be in touch with you shortly.`,
      ``,
      `Want to book your FREE estimate right now? Visit: ${bookingUrl}#booking`,
      ``,
      `Questions? Call or text us: ${phone}`,
      ``,
      `– The ${businessName} Team`,
    ].join("\n");

    const html = `<!doctype html><html><body style="margin:0;background:#f9fafb;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#92400e,#d97706);color:#fff;padding:28px 24px;">
        <div style="font-size:28px;margin-bottom:6px;">📋</div>
        <div style="font-size:22px;font-weight:700;">We got your request!</div>
        <div style="font-size:15px;opacity:.9;margin-top:4px;">${escapeHtml(businessName)}</div>
      </div>
      <div style="padding:28px 24px;">
        <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi <strong>${escapeHtml(lead.name)}</strong>,</p>
        <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
          Thank you for reaching out to <strong>${escapeHtml(businessName)}</strong>! We've received your request${lead.serviceType ? ` for <strong>${escapeHtml(lead.serviceType)}</strong>` : ""} and one of our specialists will contact you soon.
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
          In the meantime, you can lock in your <strong>FREE in-home estimate</strong> by booking a time that works for you:
        </p>
        <div style="text-align:center;margin:0 0 28px;">
          <a href="${escapeHtml(bookingUrl)}#booking" style="display:inline-block;background:#d97706;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">
            📅 Book My Free Estimate
          </a>
        </div>
        ${phone ? `<p style="margin:0;font-size:14px;color:#6b7280;">Or call/text us directly: <a href="tel:${escapeHtml(phone)}" style="color:#d97706;font-weight:600;">${escapeHtml(phone)}</a></p>` : ""}
        <p style="margin:16px 0 0;font-size:14px;color:#374151;font-weight:600;">– The ${escapeHtml(businessName)} Team</p>
      </div>
      <div style="padding:14px 20px;background:#f9fafb;color:#9ca3af;font-size:12px;text-align:center;border-top:1px solid #f3f4f6;">
        ${escapeHtml(businessName)} · Licensed &amp; Insured · Serving NJ &amp; PA
      </div>
    </div>
  </div>
</body></html>`;

    const raw = buildRawEmail({ to: lead.email, from: "me", subject, html, text });
    const response = await connectors.proxy("google-mail", "/gmail/v1/users/me/messages/send", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ raw }),
    });
    if (!response.ok) logger.warn({ leadId: lead.id, status: response.status }, "sendLeadConfirmation: Gmail failed");
    else logger.info({ leadId: lead.id }, "sendLeadConfirmation: sent");
  } catch (err) {
    logger.error({ err, leadId: lead.id }, "sendLeadConfirmation: error");
  }
}

export async function sendLeadFollowUp(lead: Lead): Promise<void> {
  if (!lead.email) return;
  try {
    const config = await getSiteConfigMap();
    const businessName = config.get("businessName") || "Kimdasa Construction";
    const phone = config.get("phone") || "";
    const bookingUrl = config.get("siteUrl") || "https://kimdasa.com";
    const subject = `Still interested in a free estimate? — ${businessName}`;

    const text = [
      `Hi ${lead.name},`,
      ``,
      `We wanted to follow up on your request for a free estimate${lead.serviceType ? ` for ${lead.serviceType}` : ""}. Our calendar is filling up fast — we'd love to lock in a time for you.`,
      ``,
      `Book your free estimate here: ${bookingUrl}#booking`,
      ``,
      `Or call/text us: ${phone}`,
      ``,
      `– The ${businessName} Team`,
    ].join("\n");

    const html = `<!doctype html><html><body style="margin:0;background:#f9fafb;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;padding:28px 24px;">
        <div style="font-size:28px;margin-bottom:6px;">👋</div>
        <div style="font-size:22px;font-weight:700;">Still thinking about it?</div>
        <div style="font-size:15px;opacity:.9;margin-top:4px;">${escapeHtml(businessName)}</div>
      </div>
      <div style="padding:28px 24px;">
        <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi <strong>${escapeHtml(lead.name)}</strong>,</p>
        <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
          We noticed you reached out about${lead.serviceType ? ` <strong>${escapeHtml(lead.serviceType)}</strong>` : " a project"} and wanted to check in. Our schedule fills up quickly this season — we'd love to get you a free, no-obligation estimate.
        </p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${escapeHtml(bookingUrl)}#booking" style="display:inline-block;background:#2563eb;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">
            📅 Book My Free Estimate
          </a>
        </div>
        ${phone ? `<p style="margin:0;font-size:14px;color:#6b7280;text-align:center;">Or call/text us: <a href="tel:${escapeHtml(phone)}" style="color:#2563eb;font-weight:600;">${escapeHtml(phone)}</a></p>` : ""}
        <p style="margin:24px 0 0;font-size:14px;color:#374151;font-weight:600;">– The ${escapeHtml(businessName)} Team</p>
      </div>
      <div style="padding:14px 20px;background:#f9fafb;color:#9ca3af;font-size:12px;text-align:center;border-top:1px solid #f3f4f6;">
        ${escapeHtml(businessName)} · Licensed &amp; Insured · Serving NJ &amp; PA
      </div>
    </div>
  </div>
</body></html>`;

    const raw = buildRawEmail({ to: lead.email, from: "me", subject, html, text });
    const response = await connectors.proxy("google-mail", "/gmail/v1/users/me/messages/send", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ raw }),
    });
    if (!response.ok) logger.warn({ leadId: lead.id }, "sendLeadFollowUp: Gmail failed");
    else logger.info({ leadId: lead.id }, "sendLeadFollowUp: sent");
  } catch (err) {
    logger.error({ err, leadId: lead.id }, "sendLeadFollowUp: error");
  }
}

type AppointmentLike = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  service: string;
  preferredDate: string;
  timeSlot: string;
  address?: string | null;
  estimateLow?: string | null;
  estimateHigh?: string | null;
};

export async function sendAppointmentConfirmation(appt: AppointmentLike): Promise<void> {
  if (!appt.email) return;
  try {
    const config = await getSiteConfigMap();
    const businessName = config.get("businessName") || "Kimdasa Construction";
    const phone = config.get("phone") || "";
    const subject = `Your free estimate is confirmed — ${businessName}`;

    const estimateText = appt.estimateLow && appt.estimateHigh
      ? `<p style="margin:12px 0;padding:12px 16px;background:#fffbeb;border-radius:8px;font-size:14px;color:#78350f;border:1px solid #fde68a;">
          💰 Preliminary estimate range: <strong>$${Number(appt.estimateLow).toLocaleString()} – $${Number(appt.estimateHigh).toLocaleString()}</strong><br>
          <span style="font-size:12px;opacity:.8;">Final price confirmed after our specialist visits.</span>
        </p>`
      : "";

    const html = `<!doctype html><html><body style="margin:0;background:#f9fafb;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#15803d,#22c55e);color:#fff;padding:28px 24px;">
        <div style="font-size:32px;margin-bottom:8px;">✅</div>
        <div style="font-size:22px;font-weight:700;">Estimate appointment confirmed!</div>
        <div style="font-size:15px;opacity:.9;margin-top:4px;">${escapeHtml(businessName)}</div>
      </div>
      <div style="padding:28px 24px;">
        <p style="margin:0 0 20px;font-size:16px;color:#111827;">Hi <strong>${escapeHtml(appt.name)}</strong>, your appointment is confirmed!</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr><td style="padding:10px 14px;background:#f9fafb;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;width:120px;">Service</td>
            <td style="padding:10px 14px;font-size:14px;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;">${escapeHtml(appt.service)}</td></tr>
          <tr><td style="padding:10px 14px;background:#f9fafb;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Date</td>
            <td style="padding:10px 14px;font-size:14px;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;">${escapeHtml(appt.preferredDate)}</td></tr>
          <tr><td style="padding:10px 14px;background:#f9fafb;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Time</td>
            <td style="padding:10px 14px;font-size:14px;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;">${escapeHtml(appt.timeSlot)}</td></tr>
          ${appt.address ? `<tr><td style="padding:10px 14px;background:#f9fafb;color:#6b7280;font-size:13px;">Address</td>
            <td style="padding:10px 14px;font-size:14px;font-weight:600;color:#111827;">${escapeHtml(appt.address)}</td></tr>` : ""}
        </table>
        ${estimateText}
        <p style="margin:20px 0 8px;font-size:14px;color:#374151;line-height:1.6;">Our specialist will arrive during your scheduled window. If you need to reschedule, please call or text us:</p>
        ${phone ? `<p style="margin:0 0 20px;"><a href="tel:${escapeHtml(phone)}" style="color:#16a34a;font-weight:700;font-size:15px;">${escapeHtml(phone)}</a></p>` : ""}
        <p style="margin:0;font-size:14px;color:#374151;font-weight:600;">– The ${escapeHtml(businessName)} Team</p>
      </div>
      <div style="padding:14px 20px;background:#f9fafb;color:#9ca3af;font-size:12px;text-align:center;border-top:1px solid #f3f4f6;">
        ${escapeHtml(businessName)} · Licensed &amp; Insured · Serving NJ &amp; PA
      </div>
    </div>
  </div>
</body></html>`;

    const text = `Hi ${appt.name}, your appointment is confirmed!\n\nService: ${appt.service}\nDate: ${appt.preferredDate}\nTime: ${appt.timeSlot}${appt.address ? `\nAddress: ${appt.address}` : ""}\n\nQuestions? Call/text: ${phone}\n\n– The ${businessName} Team`;
    const raw = buildRawEmail({ to: appt.email!, from: "me", subject, html, text });
    const response = await connectors.proxy("google-mail", "/gmail/v1/users/me/messages/send", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ raw }),
    });
    if (!response.ok) logger.warn({ apptId: appt.id }, "sendAppointmentConfirmation: Gmail failed");
    else logger.info({ apptId: appt.id }, "sendAppointmentConfirmation: sent");
  } catch (err) {
    logger.error({ err, apptId: appt.id }, "sendAppointmentConfirmation: error");
  }
}

export async function sendAppointmentOwnerNotification(appt: AppointmentLike): Promise<void> {
  try {
    const config = await getSiteConfigMap();
    const businessName = config.get("businessName") || "Kimdasa Construction";
    const to = config.get("notify_email") || config.get("company_email") || FALLBACK_TO;
    const subject = `📅 New appointment: ${appt.name} — ${appt.preferredDate} ${appt.timeSlot}`;

    const html = `<!doctype html><html><body style="margin:0;background:#f9fafb;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;padding:24px;">
        <div style="font-size:13px;opacity:.85;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">New Appointment</div>
        <div style="font-size:22px;font-weight:700;">${escapeHtml(appt.name)}</div>
        <div style="font-size:15px;opacity:.9;margin-top:4px;">${escapeHtml(appt.preferredDate)} · ${escapeHtml(appt.timeSlot)}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:10px 14px;color:#6b7280;font-size:13px;border-bottom:1px solid #f3f4f6;width:130px;">Service</td><td style="padding:10px 14px;font-size:14px;font-weight:500;border-bottom:1px solid #f3f4f6;">${escapeHtml(appt.service)}</td></tr>
        ${appt.phone ? `<tr><td style="padding:10px 14px;color:#6b7280;font-size:13px;border-bottom:1px solid #f3f4f6;">Phone</td><td style="padding:10px 14px;font-size:14px;font-weight:500;border-bottom:1px solid #f3f4f6;"><a href="tel:${escapeHtml(appt.phone)}">${escapeHtml(appt.phone)}</a></td></tr>` : ""}
        ${appt.email ? `<tr><td style="padding:10px 14px;color:#6b7280;font-size:13px;border-bottom:1px solid #f3f4f6;">Email</td><td style="padding:10px 14px;font-size:14px;font-weight:500;border-bottom:1px solid #f3f4f6;"><a href="mailto:${escapeHtml(appt.email)}">${escapeHtml(appt.email)}</a></td></tr>` : ""}
        ${appt.address ? `<tr><td style="padding:10px 14px;color:#6b7280;font-size:13px;border-bottom:1px solid #f3f4f6;">Address</td><td style="padding:10px 14px;font-size:14px;font-weight:500;border-bottom:1px solid #f3f4f6;">${escapeHtml(appt.address)}</td></tr>` : ""}
        ${appt.estimateLow ? `<tr><td style="padding:10px 14px;color:#6b7280;font-size:13px;">Est. Range</td><td style="padding:10px 14px;font-size:14px;font-weight:600;color:#d97706;">$${Number(appt.estimateLow).toLocaleString()} – $${Number(appt.estimateHigh).toLocaleString()}</td></tr>` : ""}
      </table>
      <div style="padding:14px 20px;background:#f9fafb;color:#9ca3af;font-size:12px;text-align:center;border-top:1px solid #f3f4f6;">
        Appointment #${appt.id} · ${escapeHtml(businessName)}
      </div>
    </div>
  </div>
</body></html>`;
    const text = `New appointment: ${appt.name} on ${appt.preferredDate} at ${appt.timeSlot}\nService: ${appt.service}\nPhone: ${appt.phone || "—"}\nEmail: ${appt.email || "—"}`;
    const raw = buildRawEmail({ to, from: "me", subject, html, text });
    await connectors.proxy("google-mail", "/gmail/v1/users/me/messages/send", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ raw }),
    });
    logger.info({ apptId: appt.id }, "sendAppointmentOwnerNotification: sent");
  } catch (err) {
    logger.error({ err }, "sendAppointmentOwnerNotification: error");
  }
}

export async function sendAppointmentReminder(appt: AppointmentLike): Promise<void> {
  if (!appt.email) return;
  try {
    const config = await getSiteConfigMap();
    const businessName = config.get("businessName") || "Kimdasa Construction";
    const phone = config.get("phone") || "";
    const subject = `Reminder: Your free estimate is tomorrow — ${businessName}`;

    const html = `<!doctype html><html><body style="margin:0;background:#f9fafb;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#0369a1,#0ea5e9);color:#fff;padding:28px 24px;">
        <div style="font-size:32px;margin-bottom:8px;">⏰</div>
        <div style="font-size:22px;font-weight:700;">Your appointment is tomorrow!</div>
        <div style="font-size:15px;opacity:.9;margin-top:4px;">${escapeHtml(appt.preferredDate)} · ${escapeHtml(appt.timeSlot)}</div>
      </div>
      <div style="padding:28px 24px;">
        <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi <strong>${escapeHtml(appt.name)}</strong>,</p>
        <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
          This is a friendly reminder that your <strong>free estimate appointment</strong> with ${escapeHtml(businessName)} is scheduled for <strong>tomorrow, ${escapeHtml(appt.preferredDate)}</strong> between <strong>${escapeHtml(appt.timeSlot)}</strong>.
        </p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr><td style="padding:10px 14px;background:#f0f9ff;color:#0369a1;font-size:13px;border-bottom:1px solid #e0f2fe;width:100px;">Service</td><td style="padding:10px 14px;font-size:14px;font-weight:600;border-bottom:1px solid #e0f2fe;">${escapeHtml(appt.service)}</td></tr>
          <tr><td style="padding:10px 14px;background:#f0f9ff;color:#0369a1;font-size:13px;">Time</td><td style="padding:10px 14px;font-size:14px;font-weight:600;">${escapeHtml(appt.timeSlot)}</td></tr>
        </table>
        <p style="margin:0 0 8px;font-size:14px;color:#374151;">Need to reschedule? Contact us as soon as possible:</p>
        ${phone ? `<p style="margin:0 0 20px;"><a href="tel:${escapeHtml(phone)}" style="color:#0369a1;font-weight:700;font-size:15px;">${escapeHtml(phone)}</a></p>` : ""}
        <p style="margin:0;font-size:14px;color:#374151;font-weight:600;">See you tomorrow! — The ${escapeHtml(businessName)} Team</p>
      </div>
      <div style="padding:14px 20px;background:#f9fafb;color:#9ca3af;font-size:12px;text-align:center;border-top:1px solid #f3f4f6;">
        ${escapeHtml(businessName)} · Licensed &amp; Insured · Serving NJ &amp; PA
      </div>
    </div>
  </div>
</body></html>`;

    const text = `Hi ${appt.name}, reminder: your free estimate appointment is tomorrow (${appt.preferredDate}) at ${appt.timeSlot}.\n\nService: ${appt.service}\nQuestions? Call/text: ${phone}\n\n– The ${businessName} Team`;
    const raw = buildRawEmail({ to: appt.email!, from: "me", subject, html, text });
    const response = await connectors.proxy("google-mail", "/gmail/v1/users/me/messages/send", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ raw }),
    });
    if (!response.ok) logger.warn({ apptId: appt.id }, "sendAppointmentReminder: Gmail failed");
    else logger.info({ apptId: appt.id }, "sendAppointmentReminder: sent");
  } catch (err) {
    logger.error({ err, apptId: appt.id }, "sendAppointmentReminder: error");
  }
}

export async function notifyNewLead(lead: Lead): Promise<void> {
  try {
    const to = await getNotifyEmail();
    const phoneDigits = (lead.phone || "").replace(/\D/g, "");
    const telLink = phoneDigits ? `tel:+${phoneDigits.length === 10 ? "1" + phoneDigits : phoneDigits}` : null;
    const waLink = phoneDigits
      ? `https://wa.me/${phoneDigits.length === 10 ? "1" + phoneDigits : phoneDigits}`
      : null;
    const mailtoLink = lead.email ? `mailto:${lead.email}` : null;
    const badge = urgencyBadge(lead.urgency);
    const subject = `${badge} New Lead: ${lead.name}${lead.serviceType ? " — " + lead.serviceType : ""}`;

    const text = [
      `New lead from kimdasa.com`,
      ``,
      `Name: ${lead.name}`,
      `Phone: ${lead.phone || "—"}`,
      `Email: ${lead.email || "—"}`,
      `Address: ${lead.address || "—"}`,
      `Service: ${lead.serviceType || "—"}`,
      `Urgency: ${lead.urgency || "—"}`,
      `Budget: ${lead.budgetApprox || "—"}`,
      `Best time: ${lead.bestContactTime || "—"}`,
      `Language: ${lead.language}`,
      `Source: ${lead.source || "website"}`,
      ``,
      `Comments:`,
      `${lead.comments || "—"}`,
      ``,
      `Lead ID: #${lead.id}`,
    ].join("\n");

    const row = (label: string, value: string | null | undefined) =>
      value
        ? `<tr><td style="padding:8px 14px;color:#6b7280;font-size:13px;border-bottom:1px solid #f3f4f6;width:130px;">${label}</td><td style="padding:8px 14px;color:#111827;font-size:14px;border-bottom:1px solid #f3f4f6;font-weight:500;">${escapeHtml(value)}</td></tr>`
        : "";

    const buttons: string[] = [];
    if (telLink)
      buttons.push(
        `<a href="${telLink}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin:4px;">📞 Call Now</a>`,
      );
    if (waLink)
      buttons.push(
        `<a href="${waLink}" style="display:inline-block;background:#25D366;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin:4px;">💬 WhatsApp</a>`,
      );
    if (mailtoLink)
      buttons.push(
        `<a href="${mailtoLink}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin:4px;">✉️ Reply Email</a>`,
      );

    const html = `<!doctype html><html><body style="margin:0;background:#f9fafb;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);color:#fff;padding:24px;">
        <div style="font-size:13px;opacity:.85;letter-spacing:.5px;text-transform:uppercase;margin-bottom:6px;">${badge}</div>
        <div style="font-size:22px;font-weight:700;">New lead — ${escapeHtml(lead.name)}</div>
        ${lead.serviceType ? `<div style="font-size:15px;opacity:.9;margin-top:4px;">${escapeHtml(lead.serviceType)}</div>` : ""}
      </div>
      <div style="padding:20px 6px;text-align:center;">${buttons.join("")}</div>
      <table style="width:100%;border-collapse:collapse;">
        ${row("Phone", lead.phone)}
        ${row("Email", lead.email)}
        ${row("Address", lead.address)}
        ${row("Service", lead.serviceType)}
        ${row("Urgency", lead.urgency)}
        ${row("Budget", lead.budgetApprox)}
        ${row("Best time", lead.bestContactTime)}
        ${row("Language", lead.language === "es" ? "Spanish" : "English")}
        ${row("Source", lead.source)}
        ${lead.comments ? `<tr><td colspan="2" style="padding:14px;background:#fffbeb;border-top:1px solid #fde68a;color:#78350f;font-size:14px;line-height:1.5;"><div style="font-weight:600;margin-bottom:6px;">Customer comments</div>${escapeHtml(lead.comments).replace(/\n/g, "<br>")}</td></tr>` : ""}
      </table>
      <div style="padding:14px 20px;background:#f9fafb;color:#9ca3af;font-size:12px;text-align:center;border-top:1px solid #f3f4f6;">
        Lead #${lead.id} · ${new Date(lead.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })} · kimdasa.com
      </div>
    </div>
  </div>
</body></html>`;

    const raw = buildRawEmail({ to, from: "me", subject, html, text });

    const response = await connectors.proxy(
      "google-mail",
      "/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      },
    );

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      logger.error(
        { leadId: lead.id, status: response.status, body: errBody.slice(0, 500) },
        "notifyNewLead: Gmail send failed",
      );
      return;
    }
    logger.info({ leadId: lead.id, to }, "notifyNewLead: email sent");
  } catch (err) {
    logger.error({ err, leadId: lead.id }, "notifyNewLead: unexpected error");
  }
}
