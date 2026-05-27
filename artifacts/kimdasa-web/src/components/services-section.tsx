import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const SERVICE_KEYS = [
  "Roofing", "Siding", "Vinyl Siding", "Hardie Siding", "Gutters", "Soffit",
  "Fascia", "Window Capping", "Windows", "Doors", "Exterior Remodeling",
  "Repairs", "Kitchen Remodeling", "Bathroom Remodeling", "Drywall",
  "Interior Painting", "Flooring", "Hardwood Flooring", "Tile Work",
  "Interior Carpentry", "Custom Closets", "Basement Finishing",
  "Attic Finishing", "Interior Demolition",
] as const;

export function ServicesSection() {
  const { t } = useLanguage();
  const [showAll, setShowAll] = useState(false);
  const INITIAL_SERVICES = 8;
  const visibleKeys = showAll ? SERVICE_KEYS : SERVICE_KEYS.slice(0, INITIAL_SERVICES);
  const hasMore = SERVICE_KEYS.length > INITIAL_SERVICES;
  return (
    <section id="services" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 uppercase tracking-tight">
            {t.services.title}
          </h2>
          <p className="text-lg text-muted-foreground">{t.services.subtitle}</p>
        </div>
        <div id="services-list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {visibleKeys.map((key, i) => {
            const item = t.services.items[key];
            return (
              <div
                key={key}
                className="bg-card border border-border p-6 rounded-sm group hover:border-primary transition-colors"
                data-testid={`card-service-${i}`}
              >
                <h3 className="text-lg font-bold mb-3">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
        {hasMore && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              aria-expanded={showAll}
              aria-controls="services-list"
              onClick={() => setShowAll((v) => !v)}
              className="inline-flex items-center gap-2 bg-background text-foreground border-2 border-primary px-6 py-3 rounded-sm font-bold text-sm uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors"
              data-testid="button-services-toggle"
            >
              {showAll ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showAll ? t.services.showLess : `${t.services.showMore} (+${SERVICE_KEYS.length - INITIAL_SERVICES})`}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default ServicesSection;
