import { Globe } from "lucide-react";
import { useLanguage, type Language } from "@/lib/i18n";

const LANGS: { code: Language; label: string; aria: string }[] = [
  { code: "en", label: "EN", aria: "Switch to English" },
  { code: "es", label: "ES", aria: "Cambiar a español" },
  { code: "pt", label: "PT", aria: "Mudar para português" },
];

export function LanguageToggle({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const { lang, setLang } = useLanguage();

  const baseInactive =
    tone === "dark"
      ? "text-sidebar-foreground/50 hover:text-white"
      : "text-muted-foreground hover:text-primary";
  const baseActive = tone === "dark" ? "text-white" : "text-primary";
  const sep = tone === "dark" ? "text-sidebar-foreground/30" : "text-muted-foreground/60";
  const icon = tone === "dark" ? "text-sidebar-foreground/60" : "text-primary";

  return (
    <div
      className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
      data-testid="dashboard-language-toggle"
    >
      <Globe className={`w-3.5 h-3.5 ${icon}`} />
      {LANGS.map((l, i) => (
        <span key={l.code} className="inline-flex items-center gap-1.5">
          {i > 0 && <span className={sep}>/</span>}
          <button
            type="button"
            onClick={() => setLang(l.code)}
            aria-label={l.aria}
            aria-pressed={lang === l.code}
            data-testid={`button-dashboard-language-${l.code}`}
            className={`transition-colors ${lang === l.code ? baseActive : baseInactive}`}
          >
            {l.label}
          </button>
        </span>
      ))}
    </div>
  );
}
