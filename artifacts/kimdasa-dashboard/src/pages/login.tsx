import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { setToken } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HardHat, Lock, Mail } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@kimdasa.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { setUser } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const loginMutation = useLogin();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: (res) => {
          setToken(res.token);
          setUser(res.user);
          qc.invalidateQueries();
          navigate("/");
        },
        onError: () => setError(t.login.error),
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-end mb-3">
          <div className="rounded-md bg-white/10 backdrop-blur px-3 py-1.5">
            <LanguageToggle tone="dark" />
          </div>
        </div>
        <div className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
          <div className="bg-sidebar px-8 py-8 text-center">
            <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
              <HardHat className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">{t.login.title}</h1>
            <p className="text-sm text-white/50 mt-1">{t.login.subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.login.email}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.login.password}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t.login.passwordPlaceholder}
                  className="pl-10"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? t.login.signingIn : t.login.signIn}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              {t.login.defaultHint}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
