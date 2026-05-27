import { useGetLeads, useGetCustomers, useGetJobs, useGetFollowUps, useGetEstimates } from "@workspace/api-client-react";
import { cn, fmtDate } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { Users, Briefcase, Calendar, FileText, TrendingUp, Clock } from "lucide-react";

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string; icon: React.ComponentType<{className?: string}>; color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold mt-1.5">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  new_lead: "bg-blue-500/10 text-blue-600", contacted: "bg-purple-500/10 text-purple-600",
  estimate_sent: "bg-amber-500/10 text-amber-600", approved: "bg-green-500/10 text-green-600",
  in_progress: "bg-orange-500/10 text-orange-600", completed: "bg-teal-500/10 text-teal-600",
  lost: "bg-red-500/10 text-red-600",
};

export default function OverviewPage() {
  const { t } = useLanguage();
  const leadsQuery = useGetLeads();
  const customersQuery = useGetCustomers();
  const jobsQuery = useGetJobs();
  const followUpsQuery = useGetFollowUps();
  const estimatesQuery = useGetEstimates();

  const leads = leadsQuery.data ?? [];
  const customers = customersQuery.data ?? [];
  const jobs = jobsQuery.data ?? [];
  const followUps = followUpsQuery.data ?? [];
  const estimates = estimatesQuery.data ?? [];

  const statusLabel = (status: string) =>
    (t.leadStatus as Record<string, string>)[status] ?? status;

  const activeLeads = leads.filter(l => !["completed", "lost"].includes(l.status)).length;
  const pendingFollowUps = followUps.filter(f => !f.completed).length;
  const activeJobs = jobs.filter(j => ["scheduled", "in_progress"].includes(j.status)).length;
  const overdue = followUps.filter(f => !f.completed && new Date(f.scheduledAt) < new Date());

  const leadsByStatus = Object.entries(
    leads.reduce((acc, l) => { acc[l.status] = (acc[l.status] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]);

  const recentLeads = [...leads].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.overview.title}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t.overview.welcome}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t.overview.activeLeads} value={activeLeads} sub={`${leads.length} ${t.overview.totalSuffix}`} icon={Users} color="bg-primary" />
        <StatCard label={t.overview.customers} value={customers.length} sub={t.overview.allTime} icon={TrendingUp} color="bg-green-500" />
        <StatCard label={t.overview.activeJobs} value={activeJobs} sub={`${jobs.length} ${t.overview.totalSuffix}`} icon={Briefcase} color="bg-blue-500" />
        <StatCard label={t.overview.followUpsDue} value={pendingFollowUps} sub={overdue.length > 0 ? `${overdue.length} ${t.overview.overdueSuffix}` : t.overview.allOnTime} icon={Calendar} color={overdue.length > 0 ? "bg-destructive" : "bg-purple-500"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold mb-4">{t.overview.leadPipeline}</h2>
          <div className="space-y-2">
            {leadsByStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.overview.noLeadsYet}</p>
            ) : leadsByStatus.map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2">
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", STATUS_COLORS[status])}>
                    {statusLabel(status)}
                  </span>
                </div>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: leads.length ? `${(count / leads.length) * 100}%` : "0%" }}
                  />
                </div>
                <span className="text-xs font-bold w-5 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold mb-4">{t.overview.recentLeads}</h2>
          <div className="space-y-2">
            {recentLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.overview.noLeadsYet}</p>
            ) : recentLeads.map(lead => (
              <div key={lead.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold uppercase">
                  {lead.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">{lead.serviceType ?? "—"} · {fmtDate(lead.createdAt)}</p>
                </div>
                <span className={cn("text-xs px-2 py-0.5 rounded-full shrink-0", STATUS_COLORS[lead.status])}>
                  {statusLabel(lead.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            {t.overview.overdueFollowUps}
            {overdue.length > 0 && <span className="text-xs bg-destructive text-destructive-foreground rounded-full px-2 py-0.5">{overdue.length}</span>}
          </h2>
          {overdue.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.overview.noOverdue}</p>
          ) : overdue.slice(0, 5).map(f => (
            <div key={f.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
              <div className="flex-1">
                <p className="text-sm font-medium">{f.notes ?? t.overview.noNotes}</p>
                <p className="text-xs text-destructive">{t.overview.dueOn} {fmtDate(f.scheduledAt)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            {t.overview.recentEstimates}
          </h2>
          {estimates.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.overview.noEstimates}</p>
          ) : estimates.slice(0, 5).map(est => (
            <div key={est.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <div className="flex-1">
                <p className="text-sm font-medium">{est.serviceType}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(est.createdAt)}</p>
              </div>
              <span className="text-sm font-semibold text-primary">
                {est.recommendedPrice ? `$${Number(est.recommendedPrice).toLocaleString()}` : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
