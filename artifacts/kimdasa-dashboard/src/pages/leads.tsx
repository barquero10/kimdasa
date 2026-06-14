import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import {
  useGetLeads, useGetLead, useUpdateLead, useCreateFollowUp,
  useGetConversations, useCreateConversation, useGetPhotos, useCreatePhoto,
  useGetEstimates,
  getGetLeadsQueryKey, getGetLeadQueryKey
} from "@workspace/api-client-react";
import type { Lead, UpdateLeadRequestStatus, CreateConversationRequestRole } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn, fmtDate, fmtDateTime } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { X, Phone, Mail, MapPin, Clock, Plus, ChevronRight, MessageSquare, Camera, FileText, Info, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_KEYS: UpdateLeadRequestStatus[] = [
  "new_lead", "contacted", "estimate_sent", "approved", "in_progress", "completed", "lost"
];

const STATUS_BG: Record<string, string> = {
  new_lead: "bg-blue-50 border-blue-200",
  contacted: "bg-purple-50 border-purple-200",
  estimate_sent: "bg-amber-50 border-amber-200",
  approved: "bg-green-50 border-green-200",
  in_progress: "bg-orange-50 border-orange-200",
  completed: "bg-teal-50 border-teal-200",
  lost: "bg-red-50 border-red-200",
};

const STATUS_BADGE: Record<string, string> = {
  new_lead: "bg-blue-100 text-blue-700",
  contacted: "bg-purple-100 text-purple-700",
  estimate_sent: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  in_progress: "bg-orange-100 text-orange-700",
  completed: "bg-teal-100 text-teal-700",
  lost: "bg-red-100 text-red-700",
};

const STATUS_HEADER: Record<string, string> = {
  new_lead: "bg-blue-500",
  contacted: "bg-purple-500",
  estimate_sent: "bg-amber-500",
  approved: "bg-green-500",
  in_progress: "bg-orange-500",
  completed: "bg-teal-500",
  lost: "bg-red-500",
};

type PanelTab = "details" | "conversations" | "photos" | "estimates";

function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left bg-white border rounded-lg p-3 shadow-xs hover:shadow-sm transition-shadow group",
        STATUS_BG[lead.status]
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{lead.name}</p>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0 mt-0.5" />
      </div>
      {lead.serviceType && <p className="text-xs text-muted-foreground mt-0.5">{lead.serviceType}</p>}
      {lead.phone && (
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <Phone className="w-3 h-3" />{lead.phone}
        </p>
      )}
      <p className="text-xs text-muted-foreground/60 mt-1">{fmtDate(lead.createdAt)}</p>
    </button>
  );
}

function DetailsTab({ lead, id }: { lead: Lead; id: number }) {
  const updateMutation = useUpdateLead();
  const createFollowUp = useCreateFollowUp();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [note, setNote] = useState("");

  const handleStatusChange = (status: UpdateLeadRequestStatus) => {
    updateMutation.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetLeadsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetLeadQueryKey(id) });
          toast({ title: t.leads.statusUpdated });
        },
      }
    );
  };

  const handleSaveNote = () => {
    if (!note.trim()) return;
    const existing = lead.comments ?? "";
    updateMutation.mutate(
      { id, data: { comments: (existing ? existing + "\n" : "") + `[${new Date().toLocaleString()}] ${note}` } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetLeadQueryKey(id) });
          setNote("");
          toast({ title: t.leads.noteSaved });
        },
      }
    );
  };

  const handleScheduleFollowUp = () => {
    if (!followUpDate) return;
    createFollowUp.mutate(
      { data: { leadId: id, scheduledAt: new Date(followUpDate).toISOString(), notes: followUpNote || undefined } },
      {
        onSuccess: () => {
          setFollowUpDate(""); setFollowUpNote("");
          toast({ title: t.leads.followUpScheduled });
        },
      }
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t.leads.status}</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_KEYS.map(key => (
            <button
              key={key}
              onClick={() => handleStatusChange(key)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full font-medium transition-all border",
                lead.status === key
                  ? cn(STATUS_BADGE[key], "border-current/20")
                  : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              {t.leadStatus[key]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t.leads.contactInfo}</p>
        <div className="space-y-2">
          {lead.phone && <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-muted-foreground" /><a href={`tel:${lead.phone}`} className="hover:text-primary">{lead.phone}</a></div>}
          {lead.email && <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-muted-foreground" /><a href={`mailto:${lead.email}`} className="hover:text-primary">{lead.email}</a></div>}
          {lead.address && <div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-muted-foreground" />{lead.address}</div>}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t.leads.projectDetails}</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {lead.serviceType && <div><p className="text-xs text-muted-foreground">{t.leads.service}</p><p className="font-medium">{lead.serviceType}</p></div>}
          {lead.urgency && <div><p className="text-xs text-muted-foreground">{t.leads.urgency}</p><p className="font-medium capitalize">{lead.urgency}</p></div>}
          {lead.budgetApprox && <div><p className="text-xs text-muted-foreground">{t.leads.budget}</p><p className="font-medium">{lead.budgetApprox}</p></div>}
          {lead.bestContactTime && <div><p className="text-xs text-muted-foreground">{t.leads.bestTime}</p><p className="font-medium">{lead.bestContactTime}</p></div>}
          {lead.source && <div><p className="text-xs text-muted-foreground">{t.leads.source}</p><p className="font-medium">{lead.source}</p></div>}
          {lead.language && <div><p className="text-xs text-muted-foreground">{t.leads.language}</p><p className="font-medium uppercase">{lead.language}</p></div>}
        </div>
      </div>

      {lead.comments && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t.leads.commentsNotes}</p>
          <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-3">{lead.comments}</p>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t.leads.addNote}</p>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={t.leads.noteWritePlaceholder}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring h-20"
        />
        <Button size="sm" className="mt-2" onClick={handleSaveNote} disabled={!note.trim()}>
          {t.leads.saveNote}
        </Button>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          <Clock className="w-3.5 h-3.5 inline mr-1" />{t.leads.scheduleFollowUp}
        </p>
        <div className="space-y-2">
          <input
            type="datetime-local"
            value={followUpDate}
            onChange={e => setFollowUpDate(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            value={followUpNote}
            onChange={e => setFollowUpNote(e.target.value)}
            placeholder={t.leads.followUpNotesPlaceholder}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button size="sm" onClick={handleScheduleFollowUp} disabled={!followUpDate}>
            <Plus className="w-3.5 h-3.5 mr-1" />{t.leads.schedule}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConversationsTab({ leadId }: { leadId: number }) {
  const { data: conversations = [], isLoading } = useGetConversations({ leadId });
  const createConversation = useCreateConversation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t, lang } = useLanguage();
  const [role, setRole] = useState<CreateConversationRequestRole>("user");
  const [agentType, setAgentType] = useState("sales");
  const [content, setContent] = useState("");

  const handleAdd = () => {
    if (!content.trim()) return;
    createConversation.mutate({
      data: { leadId, role, agentType, content, language: lang }
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/api/conversations"] });
        setContent("");
        toast({ title: t.leads.entryAdded });
      }
    });
  };

  if (isLoading) return <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{t.leads.conversationsCount(conversations.length)}</p>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {conversations.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">{t.leads.noConversations}</p>
        )}
        {conversations.map(c => {
          const roleLabel = (t.leads.role as Record<string, string>)[c.role] ?? c.role;
          const agentLabel = c.agentType ? ((t.leads.agent as Record<string, string>)[c.agentType] ?? c.agentType) : "";
          return (
            <div key={c.id} className={cn(
              "rounded-lg p-3 text-sm",
              c.role === "user" ? "bg-primary/10 border-l-2 border-primary" : "bg-muted/60 border-l-2 border-border"
            )}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {roleLabel}{agentLabel ? ` · ${agentLabel}` : ""}
                </span>
                <span className="text-xs text-muted-foreground/60">{fmtDateTime(c.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap">{c.content}</p>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t.leads.logEntry}</p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <select value={role} onChange={e => setRole(e.target.value as CreateConversationRequestRole)}
            className="border border-border rounded-lg px-2 py-1.5 text-xs bg-background">
            <option value="user">{t.leads.role.user}</option>
            <option value="assistant">{t.leads.role.assistant}</option>
            <option value="system">{t.leads.role.system}</option>
          </select>
          <select value={agentType} onChange={e => setAgentType(e.target.value)}
            className="border border-border rounded-lg px-2 py-1.5 text-xs bg-background">
            <option value="sales">{t.leads.agent.sales}</option>
            <option value="estimator">{t.leads.agent.estimator}</option>
            <option value="project_manager">{t.leads.agent.project_manager}</option>
            <option value="admin">{t.leads.agent.admin}</option>
            <option value="marketing">{t.leads.agent.marketing}</option>
          </select>
        </div>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={t.leads.logPlaceholder}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none h-20 focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button size="sm" className="mt-2" onClick={handleAdd} disabled={!content.trim() || createConversation.isPending}>
          <Plus className="w-3.5 h-3.5 mr-1" />{t.leads.addEntry}
        </Button>
      </div>
    </div>
  );
}

function PhotosTab({ leadId }: { leadId: number }) {
  const { data: photos = [], isLoading } = useGetPhotos({ leadId });
  const createPhoto = useCreatePhoto();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [filename, setFilename] = useState("");

  const handleAdd = () => {
    if (!filename.trim()) return;
    createPhoto.mutate({
      data: { leadId, filename, url: url || undefined, description: description || undefined }
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/api/photos"] });
        setUrl(""); setDescription(""); setFilename("");
        toast({ title: t.leads.photoLinked });
      }
    });
  };

  if (isLoading) return <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{t.leads.photosCount(photos.length)}</p>

      <div className="grid grid-cols-2 gap-3">
        {photos.map(p => (
          <div key={p.id} className="border border-border rounded-lg overflow-hidden">
            {p.url ? (
              <img src={p.url} alt={p.description ?? p.filename} className="w-full h-28 object-cover bg-muted" />
            ) : (
              <div className="w-full h-28 bg-muted flex items-center justify-center">
                <Camera className="w-8 h-8 text-muted-foreground/30" />
              </div>
            )}
            <div className="p-2">
              <p className="text-xs font-medium truncate">{p.filename}</p>
              {p.description && <p className="text-xs text-muted-foreground truncate">{p.description}</p>}
              <p className="text-xs text-muted-foreground/60">{fmtDate(p.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>

      {photos.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">{t.leads.noPhotos}</p>
      )}

      <div className="border-t border-border pt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t.leads.linkPhoto}</p>
        <div className="space-y-2">
          <input value={filename} onChange={e => setFilename(e.target.value)} placeholder={t.leads.filenameLabel}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder={t.leads.imageUrlOptional}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder={t.leads.descriptionOptional}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          <Button size="sm" onClick={handleAdd} disabled={!filename.trim() || createPhoto.isPending}>
            <Camera className="w-3.5 h-3.5 mr-1" />{t.leads.linkPhotoBtn}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EstimatesTab({ leadId, onNavigateToEstimates }: { leadId: number; onNavigateToEstimates: () => void }) {
  const { data: allEstimates = [], isLoading } = useGetEstimates();
  const { t } = useLanguage();
  const estimates = allEstimates.filter(e => e.leadId === leadId);

  if (isLoading) return <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{t.leads.estimatesCount(estimates.length)}</p>
        <Button size="sm" onClick={onNavigateToEstimates}>
          <Plus className="w-3.5 h-3.5 mr-1" />{t.leads.newEstimate}
        </Button>
      </div>

      {estimates.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t.leads.noEstimates}</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={onNavigateToEstimates}>{t.leads.createFirstEstimate}</Button>
        </div>
      ) : (
        <div className="space-y-2">
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
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  {est.recommendedPrice && <span className="font-semibold text-primary">{t.estimates.recPrefix} ${Number(est.recommendedPrice).toLocaleString()}</span>}
                  {est.clientPrice && <span>{t.estimates.clientPrefix} ${Number(est.clientPrice).toLocaleString()}</span>}
                  {est.marginPercent && <span>{est.marginPercent}{t.estimates.marginSuffix}</span>}
                  <span className="ml-auto">{fmtDate(est.createdAt)}</span>
                </div>
                {est.notes && <p className="text-xs text-muted-foreground mt-1.5 bg-muted/50 rounded p-2">{est.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LeadDetailPanel({ id, onClose, onNavigateToEstimates }: { id: number; onClose: () => void; onNavigateToEstimates: (leadId: number) => void }) {
  const { data: lead, isLoading } = useGetLead(id);
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<PanelTab>("details");

  const PANEL_TABS: { key: PanelTab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "details", label: t.leads.tabs.details, Icon: Info },
    { key: "conversations", label: t.leads.tabs.conversations, Icon: MessageSquare },
    { key: "photos", label: t.leads.tabs.photos, Icon: Camera },
    { key: "estimates", label: t.leads.tabs.estimates, Icon: FileText },
  ];

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!lead) return null;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h2 className="font-bold text-lg">{lead.name}</h2>
          <p className="text-xs text-muted-foreground">{t.leads.leadHash} #{lead.id} · {fmtDateTime(lead.createdAt)}</p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex border-b border-border shrink-0 overflow-x-auto">
        {PANEL_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors",
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.Icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {activeTab === "details" && <DetailsTab lead={lead} id={id} />}
        {activeTab === "conversations" && <ConversationsTab leadId={id} />}
        {activeTab === "photos" && <PhotosTab leadId={id} />}
        {activeTab === "estimates" && <EstimatesTab leadId={id} onNavigateToEstimates={() => onNavigateToEstimates(id)} />}
      </div>
    </div>
  );
}

const VALID_LANGS = ["en", "es", "pt"] as const;
type LangFilter = "" | "en" | "es" | "pt";

export default function LeadsPage() {
  const { data: leads = [], isLoading } = useGetLeads();
  const { t } = useLanguage();
  const search = useSearch();
  const [location, navigate] = useLocation();

  const params = new URLSearchParams(search);

  const rawLang = params.get("lang") ?? "";
  const langFilter: LangFilter = (VALID_LANGS.includes(rawLang as typeof VALID_LANGS[number]) ? rawLang : "") as LangFilter;

  const rawStatus = params.get("status") ?? "";
  const statusFilter: UpdateLeadRequestStatus | "" = (STATUS_KEYS.includes(rawStatus as UpdateLeadRequestStatus) ? rawStatus : "") as UpdateLeadRequestStatus | "";

  const searchQuery = params.get("q") ?? "";

  const rawLeadId = params.get("lead");
  const selectedId: number | null = rawLeadId ? parseInt(rawLeadId, 10) || null : null;

  const setSearchQuery = (val: string) => {
    const next = new URLSearchParams(search);
    if (val) next.set("q", val); else next.delete("q");
    const qs = next.toString();
    navigate(location + (qs ? "?" + qs : ""), { replace: true });
  };

  const setLangFilter = (val: LangFilter) => {
    const next = new URLSearchParams(search);
    if (val) next.set("lang", val); else next.delete("lang");
    const qs = next.toString();
    navigate(location + (qs ? "?" + qs : ""), { replace: true });
  };

  const setStatusFilter = (val: UpdateLeadRequestStatus | "") => {
    const next = new URLSearchParams(search);
    if (val) next.set("status", val); else next.delete("status");
    const qs = next.toString();
    navigate(location + (qs ? "?" + qs : ""), { replace: true });
  };

  const setSelectedId = (id: number | null) => {
    const next = new URLSearchParams(search);
    if (id !== null) next.set("lead", String(id)); else next.delete("lead");
    const qs = next.toString();
    navigate(location + (qs ? "?" + qs : ""), { replace: true });
  };

  const handleNavigateToEstimates = (leadId: number) => {
    navigate(`/estimates?leadId=${leadId}`);
  };

  const searchLower = searchQuery.toLowerCase();
  const filteredLeads = leads.filter(l => {
    if (langFilter && l.language !== langFilter) return false;
    if (searchLower) {
      const haystack = [l.name, l.phone, l.email, l.serviceType]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(searchLower)) return false;
    }
    return true;
  });

  const visibleStatuses = statusFilter ? [statusFilter] : STATUS_KEYS;

  const byStatus = STATUS_KEYS.reduce((acc, key) => {
    acc[key] = filteredLeads.filter(l => l.status === key);
    return acc;
  }, {} as Record<string, Lead[]>);

  const LANG_OPTIONS: { value: LangFilter; label: string }[] = [
    { value: "", label: t.common.all ?? "All" },
    { value: "en", label: "🇺🇸 EN" },
    { value: "es", label: "🇪🇸 ES" },
    { value: "pt", label: "🇧🇷 PT" },
  ];

  return (
    <div className="flex h-full overflow-hidden">
      <div className={cn("flex-1 flex flex-col min-w-0 overflow-hidden", selectedId ? "hidden lg:flex" : "flex")}>
        <div className="px-6 py-5 border-b border-border shrink-0">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold">{t.leads.title}</h1>
              <p className="text-sm text-muted-foreground">{filteredLeads.length} {t.leads.totalLeads}</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t.leads.searchPlaceholder}
                  className="text-xs border border-border rounded-lg pl-8 pr-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring w-56"
                />
              </div>
              <div className="flex items-center gap-1">
                {LANG_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setLangFilter(opt.value)}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full font-medium border transition-all",
                      langFilter === opt.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as UpdateLeadRequestStatus | "")}
                className="text-xs border border-border rounded-lg px-2.5 py-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">{t.common.allStatuses}</option>
                {STATUS_KEYS.map(key => (
                  <option key={key} value={key}>{t.leadStatus[key]}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex gap-4 p-4 h-full min-w-max">
              {visibleStatuses.map(key => (
                <div key={key} className="w-60 shrink-0 flex flex-col">
                  <div className={cn("flex items-center gap-2 px-3 py-2 rounded-t-lg text-white text-xs font-bold uppercase tracking-wider", STATUS_HEADER[key])}>
                    {t.leadStatus[key]}
                    <span className="ml-auto bg-white/20 rounded-full px-2 py-0.5">{byStatus[key]?.length ?? 0}</span>
                  </div>
                  <div className="flex-1 bg-muted/40 rounded-b-lg p-2 space-y-2 overflow-y-auto">
                    {(byStatus[key] ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground/50 text-center py-4">{t.common.empty}</p>
                    ) : (byStatus[key] ?? []).map(lead => (
                      <LeadCard key={lead.id} lead={lead} onClick={() => setSelectedId(lead.id)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedId !== null && (
        <div className={cn(
          "border-l border-border bg-background overflow-hidden flex flex-col",
          "w-full lg:w-[460px] shrink-0"
        )}>
          <LeadDetailPanel
            id={selectedId}
            onClose={() => setSelectedId(null)}
            onNavigateToEstimates={handleNavigateToEstimates}
          />
        </div>
      )}
    </div>
  );
}
