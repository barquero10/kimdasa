import { useState, useEffect } from "react";
import { useGetSiteConfig, getGetSiteConfigQueryKey } from "@workspace/api-client-react";
import { useLanguage } from "@/lib/i18n";

function normalizePhone(raw: string | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return digits;
  return digits.length >= 10 ? digits : null;
}

export function WhatsAppButton() {
  const { lang } = useLanguage();
  const { data: config } = useGetSiteConfig({ query: { queryKey: getGetSiteConfigQueryKey() } });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const phoneRaw =
    (config as Record<string, string> | undefined)?.whatsapp ||
    (config as Record<string, string> | undefined)?.phone ||
    "(908) 800-3190";

  const waNumber = normalizePhone(phoneRaw);
  if (!waNumber) return null;

  const message =
    lang === "es"
      ? "¡Hola Kimdasa! Me interesa pedir un presupuesto."
      : lang === "pt"
      ? "Olá Kimdasa! Gostaria de solicitar um orçamento gratuito."
      : "Hi Kimdasa! I'd like to request a free estimate.";
  const href = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
  const ariaLabel =
    lang === "es" ? "Escribinos por WhatsApp" :
    lang === "pt" ? "Fale conosco pelo WhatsApp" :
    "Message us on WhatsApp";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      data-testid="link-whatsapp"
      className={`hidden md:flex fixed bottom-24 right-6 z-40 items-center justify-center h-14 w-14 rounded-full bg-[#25D366] text-white shadow-2xl hover:scale-110 hover:bg-[#1ebe57] transition-all duration-300 ${
        visible ? "scale-100 opacity-100" : "scale-0 opacity-0"
      }`}
      style={{ boxShadow: "0 6px 20px rgba(37, 211, 102, 0.5)" }}
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="currentColor" aria-hidden="true">
        <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.888 2.722.888.817 0 2.15-.516 2.478-1.318.13-.317.187-.66.187-1.003 0-.3-.057-.586-.187-.86-.273-.473-1.475-.81-2.163-1.118zM16.097 28.567a12.46 12.46 0 0 1-6.405-1.762l-4.495 1.45 1.49-4.388A12.495 12.495 0 1 1 28.611 16a12.43 12.43 0 0 1-12.514 12.567zM16 5.55C10.245 5.55 5.55 10.244 5.55 16a10.4 10.4 0 0 0 1.974 6.108L6.668 24.69l2.66-.852A10.402 10.402 0 0 0 16 26.45c5.756 0 10.45-4.694 10.45-10.45 0-2.79-1.085-5.41-3.06-7.388A10.42 10.42 0 0 0 16 5.55z" />
      </svg>
    </a>
  );
}
