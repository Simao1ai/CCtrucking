import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import type { RecurringTemplate, Client, ClientRecurringSchedule } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Pencil, Trash2, RefreshCcw, ClipboardList, Calendar, Clock, AlertTriangle, Building2, CheckCircle, AlertCircle } from "lucide-react";

type ScheduleWithDetails = ClientRecurringSchedule & {
  clientName?: string;
  templateName?: string;
};

const SERVICE_TYPES = ["IFTA Permit", "UCR Registration", "MCS-150 Update", "DOT Permit", "Business Setup", "Quarterly Tax"];
const PRIORITIES = ["low", "medium", "high", "urgent"];
const FREQUENCY_TYPES = ["quarterly", "annual", "biennial"];

const priorityStatusMap: Record<string, string> = {
  urgent: "urgent",
  high: "high",
  medium: "medium",
  low: "low",
};

function TemplateFormDialog({
  open,
  onOpenChange,
  template,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template?: RecurringTemplate | null;
}) {
  const { toast } = useToast();
  const isEdit = !!template;

  const [name, setName] = useState(template?.name || "");
  const [serviceType, setServiceType] = useState(template?.serviceType || "");
  const [description, setDescription] = useState(template?.description || "");
  const [priority, setPriority] = useState(template?.priority || "medium");
  const [frequencyType, setFrequencyType] = useState(template?.frequencyType || "annual");
  const [daysBefore, setDaysBefore] = useState(template?.daysBefore?.toString() || "30");
  const [requiredDocuments, setRequiredDocuments] = useState(template?.requiredDocuments || "");

  const mutation = useMutation({
    mutationFn: async () => {
      const body = {
        name,
        serviceType,
        description: description || undefined,
        priority,
        frequencyType,
        daysBefore: parseInt(daysBefore) || 30,
        requiredDocuments: requiredDocuments || undefined,
      };
      if (isEdit) {
        await apiRequest("PATCH", `/api/admin/recurring-templates/${template.id}`, body);
      } else {
        await apiRequest("POST", "/api/admin/recurring-templates", body);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recurring-templates"] });
      toast({ title: isEdit ? "Template updated" : "Template created" });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle data-testid="text-template-dialog-title">
            {isEdit ? "Edit Template" : "Add Template"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              data-testid="input-template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label>Service Type</Label>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger data-testid="select-template-service-type">
                <SelectValue placeholder="Select service type" />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map((s) => (
                  <SelectItem key={s} value={s} data-testid={`option-service-type-${s.toLowerCase().replace(/\s+/g, '-')}`}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              data-testid="input-template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[140px]">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger data-testid="select-template-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p} data-testid={`option-priority-${p}`}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[140px]">
              <Label>Frequency</Label>
              <Select value={frequencyType} onValueChange={setFrequencyType}>
                <SelectTrigger data-testid="select-template-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_TYPES.map((f) => (
                    <SelectItem key={f} value={f} data-testid={`option-frequency-${f}`}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[100px]">
              <Label>Days Before</Label>
              <Input
                data-testid="input-template-days-before"
                type="number"
                value={daysBefore}
                onChange={(e) => setDaysBefore(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Required Documents (comma-separated)</Label>
            <Textarea
              data-testid="input-template-required-documents"
              value={requiredDocuments}
              onChange={(e) => setRequiredDocuments(e.target.value)}
            />
          </div>
          <Button
            data-testid="button-save-template"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !name || !serviceType}
            className="w-full"
          >
            {mutation.isPending ? "Saving..." : isEdit ? "Update Template" : "Create Template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ScheduleFormDialog({
  open,
  onOpenChange,
  templates,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  templates: RecurringTemplate[];
}) {
  const { toast } = useToast();
  const [clientId, setClientId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/recurring-schedules", {
        clientId,
        templateId,
        nextDueDate: new Date(nextDueDate).toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recurring-schedules"] });
      toast({ title: "Schedule assigned" });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="text-schedule-dialog-title">Assign Schedule</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger data-testid="select-schedule-client">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={c.id} data-testid={`option-client-${c.id}`}>
                    {c.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger data-testid="select-schedule-template">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {templates.filter((t) => t.isActive).map((t) => (
                  <SelectItem key={t.id} value={t.id} data-testid={`option-template-${t.id}`}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Next Due Date</Label>
            <Input
              data-testid="input-schedule-due-date"
              type="date"
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
            />
          </div>
          <Button
            data-testid="button-save-schedule"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !clientId || !templateId || !nextDueDate}
            className="w-full"
          >
            {mutation.isPending ? "Assigning..." : "Assign Schedule"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminRecurring() {
  const { toast } = useToast();
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RecurringTemplate | null>(null);

  const { data: templates, isLoading: templatesLoading } = useQuery<RecurringTemplate[]>({
    queryKey: ["/api/admin/recurring-templates"],
  });

  const { data: schedules, isLoading: schedulesLoading } = useQuery<ScheduleWithDetails[]>({
    queryKey: ["/api/admin/recurring-schedules"],
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiRequest("PATCH", `/api/admin/recurring-templates/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recurring-templates"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/recurring-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recurring-templates"] });
      toast({ title: "Template deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/recurring-schedules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/recurring-schedules"] });
      toast({ title: "Schedule deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const activeTemplates = templates?.filter(t => t.isActive).length ?? 0;
  const totalSchedules = schedules?.length ?? 0;
  const overdueSchedules = schedules?.filter(s => s.nextDueDate && new Date(s.nextDueDate) < new Date() && s.isActive).length ?? 0;
  const upcomingSchedules = schedules?.filter(s => {
    if (!s.nextDueDate || !s.isActive) return false;
    const d = differenceInDays(new Date(s.nextDueDate), new Date());
    return d >= 0 && d <= 30;
  }).length ?? 0;

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1400px] mx-auto" data-testid="page-admin-recurring">
      <div className="flex items-center justify-between" data-testid="page-header">
        <div>
          <h1 className="text-lg font-semibold tracking-tight" data-testid="page-title">Recurring Compliance</h1>
          <p className="text-[13px] text-muted-foreground" data-testid="page-description">{activeTemplates} templates · {totalSchedules} schedules · {overdueSchedules} overdue</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" data-testid="button-add-template" onClick={() => { setEditingTemplate(null); setTemplateDialogOpen(true); }}>
            <Plus className="w-3.5 h-3.5 mr-1" />Template
          </Button>
          <Button size="sm" className="h-8 text-xs" data-testid="button-assign-schedule" onClick={() => setScheduleDialogOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />Schedule
          </Button>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Templates" value={activeTemplates} subtitle={`${(templates?.length ?? 0) - activeTemplates} inactive`} icon={ClipboardList} iconColor="text-blue-600 dark:text-blue-400" iconBg="bg-blue-100 dark:bg-blue-900/40" accent="bg-blue-500" />
        <StatCard title="Schedules" value={totalSchedules} icon={Calendar} iconColor="text-purple-600 dark:text-purple-400" iconBg="bg-purple-100 dark:bg-purple-900/40" accent="bg-purple-500" />
        <StatCard title="Due ≤30d" value={upcomingSchedules} icon={Clock} iconColor="text-amber-600 dark:text-amber-400" iconBg="bg-amber-100 dark:bg-amber-900/40" accent={upcomingSchedules > 0 ? "bg-amber-500" : undefined} />
        <StatCard title="Overdue" value={overdueSchedules} icon={AlertTriangle} iconColor={overdueSchedules > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"} iconBg={overdueSchedules > 0 ? "bg-red-100 dark:bg-red-900/40" : "bg-emerald-100 dark:bg-emerald-900/40"} accent={overdueSchedules > 0 ? "bg-red-500" : "bg-emerald-500"} subtitle={overdueSchedules > 0 ? "Needs attention" : "All on track"} />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider" data-testid="text-templates-section-title">Templates</span>
        </div>

        {templatesLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        ) : !templates?.length ? (
          <div className="bg-card border border-card-border rounded-xl">
            <EmptyState icon={ClipboardList} title="No templates yet" description="Create your first recurring compliance template" compact
              action={<Button size="sm" className="h-7 text-xs" onClick={() => { setEditingTemplate(null); setTemplateDialogOpen(true); }} data-testid="button-empty-add-template"><Plus className="w-3 h-3 mr-1" />Add Template</Button>}
            />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <div key={t.id} className={`relative bg-card border border-card-border rounded-xl p-3.5 overflow-hidden ${!t.isActive ? "opacity-50" : ""}`} data-testid={`row-template-${t.id}`}>
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${t.isActive ? "bg-blue-500" : "bg-gray-300"}`} />
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm leading-snug" data-testid={`text-template-name-${t.id}`}>{t.name}</h3>
                      <StatusBadge status={t.isActive ? "active" : "inactive"} />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5" data-testid={`text-template-service-${t.id}`}>{t.serviceType}</p>
                  </div>
                  <Switch data-testid={`switch-template-active-${t.id}`} checked={t.isActive} onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: t.id, isActive: checked })} />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  <StatusBadge status={t.frequencyType} />
                  <StatusBadge status={priorityStatusMap[t.priority] || t.priority} label={t.priority} />
                  <span className="text-[11px] text-muted-foreground" data-testid={`text-template-days-${t.id}`}>{t.daysBefore}d lead</span>
                </div>
                {t.description && <p className="text-[11px] text-muted-foreground line-clamp-1 mb-2">{t.description}</p>}
                <div className="flex items-center gap-1 border-t border-border/50 pt-2">
                  <Button size="sm" variant="ghost" className="h-6 text-[11px] px-2" data-testid={`button-edit-template-${t.id}`} onClick={() => { setEditingTemplate(t); setTemplateDialogOpen(true); }}>
                    <Pencil className="w-3 h-3 mr-1" />Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-6 text-[11px] px-2 text-destructive hover:text-destructive" data-testid={`button-delete-template-${t.id}`}>
                        <Trash2 className="w-3 h-3 mr-1" />Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Delete Template</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete "{t.name}"? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel data-testid="button-cancel-delete-template">Cancel</AlertDialogCancel><AlertDialogAction data-testid="button-confirm-delete-template" onClick={() => deleteTemplateMutation.mutate(t.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider" data-testid="text-schedules-section-title">Schedules</span>
        </div>

        {schedulesLoading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
        ) : !schedules?.length ? (
          <div className="bg-card border border-card-border rounded-xl">
            <EmptyState icon={RefreshCcw} title="No schedules assigned" description="Assign a recurring compliance schedule to a client" compact
              action={<Button size="sm" className="h-7 text-xs" onClick={() => setScheduleDialogOpen(true)} data-testid="button-empty-assign-schedule"><Plus className="w-3 h-3 mr-1" />Assign Schedule</Button>}
            />
          </div>
        ) : (
          <div className="bg-card border border-card-border rounded-xl overflow-hidden divide-y divide-border/40">
            {schedules.slice().sort((a, b) => {
              if (!a.nextDueDate) return 1;
              if (!b.nextDueDate) return -1;
              return new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime();
            }).map((s) => {
              const isOverdue = s.nextDueDate && new Date(s.nextDueDate) < new Date() && s.isActive;
              const daysUntilDue = s.nextDueDate ? differenceInDays(new Date(s.nextDueDate), new Date()) : null;
              const isDueSoon = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 14;
              return (
                <div key={s.id} className={`flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors ${isOverdue ? "bg-red-50/30 dark:bg-red-950/10" : ""} ${!s.isActive ? "opacity-50" : ""}`} data-testid={`row-schedule-${s.id}`}>
                  <div className={`flex-shrink-0 w-1.5 h-8 rounded-full ${isOverdue ? "bg-red-500" : isDueSoon ? "bg-amber-500" : "bg-emerald-500"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium" data-testid={`text-schedule-client-${s.id}`}>{s.clientName || s.clientId}</span>
                      <span className="text-[11px] text-muted-foreground" data-testid={`text-schedule-template-${s.id}`}>{s.templateName || s.templateId}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                      <span className={isOverdue ? "text-red-600 dark:text-red-400 font-semibold" : isDueSoon ? "text-amber-600 dark:text-amber-400 font-medium" : ""} data-testid={`text-schedule-due-${s.id}`}>
                        {s.nextDueDate ? (isOverdue ? `${Math.abs(daysUntilDue!)}d overdue` : daysUntilDue === 0 ? "Due today" : daysUntilDue === 1 ? "Tomorrow" : `${daysUntilDue}d`) : "No date"}
                      </span>
                      {s.nextDueDate && <span>· {format(new Date(s.nextDueDate), "MMM d, yyyy")}</span>}
                      {s.lastGeneratedDate && <span>· Last: {format(new Date(s.lastGeneratedDate), "MMM d")}</span>}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0" data-testid={`button-delete-schedule-${s.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Delete Schedule</AlertDialogTitle><AlertDialogDescription>Are you sure you want to remove this schedule assignment?</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel data-testid="button-cancel-delete-schedule">Cancel</AlertDialogCancel><AlertDialogAction data-testid="button-confirm-delete-schedule" onClick={() => deleteScheduleMutation.mutate(s.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {templateDialogOpen && (
        <TemplateFormDialog
          open={templateDialogOpen}
          onOpenChange={setTemplateDialogOpen}
          template={editingTemplate}
        />
      )}

      {scheduleDialogOpen && (
        <ScheduleFormDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          templates={templates ?? []}
        />
      )}
    </div>
  );
}
