import { useState, useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthContext, getToken, clearToken } from "@/lib/auth";
import { LanguageProvider, useLanguage } from "@/lib/i18n";
import type { User } from "@workspace/api-client-react";
import { useGetMe } from "@workspace/api-client-react";
import DashboardLayout from "@/components/layout";
import LoginPage from "@/pages/login";
import LeadsPage from "@/pages/leads";
import CustomersPage from "@/pages/customers";
import EstimatesPage from "@/pages/estimates";
import JobsPage from "@/pages/jobs";
import FollowUpsPage from "@/pages/follow-ups";
import MarketPricesPage from "@/pages/market-prices";
import AiAssistantsPage from "@/pages/ai-assistants";
import GoogleBusinessPage from "@/pages/google-business";
import SiteSettingsPage from "@/pages/site-settings";
import UsersPage from "@/pages/users";
import OverviewPage from "@/pages/overview";
import NotFound from "@/pages/not-found";
import AppointmentsPage from "@/pages/appointments";
import DesignStudioPage from "@/pages/design-studio";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

function AuthGate() {
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const [, navigate] = useLocation();
  const { fetchAndApplyServerLang } = useLanguage();
  const prevUserRef = useRef<User | null>(null);

  const meQuery = useGetMe({
    query: {
      queryKey: ["me"],
      enabled: !!getToken(),
      retry: (failureCount, error) => {
        const status = (error as { status?: number })?.status;
        if (status === 401) return false;
        return failureCount < 3;
      },
    },
  });

  useEffect(() => {
    if (!getToken()) { setChecked(true); return; }
    if (meQuery.data) {
      setUser(meQuery.data);
      setChecked(true);
    }
    if (meQuery.isError) {
      const status = (meQuery.error as { status?: number })?.status;
      if (status === 401) { clearToken(); setChecked(true); }
      else { setChecked(true); }
    }
  }, [meQuery.data, meQuery.isError, meQuery.error]);

  useEffect(() => {
    if (user && !prevUserRef.current) {
      fetchAndApplyServerLang();
    }
    prevUserRef.current = user;
  }, [user, fetchAndApplyServerLang]);

  const logout = () => {
    clearToken();
    setUser(null);
    queryClient.clear();
    navigate("/login");
  };

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      <Switch>
        <Route path="/login">
          {user ? <Redirect to="/" /> : <LoginPage />}
        </Route>
        {user ? (
          <Route>
            <DashboardLayout>
              <Switch>
                <Route path="/" component={OverviewPage} />
                <Route path="/leads" component={LeadsPage} />
                <Route path="/customers" component={CustomersPage} />
                <Route path="/estimates" component={EstimatesPage} />
                <Route path="/jobs" component={JobsPage} />
                <Route path="/follow-ups" component={FollowUpsPage} />
                <Route path="/market-prices" component={MarketPricesPage} />
                <Route path="/ai-assistants" component={AiAssistantsPage} />
                <Route path="/google-business" component={GoogleBusinessPage} />
                <Route path="/site-settings" component={SiteSettingsPage} />
                <Route path="/users" component={UsersPage} />
                <Route path="/appointments" component={AppointmentsPage} />
                <Route path="/design-studio" component={DesignStudioPage} />
                <Route component={NotFound} />
              </Switch>
            </DashboardLayout>
          </Route>
        ) : (
          <Route>
            <LoginPage />
          </Route>
        )}
      </Switch>
    </AuthContext.Provider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthGate />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
