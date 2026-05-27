import { useState } from "react";
import {
  useGetJobs, useCreateJob, useUpdateJob,
  useGetPhotos, useCreatePhoto,
  getGetJobsQueryKey
} from "@workspace/api-client-react";
import type { CreateJobRequestStatus, Job } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn, fmtDate } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, X, Camera, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_KEYS: { key: CreateJobRequestStatus; color: string }[] = [
  { key: "scheduled", color: "bg-blue-100 text-blue-700" },
  { key: "in_progress", color: "bg-amber-100 text-amber-700" },
  { key: "completed", color: "bg-green-100 text-green-700" },
  { key: "on_hold", color: "bg-muted text-muted-foreground" },
  { key: "cancelled", color: "bg-red-100 text-red-700" },
];

const SERVICES = ["Roofing","Siding","Vinyl Siding","Hardie Siding","Gutters","Soffit","Fascia","Window Capping","Windows","Doors","Exterior Remodeling","Repairs"];

function PhotosSection({ jobId }: { jobId: number }) {
  const { data: photos = [], isLoading } = useGetPhotos({ jobId });
  const createPhoto = useCreatePhoto();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [filename, setFilename] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");

  const handleAdd = () => {
    if (!filename.trim()) return;
    createPhoto.mutate({
      data: { jobId, filename, url: url || undefined, description: description || undefined }
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/api/photos"] });
        setFilename(""); setUrl(""); setDescription(""); setShowForm(false);
        toast({ title: t.jobs.photoLinked });
      }
    });
  };

  if (isLoading) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5" />{t.jobs.photos} ({photos.length})
        </p>
        <button onClick={() => setShowForm(!showForm)} className="text-xs text-primary hover:underline">
          {showForm ? t.jobs.cancelBtn : t.jobs.addBtn}
        </button>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          {photos.map(p => (
            <div key={p.id} className="rounded border border-border overflow-hidden aspect-square bg-muted">
              {p.url ? (
                <img src={p.url} alt={p.description ?? p.filename} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera className="w-5 h-5 text-muted-foreground/30" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="bg-muted/40 rounded-lg p-3 space-y-2">
          <input value={filename} onChange={e => setFilename(e.target.value)} placeholder={t.jobs.filenameRequired}
            className="w-full border border-border rounded px-2 py-1.5 text-xs bg-background" />
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder={t.leads.imageUrlOptional}
            className="w-full border border-border rounded px-2 py-1.5 text-xs bg-background" />
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder={t.leads.descriptionOptional}
            className="w-full border border-border rounded px-2 py-1.5 text-xs bg-background" />
          <Button size="sm" onClick={handleAdd} disabled={!filename.trim() || createPhoto.isPending} className="w-full text-xs h-7">
            {t.leads.linkPhotoBtn}
          </Button>
        </div>
      )}
    </div>
  );
}

function JobForm({ onClose }: { onClose: () => void }) {
  const createMutation = useCreateJob();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [form, setForm] = useState({
    title: "", serviceType: "Roofing", status: "scheduled" as CreateJobRequestStatus,
    startDate: "", endDate: "", crewAssigned: "", crewNotes: "", notes: "",
  });

  const save = () => {
    createMutation.mutate({
      data: {
        title: form.title,
        serviceType: form.serviceType,
        status: form.status,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        crewNotes: [form.crewAssigned ? `Crew: ${form.crewAssigned}` : "", form.crewNotes].filter(Boolean).join("\n") || undefined,
        notes: form.notes || undefined,
      }
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetJobsQueryKey() });
        toast({ title: t.jobs.jobCreated });
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-2xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-lg">{t.jobs.newJob}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.jobs.jobTitle} *</label>
            <input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))}
              placeholder={t.jobs.jobTitlePlaceholder}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.jobs.service}</label>
              <select value={form.serviceType} onChange={e => setForm(p => ({...p, serviceType: e.target.value}))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1">
                {SERVICES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.jobs.status}</label>
              <select value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value as CreateJobRequestStatus}))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1">
                {STATUS_KEYS.map(s => <option key={s.key} value={s.key}>{t.jobs.statuses[s.key]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.jobs.startDate}</label>
              <input type="date" value={form.startDate} onChange={e => setForm(p => ({...p, startDate: e.target.value}))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.jobs.endDate}</label>
              <input type="date" value={form.endDate} onChange={e => setForm(p => ({...p, endDate: e.target.value}))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />{t.jobs.assignedCrew}
            </label>
            <input value={form.crewAssigned} onChange={e => setForm(p => ({...p, crewAssigned: e.target.value}))}
              placeholder={t.jobs.crewPlaceholder}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.jobs.crewNotes}</label>
            <textarea value={form.crewNotes} onChange={e => setForm(p => ({...p, crewNotes: e.target.value}))}
              placeholder={t.jobs.crewNotesPlaceholder}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1 resize-none h-20" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.jobs.generalNotes}</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1 resize-none h-16" />
          </div>
          <div className="flex gap-3">
            <Button onClick={save} disabled={!form.title || createMutation.isPending} className="flex-1">{t.jobs.createJob}</Button>
            <Button variant="outline" onClick={onClose}>{t.common.cancel}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditJobPanel({ job, onClose }: { job: Job; onClose: () => void }) {
  const updateMutation = useUpdateJob();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [status, setStatus] = useState<CreateJobRequestStatus>(job.status as CreateJobRequestStatus);
  const [crewNotes, setCrewNotes] = useState(job.crewNotes ?? "");
  const [notes, setNotes] = useState(job.notes ?? "");

  const save = () => {
    updateMutation.mutate({ id: job.id, data: { title: job.title, status, crewNotes: crewNotes || undefined, notes: notes || undefined } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetJobsQueryKey() });
        toast({ title: t.jobs.jobUpdated });
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-2xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-lg truncate">{job.title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground shrink-0"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.jobs.status}</label>
            <select value={status} onChange={e => setStatus(e.target.value as CreateJobRequestStatus)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1">
              {STATUS_KEYS.map(s => <option key={s.key} value={s.key}>{t.jobs.statuses[s.key]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />{t.jobs.crewNotesAlt}
            </label>
            <textarea value={crewNotes} onChange={e => setCrewNotes(e.target.value)}
              placeholder={t.jobs.crewNotesAltPlaceholder}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1 resize-none h-24" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.jobs.generalNotes}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1 resize-none h-20" />
          </div>
          <div className="border-t border-border pt-4">
            <PhotosSection jobId={job.id} />
          </div>
          <div className="flex gap-3">
            <Button onClick={save} disabled={updateMutation.isPending} className="flex-1">{t.common.saveChanges}</Button>
            <Button variant="outline" onClick={onClose}>{t.common.close}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JobsPage() {
  const { data: jobs = [], isLoading } = useGetJobs();
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? jobs : jobs.filter(j => j.status === filter);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">{t.jobs.title}</h1>
          <p className="text-sm text-muted-foreground">{jobs.length} {t.jobs.totalJobs}</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />{t.jobs.newJob}
        </Button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFilter("all")}
          className={cn("text-xs px-3 py-1.5 rounded-full font-medium border transition-colors",
            filter === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
          {t.common.all} ({jobs.length})
        </button>
        {STATUS_KEYS.map(s => (
          <button key={s.key} onClick={() => setFilter(s.key)}
            className={cn("text-xs px-3 py-1.5 rounded-full font-medium border transition-colors",
              filter === s.key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
            {t.jobs.statuses[s.key]} ({jobs.filter(j => j.status === s.key).length})
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <Briefcase className="w-12 h-12 opacity-20 mb-3" />
          <p className="font-medium">{t.jobs.none}</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(job => {
            const st = STATUS_KEYS.find(s => s.key === job.status);
            const statusLabel = (t.jobs.statuses as Record<string, string>)[job.status] ?? job.status;
            const crewLines = job.crewNotes?.split("\n") ?? [];
            const crewLine = crewLines.find(l => l.startsWith("Crew:")) ?? null;
            const otherNotes = crewLines.filter(l => !l.startsWith("Crew:")).join("\n").trim();
            return (
              <div key={job.id} className="bg-card border border-border rounded-xl p-5 space-y-3 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{job.title}</p>
                    {job.serviceType && <p className="text-xs text-muted-foreground mt-0.5">{job.serviceType}</p>}
                  </div>
                  <span className={cn("text-xs px-2 py-1 rounded-full font-medium shrink-0 whitespace-nowrap", st?.color ?? "bg-muted text-muted-foreground")}>
                    {statusLabel}
                  </span>
                </div>

                {(job.startDate || job.endDate) && (
                  <p className="text-xs text-muted-foreground">{fmtDate(job.startDate)} – {fmtDate(job.endDate)}</p>
                )}

                {crewLine && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{crewLine.replace("Crew:", "").trim()}</span>
                  </div>
                )}

                {otherNotes && (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 line-clamp-2">{otherNotes}</p>
                )}

                <div className="border-t border-border pt-3">
                  <PhotosSection jobId={job.id} />
                </div>

                <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => setEditJob(job)}>
                  {t.jobs.editJobDetails}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {showForm && <JobForm onClose={() => setShowForm(false)} />}
      {editJob && <EditJobPanel job={editJob} onClose={() => setEditJob(null)} />}
    </div>
  );
}
