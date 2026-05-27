import { useState, useEffect } from "react";
import { useGetSiteConfig, useUpdateSiteConfig, getGetSiteConfigQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Settings, Save, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";

const FIELD_KEYS = [
  { key: "businessName", type: "text" },
  { key: "phone", type: "tel" },
  { key: "email", type: "email" },
  { key: "address", type: "text" },
  { key: "tagline", type: "text" },
  { key: "whatsapp", type: "tel" },
  { key: "heroModalEnabled", type: "text" },
  { key: "googlePlaceId", type: "text" },
  { key: "googleReviewUrl", type: "url" },
  { key: "googleReviewEmailEnabled", type: "text" },
  { key: "googleAdsId", type: "text" },
  { key: "googleAdsLeadLabel", type: "text" },
  { key: "googleAdsBookingLabel", type: "text" },
  { key: "googleAdsCallLabel", type: "text" },
  { key: "ga4Id", type: "text" },
] as const;

type FieldKey = typeof FIELD_KEYS[number]["key"];

export default function SiteSettingsPage() {
  const { data: config, isLoading } = useGetSiteConfig({ query: { queryKey: getGetSiteConfigQueryKey() } });
  const updateMutation = useUpdateSiteConfig();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      const initial: Record<string, string> = {};
      FIELD_KEYS.forEach(f => { initial[f.key] = (config as Record<string, string>)[f.key] ?? ""; });
      setForm(initial);
    }
  }, [config]);

  const fieldLabel = (key: FieldKey) =>
    (t.siteSettings.fields as Record<string, { label: string; description: string }>)[key]?.label ?? key;
  const fieldDesc = (key: FieldKey) =>
    (t.siteSettings.fields as Record<string, { label: string; description: string }>)[key]?.description ?? "";

  const handleSave = async (key: string) => {
    setSaving(key);
    updateMutation.mutate(
      { key, data: { value: form[key] } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetSiteConfigQueryKey() });
          toast({ title: `${fieldLabel(key as FieldKey)} ${t.common.saved.toLowerCase()}` });
          setSaving(null);
        },
        onError: () => { setSaving(null); toast({ title: t.siteSettings.saveFailed, variant: "destructive" }); },
      }
    );
  };

  const handleSaveAll = async () => {
    for (const field of FIELD_KEYS) {
      await new Promise<void>(resolve => {
        updateMutation.mutate(
          { key: field.key, data: { value: form[field.key] ?? "" } },
          { onSuccess: () => resolve(), onError: () => resolve() }
        );
      });
    }
    qc.invalidateQueries({ queryKey: getGetSiteConfigQueryKey() });
    toast({ title: t.siteSettings.allSaved });
  };

  const toggleHeroModal = () => {
    const current = form.heroModalEnabled;
    const next = current === "false" ? "true" : "false";
    setForm(p => ({ ...p, heroModalEnabled: next }));
    updateMutation.mutate(
      { key: "heroModalEnabled", data: { value: next } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetSiteConfigQueryKey() });
          toast({ title: next === "true" ? t.siteSettings.heroEnabledToast : t.siteSettings.heroDisabledToast });
        }
      }
    );
  };

  const toggleReviewEmail = () => {
    const current = form.googleReviewEmailEnabled;
    const next = current === "false" ? "true" : "false";
    setForm(p => ({ ...p, googleReviewEmailEnabled: next }));
    updateMutation.mutate(
      { key: "googleReviewEmailEnabled", data: { value: next } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetSiteConfigQueryKey() });
          toast({ title: next === "true" ? t.siteSettings.reviewEmailEnabledToast : t.siteSettings.reviewEmailDisabledToast });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-muted-foreground" />{t.siteSettings.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t.siteSettings.subtitle}</p>
        </div>
        <Button onClick={handleSaveAll} disabled={updateMutation.isPending}>
          <Save className="w-4 h-4 mr-2" />{t.siteSettings.saveAll}
        </Button>
      </div>

      <div className="space-y-4">
        {FIELD_KEYS.map(field => (
          <div key={field.key} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <label className="text-sm font-semibold">{fieldLabel(field.key)}</label>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3">{fieldDesc(field.key)}</p>

                {field.key === "heroModalEnabled" ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleHeroModal}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        form.heroModalEnabled !== "false" ? "bg-primary" : "bg-muted"
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                        form.heroModalEnabled !== "false" ? "translate-x-6" : "translate-x-1"
                      }`} />
                    </button>
                    <span className="text-sm flex items-center gap-1.5">
                      {form.heroModalEnabled !== "false"
                        ? <><Eye className="w-4 h-4 text-primary" /> {t.siteSettings.heroEnabled}</>
                        : <><EyeOff className="w-4 h-4 text-muted-foreground" /> {t.siteSettings.heroDisabled}</>}
                    </span>
                  </div>
                ) : field.key === "googleReviewEmailEnabled" ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleReviewEmail}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        form.googleReviewEmailEnabled !== "false" ? "bg-primary" : "bg-muted"
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                        form.googleReviewEmailEnabled !== "false" ? "translate-x-6" : "translate-x-1"
                      }`} />
                    </button>
                    <span className="text-sm flex items-center gap-1.5">
                      {form.googleReviewEmailEnabled !== "false"
                        ? <><Eye className="w-4 h-4 text-primary" /> {t.siteSettings.reviewEmailEnabled}</>
                        : <><EyeOff className="w-4 h-4 text-muted-foreground" /> {t.siteSettings.reviewEmailDisabled}</>}
                    </span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type={field.type ?? "text"}
                      value={form[field.key] ?? ""}
                      onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                      className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSave(field.key)}
                      disabled={saving === field.key}
                    >
                      {saving === field.key ? "…" : t.common.save}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
