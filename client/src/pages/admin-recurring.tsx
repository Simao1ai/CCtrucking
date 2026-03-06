import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { RecurringTemplate, Client, ClientRecurringSchedule } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, RefreshCcw } from "lucide-react";

type ScheduleWithDetails = ClientRecurringSchedule & {
  clientName?: string;
  templateName?: string;
};

const SERVICE_TYPES = ["IFTA Permit", "UCR Registration", "MCS-150 Update", "DOT Permit", "Business Setup", "Quarterly Tax"];
const PRIORITIES = ["low", "medium", "high", "urgent"];
const FREQUENCY_TYPES = ["quarterly", "annual", "biennial"];

const priorityVariant = (p: string) => {
  switch (p) {
    case "urgent": return "destructive";
    case "high": return "destructive";
    default: return "secondary";
  }
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

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 flex-wrap">
        <RefreshCcw className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Recurring Compliance</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle data-testid="text-templates-section-title">Recurring Compliance Templates</CardTitle>
          <Button
            data-testid="button-add-template"
            onClick={() => {
              setEditingTemplate(null);
              setTemplateDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Template
          </Button>
        </CardHeader>
        <CardContent>
          {templatesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !templates?.length ? (
            <p className="text-muted-foreground text-center py-8" data-testid="text-no-templates">
              No templates yet. Click "Add Template" to create one.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Service Type</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Days Before</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((t) => (
                    <TableRow key={t.id} data-testid={`row-template-${t.id}`}>
                      <TableCell className="font-medium" data-testid={`text-template-name-${t.id}`}>{t.name}</TableCell>
                      <TableCell data-testid={`text-template-service-${t.id}`}>{t.serviceType}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" data-testid={`badge-template-frequency-${t.id}`}>
                          {t.frequencyType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={priorityVariant(t.priority)} data-testid={`badge-template-priority-${t.id}`}>
                          {t.priority}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-template-days-${t.id}`}>{t.daysBefore}</TableCell>
                      <TableCell>
                        <Switch
                          data-testid={`switch-template-active-${t.id}`}
                          checked={t.isActive}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({ id: t.id, isActive: checked })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            data-testid={`button-edit-template-${t.id}`}
                            onClick={() => {
                              setEditingTemplate(t);
                              setTemplateDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                data-testid={`button-delete-template-${t.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Template</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{t.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel data-testid="button-cancel-delete-template">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  data-testid="button-confirm-delete-template"
                                  onClick={() => deleteTemplateMutation.mutate(t.id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle data-testid="text-schedules-section-title">Client Compliance Schedules</CardTitle>
          <Button
            data-testid="button-assign-schedule"
            onClick={() => setScheduleDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Assign Schedule
          </Button>
        </CardHeader>
        <CardContent>
          {schedulesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !schedules?.length ? (
            <p className="text-muted-foreground text-center py-8" data-testid="text-no-schedules">
              No schedules assigned yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Next Due Date</TableHead>
                    <TableHead>Last Generated</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((s) => (
                    <TableRow key={s.id} data-testid={`row-schedule-${s.id}`}>
                      <TableCell className="font-medium" data-testid={`text-schedule-client-${s.id}`}>
                        {s.clientName || s.clientId}
                      </TableCell>
                      <TableCell data-testid={`text-schedule-template-${s.id}`}>
                        {s.templateName || s.templateId}
                      </TableCell>
                      <TableCell data-testid={`text-schedule-due-${s.id}`}>
                        {s.nextDueDate ? format(new Date(s.nextDueDate), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell data-testid={`text-schedule-generated-${s.id}`}>
                        {s.lastGeneratedDate ? format(new Date(s.lastGeneratedDate), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.isActive ? "secondary" : "outline"} data-testid={`badge-schedule-active-${s.id}`}>
                          {s.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              data-testid={`button-delete-schedule-${s.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove this schedule assignment?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel data-testid="button-cancel-delete-schedule">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                data-testid="button-confirm-delete-schedule"
                                onClick={() => deleteScheduleMutation.mutate(s.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
          templates={templates || []}
        />
      )}
    </div>
  );
}
