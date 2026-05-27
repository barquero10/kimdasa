import { useState } from "react";
import { Plus, Minus, Phone } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useGetSiteConfig } from "@workspace/api-client-react";

export function FAQSection() {
  const { t } = useLanguage();
  const { data: config } = useGetSiteConfig();
  const phone = config?.phone || "(908) 800-3190";
  const phoneTel = phone.replace(/\D/g, "");
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [showAll, setShowAll] = useState(false);
  const INITIAL_FAQ = 4;
  const visibleItems = showAll ? t.faq.items : t.faq.items.slice(0, INITIAL_FAQ);
  const hasMore = t.faq.items.length > INITIAL_FAQ;

  return (
    <section id="faq" className="py-24 bg-secondary text-secondary-foreground">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="inline-block text-xs uppercase tracking-[0.3em] text-primary font-bold mb-3">
            {t.faq.eyebrow}
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 uppercase tracking-tight">
            {t.faq.title}
          </h2>
          <p className="text-lg text-secondary-foreground/70">{t.faq.subtitle}</p>
        </div>

        <div id="faq-list" className="max-w-3xl mx-auto space-y-3">
          {visibleItems.map((item, i) => {
            const isOpen = openIndex === i;
            const panelId = `faq-panel-${i}`;
            const buttonId = `faq-button-${i}`;
            return (
              <div
                key={i}
                className="bg-background text-foreground border border-border rounded-sm overflow-hidden"
                data-testid={`faq-item-${i}`}
              >
                <button
                  type="button"
                  id={buttonId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-5 text-left hover:bg-muted/40 transition-colors"
                  data-testid={`faq-question-${i}`}
                >
                  <span className="font-bold text-base md:text-lg leading-snug">{item.q}</span>
                  <span
                    className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-sm transition-colors ${
                      isOpen ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}
                    aria-hidden="true"
                  >
                    {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </span>
                </button>
                {isOpen && (
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className="px-5 pb-5 -mt-1 text-muted-foreground leading-relaxed text-sm md:text-base"
                  >
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {hasMore && (
          <div className="max-w-3xl mx-auto mt-6 flex justify-center">
            <button
              type="button"
              aria-expanded={showAll}
              aria-controls="faq-list"
              onClick={() => {
                setShowAll((v) => !v);
                if (showAll) setOpenIndex(null);
              }}
              className="inline-flex items-center gap-2 bg-background text-foreground border-2 border-primary px-6 py-3 rounded-sm font-bold text-sm uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors"
              data-testid="button-faq-toggle"
            >
              {showAll ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showAll ? t.faq.showLess : t.faq.showMore}
            </button>
          </div>
        )}

        <div className="mt-12 max-w-3xl mx-auto bg-background text-foreground border-2 border-primary rounded-sm p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-5">
          <div>
            <p className="font-bold text-lg mb-1">{t.faq.stillHaveQuestions}</p>
            <p className="text-muted-foreground text-sm">{t.faq.callUs} {phone}</p>
          </div>
          <a
            href={`tel:${phoneTel}`}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-sm font-bold text-sm uppercase tracking-widest hover:bg-primary/90 transition-colors whitespace-nowrap"
            data-testid="link-faq-call"
          >
            <Phone className="w-4 h-4" />
            {phone}
          </a>
        </div>
      </div>
    </section>
  );
}

export default FAQSection;
