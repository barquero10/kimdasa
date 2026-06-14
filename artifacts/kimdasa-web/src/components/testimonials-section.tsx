import { Star } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import {
  useGetSiteConfig,
  getGetSiteConfigQueryKey,
  useGetGoogleReviews,
  getGetGoogleReviewsQueryKey,
} from "@workspace/api-client-react";

const TESTIMONIALS = [
  {
    name: "Michael T.",
    location: { en: "Morris County, NJ", es: "Condado de Morris, NJ", pt: "Condado de Morris, NJ" },
    service: { en: "Full Roof Replacement", es: "Reemplazo total de techo", pt: "Substituição completa de telhado" },
    quote: {
      en: "Kimdasa replaced our entire roof in one day. The crew was professional, cleaned up completely, and the price was exactly what they quoted. No surprises.",
      es: "Kimdasa reemplazó todo nuestro techo en un día. El equipo fue profesional, limpió completamente, y el precio fue exactamente el que cotizaron. Sin sorpresas.",
      pt: "A Kimdasa substituiu todo o nosso telhado em um dia. A equipe foi profissional, limpou tudo e o preço foi exatamente o que orçaram. Sem surpresas.",
    },
    rating: 5,
  },
  {
    name: "Sandra L.",
    location: { en: "Bucks County, PA", es: "Condado de Bucks, PA", pt: "Condado de Bucks, PA" },
    service: { en: "Siding & Gutters", es: "Revestimiento y canaletas", pt: "Revestimento e calhas" },
    quote: {
      en: "I got three quotes and Kimdasa earned the job — not because they were the cheapest, but because they took time to explain what we actually needed and what we didn't.",
      es: "Pedí tres cotizaciones y Kimdasa se ganó el trabajo — no por ser los más baratos, sino porque se tomaron el tiempo para explicar lo que realmente necesitábamos y lo que no.",
      pt: "Recebi três orçamentos e a Kimdasa ganhou o trabalho — não por serem os mais baratos, mas porque dedicaram tempo para explicar o que realmente precisávamos e o que não precisávamos.",
    },
    rating: 5,
  },
  {
    name: "Carlos R.",
    location: { en: "Bergen County, NJ", es: "Condado de Bergen, NJ", pt: "Condado de Bergen, NJ" },
    service: { en: "Windows & Doors", es: "Ventanas y puertas", pt: "Janelas e portas" },
    quote: {
      en: "We spoke in Spanish, which was very important to us. The work was excellent and they finished earlier than expected.",
      es: "Hablamos en español, lo cual fue muy importante para nosotros. El trabajo fue excelente y terminaron antes de lo esperado.",
      pt: "Conversamos em espanhol, o que foi muito importante para nós. O trabalho foi excelente e terminaram antes do previsto.",
    },
    rating: 5,
  },
  {
    name: "Diane W.",
    location: { en: "Montgomery County, PA", es: "Condado de Montgomery, PA", pt: "Condado de Montgomery, PA" },
    service: { en: "Decking", es: "Terrazas", pt: "Decks" },
    quote: {
      en: "Our new deck looks better than we imagined. They matched the color to our existing siding perfectly. We've already referred them to two neighbors.",
      es: "Nuestra nueva terraza luce mejor de lo que imaginábamos. Combinaron el color con nuestro revestimiento perfectamente. Ya los hemos recomendado a dos vecinos.",
      pt: "Nosso novo deck ficou melhor do que imaginávamos. Combinaram a cor com o revestimento existente perfeitamente. Já os indicamos a dois vizinhos.",
    },
    rating: 5,
  },
];

function GoogleStars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const cls = size === "md" ? "w-5 h-5" : "w-4 h-4";
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${cls} ${i < full ? "fill-primary text-primary" : i === full && half ? "fill-primary/50 text-primary" : "fill-muted text-muted"}`}
        />
      ))}
    </div>
  );
}

export function TestimonialsSection() {
  const { t, lang } = useLanguage();
  const { data: config } = useGetSiteConfig({ query: { queryKey: getGetSiteConfigQueryKey() } });
  const cfgMap = config as Record<string, string | null> | undefined;
  const placeId = cfgMap?.googlePlaceId;
  const reviewUrl = cfgMap?.googleReviewUrl;
  const address = cfgMap?.address;

  const { data: googleData, isLoading } = useGetGoogleReviews({
    query: {
      queryKey: getGetGoogleReviewsQueryKey(),
      enabled: !!placeId,
      staleTime: 30 * 60 * 1000,
      retry: false,
    },
  });

  const hasLiveReviews = !!googleData && googleData.reviews.length > 0;
  const usingFallback = !isLoading && (!placeId || !hasLiveReviews);

  const effectiveReviewUrl = reviewUrl
    || (placeId ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}` : null);

  const mapSrc = placeId
    ? address
      ? `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed&z=13`
      : `https://maps.google.com/maps?q=place_id:${encodeURIComponent(placeId)}&output=embed&z=13`
    : null;

  return (
    <section id="testimonials" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 uppercase tracking-tight">
            {t.testimonials.title}
          </h2>
          <p className="text-lg text-muted-foreground mb-6">{t.testimonials.subtitle}</p>

          {googleData && googleData.userRatingsTotal > 0 && (
            <div className="inline-flex items-center gap-3 bg-secondary border border-border rounded-sm px-5 py-3 mb-2"
              data-testid="badge-google-rating"
            >
              <GoogleStars rating={googleData.rating} size="md" />
              <span className="text-sm font-semibold">
                {t.testimonials.ratingBadge(googleData.rating, googleData.userRatingsTotal)}
              </span>
              <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
          )}

          {isLoading && placeId && (
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground py-2">
              <span className="inline-block w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin" />
              <span>{t.testimonials.loading}</span>
            </div>
          )}

          {usingFallback && placeId && (
            <p className="text-xs text-muted-foreground mt-2" data-testid="text-fallback-notice">
              {t.testimonials.fallbackNotice}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {isLoading && placeId
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-card border border-border p-8 rounded-sm animate-pulse" aria-hidden="true">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <div key={j} className="w-4 h-4 rounded-sm bg-muted" />
                    ))}
                  </div>
                  <div className="space-y-2 mb-6">
                    <div className="h-3 bg-muted rounded-sm w-full" />
                    <div className="h-3 bg-muted rounded-sm w-5/6" />
                    <div className="h-3 bg-muted rounded-sm w-4/6" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted" />
                    <div className="space-y-1">
                      <div className="h-3 bg-muted rounded-sm w-24" />
                      <div className="h-2 bg-muted rounded-sm w-16" />
                    </div>
                  </div>
                </div>
              ))
            : hasLiveReviews
            ? googleData.reviews.map((rv, i) => (
                <div key={i} className="bg-card border border-border p-8 rounded-sm" data-testid={`card-testimonial-${i}`}>
                  <GoogleStars rating={rv.rating} />
                  <blockquote className="text-foreground leading-relaxed my-4 italic">
                    "{rv.text}"
                  </blockquote>
                  <div className="flex items-center gap-3 mt-auto">
                    {rv.authorPhoto && (
                      <img
                        src={rv.authorPhoto}
                        alt={rv.authorName}
                        className="w-9 h-9 rounded-full object-cover border border-border"
                        loading="lazy"
                      />
                    )}
                    <div>
                      <div className="font-bold text-sm">{rv.authorName}</div>
                      <div className="text-xs text-muted-foreground">{rv.relativeTime}</div>
                    </div>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 ml-auto shrink-0 opacity-60" aria-label="Google review">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                </div>
              ))
            : TESTIMONIALS.map((tst, i) => (
                <div key={i} className="bg-card border border-border p-8 rounded-sm" data-testid={`card-testimonial-${i}`}>
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: tst.rating }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <blockquote className="text-foreground leading-relaxed mb-6 italic">
                    "{tst.quote[lang]}"
                  </blockquote>
                  <div>
                    <div className="font-bold">{tst.name}</div>
                    <div className="text-sm text-muted-foreground">{tst.location[lang]}</div>
                    <div className="text-xs text-primary uppercase tracking-wider mt-1">{tst.service[lang]}</div>
                  </div>
                </div>
              ))}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          {placeId && effectiveReviewUrl && (
            <a
              href={effectiveReviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-background border-2 border-primary text-primary px-6 py-3 rounded-sm font-bold text-sm uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors"
              data-testid="link-leave-review"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t.testimonials.leaveReview}
            </a>
          )}
          {hasLiveReviews && (
            <p className="text-xs text-muted-foreground">{t.testimonials.poweredBy}</p>
          )}
        </div>

        {placeId && mapSrc && (
          <div className="mt-14 max-w-5xl mx-auto" data-testid="section-google-map">
            <p className="text-xs uppercase tracking-widest text-muted-foreground text-center mb-4 font-bold">
              {t.testimonials.mapTitle}
            </p>
            <div className="rounded-sm overflow-hidden border border-border shadow-sm" style={{ height: 300 }}>
              <iframe
                title={t.testimonials.mapTitle}
                src={mapSrc}
                width="100%"
                height="300"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="block w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-popups"
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default TestimonialsSection;
