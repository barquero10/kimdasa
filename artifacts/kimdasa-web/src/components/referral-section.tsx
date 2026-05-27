import { useLanguage } from "@/lib/i18n";
import { useGetSiteConfig, getGetSiteConfigQueryKey } from "@workspace/api-client-react";

function normalizeWaPhone(raw: string | undefined): string {
  if (!raw) return "19088003190";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return digits;
  return digits.length >= 10 ? digits : "19088003190";
}

export function ReferralSection() {
  const { t } = useLanguage();
  const { data: config } = useGetSiteConfig({ query: { queryKey: getGetSiteConfigQueryKey() } });
  const waNumber = normalizeWaPhone(
    (config as Record<string, string> | undefined)?.whatsapp ||
      (config as Record<string, string> | undefined)?.phone ||
      "(908) 800-3190",
  );
  const href = `https://wa.me/${waNumber}?text=${encodeURIComponent(t.referral.whatsappMessage)}`;
  return (
    <section id="referral" className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto relative overflow-hidden bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-sm border-2 border-primary p-8 md:p-12">
          <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
          <div className="absolute -left-12 -bottom-12 w-56 h-56 rounded-full bg-black/10 blur-2xl" aria-hidden="true" />
          <div className="relative grid md:grid-cols-[1fr_auto] gap-8 items-center">
            <div>
              <span className="inline-block text-xs uppercase tracking-[0.3em] font-bold mb-3 opacity-90">
                {t.referral.eyebrow}
              </span>
              <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tight mb-4 leading-tight">
                {t.referral.title}
              </h2>
              <p className="text-base md:text-lg opacity-95 leading-relaxed mb-3 max-w-2xl">
                {t.referral.description}
              </p>
              <p className="text-xs opacity-75 italic">{t.referral.terms}</p>
            </div>
            <div className="flex md:flex-col items-center gap-4 shrink-0">
              <div className="text-center">
                <div className="text-5xl md:text-6xl font-black leading-none drop-shadow-md">$300</div>
                <div className="text-[11px] uppercase tracking-widest font-bold opacity-90 mt-1">
                  {t.referral.cashLabel}
                </div>
              </div>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-white text-primary px-6 py-3 rounded-sm font-bold text-sm uppercase tracking-widest hover:bg-white/90 transition-colors whitespace-nowrap shadow-lg"
                data-testid="link-referral-whatsapp"
              >
                {t.referral.cta}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ReferralSection;
