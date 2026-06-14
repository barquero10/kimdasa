import { useState } from "react";
import {
  useGetFollowUps, useCreateFollowUp, useUpdateFollowUp, useDeleteFollowUp,
  useGetLeads, useGetCustomers,
  getGetFollowUpsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn, fmtDateTime } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Check, Trash2, X, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function FollowUpForm({ onClose }: { onClose: () => void }) {
  const leadsQuery = useGetLeads();
  const customersQuery = useGetCustomers();
  const createMutation = useCreateFollowUp();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [form, setForm] = useState({ scheduledAt: "", notes: "", leadId: "", customerId: "", assignedTo: "" });

  const save = () => {
    createMutation.mutate({
      data: {
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        notes: form.notes || undefined,
        leadId: form.leadId ? Number(form.leadId) : undefined,
        customerId: form.customerId ? Number(form.customerId) : undefined,
        assignedTo: form.assignedTo || undefined,
      }
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetFollowUpsQueryKey() });
        toast({ title: t.followUps.scheduled });
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-2xl border border-border w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-lg">{t.followUps.newFollowUp}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.followUps.dateTime}</label>
            <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(p => ({...p, scheduledAt: e.target.value}))}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.followUps.lead}</label>
              <select value={form.leadId} onChange={e => setForm(p => ({...p, leadId: e.target.value}))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1">
                <option value="">{t.common.none}</option>
                {(leadsQuery.data ?? []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.followUps.customer}</label>
              <select value={form.customerId} onChange={e => setForm(p => ({...p, customerId: e.target.value}))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1">
                <option value="">{t.common.none}</option>
                {(customersQuery.data ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.followUps.assignedTo}</label>
            <input value={form.assignedTo} onChange={e => setForm(p => ({...p, assignedTo: e.target.value}))}
              placeholder={t.followUps.assignedToPlaceholder} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.followUps.notes}</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1 resize-none h-20" />
          </div>
          <div className="flex gap-3">
            <Button onClick={save} disabled={!form.scheduledAt || createMutation.isPending} className="flex-1">{t.followUps.schedule}</Button>
            <Button variant="outline" onClick={onClose}>{t.common.cancel}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FollowUpsPage() {
  const { data: followUps = [], isLoading } = useGetFollowUps();
  const updateMutation = useUpdateFollowUp();
  const deleteMutation = useDeleteFollowUp();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "completed" | "overdue">("pending");

  const now = new Date();
  const filtered = followUps.filter(f => {
    if (filter === "pending") return !f.completed;
    if (filter === "completed") return f.completed;
    if (filter === "overdue") return !f.completed && new Date(f.scheduledAt) < now;
    return true;
  }).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const markComplete = (id: number) => {
    const fu = followUps.find(f => f.id === id);
    if (!fu) return;
    updateMutation.mutate({ id, data: { completed: true, completedAt: new Date().toISOString(), scheduledAt: fu.scheduledAt, notes: fu.notes ?? undefined } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetFollowUpsQueryKey() });
        toast({ title: t.followUps.markedComplete });
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetFollowUpsQueryKey() });
        toast({ title: t.followUps.deleted });
      }
    });
  };

  const overdue = followUps.filter(f => !f.completed && new Date(f.scheduledAt) < now).length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">{t.followUps.title}</h1>
          <p className="text-sm text-muted-foreground">{followUps.filter(f => !f.completed).length} {t.common.pending}</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />{t.followUps.newFollowUp}
        </Button>
      </div>

      {overdue > 0 && (
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 mb-5">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive font-medium">{t.followUps.overdueAlert(overdue)}</p>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {(["pending","overdue","completed","all"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("text-xs px-3 py-1.5 rounded-full font-medium border transition-colors",
              filter === f ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
            {t.followUps.filters[f]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <Calendar className="w-12 h-12 opacity-20 mb-3" />
          <p className="font-medium">{t.followUps.none}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(f => {
            const isOverdue = !f.completed && new Date(f.scheduledAt) < now;
            return (
              <div key={f.id} className={cn(
                "flex items-start gap-4 bg-card border rounded-xl px-5 py-4 transition-colors",
                f.completed ? "opacity-60" : "",
                isOverdue ? "border-destructive/30 bg-destructive/5" : "border-border"
              )}>
                <button
                  onClick={() => !f.completed && markComplete(f.id)}
                  className={cn(
                    "w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors",
                    f.completed ? "bg-green-500 border-green-500 text-white" : "border-border hover:border-green-500"
                  )}
                >
                  {f.completed && <Check className="w-3 h-3" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium", f.completed && "line-through text-muted-foreground")}>
                    {f.notes ?? t.followUps.followUpFallback}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span className={cn(isOverdue && "text-destructive font-medium")}>
                      {fmtDateTime(f.scheduledAt)}
                      {isOverdue && t.followUps.overdueSuffix}
                    </span>
                    {f.assignedTo && <span>→ {f.assignedTo}</span>}
                    {f.leadId && <span>{t.followUps.leadPrefix}{f.leadId}</span>}
                    {f.customerId && <span>{t.followUps.customerPrefix}{f.customerId}</span>}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(f.id)}
                  className="text-muted-foreground/40 hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showForm && <FollowUpForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
