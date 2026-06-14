import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import {
  useGetEstimates, useGetLeads, useGetCustomers,
  useCalculateEstimate, useCreateEstimate,
  getGetEstimatesQueryKey
} from "@workspace/api-client-react";
import type { EstimateCalculation, Estimate } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn, fmt, fmtDate } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Calculator, FileText, Plus, X, Printer, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const EXTERIOR_SERVICES = [
  "Roofing",
  "Siding",
  "Vinyl Siding",
  "Hardie Siding",
  "Gutters",
  "Soffit",
  "Fascia",
  "Window Capping",
  "Windows",
  "Doors",
  "Exterior Remodeling",
  "Repairs",
];

const INTERIOR_SERVICES = [
  "Kitchen Remodeling (full)",
  "Bathroom Remodeling (full)",
  "Drywall (Install + Finish)",
  "Interior Painting",
  "Laminate / LVP Flooring",
  "Hardwood Flooring",
  "Tile Work (Floor & Wall)",
  "Interior Carpentry (Trim/Molding)",
  "Custom Closets",
  "Basement Finishing",
  "Attic Finishing",
  "Interior Demolition",
];

const ALL_SERVICES = [...EXTERIOR_SERVICES, ...INTERIOR_SERVICES];

const LINEAR_FT_SERVICES = new Set([
  "Gutters", "Soffit", "Fascia", "Window Capping",
  "Interior Carpentry (Trim/Molding)", "Custom Closets",
]);

const ROOFING_ONLY_SERVICES = new Set(["Roofing"]);

const INTERIOR_SERVICE_SET = new Set(INTERIOR_SERVICES);

const MATERIAL_OPTIONS_BY_SERVICE: Record<string, string[]> = {
  Roofing: ["Asphalt Shingles (3-tab)", "Architectural Shingles", "Metal (Standing Seam)", "EPDM Flat Roof", "TPO Membrane", "Cedar Shake", "Slate", "Tile"],
  Siding: ["Vinyl Siding", "Hardie Board (Fiber Cement)", "Cedar Wood", "OSB Sheathing"],
  "Vinyl Siding": ["Vinyl Siding (standard)", "Vinyl Siding (insulated)", "Vinyl Siding (premium)"],
  "Hardie Siding": ["Hardie Plank Lap", "Hardie Panel (vertical)", "Hardie Shingle"],
  Gutters: ["Aluminum K-Style", "Aluminum Half-Round", "Copper K-Style", "Steel", "Vinyl"],
  Soffit: ["Aluminum Vented", "Aluminum Solid", "Vinyl"],
  Fascia: ["Aluminum Wrap", "Hardie Fascia", "Cedar Fascia"],
  "Window Capping": ["Aluminum Capping", "Hardie Trim"],
  Windows: ["Double-Hung Vinyl", "Double-Hung Fiberglass", "Casement Vinyl", "Bay Window", "Sliding Window"],
  Doors: ["Steel Entry Door", "Fiberglass Entry Door", "French Doors", "Sliding Glass Door", "Steel w/ Sidelites"],
  "Exterior Remodeling": ["Mixed Materials", "Custom"],
  Repairs: ["Patch & Repair", "Caulk & Seal", "Mixed"],
  "Kitchen Remodeling (full)": ["Stock Cabinets", "Semi-Custom Cabinets", "Custom Cabinets", "Laminate Countertops", "Quartz Countertops", "Granite Countertops", "LVP Flooring + Cabinets", "Full Gut + Custom"],
  "Bathroom Remodeling (full)": ["Ceramic Tile", "Porcelain Tile", "Natural Stone", "Fiberglass Tub/Shower", "Acrylic Tub/Shower", "Custom Tile Shower", "Walk-in Shower + Tile", "Full Gut + Custom"],
  "Drywall (Install + Finish)": ["1/2\" Standard Drywall", "5/8\" Fire-Rated Drywall", "Moisture-Resistant (Green Board)", "Mold-Resistant (Purple Board)"],
  "Interior Painting": ["Flat Paint", "Eggshell Paint", "Satin Paint", "Semi-Gloss", "Two-Coat System", "Paint + Primer Combo"],
  "Laminate / LVP Flooring": ["Laminate (basic)", "Luxury Vinyl Plank (LVP)", "Engineered Vinyl Plank (EVP)", "LVP Waterproof"],
  "Hardwood Flooring": ["Oak (solid)", "Maple (solid)", "Hickory (solid)", "Engineered Hardwood", "Pre-finished Hardwood"],
  "Tile Work (Floor & Wall)": ["Ceramic Tile", "Porcelain Tile", "Natural Stone", "Mosaic Tile", "Large Format Tile (24x24+)"],
  "Interior Carpentry (Trim/Molding)": ["Pine Trim", "MDF Trim", "Poplar Trim", "Oak Trim", "PVC Trim", "Crown Molding", "Base Molding + Casing"],
  "Custom Closets": ["Laminate System", "Melamine System", "Solid Wood System", "Wire Shelving", "California Closet Style"],
  "Basement Finishing": ["Drywall + Paint", "Drop Ceiling + LVP", "Full Finish (drywall, floor, ceiling)", "Egress + Full Finish"],
  "Attic Finishing": ["Spray Foam Insulation + Drywall", "Batt Insulation + Drywall", "Full Finish (floor, walls, ceiling)", "Knee Wall + Storage"],
  "Interior Demolition": ["Selective Demolition", "Full Room Demo", "Structural Wall Remove", "Demo + Haul Away"],
};

const ROOF_PITCHES = ["Flat (1/12–2/12)", "Low (3/12–4/12)", "Medium (5/12–7/12)", "Steep (8/12–10/12)", "Very Steep (11/12+)"];
const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const REGION_KEYS: ("new_jersey" | "pennsylvania")[] = ["new_jersey", "pennsylvania"];

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

function getUnitLabel(serviceType: string): string {
  if (LINEAR_FT_SERVICES.has(serviceType)) return "linear ft";
  if (serviceType === "Window Capping" || serviceType === "Windows" || serviceType === "Doors") return "units";
  return "sq ft";
}

function PrintableProposal({ est, onClose }: { est: Estimate; onClose: () => void }) {
  const { t } = useLanguage();
  const regionLabel = est.region ? (t.estimates.regions[est.region as "new_jersey" | "pennsylvania"] ?? est.region) : null;
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8" id="proposal-print">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{t.estimates.printableTitle}</h1>
              <p className="text-sm text-slate-500 mt-0.5">{t.estimates.printableSubtitle}</p>
            </div>
            <div className="text-right text-sm text-slate-500">
              <p>{t.estimates.estimateHash}{est.id}</p>
              <p>{fmtDate(est.createdAt)}</p>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6 mb-6">
            <h2 className="font-bold text-lg mb-3">{t.estimates.serviceHeader} {est.serviceType}</h2>
            <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
              {regionLabel && <p>{t.estimates.regionLabel} {regionLabel}</p>}
              {est.measurements && <p>{t.estimates.measurementsLabel} {est.measurements}</p>}
              {est.height && <p>{t.estimates.heightLabel} {est.height}</p>}
              {est.roofPitch && <p>{t.estimates.roofPitchLabel} {est.roofPitch}</p>}
              {est.materials && <p>{t.estimates.materialsLabel} {est.materials}</p>}
              {est.difficulty && <p>{t.estimates.complexityLabel} <span>{(t.estimates.difficultyOptions as Record<string, string>)[est.difficulty] ?? est.difficulty}</span></p>}
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold mb-4 text-slate-800">{t.estimates.costBreakdown}</h3>
            <div className="space-y-2">
              {[
                { label: t.estimates.materialCost, value: est.materialCost },
                { label: t.estimates.laborShort, value: est.laborCost },
                { label: t.estimates.overhead, value: est.overhead },
                { label: t.estimates.profitMargin, value: est.profitMargin },
              ].map(({ label, value }) => value ? (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-slate-600">{label}</span>
                  <span className="font-medium">{fmt(value)}</span>
                </div>
              ) : null)}
              <div className="border-t border-slate-200 pt-3 mt-3">
                <div className="flex justify-between font-bold text-lg">
                  <span>{t.estimates.recommendedPrice}</span>
                  <span className="text-orange-600">{fmt(est.recommendedPrice)}</span>
                </div>
                {est.clientPrice && est.clientPrice !== est.recommendedPrice && (
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-600">{t.estimates.clientPriceShort}</span>
                    <span className="font-medium">{fmt(est.clientPrice)}</span>
                  </div>
                )}
                {est.marginPercent && (
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-600">{t.estimates.marginShort}</span>
                    <span className="font-medium">{est.marginPercent}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {est.notes && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">{t.estimates.notesForClient}</h3>
              <p className="text-sm text-slate-600">{est.notes}</p>
            </div>
          )}

          <div className="border-t border-slate-200 pt-6 text-sm text-slate-500">
            <p>{t.estimates.footerLine}</p>
            <p className="mt-1">{t.estimates.validityNote}</p>
          </div>
        </div>
        <div className="px-8 py-4 border-t border-slate-200 flex gap-3">
          <Button onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />{t.estimates.print}
          </Button>
          <Button variant="outline" onClick={onClose}>{t.common.close}</Button>
        </div>
      </div>
    </div>
  );
}

function EstimateForm({ onClose, defaultLeadId }: { onClose: () => void; defaultLeadId?: number }) {
  const leadsQuery = useGetLeads();
  const customersQuery = useGetCustomers();
  const calcMutation = useCalculateEstimate();
  const createMutation = useCreateEstimate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [form, setForm] = useState({
    serviceType: "Roofing",
    squareFootage: "",
    difficulty: "medium" as typeof DIFFICULTIES[number],
    region: "new_jersey" as "new_jersey" | "pennsylvania",
    height: "",
    roofPitch: "",
    materials: "",
    overrideLabor: "",
    overrideMaterial: "",
    overrideOverhead: "",
    overrideMargin: "",
    leadId: defaultLeadId ? String(defaultLeadId) : "",
    customerId: "",
    notes: "",
    internalNotes: "",
  });
  const [calc, setCalc] = useState<EstimateCalculation | null>(null);
  const [clientPrice, setClientPrice] = useState("");

  const isInterior = INTERIOR_SERVICE_SET.has(form.serviceType);
  const isRoofing = ROOFING_ONLY_SERVICES.has(form.serviceType);
  const usesLinearFt = LINEAR_FT_SERVICES.has(form.serviceType);
  const unitLabel = getUnitLabel(form.serviceType);
  const materialOptions = MATERIAL_OPTIONS_BY_SERVICE[form.serviceType] ?? [];

  const handleServiceChange = (newService: string) => {
    setForm(p => ({ ...p, serviceType: newService, materials: "", roofPitch: "" }));
    setCalc(null);
    setClientPrice("");
  };

  const handleCalculate = () => {
    calcMutation.mutate({
      data: {
        serviceType: form.serviceType,
        squareFootage: form.squareFootage ? Number(form.squareFootage) : undefined,
        difficulty: form.difficulty,
        region: form.region,
      }
    }, {
      onSuccess: (res) => {
        setCalc(res);
        setClientPrice(res.recommendedPrice);
      }
    });
  };

  const effectiveCalc = calc ? {
    materialCost: form.overrideMaterial || calc.materialCost,
    laborCost: form.overrideLabor || calc.laborCost,
    overhead: form.overrideOverhead || calc.overhead,
    profitMargin: form.overrideMargin || calc.profitMargin,
    internalCost: calc.internalCost,
    recommendedPrice: calc.recommendedPrice,
    marginPercent: calc.marginPercent,
  } : null;

  const handleSave = () => {
    if (!effectiveCalc) return;
    createMutation.mutate({
      data: {
        serviceType: form.serviceType,
        measurements: form.squareFootage ? `${form.squareFootage} ${unitLabel}` : undefined,
        difficulty: form.difficulty,
        region: form.region,
        height: form.height || undefined,
        roofPitch: form.roofPitch || undefined,
        materials: form.materials || undefined,
        leadId: form.leadId ? Number(form.leadId) : undefined,
        customerId: form.customerId ? Number(form.customerId) : undefined,
        materialCost: effectiveCalc.materialCost,
        laborCost: effectiveCalc.laborCost,
        overhead: effectiveCalc.overhead,
        profitMargin: effectiveCalc.profitMargin,
        internalCost: effectiveCalc.internalCost,
        recommendedPrice: effectiveCalc.recommendedPrice,
        clientPrice: clientPrice || effectiveCalc.recommendedPrice,
        marginPercent: effectiveCalc.marginPercent,
        notes: form.notes,
        internalNotes: form.internalNotes,
        status: "draft",
      }
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetEstimatesQueryKey() });
        toast({ title: t.estimates.estimateSaved });
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-2xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            {t.estimates.engineTitle}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">{t.estimates.coreInputs}</p>
            <div className="grid grid-cols-2 gap-4">

              {/* Service Type — grouped dropdown */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.estimates.serviceType} *</label>
                <select
                  value={form.serviceType}
                  onChange={e => handleServiceChange(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1"
                >
                  <optgroup label="── Exterior ──">
                    {EXTERIOR_SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                  </optgroup>
                  <optgroup label="── Interior ──">
                    {INTERIOR_SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                  </optgroup>
                </select>
              </div>

              {/* Region */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.estimates.region} *</label>
                <select
                  value={form.region}
                  onChange={e => setForm(p => ({ ...p, region: e.target.value as typeof form.region }))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1"
                >
                  {REGION_KEYS.map(k => <option key={k} value={k}>{t.estimates.regions[k]}</option>)}
                </select>
              </div>

              {/* Measurement — dynamic label */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {usesLinearFt ? "Linear Feet" : isInterior ? "Square Feet (room/area)" : t.estimates.squareFootage}
                </label>
                <input
                  type="number"
                  value={form.squareFootage}
                  onChange={e => setForm(p => ({ ...p, squareFootage: e.target.value }))}
                  placeholder={`e.g. ${usesLinearFt ? "120 linear ft" : "500"}`}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1"
                />
              </div>

              {/* Difficulty */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.estimates.difficultyLabel}</label>
                <select
                  value={form.difficulty}
                  onChange={e => setForm(p => ({ ...p, difficulty: e.target.value as typeof form.difficulty }))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1"
                >
                  {DIFFICULTIES.map(d => <option key={d} value={d}>{t.estimates.difficultyOptions[d]}</option>)}
                </select>
              </div>

              {/* Height — only exterior */}
              {!isInterior && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.estimates.heightStories}</label>
                  <input
                    value={form.height}
                    onChange={e => setForm(p => ({ ...p, height: e.target.value }))}
                    placeholder={t.estimates.heightPlaceholder}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1"
                  />
                </div>
              )}

              {/* Roof Pitch — only roofing */}
              {isRoofing && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.estimates.roofPitch}</label>
                  <select
                    value={form.roofPitch}
                    onChange={e => setForm(p => ({ ...p, roofPitch: e.target.value }))}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1"
                  >
                    <option value="">{t.estimates.selectPitch}</option>
                    {ROOF_PITCHES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              )}

              {/* Materials — dynamic per service */}
              <div className={isRoofing || !isInterior ? "col-span-2" : "col-span-2"}>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.estimates.materials}</label>
                <select
                  value={form.materials}
                  onChange={e => setForm(p => ({ ...p, materials: e.target.value }))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1"
                >
                  <option value="">{t.estimates.selectMaterial}</option>
                  {materialOptions.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

            </div>
          </div>

          {/* Interior category badge */}
          {isInterior && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                Interior Service — NJ/PA Market Pricing Applied
              </span>
            </div>
          )}

          {/* Advanced overrides */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {t.estimates.advancedToggle}
          </button>

          {showAdvanced && (
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-3">{t.estimates.overrideHint}</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "overrideMaterial" as const, label: t.estimates.materialCost + " ($)" },
                  { key: "overrideLabor" as const, label: t.estimates.laborCost + " ($)" },
                  { key: "overrideOverhead" as const, label: t.estimates.overhead + " ($)" },
                  { key: "overrideMargin" as const, label: t.estimates.profitMargin + " ($)" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs text-muted-foreground">{label}</label>
                    <input
                      type="number"
                      value={form[key]}
                      onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={t.estimates.autoCalculated}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lead / Customer links */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.estimates.linkToLead}</label>
              <select
                value={form.leadId}
                onChange={e => setForm(p => ({ ...p, leadId: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1"
              >
                <option value="">{t.common.none}</option>
                {(leadsQuery.data ?? []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.estimates.linkToCustomer}</label>
              <select
                value={form.customerId}
                onChange={e => setForm(p => ({ ...p, customerId: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1"
              >
                <option value="">{t.common.none}</option>
                {(customersQuery.data ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <Button onClick={handleCalculate} disabled={calcMutation.isPending} className="w-full">
            <Calculator className="w-4 h-4 mr-2" />
            {calcMutation.isPending ? t.estimates.calculating : t.estimates.calculate}
          </Button>

          {effectiveCalc && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-3">
              <h3 className="font-semibold text-sm">{t.estimates.costBreakdown}</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: t.estimates.materialCost, value: effectiveCalc.materialCost },
                  { label: t.estimates.laborCost, value: effectiveCalc.laborCost },
                  { label: t.estimates.overhead, value: effectiveCalc.overhead },
                  { label: t.estimates.profitMargin, value: effectiveCalc.profitMargin },
                  { label: t.estimates.internalCost, value: effectiveCalc.internalCost },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-semibold">{fmt(value)}</p>
                  </div>
                ))}
                <div>
                  <p className="text-xs text-muted-foreground">{t.estimates.marginPct}</p>
                  <p className="font-semibold">{effectiveCalc.marginPercent}%</p>
                </div>
              </div>
              <div className="border-t border-primary/20 pt-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{t.estimates.recommendedPrice}</p>
                  <p className="text-2xl font-bold text-primary">{fmt(effectiveCalc.recommendedPrice)}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.estimates.clientPriceEditable}</label>
                  <input
                    type="text"
                    value={clientPrice}
                    onChange={e => setClientPrice(e.target.value)}
                    className="w-36 border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1 block font-semibold"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.estimates.clientFacingNotes}</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder={t.estimates.clientNotesPlaceholder}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1 resize-none h-16"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.estimates.internalNotes}</label>
              <textarea
                value={form.internalNotes}
                onChange={e => setForm(p => ({ ...p, internalNotes: e.target.value }))}
                placeholder={t.estimates.internalNotesPlaceholder}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1 resize-none h-16"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={!effectiveCalc || createMutation.isPending} className="flex-1">
              {t.estimates.saveEstimate}
            </Button>
            <Button variant="outline" onClick={onClose}>{t.common.cancel}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EstimatesPage() {
  const { data: estimates = [], isLoading } = useGetEstimates();
  const { t } = useLanguage();
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const leadIdParam = params.get("leadId");
  const defaultLeadId = leadIdParam ? Number(leadIdParam) : undefined;

  const [showForm, setShowForm] = useState(false);
  const [printEst, setPrintEst] = useState<Estimate | null>(null);

  useEffect(() => {
    if (defaultLeadId) setShowForm(true);
  }, [defaultLeadId]);

  const colHeaders = [
    t.estimates.cols.num, t.estimates.cols.service, t.estimates.cols.region, t.estimates.cols.materials,
    t.estimates.cols.height, t.estimates.cols.pitch, t.estimates.cols.internal, t.estimates.cols.recommended,
    t.estimates.cols.clientPrice, t.estimates.cols.margin, t.estimates.cols.status, t.estimates.cols.date, "",
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">{t.estimates.title}</h1>
          <p className="text-sm text-muted-foreground">{estimates.length} {t.estimates.totalEstimates}</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />{t.estimates.newEstimate}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : estimates.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <FileText className="w-12 h-12 opacity-20 mb-3" />
          <p className="font-medium">{t.estimates.noEstimates}</p>
          <Button className="mt-4" onClick={() => setShowForm(true)} variant="outline" size="sm">{t.estimates.createFirst}</Button>
        </div>
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
              {estimates.map(est => {
                const regionLabel = est.region ? (t.estimates.regions[est.region as "new_jersey" | "pennsylvania"] ?? est.region.replace("_", " ")) : "—";
                const statusLabel = (t.estimates.statusBadge as Record<string, string>)[est.status] ?? est.status;
                const isIntEst = INTERIOR_SERVICE_SET.has(est.serviceType ?? "");
                return (
                  <tr key={est.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{est.id}</td>
                    <td className="px-4 py-3 font-medium">
                      <span>{est.serviceType}</span>
                      {isIntEst && <span className="ml-1.5 text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-1.5 py-0.5">INT</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{regionLabel}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-[100px] truncate">{est.materials ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{est.height ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-[80px] truncate">{est.roofPitch ?? "—"}</td>
                    <td className="px-4 py-3">{fmt(est.internalCost)}</td>
                    <td className="px-4 py-3 font-semibold text-primary">{fmt(est.recommendedPrice)}</td>
                    <td className="px-4 py-3">{fmt(est.clientPrice)}</td>
                    <td className="px-4 py-3">{est.marginPercent ? `${est.marginPercent}%` : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs px-2 py-1 rounded-full font-medium", STATUS_BADGE[est.status])}>{statusLabel}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{fmtDate(est.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setPrintEst(est)} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 whitespace-nowrap">
                        <Printer className="w-3.5 h-3.5" />{t.estimates.proposal}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <EstimateForm onClose={() => setShowForm(false)} defaultLeadId={defaultLeadId} />}
      {printEst && <PrintableProposal est={printEst} onClose={() => setPrintEst(null)} />}
    </div>
  );
}
