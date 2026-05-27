import { ClipboardList, BadgeCheck, Hammer, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export function ProcessSection() {
  const { t } = useLanguage();
  const icons = [ClipboardList, BadgeCheck, Hammer, ShieldCheck];
  return (
    <section id="process" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="inline-block text-xs uppercase tracking-[0.3em] text-primary font-bold mb-3">
            {t.process.eyebrow}
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 uppercase tracking-tight">
            {t.process.title}
          </h2>
          <p className="text-lg text-muted-foreground">{t.process.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {t.process.steps.map((step, i) => {
            const Icon = icons[i] ?? ClipboardList;
            return (
              <div
                key={step.number}
                className="relative bg-card border border-border rounded-sm p-6 hover:border-primary/50 transition-colors group"
                data-testid={`process-step-${i}`}
              >
                <div className="flex items-start justify-between mb-5">
                  <span className="text-5xl font-black text-primary/20 leading-none group-hover:text-primary/40 transition-colors">
                    {step.number}
                  </span>
                  <div className="w-11 h-11 rounded-sm bg-primary/10 flex items-center justify-center text-primary">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-2 leading-tight">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <a
            href="#estimate"
            className="inline-block bg-primary text-primary-foreground px-8 py-4 rounded-sm font-bold text-sm uppercase tracking-widest hover:bg-primary/90 transition-colors"
            data-testid="link-process-estimate"
          >
            {t.hero.requestEstimate}
          </a>
        </div>
      </div>
    </section>
  );
}

export default ProcessSection;
