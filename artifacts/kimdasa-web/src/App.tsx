import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/i18n";
import Home from "@/pages/home";
import Gracias from "@/pages/gracias";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function RouteTracker() {
  const [location] = useLocation();
  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        page_path: location,
        page_title: document.title,
      });
    }
  }, [location]);
  return null;
}

function Router() {
  return (
    <>
      <RouteTracker />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/gracias" component={Gracias} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
