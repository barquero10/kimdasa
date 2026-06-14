import { useState } from "react";
import { Plus, ChevronRight, Calculator } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const CALCULATOR_PRICING = {
  roofing: {
    icon: "🏠",
    sizeMultiplier: 1.3,
    pricePerSqft: { low: 5.5, high: 9 },
    flat: false,
  },
  siding: {
    icon: "🧱",
    sizeMultiplier: 1.5,
    pricePerSqft: { low: 4, high: 12 },
    flat: false,
  },
  bathroom: {
    icon: "🛁",
    sizeMultiplier: 0,
    pricePerSqft: { low: 0, high: 0 },
    flat: true,
    flatPrices: {
      small: { low: 11000, high: 26000 },
      medium: { low: 16000, high: 39000 },
      large: { low: 27000, high: 65000 },
      xlarge: { low: 40000, high: 90000 },
    },
  },
  kitchen: {
    icon: "🍳",
    sizeMultiplier: 0,
    pricePerSqft: { low: 0, high: 0 },
    flat: true,
    flatPrices: {
      small: { low: 12000, high: 18000 },
      medium: { low: 30000, high: 48000 },
      large: { low: 50000, high: 75000 },
      xlarge: { low: 75000, high: 120000 },
    },
  },
  windows: {
    icon: "🪟",
    sizeMultiplier: 0,
    pricePerSqft: { low: 0, high: 0 },
    flat: true,
    flatPrices: {
      small: { low: 4000, high: 9000 },
      medium: { low: 6000, high: 13500 },
      large: { low: 8000, high: 18000 },
      xlarge: { low: 10000, high: 22500 },
    },
  },
  deck: {
    icon: "🌳",
    sizeMultiplier: 0,
    pricePerSqft: { low: 0, high: 0 },
    flat: true,
    flatPrices: {
      small: { low: 5000, high: 17000 },
      medium: { low: 7500, high: 25500 },
      large: { low: 10000, high: 34000 },
      xlarge: { low: 12500, high: 42500 },
    },
  },
  painting: {
    icon: "🎨",
    sizeMultiplier: 1,
    pricePerSqft: { low: 3, high: 5 },
    flat: false,
  },
} as const;

const HOUSE_SIZES = {
  small: 1200,
  medium: 2000,
  large: 3000,
  xlarge: 4000,
} as const;

type ProjectKey = keyof typeof CALCULATOR_PRICING;
type SizeKey = keyof typeof HOUSE_SIZES;

function formatUSD(n: number): string {
  if (n >= 1000) return `$${Math.round(n / 100) / 10}k`;
  return `$${n}`;
}

export function CalculatorSection() {
  const { t } = useLanguage();
  const [project, setProject] = useState<ProjectKey | null>(null);
  const [size, setSize] = useState<SizeKey | null>(null);

  const projectKeys: ProjectKey[] = ["roofing", "siding", "windows", "bathroom", "kitchen", "deck", "painting"];
  const sizeKeys: SizeKey[] = ["small", "medium", "large", "xlarge"];

  let estimateLow = 0;
  let estimateHigh = 0;
  if (project && size) {
    const cfg = CALCULATOR_PRICING[project];
    if (cfg.flat) {
      estimateLow = cfg.flatPrices[size].low;
      estimateHigh = cfg.flatPrices[size].high;
    } else {
      const area = HOUSE_SIZES[size] * cfg.sizeMultiplier;
      estimateLow = Math.round((area * cfg.pricePerSqft.low) / 100) * 100;
      estimateHigh = Math.round((area * cfg.pricePerSqft.high) / 100) * 100;
    }
  }

  return (
    <section id="calculator" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-block text-xs uppercase tracking-[0.3em] text-primary font-bold mb-3">
            {t.calculator.eyebrow}
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 uppercase tracking-tight">
            {t.calculator.title}
          </h2>
          <p className="text-lg text-muted-foreground">{t.calculator.subtitle}</p>
        </div>

        <div className="max-w-4xl mx-auto bg-card border border-border rounded-md overflow-hidden shadow-xl">
          <div className="p-6 md:p-10 grid md:grid-cols-2 gap-8">
            <div>
              <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center text-xs">1</span>
                {t.calculator.selectProject}
              </p>
              <div className="space-y-2">
                {projectKeys.map((key) => {
                  const cfg = CALCULATOR_PRICING[key];
                  const active = project === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setProject(key)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm border-2 text-left transition-all ${
                        active
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border bg-background hover:border-primary/50 text-foreground"
                      }`}
                      data-testid={`calc-project-${key}`}
                    >
                      <span className="text-2xl" aria-hidden="true">{cfg.icon}</span>
                      <span className="font-bold text-sm md:text-base flex-1">
                        {t.calculator.projectTypes[key]}
                      </span>
                      {active && <Plus className="w-4 h-4 text-primary rotate-45" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center text-xs">2</span>
                {t.calculator.selectSize}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {sizeKeys.map((key) => {
                  const active = size === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSize(key)}
                      className={`flex flex-col items-start gap-1 px-4 py-3 rounded-sm border-2 text-left transition-all ${
                        active
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:border-primary/50"
                      }`}
                      data-testid={`calc-size-${key}`}
                    >
                      <span className="font-bold text-sm uppercase tracking-wide">
                        {t.calculator.sizes[key]}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {t.calculator.sizeRange[key]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-secondary text-secondary-foreground p-6 md:p-10">
            {project && size ? (
              <div className="grid md:grid-cols-2 gap-6 items-center">
                <div>
                  <p className="text-xs uppercase tracking-widest text-secondary-foreground/60 font-bold mb-2">
                    {t.calculator.result}
                  </p>
                  <p className="text-4xl md:text-5xl font-black text-primary leading-none mb-3" data-testid="calc-result">
                    {formatUSD(estimateLow)} – {formatUSD(estimateHigh)}
                  </p>
                  <p className="text-xs text-secondary-foreground/60 leading-relaxed">
                    {t.calculator.disclaimer}
                  </p>
                </div>
                <div className="flex md:justify-end">
                  <a
                    href="#estimate"
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-4 rounded-sm font-bold text-sm uppercase tracking-widest hover:bg-primary/90 transition-colors w-full md:w-auto justify-center"
                    data-testid="link-calc-cta"
                  >
                    {t.calculator.cta}
                    <ChevronRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center text-secondary-foreground/60 flex items-center justify-center gap-2 py-2">
                <Calculator className="w-5 h-5" />
                <span className="text-sm">{t.calculator.pickToStart}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default CalculatorSection;
