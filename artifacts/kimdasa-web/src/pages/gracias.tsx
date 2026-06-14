import { CheckCircle2, Phone, Calendar, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useGetSiteConfig, getGetSiteConfigQueryKey } from "@workspace/api-client-react";

export default function Gracias() {
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const g = t.gracias;
  const { data: config } = useGetSiteConfig({ query: { queryKey: getGetSiteConfigQueryKey() } });
  const phone = (config as Record<string, string> | undefined)?.phone || "(908) 800-3190";

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-24">
      <div className="max-w-lg w-full text-center">
        <div className="flex justify-center mb-6">
          <CheckCircle2 className="w-20 h-20 text-primary" />
        </div>

        <h1 className="text-4xl font-black uppercase tracking-tight mb-4 text-foreground">
          {g.title}
        </h1>

        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
          {g.body}
        </p>

        <div className="bg-card border border-border rounded-sm p-6 mb-8 text-left space-y-4">
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-foreground text-sm uppercase tracking-wide">{g.nextStep1Title}</p>
              <p className="text-muted-foreground text-sm">{g.nextStep1Body}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-foreground text-sm uppercase tracking-wide">{g.nextStep2Title}</p>
              <p className="text-muted-foreground text-sm">{g.nextStep2Body}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            className="h-12 font-bold uppercase tracking-wider px-8"
            onClick={() => navigate("/")}
          >
            {g.backHome} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button
            variant="outline"
            className="h-12 font-bold uppercase tracking-wider px-8"
            asChild
          >
            <a href={`tel:${phone}`}>{g.callUs}</a>
          </Button>
        </div>
      </div>
    </main>
  );
}
