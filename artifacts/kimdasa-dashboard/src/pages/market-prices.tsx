import { useState } from "react";
import {
  useGetMarketPrices, useUpdateMarketPrice, useGetMarketPriceStaleness,
  useCreateMarketPrice,
  getGetMarketPricesQueryKey
} from "@workspace/api-client-react";
import type { MarketPrice } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn, daysSince, fmtDate } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Save, RefreshCw, Plus, X, Check, BarChart3, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type EditablePrice = { minPrice: string; avgPrice: string; premiumPrice: string };
type EditMap = Record<number, EditablePrice>;

const SERVICES = ["Roofing","Siding","Vinyl Siding","Hardie Siding","Gutters","Soffit","Fascia","Window Capping","Windows","Doors","Exterior Remodeling","Repairs"];
const UNITS = ["per sq ft","per linear ft","per unit","per door","per window","per job","per sq"];

function PriceCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
      <input
        type="number" step="0.01" value={value} onChange={e => onChange(e.target.value)}
        className="w-24 pl-5 pr-1 py-1 border border-primary/30 rounded text-xs bg-primary/5 text-right focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}

function AddPriceForm({ onClose }: { onClose: () => void }) {
  const createMutation = useCreateMarketPrice();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [form, setForm] = useState({ category: "Roofing", region: "new_jersey" as "new_jersey" | "pennsylvania", priceType: "installed" as "installed" | "material" | "labor", unit: "per sq ft", minPrice: "", avgPrice: "", premiumPrice: "", notes: "", source: "" });

  const save = () => {
    createMutation.mutate({
      data: {
        category: form.category,
        region: form.region,
        priceType: form.priceType,
        unit: form.unit,
        minPrice: form.minPrice || undefined,
        avgPrice: form.avgPrice || undefined,
        premiumPrice: form.premiumPrice || undefined,
        notes: form.notes || undefined,
        source: form.source || undefined,
      }
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetMarketPricesQueryKey() });
        toast({ title: t.marketPrices.added });
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-2xl border border-border w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-lg">{t.marketPrices.addTitle}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.marketPrices.category}</label>
              <select value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1">
                {SERVICES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.marketPrices.region}</label>
              <select value={form.region} onChange={e => setForm(p => ({...p, region: e.target.value as typeof form.region}))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1">
                <option value="new_jersey">{t.marketPrices.filters.new_jersey}</option>
                <option value="pennsylvania">{t.marketPrices.filters.pennsylvania}</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</label>
              <select value={form.priceType} onChange={e => setForm(p => ({...p, priceType: e.target.value as typeof form.priceType}))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1">
                <option value="installed">{t.marketPrices.typeFilters.installed}</option>
                <option value="material">{t.marketPrices.typeFilters.material}</option>
                <option value="labor">{t.marketPrices.typeFilters.labor}</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.marketPrices.unit}</label>
              <select value={form.unit} onChange={e => setForm(p => ({...p, unit: e.target.value}))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1">
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: "minPrice" as const, label: t.marketPrices.minPrice },
              { key: "avgPrice" as const, label: t.marketPrices.avgPrice },
              { key: "premiumPrice" as const, label: t.marketPrices.premiumPrice },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
                <input type="number" value={form[key]} onChange={e => setForm(p => ({...p, [key]: e.target.value}))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1" />
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.marketPrices.sourceRef}</label>
            <input value={form.source} onChange={e => setForm(p => ({...p, source: e.target.value}))}
              placeholder={t.marketPrices.sourcePlaceholder}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.marketPrices.notes}</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1 resize-none h-16" />
          </div>
          <div className="flex gap-3">
            <Button onClick={save} disabled={createMutation.isPending} className="flex-1">{t.marketPrices.addEntry}</Button>
            <Button variant="outline" onClick={onClose}>{t.common.cancel}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RefreshWorkflow({ staleIds, prices, onDone }: { staleIds: number[]; prices: MarketPrice[]; onDone: () => void }) {
  const updateMutation = useUpdateMarketPrice();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [edits, setEdits] = useState<EditMap>(() =>
    Object.fromEntries(staleIds.map(id => {
      const p = prices.find(x => x.id === id);
      return [id, { minPrice: p?.minPrice ?? "", avgPrice: p?.avgPrice ?? "", premiumPrice: p?.premiumPrice ?? "" }];
    }))
  );
  const [saved, setSaved] = useState<Set<number>>(new Set());

  const saveOne = async (price: MarketPrice) => {
    const edit = edits[price.id];
    await new Promise<void>(resolve => {
      updateMutation.mutate({
        id: price.id,
        data: {
          category: price.category,
          region: price.region,
          minPrice: edit.minPrice || undefined,
          avgPrice: edit.avgPrice || undefined,
          premiumPrice: edit.premiumPrice || undefined,
          unit: price.unit,
          notes: price.notes ?? undefined,
          source: price.source ?? undefined,
        }
      }, {
        onSuccess: () => { setSaved(prev => new Set([...prev, price.id])); resolve(); },
        onError: () => resolve(),
      });
    });
  };

  const saveAll = async () => {
    const stale = prices.filter(p => staleIds.includes(p.id));
    for (const price of stale) await saveOne(price);
    qc.invalidateQueries({ queryKey: getGetMarketPricesQueryKey() });
    toast({ title: t.marketPrices.pricesRefreshed(staleIds.length) });
    onDone();
  };

  const stale = prices.filter(p => staleIds.includes(p.id));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-2xl border border-border w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-amber-500" />{t.marketPrices.updateStaleTitle}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">{t.marketPrices.updateStaleSubtitle(stale.length)}</p>
          </div>
          <button onClick={onDone} className="p-1 rounded hover:bg-muted text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 mb-4">
            {t.marketPrices.updateStaleHint}
          </div>

          <div className="space-y-2">
            {stale.map(price => {
              const age = daysSince(price.updatedAt);
              const isSaved = saved.has(price.id);
              const edit = edits[price.id] ?? { minPrice: "", avgPrice: "", premiumPrice: "" };
              return (
                <div key={price.id} className={cn("border rounded-xl p-4 transition-colors", isSaved ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50/30")}>
                  <div className="flex items-center gap-3 mb-3">
                    {isSaved ? (
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span className="font-semibold text-sm">{price.category}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded font-medium",
                      price.region === "new_jersey" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700")}>
                      {price.region === "new_jersey" ? "NJ" : "PA"}
                    </span>
                    <span className="text-xs text-muted-foreground">{price.unit}</span>
                    <span className="text-xs text-amber-600 ml-auto">{age} {t.marketPrices.daysOld} {fmtDate(price.updatedAt)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { key: "minPrice" as const, label: t.marketPrices.cols.min },
                      { key: "avgPrice" as const, label: t.marketPrices.cols.avg },
                      { key: "premiumPrice" as const, label: t.marketPrices.cols.premium },
                    ]).map(({ key, label }) => (
                      <div key={key}>
                        <p className="text-xs text-muted-foreground mb-1">{label}</p>
                        <PriceCell value={edit[key]} onChange={v => setEdits(prev => ({...prev, [price.id]: {...prev[price.id], [key]: v}}))} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button onClick={() => saveOne(price)} disabled={isSaved || updateMutation.isPending}
                      className="text-xs text-primary hover:underline">
                      {isSaved ? t.marketPrices.savedMark : t.marketPrices.saveThis}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button onClick={saveAll} disabled={updateMutation.isPending} className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />{t.marketPrices.refreshAll} ({stale.length - saved.size} {t.marketPrices.remaining})
            </Button>
            <Button variant="outline" onClick={onDone}>{t.common.done}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmt(val: string | null | undefined, decimals = 2): string {
  if (!val) return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return "—";
  return n >= 100 ? `$${Math.round(n).toLocaleString()}` : `$${n.toFixed(decimals)}`;
}

function pct(a: string | null | undefined, b: string | null | undefined): string {
  const na = parseFloat(a ?? "");
  const nb = parseFloat(b ?? "");
  if (isNaN(na) || isNaN(nb) || nb === 0) return "—";
  return `${Math.round((na / nb) * 100)}%`;
}

function laborAmt(mat: string | null | undefined, ins: string | null | undefined): string {
  const nm = parseFloat(mat ?? "");
  const ni = parseFloat(ins ?? "");
  if (isNaN(nm) || isNaN(ni)) return "—";
  const labor = ni - nm;
  if (labor < 0) return "—";
  return labor >= 100 ? `$${Math.round(labor).toLocaleString()}` : `$${labor.toFixed(2)}`;
}

function laborPctVal(mat: string | null | undefined, ins: string | null | undefined): number {
  const nm = parseFloat(mat ?? "");
  const ni = parseFloat(ins ?? "");
  if (isNaN(nm) || isNaN(ni) || ni === 0) return 0;
  return Math.max(0, Math.round(((ni - nm) / ni) * 100));
}

function MarketStudyTab({ prices }: { prices: MarketPrice[] }) {
  const { t } = useLanguage();
  const ts = t.marketPrices.study;
  const [studyRegion, setStudyRegion] = useState<"new_jersey" | "pennsylvania">("new_jersey");

  const installedByCategory = Object.fromEntries(
    prices
      .filter(p => p.priceType === "installed" && p.region === studyRegion)
      .map(p => [p.category, p])
  );

  const materialByCategory = Object.fromEntries(
    prices
      .filter(p => p.priceType === "material" && p.region === studyRegion)
      .map(p => [p.category, p])
  );

  const categories = [...new Set([
    ...Object.keys(installedByCategory),
    ...Object.keys(materialByCategory),
  ])].filter(cat => installedByCategory[cat] && materialByCategory[cat]).sort();

  const CATEGORY_GROUPS: Record<string, string[]> = {
    "Roofing": ["Asphalt Shingles (3-tab)", "Architectural Shingles", "Metal Roofing (Standing Seam)", "Flat Roof (EPDM Rubber)", "Flat Roof (TPO Membrane)"],
    "Siding": ["Vinyl Siding", "Hardie Board Siding"],
    "Gutters & Trim": ["Gutters (Aluminum K-Style)", "Downspouts", "Soffit (Aluminum)", "Fascia (Aluminum Wrap)", "Window Capping"],
    "Windows & Doors": ["Windows (Double-Hung Vinyl)", "Doors (Entry Steel)"],
    "Interior": ["Kitchen Remodeling (full)", "Bathroom Remodeling (full)", "Drywall (Install + Finish)", "Interior Painting", "Laminate / LVP Flooring", "Hardwood Flooring", "Tile Work (Floor & Wall)", "Interior Carpentry (Trim/Molding)", "Custom Closets", "Basement Finishing", "Attic Finishing", "Interior Demolition"],
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold">{ts.title}</h2>
          <p className="text-sm text-muted-foreground">{ts.subtitle}</p>
        </div>
        <div className="flex gap-2">
          {(["new_jersey", "pennsylvania"] as const).map(r => (
            <button key={r} onClick={() => setStudyRegion(r)}
              className={cn("text-sm px-4 py-2 rounded-lg font-semibold border transition-colors",
                studyRegion === r
                  ? r === "new_jersey" ? "bg-blue-600 text-white border-blue-600" : "bg-purple-600 text-white border-purple-600"
                  : "border-border text-muted-foreground hover:border-primary/40")}>
              {r === "new_jersey" ? ts.nj : ts.pa}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(CATEGORY_GROUPS).map(([group, groupCats]) => {
          const rows = groupCats.filter(c => categories.includes(c));
          if (rows.length === 0) return null;
          return (
            <div key={group} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className={cn("px-4 py-2.5 border-b border-border font-bold text-sm uppercase tracking-wider",
                studyRegion === "new_jersey" ? "bg-blue-50 text-blue-800" : "bg-purple-50 text-purple-800")}>
                {group}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-52">Category</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unit</th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-green-700">Material (avg)</th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-blue-700">Installed (avg)</th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-orange-700">Labor (est. avg)</th>
                      <th className="text-right px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Labor %</th>
                      <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Split</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map(cat => {
                      const ins = installedByCategory[cat];
                      const mat = materialByCategory[cat];
                      if (!ins || !mat) return null;
                      const lp = laborPctVal(mat.avgPrice, ins.avgPrice);
                      const mp = 100 - lp;
                      return (
                        <tr key={cat} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-medium text-sm">{cat}</td>
                          <td className="px-3 py-3 text-xs text-muted-foreground">{ins.unit.replace(" installed", "").replace(" material", "")}</td>
                          <td className="px-3 py-3 text-right">
                            <span className="text-green-700 font-semibold">{fmt(mat.avgPrice)}</span>
                            <div className="text-xs text-muted-foreground">{fmt(mat.minPrice)} – {fmt(mat.premiumPrice)}</div>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="text-blue-700 font-semibold">{fmt(ins.avgPrice)}</span>
                            <div className="text-xs text-muted-foreground">{fmt(ins.minPrice)} – {fmt(ins.premiumPrice)}</div>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="text-orange-700 font-semibold">{laborAmt(mat.avgPrice, ins.avgPrice)}</span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className={cn("font-bold text-sm",
                              lp > 60 ? "text-red-600" : lp > 40 ? "text-orange-600" : "text-green-600")}>
                              {lp}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex h-4 rounded overflow-hidden w-28">
                              <div className="bg-green-400" style={{ width: `${mp}%` }} title={`Material ${mp}%`} />
                              <div className="bg-orange-400" style={{ width: `${lp}%` }} title={`Labor ${lp}%`} />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground mt-0.5 w-28">
                              <span className="text-green-600">{mp}% mat</span>
                              <span className="text-orange-600">{lp}% labor</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 bg-muted/30 border border-border rounded-xl px-4 py-3">
        <p className="text-xs text-muted-foreground">{ts.source}</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        {[
          { label: "Avg Labor % (Exterior)", value: (() => {
            const cats = ["Asphalt Shingles (3-tab)","Architectural Shingles","Vinyl Siding","Hardie Board Siding","Gutters (Aluminum K-Style)"];
            const vals = cats.map(c => laborPctVal(materialByCategory[c]?.avgPrice, installedByCategory[c]?.avgPrice)).filter(v => v > 0);
            return vals.length ? `${Math.round(vals.reduce((a,b) => a+b, 0) / vals.length)}%` : "—";
          })(), color: "text-orange-600" },
          { label: "Avg Labor % (Interior)", value: (() => {
            const cats = ["Kitchen Remodeling (full)","Bathroom Remodeling (full)","Laminate / LVP Flooring","Hardwood Flooring","Tile Work (Floor & Wall)"];
            const vals = cats.map(c => laborPctVal(materialByCategory[c]?.avgPrice, installedByCategory[c]?.avgPrice)).filter(v => v > 0);
            return vals.length ? `${Math.round(vals.reduce((a,b) => a+b, 0) / vals.length)}%` : "—";
          })(), color: "text-red-600" },
          { label: "Categories with Data", value: `${categories.length}`, color: "text-blue-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl px-4 py-3 text-center">
            <p className={cn("text-2xl font-bold", color)}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MarketPricesPage() {
  const { data: prices = [], isLoading } = useGetMarketPrices();
  const stalenessQuery = useGetMarketPriceStaleness();
  const updateMutation = useUpdateMarketPrice();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<"database" | "study">("database");
  const [edits, setEdits] = useState<EditMap>({});
  const [regionFilter, setRegionFilter] = useState<"all" | "new_jersey" | "pennsylvania">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "installed" | "material" | "labor">("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showRefreshFlow, setShowRefreshFlow] = useState(false);

  const stale = stalenessQuery.data;
  const staleIds = prices.filter(p => daysSince(p.updatedAt) > 30).map(p => p.id);
  const filtered = prices.filter(p =>
    (regionFilter === "all" || p.region === regionFilter) &&
    (typeFilter === "all" || p.priceType === typeFilter)
  );
  const grouped = filtered.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {} as Record<string, MarketPrice[]>);

  const startEdit = (p: MarketPrice) => {
    setEdits(prev => ({
      ...prev,
      [p.id]: { minPrice: p.minPrice ?? "", avgPrice: p.avgPrice ?? "", premiumPrice: p.premiumPrice ?? "" }
    }));
  };

  const setEdit = (id: number, field: keyof EditablePrice, val: string) => {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));
  };

  const savePrice = (price: MarketPrice) => {
    const edit = edits[price.id];
    if (!edit) return;
    updateMutation.mutate({
      id: price.id,
      data: {
        category: price.category, region: price.region,
        minPrice: edit.minPrice || undefined, avgPrice: edit.avgPrice || undefined, premiumPrice: edit.premiumPrice || undefined,
        unit: price.unit, notes: price.notes ?? undefined, source: price.source ?? undefined,
      }
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetMarketPricesQueryKey() });
        setEdits(prev => { const n={...prev}; delete n[price.id]; return n; });
        toast({ title: t.marketPrices.priceUpdated });
      }
    });
  };

  const saveAll = async () => {
    const ids = Object.keys(edits).map(Number);
    const toUpdate = prices.filter(p => ids.includes(p.id));
    for (const price of toUpdate) {
      await new Promise<void>(resolve => {
        updateMutation.mutate({
          id: price.id,
          data: {
            category: price.category, region: price.region,
            minPrice: edits[price.id]?.minPrice || undefined,
            avgPrice: edits[price.id]?.avgPrice || undefined,
            premiumPrice: edits[price.id]?.premiumPrice || undefined,
            unit: price.unit, notes: price.notes ?? undefined, source: price.source ?? undefined,
          }
        }, { onSuccess: () => resolve(), onError: () => resolve() });
      });
    }
    qc.invalidateQueries({ queryKey: getGetMarketPricesQueryKey() });
    setEdits({});
    toast({ title: t.marketPrices.pricesUpdated(ids.length) });
  };

  const priceTypeBadge = (pt: string) => {
    if (pt === "material") return <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Mat</span>;
    if (pt === "labor") return <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">Labor</span>;
    return <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">Inst.</span>;
  };

  const colHeaders = [
    t.marketPrices.cols.category, "Type", t.marketPrices.cols.region, t.marketPrices.cols.unit,
    t.marketPrices.cols.min, t.marketPrices.cols.avg, t.marketPrices.cols.premium,
    t.marketPrices.cols.source, t.marketPrices.cols.lastUpdated, "",
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">{t.marketPrices.title}</h1>
          <p className="text-sm text-muted-foreground">{prices.length} {t.marketPrices.subtitle}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {activeTab === "database" && Object.keys(edits).length > 0 && (
            <Button onClick={saveAll} disabled={updateMutation.isPending} variant="outline">
              <Save className="w-4 h-4 mr-2" />{t.marketPrices.saveEdits} ({Object.keys(edits).length})
            </Button>
          )}
          {activeTab === "database" && staleIds.length > 0 && (
            <Button onClick={() => setShowRefreshFlow(true)} variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50">
              <RefreshCw className="w-4 h-4 mr-2" />{t.marketPrices.updateStale} ({staleIds.length})
            </Button>
          )}
          {activeTab === "database" && (
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />{t.marketPrices.addPrice}
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-1 mb-5 border-b border-border">
        {([
          { id: "database" as const, icon: Database, label: t.marketPrices.tabs.database },
          { id: "study" as const, icon: BarChart3, label: t.marketPrices.tabs.study },
        ]).map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={cn("flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {activeTab === "study" ? (
        isLoading ? (
          <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <MarketStudyTab prices={prices} />
        )
      ) : (
        <>
          {stale && stale.staleCount > 0 && (
            <div
              onClick={() => setShowRefreshFlow(true)}
              className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-5 cursor-pointer hover:bg-amber-100 transition-colors"
            >
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">
                  {t.marketPrices.staleAlert(stale.staleCount)}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {t.marketPrices.staleHint}
                </p>
              </div>
              <RefreshCw className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            </div>
          )}

          <div className="flex gap-2 mb-3 flex-wrap">
            {(["all","new_jersey","pennsylvania"] as const).map(r => (
              <button key={r} onClick={() => setRegionFilter(r)}
                className={cn("text-xs px-3 py-1.5 rounded-full font-medium border transition-colors",
                  regionFilter === r ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
                {t.marketPrices.filters[r]}
              </button>
            ))}
            <span className="text-muted-foreground text-xs py-1.5 px-1">·</span>
            {(["all","installed","material","labor"] as const).map(tp => (
              <button key={tp} onClick={() => setTypeFilter(tp)}
                className={cn("text-xs px-3 py-1.5 rounded-full font-medium border transition-colors",
                  typeFilter === tp
                    ? tp === "material" ? "bg-green-600 text-white border-green-600"
                    : tp === "labor" ? "bg-orange-500 text-white border-orange-500"
                    : tp === "installed" ? "bg-blue-600 text-white border-blue-600"
                    : "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/40")}>
                {t.marketPrices.typeFilters[tp]}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    {colHeaders.map((h, i) => (
                      <th key={i} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {Object.entries(grouped).map(([category, rows]) =>
                    rows.map((price, i) => {
                      const isEditing = !!edits[price.id];
                      const edit = edits[price.id] ?? { minPrice: price.minPrice ?? "", avgPrice: price.avgPrice ?? "", premiumPrice: price.premiumPrice ?? "" };
                      const age = daysSince(price.updatedAt);
                      const isStale = age > 30;

                      return (
                        <tr key={price.id} className={cn("hover:bg-muted/30 transition-colors", isEditing && "bg-primary/5", isStale && !isEditing && "bg-amber-50/40")}>
                          {i === 0 ? (
                            <td className="px-4 py-2.5 font-semibold text-sm" rowSpan={rows.length}>{category}</td>
                          ) : null}
                          <td className="px-4 py-2.5">{priceTypeBadge(price.priceType)}</td>
                          <td className="px-4 py-2.5">
                            <span className={cn("px-2 py-0.5 rounded text-xs font-medium",
                              price.region === "new_jersey" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700")}>
                              {price.region === "new_jersey" ? "NJ" : "PA"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{price.unit}</td>
                          <td className="px-4 py-2.5">
                            {isEditing ? <PriceCell value={edit.minPrice} onChange={v => setEdit(price.id, "minPrice", v)} />
                              : <span className="text-sm">{price.minPrice ? `$${price.minPrice}` : "—"}</span>}
                          </td>
                          <td className="px-4 py-2.5">
                            {isEditing ? <PriceCell value={edit.avgPrice} onChange={v => setEdit(price.id, "avgPrice", v)} />
                              : <span className="text-sm font-semibold">{price.avgPrice ? `$${price.avgPrice}` : "—"}</span>}
                          </td>
                          <td className="px-4 py-2.5">
                            {isEditing ? <PriceCell value={edit.premiumPrice} onChange={v => setEdit(price.id, "premiumPrice", v)} />
                              : <span className="text-sm">{price.premiumPrice ? `$${price.premiumPrice}` : "—"}</span>}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[100px] truncate">{price.source ?? "—"}</td>
                          <td className="px-4 py-2.5">
                            <span className={cn("text-xs", isStale ? "text-amber-600 font-medium" : "text-muted-foreground")}>
                              {isStale && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                              {fmtDate(price.updatedAt)} {isStale ? `(${age}${t.marketPrices.ageSuffix})` : ""}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            {isEditing ? (
                              <div className="flex gap-1">
                                <button onClick={() => savePrice(price)} className="text-xs text-primary font-medium hover:underline">{t.common.save}</button>
                                <span className="text-muted-foreground">·</span>
                                <button onClick={() => setEdits(p => { const n={...p}; delete n[price.id]; return n; })} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
                              </div>
                            ) : (
                              <button onClick={() => startEdit(price)} className={cn("text-xs transition-colors", isStale ? "text-amber-600 hover:text-amber-800 font-medium" : "text-muted-foreground hover:text-primary")}>
                                {isStale ? t.marketPrices.updateAction : t.marketPrices.editAction}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showAddForm && <AddPriceForm onClose={() => setShowAddForm(false)} />}
      {showRefreshFlow && staleIds.length > 0 && (
        <RefreshWorkflow
          staleIds={staleIds}
          prices={prices}
          onDone={() => { setShowRefreshFlow(false); qc.invalidateQueries({ queryKey: getGetMarketPricesQueryKey() }); }}
        />
      )}
    </div>
  );
}
