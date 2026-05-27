import { useState, useEffect, lazy, Suspense } from "react";
import { useGetSiteConfig, getGetSiteConfigQueryKey } from "@workspace/api-client-react";
import { Phone, ShieldCheck, MessageCircle, ChevronRight, CheckCircle2 } from "lucide-react";
import logoIcon from "@/assets/logo-icon.webp";
import { trackPhoneCall } from "@/lib/gtag";
import { HeroSection } from "@/components/hero-section";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/lib/i18n";

const ServicesSection    = lazy(() => import("@/components/services-section"));
const GallerySection     = lazy(() => import("@/components/gallery-section"));
const ProcessSection     = lazy(() => import("@/components/process-section"));
const CalculatorSection  = lazy(() => import("@/components/calculator-section"));
const TestimonialsSection = lazy(() => import("@/components/testimonials-section"));
const ReferralSection    = lazy(() => import("@/components/referral-section"));
const ServiceAreasSection = lazy(() => import("@/components/service-areas-section"));
const FAQSection         = lazy(() => import("@/components/faq-section"));
const PhotoEstimatorSection = lazy(() => import("@/components/photo-estimator-section"));
const BookingSection     = lazy(() => import("@/components/booking-calendar").then(m => ({ default: m.BookingSection })));
const LeadFormSection    = lazy(() => import("@/components/lead-form").then(m => ({ default: m.LeadFormSection })));
const ChatWidget         = lazy(() => import("@/components/chat-widget").then(m => ({ default: m.ChatWidget })));
const WhatsAppButton     = lazy(() => import("@/components/whatsapp-button").then(m => ({ default: m.WhatsAppButton })));
const Footer             = lazy(() => import("@/components/footer-section"));

function SEOMeta() {
  const { lang } = useLanguage();
  if (lang === "es") {
    return (
      <>
        <title>Kimdasa Construction — Remodelación Exterior NJ y PA | Techos, Revestimiento, Ventanas</title>
        <meta name="description" content="Kimdasa Construction ofrece remodelación exterior premium en Nueva Jersey y Pensilvania. Expertos en techos, revestimiento, ventanas, puertas, canaletas y más. Licenciados y asegurados. Presupuestos gratis." />
        <meta name="keywords" content="contratista de techos NJ, contratista de revestimiento PA, remodelación exterior Nueva Jersey, reemplazo de techo Bergen County, instalación de revestimiento Bucks County" />
        <meta property="og:title" content="Kimdasa Construction — Remodelación Exterior NJ y PA" />
        <meta property="og:description" content="Remodelación exterior premium en NJ y PA. Techos, revestimiento, ventanas, puertas, canaletas y más. Licenciados y asegurados. Presupuestos gratis." />
        <meta property="og:type" content="website" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://kimdasa.com/" />
      </>
    );
  }
  return (
    <>
      <title>Kimdasa Construction — Exterior Remodeling NJ & PA | Roofing, Siding, Windows</title>
      <meta name="description" content="Kimdasa Construction provides premium exterior remodeling across New Jersey and Pennsylvania. Expert roofing, siding, windows, doors, gutters, and more. Licensed & insured. Free estimates." />
      <meta name="keywords" content="roofing contractor NJ, siding contractor PA, exterior remodeling New Jersey, roof replacement Bergen County, siding installation Bucks County, windows doors NJ PA" />
      <meta property="og:title" content="Kimdasa Construction — NJ & PA Exterior Remodeling" />
      <meta property="og:description" content="Premium exterior remodeling across NJ and PA. Roofing, siding, windows, doors, gutters, decking, and more. Licensed & insured. Free estimates." />
      <meta property="og:type" content="website" />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href="https://kimdasa.com/" />
    </>
  );
}

const URGENCY_TEXT: Record<"en" | "es" | "pt", string> = {
  en: "✓ Licensed & Insured  ·  ✓ Free Written Estimates  ·  ✓ We Respond Within 4 Hours",
  es: "✓ Licenciados y Asegurados  ·  ✓ Presupuestos Gratis  ·  ✓ Respondemos en Menos de 4 Horas",
  pt: "✓ Licenciados e Segurados  ·  ✓ Orçamentos Grátis  ·  ✓ Respondemos em Até 4 Horas",
};

function UrgencyBar() {
  const { lang } = useLanguage();
  return (
    <div className="bg-primary text-primary-foreground text-center text-[11px] font-bold uppercase tracking-widest py-2 px-4 select-none">
      {URGENCY_TEXT[lang]}
    </div>
  );
}

function TrustSection() {
  const { t } = useLanguage();
  const stats = [
    { value: "20+", label: t.trust.yearsExperience },
    { value: "100%", label: t.trust.licensedInsured },
    { value: "500+", label: t.trust.projectsCompleted },
    { value: "NJ & PA", label: t.trust.serviceAreas },
  ];
  return (
    <section className="py-20 bg-secondary text-secondary-foreground border-y border-border">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-border">
          {stats.map((stat, i) => (
            <div key={i} className="p-4" data-testid={`stat-${i}`}>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-1">{stat.value}</div>
              <div className="text-sm uppercase tracking-wider font-bold">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BrandsSection() {
  const { t } = useLanguage();
  return (
    <section className="py-16 bg-background border-b border-border">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-3 uppercase tracking-tight">
            {t.brands.title}
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">{t.brands.subtitle}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 max-w-6xl mx-auto">
          {t.brands.items.map((brand, i) => (
            <div
              key={brand.name}
              className="group relative bg-card border border-border rounded-sm p-5 flex flex-col items-center justify-center text-center hover:border-primary transition-colors min-h-[110px]"
              data-testid={`brand-${i}`}
            >
              <div
                className="absolute top-0 left-0 right-0 h-1 transition-all group-hover:h-1.5"
                style={{ backgroundColor: brand.color }}
                aria-hidden="true"
              />
              <p className="font-black text-base md:text-lg uppercase tracking-tight text-foreground leading-none mb-2">
                {brand.name}
              </p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground leading-tight">
                {brand.category}
              </p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 mt-8 text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>Manufacturer warranties · Certified installer</span>
        </div>
      </div>
    </section>
  );
}

function DesktopStickyCTA() {
  const { t } = useLanguage();
  const { data: config } = useGetSiteConfig();
  const phone = config?.phone || "(908) 800-3190";
  const phoneTel = phone.replace(/\D/g, "");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.75);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`hidden md:flex fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b border-border shadow-sm transition-transform duration-300 ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
      data-testid="desktop-sticky-cta"
    >
      <div className="container mx-auto px-6 py-3 flex items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <img src={logoIcon} alt="Kimdasa" className="h-8 w-8" loading="lazy" width={32} height={32} />
          <span className="font-black text-sm uppercase tracking-tight">{config?.businessName || "Kimdasa Construction"}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Licensed & Insured</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Free Estimates</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> NJ & PA</span>
          </div>
          <a
            href={`tel:${phoneTel}`}
            onClick={trackPhoneCall}
            className="flex items-center gap-2 font-bold text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <Phone className="w-4 h-4" />
            {phone}
          </a>
          <a
            href="#estimate"
            className="bg-primary text-primary-foreground px-5 py-2 rounded-sm font-bold text-sm uppercase tracking-wider hover:bg-primary/90 transition-colors"
          >
            {t.hero.requestEstimate}
          </a>
        </div>
      </div>
    </div>
  );
}

function MobileStickyBar() {
  const { t, lang } = useLanguage();
  const { data: config } = useGetSiteConfig();
  const phoneRaw = config?.phone || "(908) 800-3190";
  const phoneTel = phoneRaw.replace(/\D/g, "");
  const waNumber = phoneTel.length === 10 ? `1${phoneTel}` : phoneTel;
  const waMessage =
    lang === "es"
      ? "¡Hola Kimdasa! Me interesa pedir un presupuesto."
      : lang === "pt"
      ? "Olá Kimdasa! Quero pedir um orçamento."
      : "Hi Kimdasa! I'd like to request a free estimate.";
  const waHref = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`;

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 grid grid-cols-3 bg-background border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.15)]"
      data-testid="mobile-sticky-bar"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <a
        href={`tel:${phoneTel}`}
        onClick={trackPhoneCall}
        className="flex flex-col items-center justify-center gap-1 py-3 text-foreground hover:bg-muted/50 active:bg-muted transition-colors border-r border-border"
        data-testid="mobile-bar-call"
      >
        <Phone className="w-5 h-5 text-primary" />
        <span className="text-[11px] font-bold uppercase tracking-wider">{t.mobileBar.call}</span>
      </a>
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center justify-center gap-1 py-3 text-foreground hover:bg-muted/50 active:bg-muted transition-colors border-r border-border"
        data-testid="mobile-bar-whatsapp"
      >
        <MessageCircle className="w-5 h-5 text-[#25D366]" />
        <span className="text-[11px] font-bold uppercase tracking-wider">{t.mobileBar.whatsapp}</span>
      </a>
      <a
        href="#estimate"
        className="flex flex-col items-center justify-center gap-1 py-3 bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 transition-colors"
        data-testid="mobile-bar-estimate"
      >
        <ChevronRight className="w-5 h-5" />
        <span className="text-[11px] font-bold uppercase tracking-wider">{t.mobileBar.estimate}</span>
      </a>
    </div>
  );
}

export default function Home() {
  const { data: config } = useGetSiteConfig({ query: { queryKey: getGetSiteConfigQueryKey() } });
  const { t } = useLanguage();

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const targets = Array.from(document.querySelectorAll<HTMLElement>("section"));
    targets.forEach((el) => el.classList.add("reveal"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.01 },
    );
    targets.forEach((el) => io.observe(el));
    const fallback = window.setTimeout(() => {
      targets.forEach((el) => el.classList.add("is-visible"));
    }, 1500);
    return () => {
      window.clearTimeout(fallback);
      io.disconnect();
    };
  }, []);

  return (
    <>
      <SEOMeta />
      <LanguageToggle />
      <DesktopStickyCTA />
      <div className="min-h-screen bg-background text-foreground flex flex-col pb-20 md:pb-0">
        <UrgencyBar />
        <div
          className="md:hidden sticky top-0 z-50 bg-background border-b border-border px-3 py-2 flex justify-between items-center shadow-sm"
          data-testid="mobile-top-bar"
        >
          <a href="#top" className="flex items-center gap-2" data-testid="link-mobile-logo">
            <img src={logoIcon} alt="Kimdasa" className="h-9 w-9" width={36} height={36} />
            <div className="leading-none">
              <p className="font-black text-sm uppercase tracking-tight">{config?.businessName || "Kimdasa"}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Construction</p>
            </div>
          </a>
          <a
            href={`tel:${(config?.phone || "9088003190").replace(/\D/g, "")}`}
            onClick={trackPhoneCall}
            className="bg-primary text-primary-foreground px-3 py-2 rounded-sm flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider"
            data-testid="link-mobile-call-now"
          >
            <Phone className="w-3.5 h-3.5" />
            {t.callNow}
          </a>
        </div>

        <main className="flex-1">
          <HeroSection />
          <TrustSection />
          <BrandsSection />
          <Suspense fallback={null}><ServicesSection /></Suspense>
          <Suspense fallback={null}><GallerySection /></Suspense>
          <Suspense fallback={null}><ProcessSection /></Suspense>
          <Suspense fallback={null}><CalculatorSection /></Suspense>
          <Suspense fallback={null}><TestimonialsSection /></Suspense>
          <Suspense fallback={null}><ReferralSection /></Suspense>
          <Suspense fallback={null}><ServiceAreasSection /></Suspense>
          <Suspense fallback={null}><FAQSection /></Suspense>
          <Suspense fallback={null}><PhotoEstimatorSection /></Suspense>
          <Suspense fallback={null}><BookingSection /></Suspense>
          <Suspense fallback={null}><LeadFormSection /></Suspense>
        </main>

        <Suspense fallback={null}><Footer /></Suspense>
        <Suspense fallback={null}><WhatsAppButton /></Suspense>
        <Suspense fallback={null}><ChatWidget /></Suspense>
        <MobileStickyBar />
      </div>
    </>
  );
}
