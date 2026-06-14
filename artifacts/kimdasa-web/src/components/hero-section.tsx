import { useState, useEffect } from "react";
import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";
import { useGetSiteConfig, getGetSiteConfigQueryKey } from "@workspace/api-client-react";
import { X, Phone } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { trackPhoneCall } from "@/lib/gtag";
// Video served from public/ — direct URL, no JS module parse needed
const heroVideo = "/hero-loop.mp4";
const heroPoster = "/hero-poster.webp";

// Deferred video — mounts only after page fully loads so the
// poster image (fast) is the LCP element, not the 838 KB video.
function useDeferredVideo() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (document.readyState === "complete") {
      const t = setTimeout(() => setReady(true), 800);
      return () => clearTimeout(t);
    }
    const onLoad = () => setTimeout(() => setReady(true), 800);
    window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return ready;
}

const SERVICE_HIGHLIGHT_KEYS = [
  "Roofing",
  "Vinyl Siding",
  "Hardie Siding",
  "Windows",
  "Doors",
  "Gutters",
  "Soffit",
  "Exterior Remodeling",
] as const;

function shouldShowIntroQueryParam(): boolean {
  if (typeof window === "undefined") return true;
  const params = new URLSearchParams(window.location.search);
  if (params.get("noIntro") === "1") return false;
  return true;
}

export function HeroSection() {
  const { data: config } = useGetSiteConfig({ query: { queryKey: getGetSiteConfigQueryKey() } });
  const { t } = useLanguage();
  const [showIntro, setShowIntro] = useState(false);
  const [serviceIndex, setServiceIndex] = useState(0);
  const videoReady = useDeferredVideo();

  const title = config?.businessName || "Kimdasa Construction";
  const tagline = config?.tagline || t.hero.tagline;
  const phone = config?.phone || "(908) 800-3190";

  useEffect(() => {
    const queryParamAllows = shouldShowIntroQueryParam();
    const configAllows = config?.heroModalEnabled !== "false";
    if (queryParamAllows && configAllows) {
      setShowIntro(true);
    }
  }, [config]);

  useEffect(() => {
    if (!showIntro) return;
    const interval = setInterval(() => {
      setServiceIndex((prev) => (prev + 1) % SERVICE_HIGHLIGHT_KEYS.length);
    }, 900);
    return () => clearInterval(interval);
  }, [showIntro]);

  const dismissIntro = () => setShowIntro(false);

  return (
    <LazyMotion features={domAnimation} strict>
      <AnimatePresence>
        {showIntro && (
          <m.div
            key="intro-modal"
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6, ease: "easeInOut" } }}
            data-testid="hero-intro-modal"
          >
            <button
              onClick={dismissIntro}
              className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
              aria-label={t.hero.skipIntro}
              data-testid="button-skip-intro"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center px-8 max-w-3xl">
              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-xs uppercase tracking-[0.3em] text-primary font-semibold mb-8"
              >
                {t.hero.eyebrow}
              </m.div>

              <m.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="text-4xl md:text-6xl font-black uppercase tracking-tight text-white mb-4"
              >
                Kimdasa Construction
              </m.h1>

              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="h-16 flex items-center justify-center mb-12"
              >
                <AnimatePresence mode="wait">
                  <m.span
                    key={serviceIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="text-2xl md:text-4xl font-bold text-primary uppercase tracking-wider"
                    data-testid="text-service-highlight"
                  >
                    {t.services.items[SERVICE_HIGHLIGHT_KEYS[serviceIndex]].title}
                  </m.span>
                </AnimatePresence>
              </m.div>

              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <a
                  href="#estimate"
                  onClick={dismissIntro}
                  className="bg-primary text-primary-foreground px-8 py-4 font-bold text-sm uppercase tracking-widest hover:bg-primary/90 transition-colors w-full sm:w-auto text-center rounded-sm"
                  data-testid="link-intro-request-estimate"
                >
                  {t.hero.requestEstimate}
                </a>
                <a
                  href={`tel:${phone.replace(/\D/g, "")}`}
                  onClick={() => { dismissIntro(); trackPhoneCall(); }}
                  className="border border-white/30 text-white px-8 py-4 font-bold text-sm uppercase tracking-widest hover:bg-white/10 transition-colors w-full sm:w-auto text-center rounded-sm flex items-center justify-center gap-2"
                  data-testid="link-intro-call-now"
                >
                  <Phone className="w-4 h-4" />
                  {t.callNow}
                </a>
                <a
                  href="#gallery"
                  onClick={dismissIntro}
                  className="border border-white/20 text-slate-400 px-8 py-4 font-bold text-sm uppercase tracking-widest hover:bg-white/5 hover:text-white transition-colors w-full sm:w-auto text-center rounded-sm"
                  data-testid="link-intro-view-work"
                >
                  {t.hero.viewWork}
                </a>
              </m.div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/80 z-10" />
        {/* LCP element: always starts with the preloaded local poster.
            Only switches to heroImageUrl (if set in config) after the API
            responds — this way the <link rel="preload"> in <head> is always
            used and LCP is never gated on the API call. */}
        <img
          src={heroPoster}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          decoding="sync"
          width={828}
          height={621}
          className="absolute inset-0 w-full h-full object-cover object-center z-0"
          style={config?.heroImageUrl ? { display: "none" } : undefined}
        />
        {config?.heroImageUrl && (
          <img
            src={config.heroImageUrl}
            alt=""
            aria-hidden="true"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover object-center z-0"
          />
        )}
        {videoReady && (
          <video
            src={heroVideo}
            poster={config?.heroImageUrl || heroPoster}
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            className="absolute inset-0 w-full h-full object-cover object-center z-[1]"
            aria-hidden="true"
          />
        )}

        <m.div
          className="relative z-20 container mx-auto px-4 text-center max-w-4xl"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-6 uppercase">
            {title}
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-10 max-w-2xl mx-auto">
            {tagline}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#estimate"
              className="bg-primary text-primary-foreground px-8 py-4 rounded-sm font-bold text-lg uppercase tracking-wider hover:bg-primary/90 transition-colors inline-block w-full sm:w-auto"
              data-testid="link-hero-request-estimate"
            >
              {t.hero.requestEstimate}
            </a>
            <a
              href={`tel:${phone.replace(/\D/g, "")}`}
              onClick={trackPhoneCall}
              className="bg-transparent border border-white/30 text-white px-8 py-4 rounded-sm font-bold text-lg uppercase tracking-wider hover:bg-white/10 transition-colors inline-block w-full sm:w-auto flex items-center justify-center gap-2"
              data-testid="link-hero-call-now"
            >
              <Phone className="w-5 h-5" />
              {t.callNow}
            </a>
            <a
              href="#gallery"
              className="bg-transparent border border-white/20 text-slate-300 px-8 py-4 rounded-sm font-bold text-lg uppercase tracking-wider hover:bg-white/5 hover:text-white transition-colors inline-block w-full sm:w-auto"
              data-testid="link-hero-view-work"
            >
              {t.hero.viewWork}
            </a>
          </div>
          <div className="flex items-center justify-center gap-6 mt-8 flex-wrap">
            <span className="flex items-center gap-1.5 text-slate-300 text-sm font-medium">
              <span className="text-primary font-bold">✓</span> Licensed NJ & PA
            </span>
            <span className="text-slate-600">·</span>
            <span className="flex items-center gap-1.5 text-slate-300 text-sm font-medium">
              <span className="text-primary font-bold">✓</span> {t.hero.freeEstimate}
            </span>
            <span className="text-slate-600">·</span>
            <span className="flex items-center gap-1.5 text-slate-300 text-sm font-medium">
              <span className="text-primary font-bold">✓</span> 500+ Projects
            </span>
            <span className="text-slate-600">·</span>
            <span className="flex items-center gap-1.5 text-slate-300 text-sm font-medium">
              <span className="text-primary font-bold">✓</span> {t.hero.responds4h}
            </span>
          </div>
        </m.div>
      </section>
    </LazyMotion>
  );
}
