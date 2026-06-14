declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

const ADS_ID = import.meta.env.VITE_GOOGLE_ADS_ID as string | undefined;
const LEAD_LABEL = import.meta.env.VITE_GOOGLE_ADS_LEAD_LABEL as string | undefined;
const BOOKING_LABEL = import.meta.env.VITE_GOOGLE_ADS_BOOKING_LABEL as string | undefined;
const CALL_LABEL = import.meta.env.VITE_GOOGLE_ADS_CALL_LABEL as string | undefined;
const GA4_ID = import.meta.env.VITE_GA4_ID as string | undefined;

function gtag(...args: unknown[]) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag === "function") {
    window.gtag(...args);
  } else {
    window.dataLayer.push(args);
  }
}

export function trackLeadConversion() {
  if (ADS_ID) {
    const sendTo = LEAD_LABEL ? `${ADS_ID}/${LEAD_LABEL}` : ADS_ID;
    gtag("event", "conversion", { send_to: sendTo });
  }
  if (GA4_ID) {
    gtag("event", "generate_lead", { currency: "USD" });
  }
}

export function trackBookingConversion() {
  if (ADS_ID) {
    const sendTo = BOOKING_LABEL ? `${ADS_ID}/${BOOKING_LABEL}` : ADS_ID;
    gtag("event", "conversion", { send_to: sendTo });
  }
  if (GA4_ID) {
    gtag("event", "book_appointment", { currency: "USD" });
  }
}

export function trackPhoneCall() {
  if (ADS_ID) {
    const sendTo = CALL_LABEL ? `${ADS_ID}/${CALL_LABEL}` : ADS_ID;
    gtag("event", "conversion", { send_to: sendTo });
  }
  if (GA4_ID) {
    gtag("event", "contact", { method: "phone" });
  }
}
