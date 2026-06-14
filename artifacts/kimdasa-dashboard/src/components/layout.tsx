import { useState } from "react";
import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { LanguageToggle } from "@/components/language-toggle";
import {
  LayoutDashboard, Users, FileText, Briefcase, Calendar,
  DollarSign, Bot, Settings, UserCog, X, LogOut,
  HardHat, Building2, Box, MoreHorizontal, Star
} from "lucide-react";

const NAV_ALL = (t: ReturnType<typeof useLanguage>["t"]) => [
  { href: "/",               label: t.nav.overview,       icon: LayoutDashboard },
  { href: "/leads",          label: t.nav.leads,           icon: Users },
  { href: "/jobs",           label: t.nav.jobs,            icon: Briefcase },
  { href: "/estimates",      label: t.nav.estimates,       icon: FileText },
  { href: "/design-studio",  label: t.nav.designStudio,   icon: Box },
  { href: "/customers",      label: t.nav.customers,       icon: UserCog },
  { href: "/appointments",   label: t.nav.appointments,    icon: Calendar },
  { href: "/follow-ups",     label: t.nav.followUps,       icon: Calendar },
  { href: "/ai-assistants",  label: t.nav.aiAssistants,   icon: Bot },
  { href: "/market-prices",  label: t.nav.marketPrices,   icon: DollarSign },
  { href: "/google-business",label: t.nav.googleBusiness, icon: Star },
  { href: "/site-settings",  label: t.nav.siteSettings,   icon: Settings },
  { href: "/users",          label: t.nav.users,           icon: UserCog },
];

const BOTTOM_NAV_HREFS = ["/", "/leads", "/jobs", "/design-studio"];

function MoreDrawer({ onClose }: { onClose: () => void }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const all = NAV_ALL(t);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-sidebar rounded-t-2xl max-h-[85vh] flex flex-col lg:hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-sidebar-primary rounded-lg flex items-center justify-center">
              <HardHat className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="text-sm font-bold text-white">Kimdasa Admin</p>
          </div>
          <button onClick={onClose} className="text-sidebar-foreground/60 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 grid grid-cols-2 gap-1.5 content-start">
          {all.map(({ href, label, icon: Icon }) => {
            const active = location === href || (href !== "/" && location.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-white"
                    : "text-sidebar-foreground/70 bg-sidebar-accent/30 hover:bg-sidebar-accent"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-sidebar-border space-y-3">
          <LanguageToggle tone="dark" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center text-xs font-bold text-white uppercase">
                {user?.name?.[0] ?? "A"}
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{user?.name ?? "Admin"}</p>
                <p className="text-xs text-sidebar-foreground/50 capitalize">{user?.role ?? "admin"}</p>
              </div>
            </div>
            <button
              onClick={() => { logout(); onClose(); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-white transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              {t.nav.signOut}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const all = NAV_ALL(t);

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
          <HardHat className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-none">Kimdasa</p>
          <p className="text-xs text-sidebar-foreground/50 mt-0.5">{t.nav.adminDashboard}</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {all.map(({ href, label, icon: Icon }) => {
          const active = location === href || (href !== "/" && location.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-white"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border space-y-3">
        <div className="px-2">
          <LanguageToggle tone="dark" />
        </div>
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-xs font-bold text-sidebar-primary uppercase">
            {user?.name?.[0] ?? "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.name ?? "Admin"}</p>
            <p className="text-xs text-sidebar-foreground/50 truncate capitalize">{user?.role ?? "admin"}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t.nav.signOut}
        </button>
      </div>
    </div>
  );
}

function BottomNav({ onMoreClick }: { onMoreClick: () => void }) {
  const [location] = useLocation();
  const { t } = useLanguage();
  const all = NAV_ALL(t);
  const bottomItems = all.filter(item => BOTTOM_NAV_HREFS.includes(item.href));

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-sidebar border-t border-sidebar-border flex items-stretch"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {bottomItems.map(({ href, label, icon: Icon }) => {
        const active = location === href || (href !== "/" && location.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors"
          >
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
              active ? "bg-sidebar-primary" : ""
            )}>
              <Icon className={cn("w-5 h-5", active ? "text-white" : "text-sidebar-foreground/50")} />
            </div>
            <span className={cn(
              "text-[10px] font-medium leading-none",
              active ? "text-sidebar-primary" : "text-sidebar-foreground/40"
            )}>
              {label}
            </span>
          </Link>
        );
      })}

      <button
        onClick={onMoreClick}
        className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors"
      >
        <div className="w-8 h-8 rounded-xl flex items-center justify-center">
          <MoreHorizontal className="w-5 h-5 text-sidebar-foreground/50" />
        </div>
        <span className="text-[10px] font-medium leading-none text-sidebar-foreground/40">Más</span>
      </button>
    </nav>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col">
        <Sidebar />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto pb-[64px] lg:pb-0">
          {children}
        </main>
      </div>

      <BottomNav onMoreClick={() => setMoreOpen(true)} />
      {moreOpen && <MoreDrawer onClose={() => setMoreOpen(false)} />}
    </div>
  );
}
