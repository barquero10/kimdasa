import { Globe } from "lucide-react";
import { useLanguage, type Language } from "@/lib/i18n";

type Variant = "fixed" | "inline";

const LANGS: { code: Language; label: string; aria: string }[] = [
  { code: "en", label: "EN", aria: "Switch to English" },
  { code: "es", label: "ES", aria: "Cambiar a español" },
  { code: "pt", label: "PT", aria: "Mudar para português" },
];

export function LanguageToggle({ variant = "fixed" }: { variant?: Variant }) {
  const { lang, setLang, toggleLang } = useLanguage();

  if (variant === "inline") {
    return (
      <div
        className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary-foreground/90"
        data-testid="language-toggle-inline"
      >
        <button
          type="button"
          onClick={toggleLang}
          className="inline-flex items-center gap-1 hover:text-primary-foreground transition-colors"
          aria-label="Cycle language"
          data-testid="button-language-toggle-inline"
        >
          <Globe className="w-3.5 h-3.5" />
        </button>
        {LANGS.map((l, i) => (
          <span key={l.code} className="inline-flex items-center gap-1">
            {i > 0 && <span className="text-primary-foreground/50">/</span>}
            <button
              type="button"
              onClick={() => setLang(l.code)}
              aria-label={l.aria}
              aria-pressed={lang === l.code}
              data-testid={`button-language-inline-${l.code}`}
              className={`transition-colors ${
                lang === l.code
                  ? "text-primary-foreground"
                  : "text-primary-foreground/60 hover:text-primary-foreground"
              }`}
            >
              {l.label}
            </button>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div
      className="fixed top-4 right-4 z-[60] bg-card/90 backdrop-blur-sm border border-border rounded-full px-3 py-1.5 shadow-lg flex items-center gap-1.5"
      data-testid="language-toggle"
    >
      <Globe className="w-3.5 h-3.5 text-primary" />
      {LANGS.map((l, i) => (
        <span key={l.code} className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
          {i > 0 && <span className="text-muted-foreground">/</span>}
          <button
            type="button"
            onClick={() => setLang(l.code)}
            aria-label={l.aria}
            aria-pressed={lang === l.code}
            data-testid={`button-language-${l.code}`}
            className={`transition-colors hover:text-primary ${
              lang === l.code ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {l.label}
          </button>
        </span>
      ))}
    </div>
  );
}
