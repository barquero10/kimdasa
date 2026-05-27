import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { trackBookingConversion } from "@/lib/gtag";
import { Calendar, ChevronLeft, ChevronRight, Clock, CheckCircle, Loader2, User, Phone, Mail, MapPin, StickyNote, Wrench } from "lucide-react";
import { useLanguage, TRANSLATIONS } from "@/lib/i18n";

const EN_SERVICES = TRANSLATIONS.en.booking.services;

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

type BookingState = { step: 1 | 2 | 3 | "done" };
type FormData = {
  name: string; phone: string; email: string;
  address: string; zipCode: string; notes: string; service: string;
};

export function BookingCalendar({ estimateLow, estimateHigh, leadId, initialName, initialPhone, initialEmail, initialService, initialAddress }: {
  estimateLow?: string;
  estimateHigh?: string;
  leadId?: number;
  initialName?: string;
  initialPhone?: string;
  initialEmail?: string;
  initialService?: string;
  initialAddress?: string;
}) {
  const { t, lang } = useLanguage();
  const tb = t.booking;
  const [, navigate] = useLocation();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = addDays(today, 1);

  const [view, setView] = useState<Date>(startOfMonth(minDate));
  const [selected, setSelected] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [step, setStep] = useState<BookingState["step"]>(1);
  const [form, setForm] = useState<FormData>({
    name: initialName ?? "",
    phone: initialPhone ?? "",
    email: initialEmail ?? "",
    address: initialAddress ?? "",
    zipCode: "",
    notes: "",
    service: initialService ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookedDate, setBookedDate] = useState<string>("");
  const [bookedTime, setBookedTime] = useState<string>("");

  const fetchSlots = useCallback(async (dateStr: string) => {
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);
    try {
      const res = await fetch(`${BASE}/api/appointments/slots?date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots ?? []);
      }
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (selected) fetchSlots(selected);
  }, [selected, fetchSlots]);

  const prevMonth = () => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1));
  const nextMonth = () => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1));

  const firstDow = startOfMonth(view).getDay();
  const daysCount = daysInMonth(view);

  const monthLabel = view.toLocaleString(lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US", {
    month: "long", year: "numeric",
  });

  const isBefore = (dateStr: string) => parseDate(dateStr) < minDate;
  const isSameMonth = (day: number) => {
    const d = new Date(view.getFullYear(), view.getMonth(), day);
    return d >= minDate;
  };

  const handleDayClick = (day: number) => {
    const d = new Date(view.getFullYear(), view.getMonth(), day);
    if (d < minDate) return;
    const str = formatDate(d);
    setSelected(str);
  };

  const handleSlotSelect = (s: string) => {
    setSelectedSlot(s);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !selectedSlot || !form.name || !form.phone) return;
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        address: (() => { const a = form.address.trim(); const z = form.zipCode.trim(); return a && z ? `${a}, ${z}` : a || z || undefined; })(),
        notes: form.notes.trim() || undefined,
        service: form.service || EN_SERVICES[0],
        preferredDate: selected,
        timeSlot: selectedSlot,
        language: lang,
      };
      if (estimateLow) body.estimateLow = estimateLow;
      if (estimateHigh) body.estimateHigh = estimateHigh;
      if (leadId) body.leadId = leadId;

      const res = await fetch(`${BASE}/api/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("failed");

      setBookedDate(selected);
      setBookedTime(selectedSlot);
      trackBookingConversion();
      setStep("done");
      navigate("/gracias");
    } catch {
      setError(tb.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  };

  const setField = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  if (step === "done") {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-9 h-9 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-2">{tb.success}</h3>
        <p className="text-muted-foreground text-base max-w-sm">
          {tb.successDesc} <strong>{bookedDate}</strong> · <strong>{bookedTime}</strong>.
        </p>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <button onClick={() => setStep(1)} className="hover:text-primary transition-colors flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" />{tb.back}
            </button>
          </div>
          <p className="font-semibold text-lg">
            📅 {selected && parseDate(selected).toLocaleDateString(lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US", { weekday: "long", month: "long", day: "numeric" })}
            {" "}· {selectedSlot}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-foreground">{tb.service}</label>
              <div className="relative">
                <Wrench className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <select
                  value={form.service}
                  onChange={setField("service")}
                  className="w-full pl-9 pr-3 py-2.5 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">{tb.servicePlaceholder}</option>
                  {tb.services.map((s, i) => (
                    <option key={EN_SERVICES[i] ?? s} value={EN_SERVICES[i] ?? s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5 text-foreground">{tb.name} *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  required
                  value={form.name}
                  onChange={setField("name")}
                  placeholder={tb.namePlaceholder}
                  className="w-full pl-9 pr-3 py-2.5 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5 text-foreground">{tb.phone} *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={setField("phone")}
                  placeholder={tb.phonePlaceholder}
                  className="w-full pl-9 pr-3 py-2.5 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5 text-foreground">{tb.email}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="email"
                  value={form.email}
                  onChange={setField("email")}
                  placeholder={tb.emailPlaceholder}
                  className="w-full pl-9 pr-3 py-2.5 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-semibold mb-1.5 text-foreground">{tb.address}</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  value={form.address}
                  onChange={setField("address")}
                  placeholder={tb.addressPlaceholder}
                  className="w-full pl-9 pr-3 py-2.5 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-foreground">{tb.zipCode}</label>
              <input
                required
                value={form.zipCode}
                onChange={setField("zipCode")}
                placeholder={tb.zipCodePlaceholder}
                maxLength={10}
                className="w-full px-3 py-2.5 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5 text-foreground">{tb.notes}</label>
            <div className="relative">
              <StickyNote className="absolute left-3 top-3 w-4 h-4 text-muted-foreground pointer-events-none" />
              <textarea
                value={form.notes}
                onChange={setField("notes")}
                rows={2}
                placeholder={tb.notesPlaceholder}
                className="w-full pl-9 pr-3 py-2.5 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !form.name || !form.phone}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 rounded-md font-bold text-base hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" />{tb.submitting}</>
            ) : (
              tb.submit
            )}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
      <div className="w-full max-w-sm mx-auto lg:mx-0">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm capitalize">{monthLabel}</span>
          <button
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {DAY_NAMES.map((d) => (
            <div key={d} className="text-center text-xs text-muted-foreground font-semibold py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: firstDow }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysCount }).map((_, i) => {
            const day = i + 1;
            const d = new Date(view.getFullYear(), view.getMonth(), day);
            const disabled = d < minDate;
            const dateStr = formatDate(d);
            const isSelected = dateStr === selected;
            return (
              <button
                key={day}
                disabled={disabled}
                onClick={() => handleDayClick(day)}
                className={`
                  aspect-square flex items-center justify-center rounded-full text-sm font-medium transition-colors
                  ${disabled ? "text-muted-foreground/40 cursor-not-allowed" : "hover:bg-primary/10 cursor-pointer"}
                  ${isSelected ? "bg-primary text-primary-foreground hover:bg-primary" : ""}
                `}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      <div className="w-full max-w-xs mx-auto lg:mx-0 min-h-[180px]">
        {!selected && (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
            <Calendar className="w-8 h-8 mb-2 opacity-30" />
            <p>{tb.selectDateFirst}</p>
          </div>
        )}
        {selected && loadingSlots && (
          <div className="flex items-center justify-center h-40 gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>{tb.loadingSlots}</span>
          </div>
        )}
        {selected && !loadingSlots && slots.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm text-center px-4">
            <Clock className="w-8 h-8 mb-2 opacity-30" />
            <p>{tb.noSlots}</p>
          </div>
        )}
        {selected && !loadingSlots && slots.length > 0 && (
          <div>
            <p className="text-sm font-bold mb-3 text-foreground">{tb.step2}</p>
            <div className="grid grid-cols-2 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => handleSlotSelect(slot)}
                  className="flex items-center gap-2 px-3 py-2.5 border border-border rounded-md text-sm font-medium hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                  {slot}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function BookingSection({ estimateLow, estimateHigh, leadId }: {
  estimateLow?: string;
  estimateHigh?: string;
  leadId?: number;
}) {
  const { t } = useLanguage();
  const tb = t.booking;

  return (
    <section id="booking" className="py-20 bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <p className="text-primary font-bold text-sm uppercase tracking-widest mb-3">{tb.eyebrow}</p>
          <h2 className="text-3xl sm:text-4xl font-black text-foreground mb-4">{tb.title}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{tb.subtitle}</p>
        </div>

        {(estimateLow && estimateHigh) && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg text-center">
            <p className="text-sm text-amber-800 font-medium">
              💰 Your preliminary estimate: <strong>${Number(estimateLow).toLocaleString()} – ${Number(estimateHigh).toLocaleString()}</strong>
            </p>
            <p className="text-xs text-amber-700 mt-1">Lock it in by booking your free in-home visit below</p>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-6 sm:p-10 shadow-sm">
          <BookingCalendar estimateLow={estimateLow} estimateHigh={estimateHigh} leadId={leadId} />
        </div>
      </div>
    </section>
  );
}
