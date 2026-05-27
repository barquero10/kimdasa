import { useState, useEffect } from "react";
import { useGetUsers, useCreateUser, useUpdateUser, getGetUsersQueryKey } from "@workspace/api-client-react";
import type { CreateUserRequestRole, UpdateUserRequestRole } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn, fmtDate } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Plus, Shield, UserCog, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useSearch, useLocation } from "wouter";

const USERS_FILTER_KEY = "users_filter";

const ROLE_VALUES: { value: CreateUserRequestRole; color: string }[] = [
  { value: "admin", color: "bg-red-100 text-red-700" },
  { value: "manager", color: "bg-blue-100 text-blue-700" },
  { value: "staff", color: "bg-muted text-muted-foreground" },
];

function UserForm({ onClose }: { onClose: () => void }) {
  const createMutation = useCreateUser();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "staff" as CreateUserRequestRole });

  const save = () => {
    createMutation.mutate({
      data: { name: form.name, email: form.email, passwordHash: form.password, role: form.role }
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetUsersQueryKey() });
        toast({ title: t.users.userCreated });
        onClose();
      },
      onError: () => toast({ title: t.users.createFailed, variant: "destructive" }),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-2xl border border-border w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-lg">{t.users.newUser}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {([
            { field: "name" as const, label: t.users.fullName, type: "text" },
            { field: "email" as const, label: t.users.email, type: "email" },
            { field: "password" as const, label: t.users.password, type: "password" },
          ]).map(({ field, label, type }) => (
            <div key={field}>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label} *</label>
              <input
                type={type}
                value={form[field]}
                onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.users.role}</label>
            <select
              value={form.role}
              onChange={e => setForm(p => ({ ...p, role: e.target.value as CreateUserRequestRole }))}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1"
            >
              {ROLE_VALUES.map(r => <option key={r.value} value={r.value}>{t.users.roles[r.value]}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <Button onClick={save} disabled={!form.name || !form.email || !form.password || createMutation.isPending} className="flex-1">
              {t.users.createUser}
            </Button>
            <Button variant="outline" onClick={onClose}>{t.common.cancel}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

const LANGUAGE_FILTER_VALUES = ["", "en", "es", "pt"] as const;
const LANGUAGE_FLAG_LABELS: Record<string, string> = { en: "🇺🇸 EN", es: "🇪🇸 ES", pt: "🇧🇷 PT" };

export default function UsersPage() {
  const { data: users = [], isLoading } = useGetUsers();
  const updateMutation = useUpdateUser();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const search = useSearch();
  const [location, navigate] = useLocation();
  const params = new URLSearchParams(search);
  const rawLang = params.get("lang") ?? "";
  const langFilter: "" | "en" | "es" | "pt" = (["en", "es", "pt"].includes(rawLang) ? rawLang : "") as "" | "en" | "es" | "pt";

  const rawRole = params.get("role") ?? "";
  const roleFilter: "" | "admin" | "manager" | "staff" = (["admin", "manager", "staff"].includes(rawRole) ? rawRole : "") as "" | "admin" | "manager" | "staff";

  useEffect(() => {
    const hasRole = params.has("role");
    const hasLang = params.has("lang");
    if (hasRole || hasLang) return;
    try {
      const saved = JSON.parse(localStorage.getItem(USERS_FILTER_KEY) ?? "{}");
      const savedRole = ["admin", "manager", "staff"].includes(saved.role) ? saved.role : "";
      const savedLang = ["en", "es", "pt"].includes(saved.lang) ? saved.lang : "";
      if (savedRole || savedLang) {
        const next = new URLSearchParams(search);
        if (savedRole) next.set("role", savedRole);
        if (savedLang) next.set("lang", savedLang);
        navigate(location + "?" + next.toString(), { replace: true });
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(USERS_FILTER_KEY, JSON.stringify({ role: roleFilter, lang: langFilter }));
    } catch {
    }
  }, [roleFilter, langFilter]);

  const setLangFilter = (val: "" | "en" | "es" | "pt") => {
    const next = new URLSearchParams(search);
    if (val) {
      next.set("lang", val);
    } else {
      next.delete("lang");
    }
    const qs = next.toString();
    navigate(location + (qs ? "?" + qs : ""), { replace: true });
  };

  const setRoleFilter = (val: "" | "admin" | "manager" | "staff") => {
    const next = new URLSearchParams(search);
    if (val) {
      next.set("role", val);
    } else {
      next.delete("role");
    }
    const qs = next.toString();
    navigate(location + (qs ? "?" + qs : ""), { replace: true });
  };

  const handleRoleChange = (id: number, role: UpdateUserRequestRole) => {
    updateMutation.mutate({ id, data: { role } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetUsersQueryKey() });
        toast({ title: t.users.roleUpdated });
      }
    });
  };

  const filteredUsers = users
    .filter(u => !langFilter || (u.dashboardLanguage ?? "") === langFilter)
    .filter(u => !roleFilter || u.role === roleFilter);

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">{t.users.title}</h1>
          <p className="text-sm text-muted-foreground">
            {filteredUsers.length} {filteredUsers.length !== 1 ? t.users.members : t.users.member}
          </p>
        </div>
        {currentUser?.role === "admin" && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />{t.users.addUser}
          </Button>
        )}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.users.roleBreakdown ?? "Roles"}:</span>
        <div className="flex gap-1">
          {ROLE_VALUES.map(({ value, color }) => {
            const count = users.filter(u => u.role === value).length;
            const label = (t.users.roles as Record<string, string>)[value] ?? value;
            const isActive = roleFilter === value;
            return (
              <button
                key={value}
                onClick={() => setRoleFilter(isActive ? "" : value)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1"
                    : cn(color, "hover:opacity-80 hover:ring-1 hover:ring-current/30")
                )}
              >
                {label}
                <span className={cn(
                  "inline-flex items-center justify-center rounded-full w-4 h-4 text-[10px] font-bold",
                  isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-black/10"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.users.filterByRole}:</span>
        <div className="flex gap-1">
          {(["", ...ROLE_VALUES.map(r => r.value)] as ("" | "admin" | "manager" | "staff")[]).map(val => {
            const count = val === ""
              ? users.length
              : users.filter(u => u.role === val).length;
            return (
              <button
                key={val}
                onClick={() => setRoleFilter(val)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                  roleFilter === val
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                )}
              >
                {val === "" ? t.users.filterAll : (t.users.roles as Record<string, string>)[val]}
                <span className={cn(
                  "ml-1.5 inline-flex items-center justify-center rounded-full w-4 h-4 text-[10px] font-bold",
                  roleFilter === val
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.users.filterByLanguage}:</span>
        <div className="flex gap-1">
          {LANGUAGE_FILTER_VALUES.map(val => {
            const count = val === ""
              ? users.length
              : users.filter(u => (u.dashboardLanguage ?? "") === val).length;
            return (
              <button
                key={val}
                onClick={() => setLangFilter(val)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                  langFilter === val
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                )}
              >
                {val === "" ? t.users.filterAll : LANGUAGE_FLAG_LABELS[val]}
                <span className={cn(
                  "ml-1.5 inline-flex items-center justify-center rounded-full w-4 h-4 text-[10px] font-bold",
                  langFilter === val
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {[t.users.cols.user, t.users.cols.email, t.users.cols.role, t.users.cols.language, t.users.cols.joined, ""].map((h, i) => (
                  <th key={i} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map(u => {
                const roleInfo = ROLE_VALUES.find(r => r.value === u.role);
                const roleLabel = (t.users.roles as Record<string, string>)[u.role] ?? u.role;
                const isCurrent = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className={cn("hover:bg-muted/30 transition-colors", isCurrent && "bg-primary/5")}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary uppercase">
                          {u.name[0]}
                        </div>
                        <div>
                          <p className="font-medium">{u.name}</p>
                          {isCurrent && <p className="text-xs text-primary">{t.users.you}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground text-sm">{u.email}</td>
                    <td className="px-5 py-3.5">
                      {currentUser?.role === "admin" && !isCurrent ? (
                        <select
                          value={u.role}
                          onChange={e => handleRoleChange(u.id, e.target.value as UpdateUserRequestRole)}
                          className={cn(
                            "text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer",
                            roleInfo?.color ?? "bg-muted text-muted-foreground"
                          )}
                        >
                          {ROLE_VALUES.map(r => <option key={r.value} value={r.value}>{t.users.roles[r.value]}</option>)}
                        </select>
                      ) : (
                        <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", roleInfo?.color ?? "bg-muted text-muted-foreground")}>
                          {roleLabel}
                          {u.role === "admin" && <Shield className="w-3 h-3 inline ml-1" />}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {u.dashboardLanguage ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {u.dashboardLanguage === "en" ? "🇺🇸" : u.dashboardLanguage === "es" ? "🇪🇸" : u.dashboardLanguage === "pt" ? "🇧🇷" : "🌐"}
                          {u.dashboardLanguage.toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground text-xs">{fmtDate(u.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      <UserCog className="w-4 h-4 text-muted-foreground/40" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <UserForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
