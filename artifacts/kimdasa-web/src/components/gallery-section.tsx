import { useState, useEffect, useRef } from "react";
import { MapPin, Play, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

import sidingBlueVideo from "@/assets/projects/01-siding-blue.mp4";
import sidingBluePoster from "@/assets/projects/01-siding-blue.webp";
import twoStoryCreamVideo from "@/assets/projects/02-two-story-cream.mp4";
import twoStoryCreamPoster from "@/assets/projects/02-two-story-cream.webp";
import boardBattenVideo from "@/assets/projects/03-board-batten.mp4";
import boardBattenPoster from "@/assets/projects/03-board-batten.webp";
import stoneVeneerVideo from "@/assets/projects/04-stone-veneer.mp4";
import stoneVeneerPoster from "@/assets/projects/04-stone-veneer.webp";
import spaBathVideo from "@/assets/projects/05-spa-bath.mp4";
import spaBathPoster from "@/assets/projects/05-spa-bath.webp";
import marbleBathVideo from "@/assets/projects/06-marble-bath.mp4";
import marbleBathPoster from "@/assets/projects/06-marble-bath.webp";
import sidingBlueBefore from "@/assets/projects/01-siding-blue-before.webp";
import sidingBlueAfter from "@/assets/projects/01-siding-blue-after.webp";
import twoStoryCreamBefore from "@/assets/projects/02-two-story-cream-before.webp";
import twoStoryCreamAfter from "@/assets/projects/02-two-story-cream-after.webp";
import boardBattenBefore from "@/assets/projects/03-board-batten-before.webp";
import boardBattenAfter from "@/assets/projects/03-board-batten-after.webp";
import stoneVeneerBefore from "@/assets/projects/04-stone-veneer-before.webp";
import stoneVeneerAfter from "@/assets/projects/04-stone-veneer-after.webp";
import spaBathBefore from "@/assets/projects/05-spa-bath-before.webp";
import spaBathAfter from "@/assets/projects/05-spa-bath-after.webp";
import marbleBathBefore from "@/assets/projects/06-marble-bath-before.webp";
import marbleBathAfter from "@/assets/projects/06-marble-bath-after.webp";

const GALLERY_PROJECTS = [
  {
    key: "sidingBlue" as const,
    category: { en: "Exterior", es: "Exterior", pt: "Exterior" },
    location: { en: "New Jersey", es: "Nueva Jersey", pt: "Nova Jersey" },
    video: sidingBlueVideo,
    poster: sidingBluePoster,
    before: sidingBlueBefore,
    after: sidingBlueAfter,
    aspect: "video" as const,
  },
  {
    key: "twoStoryCream" as const,
    category: { en: "Exterior", es: "Exterior", pt: "Exterior" },
    location: { en: "New Jersey", es: "Nueva Jersey", pt: "Nova Jersey" },
    video: twoStoryCreamVideo,
    poster: twoStoryCreamPoster,
    before: twoStoryCreamBefore,
    after: twoStoryCreamAfter,
    aspect: "portrait" as const,
  },
  {
    key: "boardBatten" as const,
    category: { en: "Exterior", es: "Exterior", pt: "Exterior" },
    location: { en: "Pennsylvania", es: "Pensilvania", pt: "Pensilvânia" },
    video: boardBattenVideo,
    poster: boardBattenPoster,
    before: boardBattenBefore,
    after: boardBattenAfter,
    aspect: "portrait" as const,
  },
  {
    key: "stoneVeneer" as const,
    category: { en: "Exterior", es: "Exterior", pt: "Exterior" },
    location: { en: "New Jersey", es: "Nueva Jersey", pt: "Nova Jersey" },
    video: stoneVeneerVideo,
    poster: stoneVeneerPoster,
    before: stoneVeneerBefore,
    after: stoneVeneerAfter,
    aspect: "portrait" as const,
  },
  {
    key: "spaBath" as const,
    category: { en: "Bathroom", es: "Baño", pt: "Banheiro" },
    location: { en: "New Jersey", es: "Nueva Jersey", pt: "Nova Jersey" },
    video: spaBathVideo,
    poster: spaBathPoster,
    before: spaBathBefore,
    after: spaBathAfter,
    aspect: "portrait" as const,
  },
  {
    key: "marbleBath" as const,
    category: { en: "Bathroom", es: "Baño", pt: "Banheiro" },
    location: { en: "Pennsylvania", es: "Pensilvania", pt: "Pensilvânia" },
    video: marbleBathVideo,
    poster: marbleBathPoster,
    before: marbleBathBefore,
    after: marbleBathAfter,
    aspect: "portrait" as const,
  },
];

function BeforeAfterCard({
  project,
  index,
  onOpen,
}: {
  project: (typeof GALLERY_PROJECTS)[number];
  index: number;
  onOpen: () => void;
}) {
  const { t, lang } = useLanguage();
  const label = t.gallery.projects[project.key];
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState(50);
  const draggingRef = useRef(false);

  const setFromClientX = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, pct)));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    setFromClientX(e.clientX);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };
  const onKey = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowDown":
        e.preventDefault(); setPos((p) => Math.max(0, p - 5)); break;
      case "ArrowRight":
      case "ArrowUp":
        e.preventDefault(); setPos((p) => Math.min(100, p + 5)); break;
      case "PageDown":
        e.preventDefault(); setPos((p) => Math.max(0, p - 15)); break;
      case "PageUp":
        e.preventDefault(); setPos((p) => Math.min(100, p + 15)); break;
      case "Home":
        e.preventDefault(); setPos(0); break;
      case "End":
        e.preventDefault(); setPos(100); break;
    }
  };

  const aspectClass = project.aspect === "portrait" ? "aspect-[4/5]" : "aspect-[16/10]";

  return (
    <div
      className="group relative block w-full bg-background border border-border rounded-sm overflow-hidden hover:border-primary transition-all"
      data-testid={`card-project-${index}`}
    >
      <div
        ref={containerRef}
        className={`relative w-full ${aspectClass} overflow-hidden bg-black select-none touch-none cursor-ew-resize`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="slider"
        aria-label={`${label.label} — ${t.gallery.before} / ${t.gallery.after}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        aria-valuetext={`${Math.round(pos)}% ${t.gallery.before} / ${100 - Math.round(pos)}% ${t.gallery.after}`}
        tabIndex={0}
        onKeyDown={onKey}
      >
        <img
          src={project.after}
          alt={`${label.label} — ${t.gallery.after}`}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          loading="lazy"
          draggable={false}
        />
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        >
          <img
            src={project.before}
            alt={`${label.label} — ${t.gallery.before}`}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            draggable={false}
          />
        </div>

        <div className="absolute top-3 left-3 z-10 flex gap-2 pointer-events-none">
          <span className="px-2.5 py-1 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider rounded-sm">
            {project.category[lang]}
          </span>
        </div>
        <span className="absolute top-3 right-3 z-10 px-2.5 py-1 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider rounded-sm pointer-events-none">
          {t.gallery.after}
        </span>
        <span
          className="absolute top-3 z-10 px-2.5 py-1 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider rounded-sm pointer-events-none transition-opacity"
          style={{ left: 12, opacity: pos > 12 ? 1 : 0 }}
        >
          {t.gallery.before}
        </span>

        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/90 shadow-[0_0_12px_rgba(0,0,0,0.6)] pointer-events-none"
          style={{ left: `${pos}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center pointer-events-none ring-2 ring-primary"
          style={{ left: `${pos}%` }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
            <polyline points="15 18 9 12 15 6" />
            <polyline points="9 18 15 12 9 6" transform="translate(6 0)" />
          </svg>
        </div>

        <button
          type="button"
          onClick={onOpen}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute bottom-3 right-3 z-20 px-3 py-1.5 bg-black/70 hover:bg-black backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider rounded-sm flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
          data-testid={`button-watch-video-${index}`}
        >
          <Play className="w-3 h-3" fill="currentColor" />
          {t.gallery.watchVideo}
        </button>
      </div>

      <div className="p-4 border-t border-border bg-background">
        <div className="flex items-start justify-between gap-3 mb-2">
          <p className="font-bold text-base leading-tight">{label.label}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <MapPin className="w-3 h-3" />
            <span>{project.location[lang]}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">{t.gallery.before}</p>
            <p className="text-muted-foreground leading-snug">{label.beforeDesc}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-primary font-bold mb-1">{t.gallery.after}</p>
            <p className="text-foreground leading-snug">{label.afterDesc}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function VideoModal({
  project,
  onClose,
}: {
  project: (typeof GALLERY_PROJECTS)[number];
  onClose: () => void;
}) {
  const { t, lang } = useLanguage();
  const label = t.gallery.projects[project.key];
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleId = `video-modal-title-${project.key}`;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const root = dialogRef.current;
        if (!root) return;
        const focusables = root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="video-modal"
    >
      <button
        ref={closeButtonRef}
        type="button"
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
        onClick={onClose}
        aria-label="Close"
        data-testid="button-close-video"
      >
        <X className="w-5 h-5" />
      </button>
      <div
        className="relative w-full max-w-5xl bg-black rounded-md overflow-hidden flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 bg-black flex items-center justify-center min-h-[50vh]">
          <video
            src={project.video}
            poster={project.poster}
            controls
            autoPlay
            playsInline
            className="max-h-[80vh] w-auto max-w-full"
          />
        </div>
        <div className="md:w-80 p-6 bg-card border-t md:border-t-0 md:border-l border-border">
          <span className="inline-block px-2 py-1 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider rounded-sm mb-3">
            {project.category[lang]}
          </span>
          <h3 id={titleId} className="text-xl font-bold text-foreground mb-2">{label.label}</h3>
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm mb-5">
            <MapPin className="w-3.5 h-3.5" />
            <span>{project.location[lang]}</span>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">{t.gallery.before}</p>
              <p className="text-sm text-muted-foreground">{label.beforeDesc}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-primary font-bold mb-1">{t.gallery.after}</p>
              <p className="text-sm text-foreground">{label.afterDesc}</p>
            </div>
          </div>
          <a
            href="#estimate"
            onClick={onClose}
            className="mt-6 block w-full bg-primary text-primary-foreground text-center px-4 py-3 font-bold text-sm uppercase tracking-wider rounded-sm hover:bg-primary/90 transition-colors"
            data-testid="link-modal-estimate"
          >
            Get a Free Estimate
          </a>
        </div>
      </div>
    </div>
  );
}

export default function GallerySection() {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="gallery" className="py-24 bg-card border-y border-border">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-block text-xs uppercase tracking-[0.3em] text-primary font-bold mb-3">
            {t.gallery.before} / {t.gallery.after}
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 uppercase tracking-tight">
            {t.gallery.title}
          </h2>
          <p className="text-lg text-muted-foreground">{t.gallery.subtitle}</p>
        </div>

        <p className="text-center text-xs uppercase tracking-[0.3em] text-muted-foreground mb-8">
          ← {t.gallery.dragHint} →
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {GALLERY_PROJECTS.map((p, i) => (
            <BeforeAfterCard key={p.key} project={p} index={i} onOpen={() => setOpenIndex(i)} />
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-10">
          @kimda_sa · Instagram
        </p>
      </div>

      {openIndex !== null && (
        <VideoModal project={GALLERY_PROJECTS[openIndex]} onClose={() => setOpenIndex(null)} />
      )}
    </section>
  );
}
