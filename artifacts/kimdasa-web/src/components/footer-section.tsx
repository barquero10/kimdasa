import { Phone, MapPin, Mail, Clock } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useGetSiteConfig, getGetSiteConfigQueryKey } from "@workspace/api-client-react";
import { trackPhoneCall } from "@/lib/gtag";
import logoIcon from "@/assets/logo-icon.webp";

const SERVICE_KEYS = [
  "Roofing", "Siding", "Vinyl Siding", "Hardie Siding", "Gutters", "Soffit",
  "Fascia", "Window Capping", "Windows", "Doors", "Exterior Remodeling",
  "Repairs", "Kitchen Remodeling", "Bathroom Remodeling", "Drywall",
  "Interior Painting", "Flooring", "Hardwood Flooring", "Tile Work",
  "Interior Carpentry", "Custom Closets", "Basement Finishing",
  "Attic Finishing", "Interior Demolition",
] as const;

const FOOTER_AREAS: Record<"en" | "es" | "pt", Record<string, string[]>> = {
  en: {
    "New Jersey": ["Bergen", "Essex", "Hudson", "Morris", "Passaic", "Somerset", "Union", "Middlesex", "Monmouth", "Ocean", "Mercer", "Burlington"],
    "Pennsylvania": ["Bucks", "Montgomery", "Philadelphia", "Delaware", "Chester", "Lehigh", "Northampton", "Berks", "Monroe"],
  },
  es: {
    "Nueva Jersey": ["Bergen", "Essex", "Hudson", "Morris", "Passaic", "Somerset", "Union", "Middlesex", "Monmouth", "Ocean", "Mercer", "Burlington"],
    "Pensilvania": ["Bucks", "Montgomery", "Philadelphia", "Delaware", "Chester", "Lehigh", "Northampton", "Berks", "Monroe"],
  },
  pt: {
    "Nova Jersey": ["Bergen", "Essex", "Hudson", "Morris", "Passaic", "Somerset", "Union", "Middlesex", "Monmouth", "Ocean", "Mercer", "Burlington"],
    "Pensilvânia": ["Bucks", "Montgomery", "Philadelphia", "Delaware", "Chester", "Lehigh", "Northampton", "Berks", "Monroe"],
  },
};

export function Footer() {
  const { data: config } = useGetSiteConfig({ query: { queryKey: getGetSiteConfigQueryKey() } });
  const { t, lang } = useLanguage();
  const footerAreas = FOOTER_AREAS[lang];

  return (
    <footer className="bg-black py-16 border-t border-border">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <img src={logoIcon} alt="Kimdasa Construction" className="h-12 w-12" loading="lazy" width={48} height={48} />
            <h3 className="text-lg font-bold uppercase tracking-wider text-white leading-tight">
              {config?.businessName || "Kimdasa Construction"}
            </h3>
          </div>
          <p className="text-slate-400 mb-4 text-sm leading-relaxed">
            {config?.tagline || t.hero.tagline}
          </p>
          <p className="text-slate-500 text-xs mb-6">{t.footer.since}</p>
          <ul className="space-y-3 text-slate-400 text-sm">
            <li className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-primary shrink-0" />
              <a href={`tel:${(config?.phone || "9088003190").replace(/\D/g, "")}`} onClick={trackPhoneCall} className="hover:text-primary transition-colors">
                {config?.phone || "(908) 800-3190"}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-primary shrink-0" />
              {config?.email || "constructionkimdasa@gmail.com"}
            </li>
            <li className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>{config?.address || (lang === "es" ? "Nueva Jersey y Pensilvania" : lang === "pt" ? "Nova Jersey e Pensilvânia" : "New Jersey & Pennsylvania")}</span>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider mb-5 text-white">{t.footer.services}</h4>
          <ul className="space-y-2 text-slate-400 text-sm columns-2">
            {SERVICE_KEYS.map((key) => (
              <li key={key}>
                <a href="#services" className="hover:text-primary transition-colors">
                  {t.services.items[key].title}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider mb-5 text-white">{t.footer.serviceAreas}</h4>
          {Object.entries(footerAreas).map(([state, counties]) => (
            <div key={state} className="mb-4">
              <p className="text-white text-xs font-bold uppercase tracking-wider mb-2">{state}</p>
              <p className="text-slate-500 text-xs leading-relaxed">
                {lang === "es" || lang === "pt"
                  ? `${t.footer.countiesSuffix} de ${counties.join(", ")}`
                  : `${counties.join(", ")} ${t.footer.countiesSuffix}`}
              </p>
            </div>
          ))}
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider mb-5 text-white">{t.footer.quickLinks}</h4>
          <ul className="space-y-3 text-slate-400 text-sm">
            {[
              { href: "#gallery", label: t.footer.links.gallery },
              { href: "#testimonials", label: t.footer.links.testimonials },
              { href: "#areas", label: t.footer.links.areas },
              { href: "#estimate", label: t.footer.links.estimate },
            ].map((link) => (
              <li key={link.href}>
                <a href={link.href} className="hover:text-primary transition-colors">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-xs">
        <span>
          &copy; {new Date().getFullYear()}{" "}
          {config?.businessName || "Kimdasa Construction"}. {t.footer.allRights}
        </span>
        <span className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" />
          {t.footer.licensed}
        </span>
      </div>
    </footer>
  );
}

export default Footer;
