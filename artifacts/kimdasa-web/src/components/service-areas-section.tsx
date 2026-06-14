import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const SERVICE_AREAS = [
  {
    state: { en: "New Jersey", es: "Nueva Jersey", pt: "Nova Jersey" },
    counties: [
      "Bergen", "Essex", "Hudson", "Morris", "Passaic", "Sussex", "Warren",
      "Hunterdon", "Somerset", "Union", "Middlesex", "Mercer", "Monmouth",
      "Ocean", "Burlington", "Camden", "Gloucester",
    ],
  },
  {
    state: { en: "Pennsylvania", es: "Pensilvania", pt: "Pensilvânia" },
    counties: [
      "Bucks", "Montgomery", "Philadelphia", "Delaware", "Chester",
      "Lehigh", "Northampton", "Berks", "Monroe", "Pike", "Carbon",
      "Lancaster", "Schuylkill",
    ],
  },
];

export function ServiceAreasSection() {
  const { t, lang } = useLanguage();
  const [showAll, setShowAll] = useState(false);
  const INITIAL_COUNTIES = 6;
  const hasMore = SERVICE_AREAS.some((a) => a.counties.length > INITIAL_COUNTIES);
  return (
    <section id="areas" className="py-20 bg-secondary border-y border-border">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold uppercase tracking-tight mb-3">
            {t.areas.title}
          </h2>
          <p className="text-muted-foreground">{t.areas.subtitle}</p>
        </div>
        <div id="areas-list" className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {SERVICE_AREAS.map((area, i) => {
            const visible = showAll ? area.counties : area.counties.slice(0, INITIAL_COUNTIES);
            const hidden = area.counties.length - visible.length;
            return (
              <div key={i} className="bg-card border border-border p-8 rounded-sm" data-testid={`card-area-${i}`}>
                <h3 className="text-xl font-bold text-primary uppercase tracking-wider mb-5">
                  {area.state[lang]}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {visible.map((county) => (
                    <span
                      key={county}
                      className="text-sm bg-background border border-border px-3 py-1 rounded-sm text-foreground"
                    >
                      {lang === "es" || lang === "pt" ? `${t.areas.countySuffix} de ${county}` : `${county} ${t.areas.countySuffix}`}
                    </span>
                  ))}
                  {!showAll && hidden > 0 && (
                    <span className="text-sm bg-primary/10 border border-primary/30 px-3 py-1 rounded-sm text-primary font-semibold">
                      +{hidden}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {hasMore && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              aria-expanded={showAll}
              aria-controls="areas-list"
              onClick={() => setShowAll((v) => !v)}
              className="inline-flex items-center gap-2 bg-background text-foreground border-2 border-primary px-6 py-3 rounded-sm font-bold text-sm uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors"
              data-testid="button-areas-toggle"
            >
              {showAll ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showAll ? t.areas.showLess : t.areas.showAll}
            </button>
          </div>
        )}
        <p className="text-center text-sm text-muted-foreground mt-8">{t.areas.notSure}</p>
      </div>
    </section>
  );
}

export default ServiceAreasSection;
