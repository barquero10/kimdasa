import { useState, useEffect, useRef } from "react";
import { useSearch } from "wouter";
import { useLanguage, TRANSLATIONS, type Language } from "@/lib/i18n";
import { useAiChat } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Building2, CheckCircle2, AlertCircle, Loader2,
  Send, Sparkles, Image, Unlink, Link2, RefreshCw, ShieldOff,
  KeyRound, Eye, EyeOff, ExternalLink, Trash2, ChevronDown, ChevronUp,
  FileText, Clock, Copy, Check, BookOpen
} from "lucide-react";
import { getToken, useAuth } from "@/lib/auth";

interface GbStatus {
  connected: boolean;
  hasCredentials: boolean;
  accountName?: string;
  locationName?: string;
  needsAccountPick?: boolean;
  needsLocationPick?: boolean;
}

interface GbLocation {
  name: string;
  title: string;
}

interface GbAccount {
  name: string;
  accountName: string;
}

interface GbCredentials {
  source: "env" | "db" | "none";
  clientIdSet: boolean;
  clientSecretSet: boolean;
  clientIdPreview: string | null;
}

async function fetchGbCredentials(): Promise<GbCredentials> {
  const token = getToken();
  const res = await fetch("/api/google/business/credentials", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to fetch credentials");
  return res.json() as Promise<GbCredentials>;
}

async function verifyGbCredentials(clientId: string, clientSecret: string): Promise<{ valid: boolean; error?: string }> {
  const token = getToken();
  const res = await fetch("/api/google/business/verify-credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  const data = await res.json() as { valid: boolean; error?: string };
  return data;
}

async function saveGbCredentials(clientId: string, clientSecret: string): Promise<void> {
  const token = getToken();
  const res = await fetch("/api/google/business/credentials", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  if (!res.ok) throw new Error("Failed to save credentials");
}

async function clearGbCredentials(): Promise<void> {
  const token = getToken();
  const res = await fetch("/api/google/business/credentials", {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to clear credentials");
}

interface GbPost {
  name: string;
  summary: string;
  createTime: string;
  state: string;
  searchUrl: string | null;
  photoUrl: string | null;
}

interface PostResult {
  success: boolean;
  postName?: string;
  error?: string;
}

async function deleteGbPost(postName: string): Promise<void> {
  const token = getToken();
  const postId = postName.split("/localPosts/")[1];
  if (!postId) throw new Error("Invalid post name");
  const res = await fetch(`/api/google/business/posts/${encodeURIComponent(postId)}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? "Failed to delete post");
  }
}

async function fetchGbPosts(): Promise<GbPost[]> {
  const token = getToken();
  const res = await fetch("/api/google/business/posts", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to fetch posts");
  const data = await res.json() as { posts: GbPost[] };
  return data.posts;
}

async function fetchGbStatus(): Promise<GbStatus> {
  const token = getToken();
  const res = await fetch("/api/google/business/status", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to fetch status");
  return res.json() as Promise<GbStatus>;
}

async function publishPost(text: string, photoUrl: string): Promise<PostResult> {
  const token = getToken();
  const res = await fetch("/api/google/business/post", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ text, photoUrl: photoUrl || undefined }),
  });
  const data = await res.json() as PostResult & { error?: string };
  if (!res.ok) return { success: false, error: data.error ?? "Unknown error" };
  return { success: true, postName: data.postName };
}

async function disconnectGb(): Promise<void> {
  const token = getToken();
  const res = await fetch("/api/google/business/disconnect", {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to disconnect");
}

async function fetchGbLocations(): Promise<GbLocation[]> {
  const token = getToken();
  const res = await fetch("/api/google/business/locations", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to fetch locations");
  const data = await res.json() as { locations: GbLocation[] };
  return data.locations;
}

async function saveGbLocation(locationName: string): Promise<void> {
  const token = getToken();
  const res = await fetch("/api/google/business/location", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ locationName }),
  });
  if (!res.ok) throw new Error("Failed to save location");
}

async function fetchGbAccounts(): Promise<GbAccount[]> {
  const token = getToken();
  const res = await fetch("/api/google/business/accounts", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to fetch accounts");
  const data = await res.json() as { accounts: GbAccount[] };
  return data.accounts;
}

async function saveGbAccount(accountName: string): Promise<{ needsLocationPick: boolean }> {
  const token = getToken();
  const res = await fetch("/api/google/business/account", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ accountName }),
  });
  if (!res.ok) throw new Error("Failed to save account");
  const data = await res.json() as { needsLocationPick?: boolean };
  return { needsLocationPick: !!data.needsLocationPick };
}

function AccountPickerPanel({
  onSaved,
  onCancel,
  canCancel,
  onLoadingChange,
  onAccountsLoaded,
  step,
}: {
  onSaved: (needsLocationPick: boolean) => void;
  onCancel?: () => void;
  canCancel: boolean;
  onLoadingChange?: (loading: boolean) => void;
  onAccountsLoaded?: () => void;
  step?: { current: number; total: number };
}) {
  const { t } = useLanguage();
  const gb = t.googleBusiness;
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<GbAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    onLoadingChange?.(true);
    setLoadError(false);
    fetchGbAccounts()
      .then((accs) => {
        setAccounts(accs);
        if (accs.length > 0) {
          setSelected(accs[0].name);
        }
        onAccountsLoaded?.();
      })
      .catch(() => setLoadError(true))
      .finally(() => {
        setLoading(false);
        onLoadingChange?.(false);
      });
  }, []);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const result = await saveGbAccount(selected);
      toast({ title: gb.accountPickerSaved });
      onSaved(result.needsLocationPick);
    } catch {
      toast({ title: gb.accountPickerSaveError, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 overflow-hidden">
      <div className="px-5 py-4 border-b border-blue-200 dark:border-blue-900 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
          <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">{gb.accountPickerTitle}</p>
          <p className="text-xs text-blue-700/70 dark:text-blue-400/70 mt-0.5">{gb.accountPickerSubtitle}</p>
        </div>
        {step && (
          <span className="shrink-0 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded-full">
            {step.current === 1 ? gb.reconnectStep1of2 : gb.reconnectStep2of2}
          </span>
        )}
      </div>
      <div className="px-5 py-4 space-y-3">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            {gb.accountPickerLoading}
          </div>
        )}
        {!loading && loadError && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            {gb.accountPickerError}
          </div>
        )}
        {!loading && !loadError && accounts.length === 0 && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{gb.accountPickerNoAccounts}</span>
            </div>
            <a
              href="https://business.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              {gb.accountPickerNoAccountsLink}
            </a>
          </div>
        )}
        {!loading && !loadError && accounts.length > 0 && (
          <>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">{gb.accountPickerLabel}</label>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {accounts.map((acc) => (
                  <option key={acc.name} value={acc.name}>{acc.accountName}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              {canCancel && onCancel && (
                <Button variant="outline" size="sm" onClick={onCancel}>
                  {t.common.close}
                </Button>
              )}
              <Button size="sm" onClick={handleSave} disabled={saving || !selected}>
                {saving ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{gb.accountPickerSaving}</>
                ) : (
                  <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />{gb.accountPickerSave}</>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LocationPickerPanel({
  onSaved,
  onCancel,
  canCancel,
  currentLocationName,
  onLoadingChange,
  step,
}: {
  onSaved: () => void;
  onCancel?: () => void;
  canCancel: boolean;
  currentLocationName?: string;
  onLoadingChange?: (loading: boolean) => void;
  step?: { current: number; total: number };
}) {
  const { t } = useLanguage();
  const gb = t.googleBusiness;
  const { toast } = useToast();
  const [locations, setLocations] = useState<GbLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    onLoadingChange?.(true);
    setLoadError(false);
    fetchGbLocations()
      .then((locs) => {
        setLocations(locs);
        if (locs.length > 0) {
          const match = currentLocationName
            ? locs.find((l) => l.name === currentLocationName)
            : undefined;
          setSelected(match ? match.name : locs[0].name);
        }
      })
      .catch(() => setLoadError(true))
      .finally(() => {
        setLoading(false);
        onLoadingChange?.(false);
      });
  }, []);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await saveGbLocation(selected);
      toast({ title: gb.locationPickerSaved });
      onSaved();
    } catch {
      toast({ title: gb.locationPickerSaveError, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 overflow-hidden">
      <div className="px-5 py-4 border-b border-amber-200 dark:border-amber-900 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
          <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{gb.locationPickerTitle}</p>
          <p className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-0.5">{gb.locationPickerSubtitle}</p>
        </div>
        {step && (
          <span className="shrink-0 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full">
            {step.current === 2 ? gb.reconnectStep2of2 : gb.reconnectStep1of2}
          </span>
        )}
      </div>
      <div className="px-5 py-4 space-y-3">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            {gb.locationPickerLoading}
          </div>
        )}
        {!loading && loadError && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            {gb.locationPickerError}
          </div>
        )}
        {!loading && !loadError && locations.length === 0 && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{gb.locationPickerNoLocations}</span>
            </div>
            <a
              href="https://business.google.com/create"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              {gb.locationPickerNoLocationsLink}
            </a>
          </div>
        )}
        {!loading && !loadError && locations.length > 0 && (
          <>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">{gb.locationPickerLabel}</label>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {locations.map((loc) => (
                  <option key={loc.name} value={loc.name}>{loc.title}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              {canCancel && onCancel && (
                <Button variant="outline" size="sm" onClick={onCancel}>
                  {t.common.close}
                </Button>
              )}
              <Button size="sm" onClick={handleSave} disabled={saving || !selected}>
                {saving ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{gb.locationPickerSaving}</>
                ) : (
                  <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />{gb.locationPickerSave}</>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const GUIDE_LANGS: { code: Language; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
  { code: "pt", label: "PT" },
];

function OAuthSetupGuide() {
  const { guideLang, setGuideLang } = useLanguage();
  const gb = TRANSLATIONS[guideLang].googleBusiness;
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [redirectUri, setRedirectUri] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    fetch("/api/google/business/redirect-uri", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() as Promise<{ redirectUri: string }> : Promise.reject())
      .then(data => setRedirectUri(data.redirectUri))
      .catch(() => setRedirectUri(`${window.location.origin}/api/google/business/oauth-callback`));
  }, []);

  const copyRedirectUri = async (uri: string) => {
    try {
      await navigator.clipboard.writeText(uri);
    } catch {
      const el = document.createElement("textarea");
      el.value = uri;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (open && redirectUri) {
      void copyRedirectUri(redirectUri);
    }
  }, [open, redirectUri]);

  const handleOpen = () => {
    setOpen(o => !o);
  };

  const steps: Array<{ title: string; desc: string; link?: string; linkLabel?: string; isRedirect?: boolean }> = [
    {
      title: gb.oauthGuideStep1Title,
      desc: gb.oauthGuideStep1Desc,
      link: "https://console.cloud.google.com/projectcreate",
      linkLabel: gb.oauthGuideStep1Link,
    },
    {
      title: gb.oauthGuideStep2Title,
      desc: gb.oauthGuideStep2Desc,
      link: "https://console.cloud.google.com/apis/library/mybusiness.googleapis.com",
      linkLabel: gb.oauthGuideStep2Link,
    },
    {
      title: gb.oauthGuideStep3Title,
      desc: gb.oauthGuideStep3Desc,
      isRedirect: true,
    },
    {
      title: gb.oauthGuideStep4Title,
      desc: gb.oauthGuideStep4Desc,
      link: "https://console.cloud.google.com/apis/credentials/consent",
      linkLabel: gb.oauthGuideStep4Link,
    },
    {
      title: gb.oauthGuideStep5Title,
      desc: gb.oauthGuideStep5Desc,
      link: "https://console.cloud.google.com/apis/credentials/oauthclient",
      linkLabel: gb.oauthGuideStep5Link,
    },
    {
      title: gb.oauthGuideStep6Title,
      desc: gb.oauthGuideStep6Desc,
    },
  ];

  return (
    <div className="rounded-lg border border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 overflow-hidden">
      <div className="w-full px-4 py-3 flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
        <button
          type="button"
          className="flex items-center gap-2 flex-1 text-left min-w-0"
          onClick={handleOpen}
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">{gb.oauthGuideTitle}</span>
        </button>
        <div className="flex items-center gap-1">
          {GUIDE_LANGS.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              onClick={() => setGuideLang(code)}
              className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors",
                guideLang === code
                  ? "bg-blue-500 text-white"
                  : "text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <button type="button" onClick={handleOpen} className="shrink-0">
          {open
            ? <ChevronUp className="w-3.5 h-3.5 text-blue-400" />
            : <ChevronDown className="w-3.5 h-3.5 text-blue-400" />}
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-blue-100 dark:border-blue-900/50 pt-3">
          {steps.map((step, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-500 dark:bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground leading-snug">{step.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
                {step.isRedirect && redirectUri && (
                  <div className="mt-1.5 flex items-center gap-1.5 rounded bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 px-2 py-1.5">
                    <code className="text-[10px] text-blue-700 dark:text-blue-300 font-mono flex-1 min-w-0 truncate">
                      {redirectUri}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyRedirectUri(redirectUri)}
                      className={cn(
                        "shrink-0 flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors",
                        copied
                          ? "text-green-600 dark:text-green-400"
                          : "text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                      )}
                    >
                      {copied
                        ? <><Check className="w-3 h-3" />{gb.oauthGuideCopied}</>
                        : <><Copy className="w-3 h-3" />{gb.oauthGuideCopy}</>}
                    </button>
                  </div>
                )}
                {step.link && step.linkLabel && (
                  <a
                    href={step.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 hover:underline mt-1"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                    {step.linkLabel}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ApiSetupPanel({
  creds,
  onSaved,
  onConnect,
}: {
  creds: GbCredentials | null;
  onSaved: () => void;
  onConnect: () => Promise<boolean>;
}) {
  const { t } = useLanguage();
  const gb = t.googleBusiness;
  const { toast } = useToast();
  const [open, setOpen] = useState(!creds?.clientIdSet);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [saveAndConnecting, setSaveAndConnecting] = useState(false);
  const redirectingRef = useRef(false);
  const [clearing, setClearing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const resetVerification = () => {
    setVerified(false);
    setVerifyError(null);
  };

  const handleClientIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClientId(e.target.value);
    resetVerification();
  };

  const handleClientSecretChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClientSecret(e.target.value);
    resetVerification();
  };

  const handleVerify = async () => {
    if (!clientId.trim() || !clientSecret.trim()) return;
    setVerifying(true);
    setVerifyError(null);
    setVerified(false);
    try {
      const result = await verifyGbCredentials(clientId.trim(), clientSecret.trim());
      if (result.valid) {
        setVerified(true);
        toast({ title: gb.credentialsVerified });
      } else {
        setVerifyError(result.error ?? gb.credentialsVerifyError);
        toast({ title: result.error ?? gb.credentialsVerifyError, variant: "destructive" });
      }
    } catch {
      setVerifyError(gb.credentialsVerifyFailed);
      toast({ title: gb.credentialsVerifyFailed, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const handleSaveAndConnect = async () => {
    if (!clientId.trim() || !clientSecret.trim()) return;
    redirectingRef.current = false;
    setSaveAndConnecting(true);
    setVerifyError(null);
    try {
      let isVerified = verified;
      if (!isVerified) {
        let verifyResult: { valid: boolean; error?: string };
        try {
          verifyResult = await verifyGbCredentials(clientId.trim(), clientSecret.trim());
        } catch {
          const errMsg = gb.credentialsVerifyFailed;
          setVerifyError(errMsg);
          toast({ title: errMsg, variant: "destructive" });
          return;
        }
        if (verifyResult.valid) {
          setVerified(true);
          isVerified = true;
        } else {
          const errMsg = verifyResult.error ?? gb.credentialsVerifyError;
          setVerifyError(errMsg);
          toast({ title: errMsg, variant: "destructive" });
          return;
        }
      }
      if (!isVerified) return;
      try {
        await saveGbCredentials(clientId.trim(), clientSecret.trim());
      } catch {
        toast({ title: gb.credentialsSaveError, variant: "destructive" });
        return;
      }
      setClientId("");
      setClientSecret("");
      resetVerification();
      onSaved();
      setOpen(false);
      const willRedirect = await onConnect();
      redirectingRef.current = willRedirect;
    } finally {
      if (!redirectingRef.current) {
        setSaveAndConnecting(false);
      }
    }
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      await clearGbCredentials();
      toast({ title: gb.credentialsCleared });
      onSaved();
    } catch {
      toast({ title: gb.credentialsClearError, variant: "destructive" });
    } finally {
      setClearing(false);
    }
  };

  const fromEnv = creds?.source === "env";
  const hasDbCreds = creds?.source === "db";
  const canVerify = !!clientId.trim() && !!clientSecret.trim() && !verifying && !saveAndConnecting;
  const canSaveAndConnect = !!clientId.trim() && !!clientSecret.trim() && !saveAndConnecting && !verifying;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold">{gb.apiSetupTitle}</p>
            {creds && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {fromEnv ? (
                  <span className="text-green-600 dark:text-green-400">{gb.credentialsViaEnv}</span>
                ) : hasDbCreds ? (
                  <span className="text-green-600 dark:text-green-400">{gb.credentialsSet}{creds.clientIdPreview ? ` · ${creds.clientIdPreview}` : ""}</span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">{gb.missingCredentialsShort}</span>
                )}
              </p>
            )}
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">{gb.apiSetupSubtitle}</p>

          {fromEnv ? (
            <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 px-4 py-3">
              <p className="text-xs text-green-800 dark:text-green-300">{gb.apiSetupFromEnv}</p>
            </div>
          ) : (
            <>
              <OAuthSetupGuide />

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">{gb.clientIdLabel}</label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={handleClientIdChange}
                    placeholder={gb.clientIdPlaceholder}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">{gb.clientSecretLabel}</label>
                  <div className="relative">
                    <input
                      type={showSecret ? "text" : "password"}
                      value={clientSecret}
                      onChange={handleClientSecretChange}
                      placeholder={gb.clientSecretPlaceholder}
                      className="w-full border border-border rounded-lg px-3 py-2 pr-10 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {verified && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 px-3 py-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
                  <p className="text-xs text-green-800 dark:text-green-300">{gb.credentialsVerified}</p>
                </div>
              )}

              {verifyError && !verified && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
                  <p className="text-xs text-red-800 dark:text-red-300">{verifyError}</p>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-1">
                <a
                  href={gb.howToGetCredentialsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  {gb.howToGetCredentials}
                </a>
                <div className="flex items-center gap-2">
                  {hasDbCreds && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClear}
                      disabled={clearing}
                      className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900 dark:hover:bg-red-950/30"
                    >
                      {clearing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
                      {gb.clearCredentials}
                    </Button>
                  )}
                  {!verified && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleVerify}
                      disabled={!canVerify}
                    >
                      {verifying ? (
                        <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{gb.verifyingCredentials}</>
                      ) : (
                        <><ShieldOff className="w-3.5 h-3.5 mr-1.5" />{gb.verifyCredentials}</>
                      )}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => { void handleSaveAndConnect(); }}
                    disabled={!canSaveAndConnect}
                  >
                    {saveAndConnecting ? (
                      <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{gb.savingAndConnecting}</>
                    ) : (
                      <><Link2 className="w-3.5 h-3.5 mr-1.5" />{gb.saveAndConnect}</>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StatusCard({
  status,
  onConnect,
  onDisconnect,
  onChangeLocation,
  onChangeAccount,
  loading,
  disconnecting,
  loadingAccountPicker,
  loadingLocationPicker,
  reconnecting,
}: {
  status: GbStatus | null;
  onConnect: () => Promise<boolean>;
  onDisconnect: () => void;
  onChangeLocation: () => void;
  onChangeAccount: () => void;
  loading: boolean;
  disconnecting?: boolean;
  loadingAccountPicker?: boolean;
  loadingLocationPicker?: boolean;
  reconnecting?: boolean;
}) {
  const { t } = useLanguage();
  const gb = t.googleBusiness;
  const [connecting, setConnecting] = useState(false);

  const handleConnectClick = async () => {
    setConnecting(true);
    const redirected = await onConnect();
    if (!redirected) setConnecting(false);
  };

  if (loading || !status) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{t.common.loading}</span>
      </div>
    );
  }

  if (status.connected) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">{gb.connected}</p>
                {(reconnecting || loadingAccountPicker || loadingLocationPicker) && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-full px-2 py-0.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {gb.reconnectingInProgress}
                  </span>
                )}
              </div>
              {status.accountName && (
                <p className="text-xs text-green-700/70 dark:text-green-400/70 mt-0.5">
                  {gb.account}: <span className="font-medium">{status.accountName}</span>
                </p>
              )}
              {status.locationName && (
                <p className="text-xs text-green-700/70 dark:text-green-400/70">
                  {gb.location}: <span className="font-medium">{status.locationName}</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <button
              onClick={onChangeAccount}
              disabled={loadingAccountPicker}
              className="inline-flex items-center gap-1 text-xs text-green-700/70 dark:text-green-400/70 hover:text-green-800 dark:hover:text-green-300 underline underline-offset-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:no-underline"
            >
              {loadingAccountPicker && <Loader2 className="w-3 h-3 animate-spin" />}
              {gb.accountPickerChange}
            </button>
            <button
              onClick={onChangeLocation}
              disabled={loadingLocationPicker}
              className="inline-flex items-center gap-1 text-xs text-green-700/70 dark:text-green-400/70 hover:text-green-800 dark:hover:text-green-300 underline underline-offset-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:no-underline"
            >
              {loadingLocationPicker && <Loader2 className="w-3 h-3 animate-spin" />}
              {gb.locationPickerChange}
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDisconnect}
              disabled={disconnecting}
              className="text-xs border-green-300 text-green-800 hover:bg-green-100 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900/40"
            >
              {disconnecting ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{gb.disconnecting}</>
              ) : (
                <><Unlink className="w-3.5 h-3.5 mr-1.5" />{gb.disconnect}</>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Building2 className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{gb.notConnected}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{gb.notConnectedDesc}</p>
          {!status.hasCredentials && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{gb.missingCredentials}</span>
            </div>
          )}
        </div>
        <Button
          onClick={handleConnectClick}
          disabled={!status.hasCredentials || connecting}
          size="sm"
          className="shrink-0"
        >
          {connecting ? (
            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{gb.redirectingToGoogle}</>
          ) : (
            <><Link2 className="w-3.5 h-3.5 mr-1.5" />{gb.connect}</>
          )}
        </Button>
      </div>
    </div>
  );
}

function AiSuggestPanel({
  onInsert,
  lang,
}: {
  onInsert: (text: string) => void;
  lang: "en" | "es" | "pt";
}) {
  const { t } = useLanguage();
  const gb = t.googleBusiness;
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const chatMutation = useAiChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    const text = prompt.trim();
    if (!text || chatMutation.isPending) return;
    setPrompt("");
    const userMsg = { role: "user" as const, content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    chatMutation.mutate(
      { data: { agentType: "marketing", messages: history, language: lang } },
      {
        onSuccess: (res) => {
          setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
        },
        onError: () => {
          setMessages((prev) => [...prev, { role: "assistant", content: t.aiAssistants.errorReply }]);
        },
      }
    );
  };

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full"
      >
        <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
        {gb.askAi}
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-amber-500 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold">{gb.aiPanelTitle}</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {t.common.close}
        </button>
      </div>

      {messages.length === 0 && (
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">{gb.aiPanelHint}</p>
        </div>
      )}

      {messages.length > 0 && (
        <div className="max-h-56 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
              {m.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shrink-0 mt-0.5 text-white text-xs font-bold">
                  AI
                </div>
              )}
              <div className={cn(
                "max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground group"
              )}>
                {m.content}
                {m.role === "assistant" && (
                  <button
                    onClick={() => onInsert(m.content)}
                    className="mt-1.5 block text-[10px] font-medium text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    {gb.useThisPost}
                  </button>
                )}
              </div>
            </div>
          ))}
          {chatMutation.isPending && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shrink-0 text-white text-xs font-bold">AI</div>
              <div className="bg-muted rounded-xl px-3 py-2 flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder={gb.aiPromptPlaceholder}
            className="flex-1 border border-border rounded-lg px-3 py-2 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            onClick={send}
            disabled={!prompt.trim() || chatMutation.isPending}
            size="icon"
            className="h-8 w-8 shrink-0 rounded-lg"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function PostThumbnail({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div className="shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-border bg-muted mt-0.5">
      <img
        src={url}
        alt=""
        className="w-full h-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function RecentPostsPanel({
  posts,
  loading,
  error,
  onRefresh,
  onDelete,
}: {
  posts: GbPost[];
  loading: boolean;
  error: boolean;
  onRefresh: () => void;
  onDelete: (postName: string) => Promise<void>;
}) {
  const { t } = useLanguage();
  const gb = t.googleBusiness;
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDelete = async (postName: string) => {
    setDeletingName(postName);
    try {
      await onDelete(postName);
      toast({ title: gb.deletePostSuccess });
    } catch (err) {
      toast({ title: gb.deletePostError, description: String(err instanceof Error ? err.message : err), variant: "destructive" });
    } finally {
      setDeletingName(null);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between gap-3 border-b border-border bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold">{gb.recentPostsTitle}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{gb.recentPostsSubtitle}</p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          title={gb.refreshPosts}
          className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      <div className="divide-y divide-border">
        {loading && (
          <div className="px-5 py-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            {gb.loadingPosts}
          </div>
        )}

        {!loading && error && (
          <div className="px-5 py-6 flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {gb.postsError}
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="px-5 py-8 text-center">
            <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{gb.noRecentPosts}</p>
          </div>
        )}

        {!loading && !error && posts.map((post) => {
          const date = post.createTime
            ? new Date(post.createTime).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
            : "";
          const stateUpper = post.state?.toUpperCase() ?? "";
          const isLive = stateUpper === "LIVE";
          const isDeleted = stateUpper === "DELETED";
          const statusLabel = isLive
            ? gb.postStatusLive
            : isDeleted
            ? gb.postStatusDeleted
            : post.state;
          const statusClass = isLive
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : isDeleted
            ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
          const isDeleting = deletingName === post.name;
          return (
            <div key={post.name} className="px-5 py-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground line-clamp-3 leading-relaxed">
                  {post.summary || "—"}
                </p>
                <div className="flex items-center gap-3 mt-1.5">
                  {date && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {date}
                    </span>
                  )}
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    statusClass
                  )}>
                    {statusLabel}
                  </span>
                  {isLive && post.searchUrl && (
                    <a
                      href={post.searchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={gb.openOnGoogle}
                      className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {gb.openOnGoogle}
                    </a>
                  )}
                </div>
              </div>
              {post.photoUrl && (
                <PostThumbnail url={post.photoUrl} />
              )}
              <button
                onClick={() => { void handleDelete(post.name); }}
                disabled={isDeleting || !!deletingName}
                title={isDeleting ? gb.deletingPost : gb.deletePost}
                aria-label={isDeleting ? gb.deletingPost : gb.deletePost}
                className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 disabled:pointer-events-none mt-0.5"
              >
                {isDeleting
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function GoogleBusinessPage() {
  const { t, lang } = useLanguage();
  const gb = t.googleBusiness;
  const { toast } = useToast();
  const { user } = useAuth();
  const searchStr = useSearch();

  if (user && user.role !== "admin" && user.role !== "manager") {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <ShieldOff className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">{gb.adminOnly}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">{gb.adminOnlyDesc}</p>
        </div>
      </div>
    );
  }

  const [status, setStatus] = useState<GbStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [creds, setCreds] = useState<GbCredentials | null>(null);
  const [postText, setPostText] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [posts, setPosts] = useState<GbPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [loadingAccountPicker, setLoadingAccountPicker] = useState(false);
  const [loadingLocationPicker, setLoadingLocationPicker] = useState(false);
  const [accountsFetchFailedOnCallback, setAccountsFetchFailedOnCallback] = useState(false);
  const [locationPickFromReconnect, setLocationPickFromReconnect] = useState(false);

  const loadPosts = async () => {
    setPostsLoading(true);
    setPostsError(false);
    try {
      const p = await fetchGbPosts();
      setPosts(p);
    } catch {
      setPostsError(true);
    } finally {
      setPostsLoading(false);
    }
  };

  const loadStatus = async () => {
    setStatusLoading(true);
    try {
      const [s, c] = await Promise.all([fetchGbStatus(), fetchGbCredentials()]);
      setStatus(s);
      setCreds(c);
      if (s.connected) {
        void loadPosts();
      }
    } catch {
      setStatus({ connected: false, hasCredentials: false });
    } finally {
      setStatusLoading(false);
    }
  };

  const reloadCreds = async () => {
    try {
      const [c, s] = await Promise.all([fetchGbCredentials(), fetchGbStatus()]);
      setCreds(c);
      setStatus(s);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(searchStr);
    if (params.get("connected") === "1") {
      toast({ title: gb.connectedToast });
      if (params.get("needs_account") === "1") {
        setShowAccountPicker(true);
        setAccountsFetchFailedOnCallback(true);
      } else if (params.get("needs_location") === "1") {
        setShowLocationPicker(true);
      }
      loadStatus();
    }
    if (params.get("error")) {
      const err = params.get("error") ?? "unknown";
      toast({ title: gb.connectionError, description: err, variant: "destructive" });
    }
  }, [searchStr]);

  useEffect(() => {
    if (status?.connected && status.needsAccountPick) {
      setShowAccountPicker(true);
    } else if (status?.connected && status.needsLocationPick) {
      setShowLocationPicker(true);
    }
  }, [status]);

  const handleConnect = async (): Promise<boolean> => {
    try {
      const token = getToken();
      const res = await fetch("/api/google/business/auth-url", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        toast({ title: t.googleBusiness.connectionError, variant: "destructive" });
        return false;
      }
      const { url } = await res.json() as { url: string };
      toast({ title: t.googleBusiness.redirectingToGoogle });
      window.location.href = url;
      return true;
    } catch {
      toast({ title: t.googleBusiness.connectionError, variant: "destructive" });
      return false;
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnectGb();
      setStatus({ connected: false, hasCredentials: !!(status?.hasCredentials) });
      toast({ title: gb.disconnectedToast });
    } catch {
      toast({ title: gb.disconnectError, variant: "destructive" });
    } finally {
      setDisconnecting(false);
    }
  };

  const handlePublish = async () => {
    if (!postText.trim()) {
      toast({ title: gb.emptyPostError, variant: "destructive" });
      return;
    }
    if (photoUrl.trim() && !/^https?:\/\/.+\..+/.test(photoUrl.trim())) {
      toast({ title: gb.invalidPhotoUrl, variant: "destructive" });
      return;
    }
    setPublishing(true);
    try {
      const result = await publishPost(postText, photoUrl);
      if (result.success) {
        toast({ title: gb.publishSuccess });
        setPostText("");
        setPhotoUrl("");
        void loadPosts();
      } else {
        toast({ title: gb.publishError, description: result.error, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: gb.publishError, description: String(err), variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  const shouldShowAccountPicker =
    showAccountPicker || (!statusLoading && !!status?.connected && !!status?.needsAccountPick);
  const shouldShowLocationPicker =
    showLocationPicker || (!statusLoading && !!status?.connected && !!status?.needsLocationPick);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{gb.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{gb.subtitle}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={loadStatus} disabled={statusLoading} className="rounded-lg">
          <RefreshCw className={cn("w-4 h-4", statusLoading && "animate-spin")} />
        </Button>
      </div>

      <ApiSetupPanel creds={creds} onSaved={reloadCreds} onConnect={handleConnect} />

      <StatusCard
        status={status}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onChangeLocation={() => {
          setShowAccountPicker(false);
          setLoadingAccountPicker(false);
          setShowLocationPicker(true);
        }}
        onChangeAccount={() => {
          setShowLocationPicker(false);
          setLoadingLocationPicker(false);
          setShowAccountPicker(true);
          setAccountsFetchFailedOnCallback(false);
        }}
        loading={statusLoading}
        disconnecting={disconnecting}
        loadingAccountPicker={loadingAccountPicker}
        loadingLocationPicker={loadingLocationPicker}
        reconnecting={!shouldShowAccountPicker && !shouldShowLocationPicker && !!(status?.needsAccountPick || status?.needsLocationPick)}
      />

      {status?.connected && shouldShowAccountPicker && accountsFetchFailedOnCallback && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 px-5 py-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{gb.accountsFetchFailedWarning}</p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">{gb.accountsFetchFailedHint}</p>
          </div>
        </div>
      )}

      {status?.connected && shouldShowAccountPicker && (
        <AccountPickerPanel
          step={{ current: 1, total: 2 }}
          canCancel={!status.needsAccountPick}
          onCancel={() => {
            setShowAccountPicker(false);
            setLoadingAccountPicker(false);
            setAccountsFetchFailedOnCallback(false);
          }}
          onSaved={(needsLocationPick) => {
            setShowAccountPicker(false);
            setLoadingAccountPicker(false);
            if (accountsFetchFailedOnCallback) {
              if (needsLocationPick) {
                setLocationPickFromReconnect(true);
              } else {
                toast({ title: gb.accountsReconnectSuccess });
              }
            }
            setAccountsFetchFailedOnCallback(false);
            if (needsLocationPick) {
              setShowLocationPicker(true);
            }
            void loadStatus();
          }}
          onLoadingChange={setLoadingAccountPicker}
          onAccountsLoaded={() => {
            // intentionally no toast here — success toast fires in onSaved once
            // we know whether a location pick is still required
          }}
        />
      )}

      {status?.connected && !shouldShowAccountPicker && shouldShowLocationPicker && (
        <LocationPickerPanel
          step={{ current: 2, total: 2 }}
          canCancel={!status.needsLocationPick}
          currentLocationName={status.locationName}
          onCancel={() => {
            setShowLocationPicker(false);
            setLoadingLocationPicker(false);
          }}
          onSaved={() => {
            setShowLocationPicker(false);
            setLoadingLocationPicker(false);
            if (locationPickFromReconnect) {
              toast({ title: gb.locationReconnectSuccess });
              setLocationPickFromReconnect(false);
            }
            void loadStatus();
          }}
          onLoadingChange={setLoadingLocationPicker}
        />
      )}

      {status?.connected && !status.needsAccountPick && !status.needsLocationPick && !shouldShowAccountPicker && !shouldShowLocationPicker && !status.locationName && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{gb.locationPickerNoLocations}</p>
              <a
                href="https://business.google.com/create"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                {gb.locationPickerNoLocationsLink}
              </a>
              <div className="pt-2">
                <button
                  onClick={() => void loadStatus()}
                  disabled={statusLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900 disabled:opacity-60 transition-colors"
                >
                  {statusLoading ? (
                    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                    </svg>
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  {gb.locationPickerNoLocationsRefresh}
                </button>
              </div>
              <div className="pt-0">
                <button
                  onClick={() => { setShowAccountPicker(true); setShowLocationPicker(false); }}
                  className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 hover:underline underline-offset-2 underline"
                >
                  {gb.locationPickerNoLocationsReconnect}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {status?.connected && !status.needsAccountPick && !status.needsLocationPick && !shouldShowAccountPicker && !shouldShowLocationPicker && !!status.locationName && (
        <>
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold mb-1">{gb.composeTitle}</h2>
              <p className="text-xs text-muted-foreground">{gb.composeSubtitle}</p>
            </div>

            <textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder={gb.postPlaceholder}
              rows={5}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />

            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                <Image className="w-3.5 h-3.5" />
                {gb.photoUrlLabel}
              </label>
              <input
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder={gb.photoUrlPlaceholder}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-xs text-muted-foreground">
                {postText.length} {gb.charCount}
              </span>
              <Button onClick={handlePublish} disabled={publishing || !postText.trim()}>
                {publishing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {gb.publishing}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {gb.publish}
                  </>
                )}
              </Button>
            </div>
          </div>

          <AiSuggestPanel onInsert={(text) => setPostText(text)} lang={lang} />

          <RecentPostsPanel
            posts={posts}
            loading={postsLoading}
            error={postsError}
            onRefresh={loadPosts}
            onDelete={async (postName) => {
              await deleteGbPost(postName);
              await loadPosts();
            }}
          />
        </>
      )}

      {!status?.connected && !statusLoading && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Building2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">{gb.connectToPost}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">{gb.connectToPostDesc}</p>
        </div>
      )}
    </div>
  );
}
