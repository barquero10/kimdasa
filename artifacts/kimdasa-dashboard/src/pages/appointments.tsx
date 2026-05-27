import { useState } from "react";
import { Calendar, Clock, User, Phone, Wrench, CheckCircle, XCircle, ChevronDown, Settings, Save } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useGetSiteConfig, useUpdateSiteConfig } from "@workspace/api-client-react";
import { getToken } from "@/lib/auth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Appointment = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  service: string;
  preferredDate: string;
  timeSlot: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  notes?: string | null;
  address?: string | null;
  estimateLow?: string | null;
  estimateHigh?: string | null;
  createdAt: string;
};

function statusColor(s: string) {
  if (s === "confirmed") return "bg-green-100 text-green-800 border-green-200";
  if (s === "pending") return "bg-yellow-100 text-yellow-800 border-yellow-200";
  if (s === "cancelled") return "bg-red-100 text-red-800 border-red-200";
  if (s === "completed") return "bg-blue-100 text-blue-800 border-blue-200";
  return "bg-muted text-muted-foreground";
}

function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/appointments`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) setAppointments(await res.json());
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    const res = await fetch(`${BASE}/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAppointments((prev) => prev?.map((a) => (a.id === id ? updated : a)) ?? null);
    }
    return res.ok;
  };

  return { appointments, loading, load, updateStatus };
}

function AvailabilityPanel() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: config } = useGetSiteConfig({});
  const upsert = useUpdateSiteConfig();
  const cfg = config as Record<string, string | null> | undefined;

  const [days, setDays] = useState<number[]>(() => {
    const raw = cfg?.availableDays ?? "1,2,3,4,5";
    return raw.split(",").map(Number).filter((n) => !isNaN(n));
  });
  const [startHour, setStartHour] = useState(cfg?.startHour ?? "8");
  const [endHour, setEndHour] = useState(cfg?.endHour ?? "17");
  const [duration, setDuration] = useState(cfg?.slotDurationMinutes ?? "60");
  const [saving, setSaving] = useState(false);

  const tA = t.appointments;

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all([
        upsert.mutateAsync({ key: "availableDays", data: { value: days.join(",") } }),
        upsert.mutateAsync({ key: "startHour", data: { value: startHour } }),
        upsert.mutateAsync({ key: "endHour", data: { value: endHour } }),
        upsert.mutateAsync({ key: "slotDurationMinutes", data: { value: duration } }),
      ]);
      toast({ title: tA.availabilitySaved });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-4 h-4 text-primary" />
        <h3 className="font-bold">{tA.availability}</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-5">{tA.availabilityDesc}</p>

      <div className="mb-5">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">{tA.availableDays}</label>
        <div className="flex flex-wrap gap-2">
          {([0, 1, 2, 3, 4, 5, 6] as const).map((d) => (
            <button
              key={d}
              onClick={() => toggleDay(d)}
              className={`px-3 py-1.5 rounded-sm text-sm font-medium border transition-colors ${
                days.includes(d)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border text-muted-foreground hover:border-primary"
              }`}
            >
              {tA.days[d]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: tA.startHour, val: startHour, set: setStartHour },
          { label: tA.endHour, val: endHour, set: setEndHour },
          { label: tA.slotDuration, val: duration, set: setDuration },
        ].map(({ label, val, set }) => (
          <div key={label}>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">{label}</label>
            <input
              type="number"
              value={val}
              onChange={(e) => set(e.target.value)}
              className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        ))}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-sm text-sm font-bold hover:bg-primary/90 disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {saving ? "…" : tA.saveAvailability}
      </button>
    </div>
  );
}

export default function AppointmentsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { appointments, loading, load, updateStatus } = useAppointments();
  const [updating, setUpdating] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const tA = t.appointments;

  const handleLoad = () => {
    if (!loaded) { setLoaded(true); load(); }
  };

  if (!loaded) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">{tA.title}</h1>
          <p className="text-muted-foreground mt-1">{tA.subtitle}</p>
        </div>
        <button
          onClick={handleLoad}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-sm font-bold hover:bg-primary/90"
        >
          {t.common.loading.replace("…", "")} {tA.title}
        </button>
      </div>
    );
  }

  const doUpdate = async (id: number, status: string) => {
    setUpdating(id);
    const ok = await updateStatus(id, status);
    setUpdating(null);
    if (ok) toast({ title: tA.statusUpdated });
  };

  const sorted = [...(appointments ?? [])].sort(
    (a, b) => a.preferredDate.localeCompare(b.preferredDate) || a.timeSlot.localeCompare(b.timeSlot),
  );

  const upcoming = sorted.filter((a) => a.status !== "cancelled" && a.status !== "completed");
  const past = sorted.filter((a) => a.status === "cancelled" || a.status === "completed");

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{tA.title}</h1>
          <p className="text-muted-foreground mt-1">
            {loading ? t.common.loading : `${sorted.length} ${tA.total}`}
          </p>
        </div>
      </div>

      <AvailabilityPanel />

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground py-8">
          <span className="w-5 h-5 border-2 border-muted border-t-primary rounded-full animate-spin" />
          <span>{t.common.loading}</span>
        </div>
      )}

      {!loading && sorted.length === 0 && (
        <div className="text-center py-16 border border-dashed border-border rounded-sm">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <p className="font-semibold text-lg">{tA.noAppointments}</p>
          <p className="text-sm text-muted-foreground mt-1">{tA.noAppointmentsDesc}</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-4">Upcoming ({upcoming.length})</h2>
          <div className="space-y-3">
            {upcoming.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appt={appt}
                t={tA}
                updating={updating === appt.id}
                onUpdate={(status) => doUpdate(appt.id, status)}
              />
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-4 text-muted-foreground">Past ({past.length})</h2>
          <div className="space-y-3 opacity-70">
            {past.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appt={appt}
                t={tA}
                updating={updating === appt.id}
                onUpdate={(status) => doUpdate(appt.id, status)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AppointmentCard({
  appt, t: tA, updating, onUpdate,
}: {
  appt: Appointment;
  t: ReturnType<typeof useLanguage>["t"]["appointments"];
  updating: boolean;
  onUpdate: (s: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card border border-border rounded-sm overflow-hidden">
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="shrink-0 w-12 h-12 bg-primary/10 rounded-sm flex flex-col items-center justify-center text-center">
          <span className="text-xs text-primary font-bold leading-none">
            {appt.preferredDate.slice(5)}
          </span>
          <span className="text-xs text-muted-foreground">{appt.preferredDate.slice(0, 4)}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm">{appt.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor(appt.status)}`}>
              {tA.status[appt.status as keyof typeof tA.status] ?? appt.status}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
            <span className="flex items-center gap-1"><Wrench className="w-3 h-3" />{appt.service}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{appt.timeSlot}</span>
            {appt.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{appt.phone}</span>}
          </div>
        </div>

        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </div>

      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
          {appt.address && (
            <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Address:</span> {appt.address}</p>
          )}
          {appt.email && (
            <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Email:</span> <a href={`mailto:${appt.email}`} className="text-primary">{appt.email}</a></p>
          )}
          {appt.estimateLow && appt.estimateHigh && (
            <p className="text-sm"><span className="font-medium">{tA.estimate}:</span> ${Number(appt.estimateLow).toLocaleString()} – ${Number(appt.estimateHigh).toLocaleString()}</p>
          )}
          {appt.notes && (
            <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">{tA.notes}:</span> {appt.notes}</p>
          )}

          <div className="flex gap-2 flex-wrap pt-1">
            {appt.status === "pending" && (
              <button
                disabled={updating}
                onClick={() => onUpdate("confirmed")}
                className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-sm text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />{tA.confirm}
              </button>
            )}
            {appt.status === "confirmed" && (
              <button
                disabled={updating}
                onClick={() => onUpdate("completed")}
                className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-sm text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />{tA.markDone}
              </button>
            )}
            {(appt.status === "pending" || appt.status === "confirmed") && (
              <button
                disabled={updating}
                onClick={() => onUpdate("cancelled")}
                className="flex items-center gap-1.5 border border-red-300 text-red-600 px-3 py-1.5 rounded-sm text-sm font-semibold hover:bg-red-50 disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />{tA.cancel}
              </button>
            )}
            {updating && <span className="text-xs text-muted-foreground self-center">{tA.savingStatus}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
