import { Link } from "wouter";
import { useLanguage } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-6xl font-bold text-muted-foreground/30">404</h1>
      <p className="mt-2 text-lg font-semibold">{t.notFound.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t.notFound.subtitle}</p>
      <Link href="/" className="mt-6 text-sm text-primary underline-offset-4 hover:underline">{t.notFound.back}</Link>
    </div>
  );
}
