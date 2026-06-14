import { useState } from "react";
import {
  useGetCustomers, useGetCustomer, useUpdateCustomer,
  useGetEstimates, useGetJobs, useGetFollowUps,
  getGetCustomersQueryKey, getGetCustomerQueryKey
} from "@workspace/api-client-react";
import type { Customer, Estimate, Job, FollowUp } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn, fmtDate, fmtDateTime } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, Search, X, UserCog, FileText, Briefcase, Calendar, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type CustomerTab = "details" | "estimates" | "jobs" | "followups";

function DetailsTab({ customer, onEdit }: { customer: Customer; onEdit: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={onEdit}>{t.customers.editDetails}</Button>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t.customers.contact}</p>
        <div className="space-y-2">
          {customer.phone && <div className="flex gap-2 text-sm items-center"><Phone className="w-4 h-4 text-muted-foreground" /><a href={`tel:${customer.phone}`} className="hover:text-primary">{customer.phone}</a></div>}
          {customer.email && <div className="flex gap-2 text-sm items-center"><Mail className="w-4 h-4 text-muted-foreground" />{customer.email}</div>}
          {customer.address && <div className="flex gap-2 text-sm items-center"><MapPin className="w-4 h-4 text-muted-foreground" />{customer.address}</div>}
        </div>
      </div>
      {customer.leadId && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t.customers.convertedFromLead}</p>
          <p className="text-sm text-muted-foreground">{t.customers.leadNumber}{customer.leadId}</p>
        </div>
      )}
      {customer.notes && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t.customers.notes}</p>
          <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-3">{customer.notes}</p>
        </div>
      )}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t.customers.customerSince}</p>
        <p className="text-sm">{fmtDate(customer.createdAt)}</p>
      </div>
    </div>
  );
}

function EstimatesTab({ customerId }: { customerId: number }) {
  const { data: allEstimates = [], isLoading } = useGetEstimates();
  const { t } = useLanguage();
  const estimates: Estimate[] = allEstimates.filter(e => e.customerId === customerId);

  if (isLoading) return <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-3">{t.customers.estimatesCount(estimates.length)}</p>
      {estimates.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">{t.customers.noEstimates}</p>}
      {estimates.map(est => {
        const statusKey = est.status as keyof typeof t.estimates.statusBadge;
        const statusLabel = t.estimates.statusBadge[statusKey] ?? est.status;
        return (
          <div key={est.id} className="border border-border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{est.serviceType}</p>
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                est.status === "approved" ? "bg-green-100 text-green-700" :
                est.status === "sent" ? "bg-blue-100 text-blue-700" :
                "bg-muted text-muted-foreground"
              )}>{statusLabel}</span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
              {est.recommendedPrice && <span className="font-semibold text-primary">{t.estimates.recPrefix} ${Number(est.recommendedPrice).toLocaleString()}</span>}
              {est.clientPrice && <span>{t.estimates.clientPrefix} ${Number(est.clientPrice).toLocaleString()}</span>}
              {est.marginPercent && <span>{est.marginPercent}{t.estimates.marginSuffix}</span>}
              {est.height && <span>{t.estimates.heightInfo} {est.height}</span>}
              {est.roofPitch && <span>{t.estimates.pitchInfo} {est.roofPitch}</span>}
              <span className="ml-auto">{fmtDate(est.createdAt)}</span>
            </div>
            {est.notes && <p className="text-xs text-muted-foreground mt-1.5 bg-muted/50 rounded p-2">{est.notes}</p>}
          </div>
        );
      })}
    </div>
  );
}

function JobsTab({ customerId }: { customerId: number }) {
  const { data: allJobs = [], isLoading } = useGetJobs();
  const { t } = useLanguage();
  const jobs: Job[] = allJobs.filter(j => j.customerId === customerId);
  const STATUS_COLOR: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-700", in_progress: "bg-amber-100 text-amber-700",
    completed: "bg-green-100 text-green-700", on_hold: "bg-muted text-muted-foreground",
    cancelled: "bg-red-100 text-red-700",
  };
  if (isLoading) return <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-3">{t.customers.jobsCount(jobs.length)}</p>
      {jobs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">{t.customers.noJobs}</p>}
      {jobs.map(job => {
        const crewLine = job.crewNotes?.split("\n").find((l: string) => l.startsWith("Crew:")) ?? null;
        const statusLabel = (t.jobs.statuses as Record<string, string>)[job.status] ?? job.status.replace("_", " ");
        return (
          <div key={job.id} className="border border-border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{job.title}</p>
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_COLOR[job.status] ?? "bg-muted text-muted-foreground")}>
                {statusLabel}
              </span>
            </div>
            {job.serviceType && <p className="text-xs text-muted-foreground mt-0.5">{job.serviceType}</p>}
            {(job.startDate || job.endDate) && (
              <p className="text-xs text-muted-foreground mt-1">{fmtDate(job.startDate)} – {fmtDate(job.endDate)}</p>
            )}
            {crewLine && <p className="text-xs text-muted-foreground mt-1">👷 {crewLine.replace("Crew:", "").trim()}</p>}
            {job.notes && <p className="text-xs text-muted-foreground mt-1 bg-muted/50 rounded p-2">{job.notes}</p>}
          </div>
        );
      })}
    </div>
  );
}

function FollowUpsTab({ customerId }: { customerId: number }) {
  const { data: allFollowUps = [], isLoading } = useGetFollowUps();
  const { t } = useLanguage();
  const followUps: FollowUp[] = allFollowUps.filter(f => f.customerId === customerId);
  const now = new Date();
  if (isLoading) return <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-3">{t.customers.followUpsCount(followUps.length)}</p>
      {followUps.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">{t.customers.noFollowUps}</p>}
      {followUps
        .slice()
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
        .map(f => {
          const overdue = !f.completed && new Date(f.scheduledAt) < now;
          return (
            <div key={f.id} className={cn("border rounded-lg p-3", f.completed ? "border-border opacity-60" : overdue ? "border-destructive/30 bg-destructive/5" : "border-border")}>
              <p className={cn("text-sm font-medium", f.completed && "line-through text-muted-foreground")}>{f.notes ?? t.followUps.followUpFallback}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                <span className={cn(overdue && "text-destructive font-medium")}>
                  {fmtDateTime(f.scheduledAt)}{overdue ? ` ${t.customers.overdue}` : ""}
                </span>
                {f.completed && <span className="text-green-600 font-medium">{t.customers.done}</span>}
                {f.assignedTo && <span>→ {f.assignedTo}</span>}
              </div>
            </div>
          );
        })}
    </div>
  );
}

function EditForm({ id, customer, onDone }: { id: number; customer: Customer; onDone: () => void }) {
  const updateMutation = useUpdateCustomer();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [form, setForm] = useState({
    name: customer.name,
    phone: customer.phone ?? "",
    email: customer.email ?? "",
    address: customer.address ?? "",
    notes: customer.notes ?? ""
  });

  const save = () => {
    updateMutation.mutate({ id, data: { name: form.name, phone: form.phone || undefined, email: form.email || undefined, address: form.address || undefined, notes: form.notes || undefined } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetCustomersQueryKey() });
        qc.invalidateQueries({ queryKey: getGetCustomerQueryKey(id) });
        onDone();
        toast({ title: t.customers.customerUpdated });
      },
    });
  };

  const fieldLabels: Record<"name"|"phone"|"email"|"address", string> = {
    name: t.customers.name, phone: t.customers.phone, email: t.customers.email, address: t.customers.address,
  };

  return (
    <div className="space-y-3">
      {(["name", "phone", "email", "address"] as const).map(field => (
        <div key={field}>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{fieldLabels[field]}</label>
          <input value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1 focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      ))}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.customers.notes}</label>
        <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background mt-1 resize-none h-24 focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={updateMutation.isPending}>{t.common.save}</Button>
        <Button size="sm" variant="outline" onClick={onDone}>{t.common.cancel}</Button>
      </div>
    </div>
  );
}

function CustomerDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const { data: customer } = useGetCustomer(id);
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<CustomerTab>("details");
  const [editing, setEditing] = useState(false);

  const CUSTOMER_TABS: { key: CustomerTab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "details", label: t.customers.tabs.details, Icon: Info },
    { key: "estimates", label: t.customers.tabs.estimates, Icon: FileText },
    { key: "jobs", label: t.customers.tabs.jobs, Icon: Briefcase },
    { key: "followups", label: t.customers.tabs.followups, Icon: Calendar },
  ];

  if (!customer) return null;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h2 className="font-bold text-lg">{customer.name}</h2>
          <p className="text-xs text-muted-foreground">{t.customers.customerHash} #{customer.id} · {t.customers.since} {fmtDate(customer.createdAt)}</p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground"><X className="w-5 h-5" /></button>
      </div>

      {!editing && (
        <div className="flex border-b border-border shrink-0 overflow-x-auto">
          {CUSTOMER_TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={cn("flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors",
                activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
              <tab.Icon className="w-3.5 h-3.5" />{tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {editing ? (
          <EditForm id={id} customer={customer} onDone={() => setEditing(false)} />
        ) : (
          <>
            {activeTab === "details" && <DetailsTab customer={customer} onEdit={() => setEditing(true)} />}
            {activeTab === "estimates" && <EstimatesTab customerId={id} />}
            {activeTab === "jobs" && <JobsTab customerId={id} />}
            {activeTab === "followups" && <FollowUpsTab customerId={id} />}
          </>
        )}
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const { data: customers = [], isLoading } = useGetCustomers();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? "").includes(search)
  );

  return (
    <div className="flex h-full overflow-hidden">
      <div className={cn("flex-1 flex flex-col min-w-0 overflow-hidden", selectedId ? "hidden lg:flex" : "flex")}>
        <div className="px-6 py-5 border-b border-border shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold">{t.customers.title}</h1>
              <p className="text-sm text-muted-foreground">{customers.length} {t.common.total}</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.customers.searchPlaceholder}
              className="w-full border border-border rounded-lg pl-10 pr-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <UserCog className="w-12 h-12 opacity-20 mb-3" />
              <p className="font-medium">{t.customers.none}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(c => (
                <button key={c.id} onClick={() => setSelectedId(c.id)}
                  className={cn("w-full text-left px-6 py-4 hover:bg-muted/50 transition-colors flex items-center gap-4", selectedId === c.id && "bg-primary/5")}>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary uppercase shrink-0">{c.name[0]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.email ?? c.phone ?? t.common.noContactInfo}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">{c.address ?? "—"}</p>
                    <p className="text-xs text-muted-foreground/60">{fmtDate(c.createdAt)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedId !== null && (
        <div className="border-l border-border bg-background overflow-hidden flex flex-col w-full lg:w-[480px] shrink-0">
          <CustomerDetail id={selectedId} onClose={() => setSelectedId(null)} />
        </div>
      )}
    </div>
  );
}
