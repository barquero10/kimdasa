import { useGetMarketPrices, getGetMarketPricesQueryKey } from "@workspace/api-client-react";
import { useLanguage } from "@/lib/i18n";

export function PricingSection() {
  const { data: prices, isLoading } = useGetMarketPrices({ query: { queryKey: getGetMarketPricesQueryKey() } });
  const { t, lang } = useLanguage();

  if (isLoading) {
    return <div className="py-24 text-center text-muted-foreground">{t.pricing.loading}</div>;
  }

  if (!prices || prices.length === 0) return null;

  const njPrices = prices.filter((p) => p.region === "new_jersey");
  const paPrices = prices.filter((p) => p.region === "pennsylvania");

  const renderTable = (items: typeof prices) => (
    <div className="space-y-3">
      {items.map((price) => (
        <div
          key={price.id}
          className="bg-background border border-border p-5 rounded-sm hover:border-primary/50 transition-colors"
          data-testid={`price-card-${price.id}`}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h4 className="font-bold text-foreground">{price.category}</h4>
              {price.unit && (
                <div className="text-xs text-muted-foreground mt-0.5">{t.pricing.perUnit} {price.unit}</div>
              )}
            </div>
            <div className="text-right">
              <div className="font-mono text-primary font-bold">
                {price.minPrice && price.avgPrice
                  ? `$${price.minPrice} – $${price.avgPrice}`
                  : price.avgPrice
                  ? `~$${price.avgPrice}`
                  : price.premiumPrice
                  ? `${t.pricing.premiumUpTo} $${price.premiumPrice}`
                  : t.pricing.contactForQuote}
              </div>
              {price.premiumPrice && price.minPrice && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {t.pricing.premiumUpTo} ${price.premiumPrice}
                </div>
              )}
            </div>
          </div>
          {price.notes && (
            <p className="text-xs text-muted-foreground border-t border-border pt-3 mt-3">
              {price.notes}
            </p>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <section id="pricing" className="py-24 bg-card">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 uppercase tracking-tight">
            {t.pricing.title}
          </h2>
          <p className="text-lg text-muted-foreground">{t.pricing.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          <div>
            <h3 className="text-xl font-bold mb-6 pb-3 border-b border-border uppercase tracking-wider text-primary">
              {lang === "es" ? "Nueva Jersey" : "New Jersey"}
            </h3>
            {renderTable(njPrices)}
          </div>
          <div>
            <h3 className="text-xl font-bold mb-6 pb-3 border-b border-border uppercase tracking-wider text-primary">
              {lang === "es" ? "Pensilvania" : "Pennsylvania"}
            </h3>
            {renderTable(paPrices)}
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-12 max-w-2xl mx-auto">
          {t.pricing.footer}
        </p>
      </div>
    </section>
  );
}
