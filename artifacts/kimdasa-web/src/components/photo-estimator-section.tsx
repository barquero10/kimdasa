import { useState, useRef } from "react";
import { useAiPhotoEstimate, useCreateLead } from "@workspace/api-client-react";
import type { AiPhotoEstimateResponse } from "@workspace/api-client-react";
import { X, BadgeCheck, Plus, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const SERVICE_KEYS = [
  "Roofing", "Siding", "Vinyl Siding", "Hardie Siding", "Gutters", "Soffit",
  "Fascia", "Window Capping", "Windows", "Doors", "Exterior Remodeling", "Repairs",
  "Kitchen Remodeling", "Bathroom Remodeling", "Drywall", "Interior Painting",
  "Flooring", "Hardwood Flooring", "Tile Work", "Interior Carpentry",
  "Custom Closets", "Basement Finishing", "Attic Finishing", "Interior Demolition",
] as const;

const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function PhotoEstimatorSection() {
  const { t, lang } = useLanguage();
  const photoT = t.photoEstimator;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<{ file: File; preview: string }[]>([]);
  const [serviceHint, setServiceHint] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<AiPhotoEstimateResponse | null>(null);
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadSent, setLeadSent] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);

  const estimateMutation = useAiPhotoEstimate();
  const createLead = useCreateLead();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const picked = Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS - files.length);
    const next: { file: File; preview: string }[] = [];
    for (const f of picked) {
      if (f.size > MAX_PHOTO_BYTES) {
        setError(photoT.errorTooBig);
        continue;
      }
      next.push({ file: f, preview: URL.createObjectURL(f) });
    }
    setFiles((prev) => [...prev, ...next].slice(0, MAX_PHOTOS));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(idx: number) {
    setFiles((prev) => {
      const f = prev[idx];
      if (f) URL.revokeObjectURL(f.preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  function reset() {
    files.forEach((f) => URL.revokeObjectURL(f.preview));
    setFiles([]);
    setEstimate(null);
    setError(null);
    setLeadSent(false);
    setLeadError(null);
    setLeadName("");
    setLeadPhone("");
    setNotes("");
    setServiceHint("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0 || estimateMutation.isPending) return;
    setError(null);
    try {
      const dataUrls = await Promise.all(files.map((f) => fileToDataUrl(f.file)));
      const result = await estimateMutation.mutateAsync({
        data: {
          images: dataUrls,
          serviceHint: serviceHint || undefined,
          notes: notes || undefined,
          language: lang,
        },
      });
      setEstimate(result);
    } catch (err) {
      const status = (err as { status?: number } | undefined)?.status;
      if (status === 503) setError(photoT.errorNoConfig);
      else if (status === 413) setError(photoT.errorTooBig);
      else setError(photoT.errorGeneric);
    }
  }

  async function handleLockEstimate(e: React.FormEvent) {
    e.preventDefault();
    if (!estimate || !leadName.trim() || !leadPhone.trim() || createLead.isPending) return;
    setLeadError(null);
    try {
      const comments = [
        `[AI Photo Estimate]`,
        `Detected: ${estimate.serviceDetected ?? "—"}`,
        `Range: ${formatUsd(estimate.lowEstimate)} – ${formatUsd(estimate.highEstimate)} (${estimate.unit})`,
        `Confidence: ${estimate.confidence}`,
        `Summary: ${estimate.summary}`,
        estimate.scopeBullets && estimate.scopeBullets.length > 0
          ? `Scope: ${estimate.scopeBullets.join("; ")}`
          : null,
        notes ? `Visitor notes: ${notes}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      await createLead.mutateAsync({
        data: {
          name: leadName.trim(),
          phone: leadPhone.trim(),
          serviceType: estimate.serviceDetected || serviceHint || undefined,
          source: "ai_photo_estimator",
          language: lang,
          comments,
        },
      });
      setLeadSent(true);
    } catch {
      setLeadError(photoT.lockError);
    }
  }

  const confidenceLabel = estimate
    ? estimate.confidence === "high"
      ? photoT.confidenceHigh
      : estimate.confidence === "medium"
        ? photoT.confidenceMedium
        : photoT.confidenceLow
    : "";
  const confidenceTone = estimate
    ? estimate.confidence === "high"
      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
      : estimate.confidence === "medium"
        ? "bg-amber-100 text-amber-800 border-amber-300"
        : "bg-orange-100 text-orange-800 border-orange-300"
    : "";

  return (
    <section id="ai-estimator" className="py-16 bg-secondary">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <span className="inline-block text-xs uppercase tracking-[0.3em] text-primary font-bold mb-3">
              {photoT.eyebrow}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold uppercase tracking-tight mb-3">
              {photoT.title}
            </h2>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              {photoT.description}
            </p>
          </div>

          {!estimate && (
            <form
              onSubmit={handleSubmit}
              className="bg-background border-2 border-primary rounded-sm p-6 md:p-8 space-y-5"
              data-testid="form-ai-estimator"
            >
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  disabled={files.length >= MAX_PHOTOS || estimateMutation.isPending}
                  className="hidden"
                  id="ai-photo-input"
                  data-testid="input-ai-photos"
                />
                <label
                  htmlFor="ai-photo-input"
                  className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-sm p-8 cursor-pointer transition-colors ${
                    files.length >= MAX_PHOTOS
                      ? "border-muted bg-muted/40 cursor-not-allowed opacity-60"
                      : "border-primary/40 hover:border-primary hover:bg-primary/5"
                  }`}
                >
                  <Plus className="w-8 h-8 text-primary mb-2" />
                  <span className="font-bold text-base uppercase tracking-widest">
                    {photoT.chooseFiles}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {files.length > 0 ? photoT.filesSelected(files.length) : `JPG · PNG · HEIC · max ${MAX_PHOTOS}`}
                  </span>
                </label>

                {files.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {files.map((f, i) => (
                      <div key={i} className="relative group" data-testid={`preview-photo-${i}`}>
                        <img
                          src={f.preview}
                          alt=""
                          className="w-full aspect-square object-cover rounded-sm border border-border"
                        />
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          aria-label={photoT.removePhoto}
                          className="absolute top-1 right-1 h-7 w-7 flex items-center justify-center rounded-full bg-black/80 text-white shadow-md hover:bg-black focus:outline-none focus:ring-2 focus:ring-white"
                          data-testid={`button-remove-photo-${i}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ai-service" className="block text-sm font-bold uppercase tracking-wider mb-2">
                    {photoT.serviceLabel}
                  </label>
                  <select
                    id="ai-service"
                    value={serviceHint}
                    onChange={(e) => setServiceHint(e.target.value)}
                    className="w-full bg-background border border-input px-3 py-3 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    data-testid="select-ai-service"
                  >
                    <option value="">{photoT.servicePlaceholder}</option>
                    {SERVICE_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {t.services.items[key].title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="ai-notes" className="block text-sm font-bold uppercase tracking-wider mb-2">
                    {photoT.notesLabel}
                  </label>
                  <input
                    id="ai-notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={photoT.notesPlaceholder}
                    maxLength={300}
                    className="w-full bg-background border border-input px-3 py-3 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    data-testid="input-ai-notes"
                  />
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="bg-destructive/10 border border-destructive/30 text-destructive text-sm px-4 py-3 rounded-sm"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={files.length === 0 || estimateMutation.isPending}
                className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-4 rounded-sm font-bold text-sm uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                data-testid="button-ai-submit"
              >
                {estimateMutation.isPending ? (
                  <>
                    <span className="inline-block h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    {photoT.analyzing}
                  </>
                ) : (
                  <>
                    <BadgeCheck className="w-5 h-5" />
                    {photoT.submit}
                  </>
                )}
              </button>
            </form>
          )}

          {estimate && (
            <div className="space-y-6">
              <div className="bg-background border-2 border-primary rounded-sm p-6 md:p-8" data-testid="card-ai-result">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <span className="inline-block text-[11px] uppercase tracking-[0.25em] text-primary font-bold">
                    {photoT.resultEyebrow}
                  </span>
                  <span className={`text-[11px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-sm border ${confidenceTone}`}>
                    {photoT.confidenceLabel}: {confidenceLabel}
                  </span>
                </div>

                {estimate.serviceDetected && (
                  <p className="text-sm text-muted-foreground mb-2">
                    <span className="font-bold uppercase tracking-wider text-foreground">
                      {photoT.detectedLabel}:
                    </span>{" "}
                    {estimate.serviceDetected}
                  </p>
                )}

                <div className="bg-secondary/50 border border-border rounded-sm p-5 my-5 text-center">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                    {photoT.rangeLabel}
                  </div>
                  <div className="text-3xl md:text-4xl font-black text-primary leading-none">
                    {formatUsd(estimate.lowEstimate)} – {formatUsd(estimate.highEstimate)}
                  </div>
                  {estimate.unit && estimate.unit !== "job" && (
                    <div className="text-xs text-muted-foreground mt-2">
                      {photoT.perUnit} {estimate.unit}
                    </div>
                  )}
                </div>

                {estimate.summary && (
                  <p className="text-base leading-relaxed mb-4">{estimate.summary}</p>
                )}

                {estimate.scopeBullets && estimate.scopeBullets.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2">
                      {photoT.scopeLabel}
                    </div>
                    <ul className="space-y-1.5 text-sm">
                      {estimate.scopeBullets.map((b, i) => (
                        <li key={i} className="flex gap-2 leading-snug">
                          <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {estimate.recommendation && (
                  <div className="bg-primary/10 border-l-4 border-primary p-4 rounded-sm mb-4">
                    <div className="text-xs uppercase tracking-wider font-bold text-primary mb-1">
                      {photoT.recommendationLabel}
                    </div>
                    <p className="text-sm leading-relaxed">{estimate.recommendation}</p>
                  </div>
                )}

                <p className="text-xs italic text-muted-foreground">{estimate.disclaimer}</p>
              </div>

              {!leadSent ? (
                <form
                  onSubmit={handleLockEstimate}
                  className="bg-primary text-primary-foreground rounded-sm p-6 md:p-8 space-y-4"
                  data-testid="form-lock-estimate"
                >
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold uppercase tracking-tight mb-1">
                      {photoT.lockTitle}
                    </h3>
                    <p className="text-sm opacity-95">{photoT.lockSubtitle}</p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      placeholder={photoT.nameLabel}
                      aria-label={photoT.nameLabel}
                      className="w-full bg-white/95 text-foreground border border-white/20 px-4 py-3 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-white"
                      data-testid="input-lock-name"
                    />
                    <input
                      type="tel"
                      required
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value)}
                      placeholder={photoT.phoneLabel}
                      aria-label={photoT.phoneLabel}
                      className="w-full bg-white/95 text-foreground border border-white/20 px-4 py-3 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-white"
                      data-testid="input-lock-phone"
                    />
                  </div>
                  {leadError && (
                    <p role="alert" className="text-sm bg-black/20 px-3 py-2 rounded-sm">
                      {leadError}
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="submit"
                      disabled={!leadName.trim() || !leadPhone.trim() || createLead.isPending}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-white text-primary px-6 py-3 rounded-sm font-bold text-sm uppercase tracking-widest hover:bg-white/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                      data-testid="button-lock-submit"
                    >
                      {createLead.isPending ? (
                        <span className="inline-block h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      ) : (
                        <BadgeCheck className="w-5 h-5" />
                      )}
                      {photoT.lockCta}
                    </button>
                    <button
                      type="button"
                      onClick={reset}
                      className="inline-flex items-center justify-center gap-2 bg-transparent text-primary-foreground border border-primary-foreground/40 px-6 py-3 rounded-sm font-bold text-sm uppercase tracking-widest hover:bg-black/10 transition-colors"
                      data-testid="button-try-again"
                    >
                      {photoT.tryAgain}
                    </button>
                  </div>
                </form>
              ) : (
                <div
                  className="bg-emerald-50 border-2 border-emerald-300 text-emerald-900 rounded-sm p-6 md:p-8 flex items-start gap-4"
                  role="status"
                  data-testid="card-lock-sent"
                >
                  <BadgeCheck className="w-7 h-7 shrink-0 text-emerald-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold mb-1">{photoT.lockSent}</p>
                    <button
                      type="button"
                      onClick={reset}
                      className="text-sm underline hover:no-underline"
                      data-testid="button-reset-after-sent"
                    >
                      {photoT.tryAgain}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
