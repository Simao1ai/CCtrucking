import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertServiceTicketSchema, type ServiceTicket, type InsertServiceTicket, type Client, type TicketRequiredDocument } from "@shared/schema";
import type { User } from "@shared/models/auth";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Search, Ticket, Calendar, User as UserIcon, ChevronDown, AlertTriangle, FileText, Check, X, Trash2, ClipboardList, Clock, CheckCircle, AlertOctagon, Lock, Unlock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";

const SERVICE_TYPES = [
  "Business Setup",
  "Quarterly Tax",
  "Annual Tax",
  "DOT Permit",
  "IFTA Permit",
  "UCR Registration",
  "IRP Registration",
  "BOC-3 Filing",
  "MCS-150 Update",
  "Other",
];

const PRIORITIES = ["low", "medium", "high", "urgent"];

const REQUIRED_DOC_TYPES = [
  "Fuel Records",
  "Mileage Report",
  "Insurance Certificate",
  "DOT Registration",
  "EIN Letter",
  "Operating Agreement",
  "Power of Attorney",
  "Tax Return",
  "Other",
];

function docStatusBadgeClass(status: string): string {
  switch (status) {
    case "pending": return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30";
    case "received": return "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30";
    case "waived": return "bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30";
    default: return "";
  }
}

const ticketFormSchema = insertServiceTicketSchema.extend({
  dueDate: z.string().optional().nullable(),
});

type TicketFormValues = z.infer<typeof ticketFormSchema>;

type SafeUser = Omit<User, "password">;

function RequiredDocsSection({ ticketId }: { ticketId: string }) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocType, setNewDocType] = useState("");

  const { data: requiredDocs = [], isLoading } = useQuery<TicketRequiredDocument[]>({
    queryKey: ["/api/tickets", ticketId, "required-docs"],
    enabled: isOpen,
  });

  const addDocMutation = useMutation({
    mutationFn: async (data: { documentName: string; documentType: string }) => {
      await apiRequest("POST", `/api/tickets/${ticketId}/required-docs`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId, "required-docs"] });
      toast({ title: "Document added", description: "Required document has been added." });
      setNewDocName("");
      setNewDocType("");
      setShowAddForm(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/tickets/required-docs/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId, "required-docs"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/tickets/required-docs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId, "required-docs"] });
      toast({ title: "Deleted", description: "Required document removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleAddDoc = () => {
    if (!newDocName.trim() || !newDocType) return;
    addDocMutation.mutate({ documentName: newDocName.trim(), documentType: newDocType });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 mt-2 h-7 text-xs" data-testid={`button-toggle-docs-${ticketId}`}>
          <FileText className="w-3 h-3" />
          Required Documents
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-3 space-y-2 border-t pt-3" data-testid={`section-required-docs-${ticketId}`}>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : requiredDocs.length === 0 && !showAddForm ? (
            <p className="text-xs text-muted-foreground">No required documents yet.</p>
          ) : (
            <div className="space-y-2">
              {requiredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-2 rounded-md border p-2"
                  data-testid={`required-doc-${doc.id}`}
                >
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="text-xs font-medium" data-testid={`doc-name-${doc.id}`}>{doc.documentName}</span>
                    <Badge variant="secondary" className="text-xs" data-testid={`doc-type-${doc.id}`}>{doc.documentType}</Badge>
                    <Badge variant="secondary" className={`text-xs ${docStatusBadgeClass(doc.status)}`} data-testid={`doc-status-${doc.id}`}>
                      {doc.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {doc.status === "pending" && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateStatusMutation.mutate({ id: doc.id, status: "received" })}
                          disabled={updateStatusMutation.isPending}
                          data-testid={`button-mark-received-${doc.id}`}
                          title="Mark as received"
                        >
                          <Check className="w-3 h-3 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateStatusMutation.mutate({ id: doc.id, status: "waived" })}
                          disabled={updateStatusMutation.isPending}
                          data-testid={`button-mark-waived-${doc.id}`}
                          title="Mark as waived"
                        >
                          <X className="w-3 h-3 text-gray-500" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => deleteMutation.mutate(doc.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-doc-${doc.id}`}
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showAddForm ? (
            <div className="flex items-end gap-2 flex-wrap mt-2" data-testid={`form-add-doc-${ticketId}`}>
              <div className="flex-1 min-w-[120px]">
                <label className="text-xs text-muted-foreground mb-1 block">Document Name</label>
                <Input
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="Document name"
                  data-testid={`input-doc-name-${ticketId}`}
                />
              </div>
              <div className="min-w-[160px]">
                <label className="text-xs text-muted-foreground mb-1 block">Document Type</label>
                <Select value={newDocType} onValueChange={setNewDocType}>
                  <SelectTrigger data-testid={`select-doc-type-${ticketId}`}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUIRED_DOC_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                onClick={handleAddDoc}
                disabled={addDocMutation.isPending || !newDocName.trim() || !newDocType}
                data-testid={`button-submit-doc-${ticketId}`}
              >
                {addDocMutation.isPending ? "Adding..." : "Add"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setShowAddForm(false); setNewDocName(""); setNewDocType(""); }}
                data-testid={`button-cancel-doc-${ticketId}`}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-1 mt-1 h-7 text-xs"
              onClick={() => setShowAddForm(true)}
              data-testid={`button-add-doc-${ticketId}`}
            >
              <Plus className="w-3 h-3" />
              Add Required Document
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function TicketForm({ onSuccess, clients }: { onSuccess: () => void; clients: Client[] }) {
  const { toast } = useToast();
  const { data: teamMembers = [] } = useQuery<SafeUser[]>({
    queryKey: ["/api/admin/users"],
    select: (users: SafeUser[]) => users.filter(u => u.role === "admin" || u.role === "owner"),
  });
  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      clientId: "",
      title: "",
      serviceType: "",
      status: "open",
      priority: "medium",
      description: "",
      dueDate: "",
      assignedTo: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: TicketFormValues) => {
      const payload: any = { ...data };
      if (payload.dueDate) {
        payload.dueDate = new Date(payload.dueDate).toISOString();
      } else {
        payload.dueDate = null;
      }
      await apiRequest("POST", "/api/tickets", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({ title: "Ticket created", description: "Service ticket has been created." });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        <FormField control={form.control} name="clientId" render={({ field }) => (
          <FormItem>
            <FormLabel>Client</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger data-testid="select-ticket-client">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
            <FormControl><Input {...field} placeholder="Ticket title" data-testid="input-ticket-title" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="serviceType" render={({ field }) => (
            <FormItem>
              <FormLabel>Service Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-service-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SERVICE_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="priority" render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-priority">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="dueDate" render={({ field }) => (
          <FormItem>
            <FormLabel>Due Date</FormLabel>
            <FormControl><Input {...field} type="date" value={field.value ?? ""} data-testid="input-due-date" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="assignedTo" render={({ field }) => (
          <FormItem>
            <FormLabel>Assign Team Member</FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? ""}>
              <FormControl>
                <SelectTrigger data-testid="select-assigned-to">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {teamMembers.map(member => (
                  <SelectItem key={member.id} value={`${member.firstName || ''} ${member.lastName || ''}`.trim() || member.username || `user-${member.id}`} data-testid={`option-member-${member.id}`}>
                    {`${member.firstName || ''} ${member.lastName || ''}`.trim() || member.username}
                    {member.role === "owner" ? " (Owner)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl><Textarea {...field} value={field.value ?? ""} placeholder="Describe the service request..." data-testid="input-ticket-description" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={mutation.isPending} data-testid="button-create-ticket">
            {mutation.isPending ? "Creating..." : "Create Ticket"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function priorityIndicator(priority: string) {
  const colors: Record<string, string> = {
    urgent: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-amber-400",
    low: "bg-gray-300 dark:bg-gray-600",
  };
  return colors[priority] || colors.low;
}

const LOCK_EXPIRY_MS = 30 * 60 * 1000;

function isLockActive(ticket: ServiceTicket): boolean {
  if (!ticket.lockedBy || !ticket.lockedAt) return false;
  return Date.now() - new Date(ticket.lockedAt).getTime() < LOCK_EXPIRY_MS;
}

export default function Tickets() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: tickets, isLoading } = useQuery<ServiceTicket[]>({ queryKey: ["/api/tickets"] });
  const { data: clients } = useQuery<Client[]>({ queryKey: ["/api/clients"] });

  const clientMap = new Map(clients?.map(c => [c.id, c]) ?? []);

  const filtered = tickets?.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.serviceType.toLowerCase().includes(search.toLowerCase()) ||
      (clientMap.get(t.clientId)?.companyName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesTab = tab === "all" || t.status === tab;
    return matchesSearch && matchesTab;
  }) ?? [];

  const statusCounts = {
    all: tickets?.length ?? 0,
    open: tickets?.filter(t => t.status === "open").length ?? 0,
    in_progress: tickets?.filter(t => t.status === "in_progress").length ?? 0,
    completed: tickets?.filter(t => t.status === "completed").length ?? 0,
    on_hold: tickets?.filter(t => t.status === "on_hold").length ?? 0,
    blocked: tickets?.filter(t => t.status === "blocked").length ?? 0,
  };

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/tickets/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
    },
  });

  const claimTicket = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/tickets/${id}/claim`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({ title: "Ticket claimed", description: "You are now working on this ticket." });
    },
    onError: (error: Error) => {
      toast({ title: "Cannot claim ticket", description: error.message, variant: "destructive" });
    },
  });

  const releaseTicket = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/tickets/${id}/release`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({ title: "Ticket released", description: "The ticket is now available for others." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1400px] mx-auto" data-testid="page-tickets">
      <div className="flex items-center justify-between" data-testid="page-header">
        <div>
          <h1 className="text-lg font-semibold tracking-tight" data-testid="page-title">Service Tickets</h1>
          <p className="text-[13px] text-muted-foreground" data-testid="page-description">{statusCounts.all} total · {statusCounts.open} open · {statusCounts.blocked} blocked</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 text-xs" data-testid="button-add-ticket"><Plus className="w-3.5 h-3.5 mr-1" />New Ticket</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Service Ticket</DialogTitle></DialogHeader>
            <TicketForm onSuccess={() => setDialogOpen(false)} clients={clients ?? []} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4" data-testid="stat-cards-row">
        <StatCard title="Open" value={statusCounts.open} icon={ClipboardList} iconColor="text-blue-600 dark:text-blue-400" iconBg="bg-blue-100 dark:bg-blue-900/40" accent="bg-blue-500" />
        <StatCard title="In Progress" value={statusCounts.in_progress} icon={Clock} iconColor="text-amber-600 dark:text-amber-400" iconBg="bg-amber-100 dark:bg-amber-900/40" accent="bg-amber-500" />
        <StatCard title="Completed" value={statusCounts.completed} icon={CheckCircle} iconColor="text-emerald-600 dark:text-emerald-400" iconBg="bg-emerald-100 dark:bg-emerald-900/40" accent="bg-emerald-500" />
        <StatCard title="Blocked" value={statusCounts.blocked} icon={AlertOctagon} iconColor="text-red-600 dark:text-red-400" iconBg="bg-red-100 dark:bg-red-900/40" accent={statusCounts.blocked > 0 ? "bg-red-500" : undefined} subtitle={statusCounts.blocked > 0 ? "Needs attention" : undefined} />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search tickets..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-sm" data-testid="input-search-tickets" />
        </div>
        <Tabs value={tab} onValueChange={setTab} className="flex-1">
          <TabsList className="h-8 gap-0.5 p-0.5">
            <TabsTrigger value="all" data-testid="tab-all" className="text-[11px] h-7 px-2.5">All</TabsTrigger>
            <TabsTrigger value="open" data-testid="tab-open" className="text-[11px] h-7 px-2.5">Open</TabsTrigger>
            <TabsTrigger value="in_progress" data-testid="tab-in-progress" className="text-[11px] h-7 px-2.5">In Progress</TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed" className="text-[11px] h-7 px-2.5">Completed</TabsTrigger>
            <TabsTrigger value="blocked" data-testid="tab-blocked" className="text-[11px] h-7 px-2.5">Blocked</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div>
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-card-border rounded-xl">
            <EmptyState icon={Ticket} title="No tickets found" description={search ? "Try adjusting your search" : "Create a service ticket to get started"} compact
              action={!search ? <Button size="sm" className="h-7 text-xs" onClick={() => setDialogOpen(true)} data-testid="button-empty-add-ticket"><Plus className="w-3 h-3 mr-1" />New Ticket</Button> : undefined}
            />
          </div>
        ) : (
          <div className="bg-card border border-card-border rounded-xl overflow-hidden divide-y divide-border/40">
            {filtered.map(ticket => {
              const client = clientMap.get(ticket.clientId);
              const isOverdue = ticket.dueDate && new Date(ticket.dueDate) < new Date() && ticket.status !== "completed" && ticket.status !== "closed";
              const locked = isLockActive(ticket);
              const lockedByMe = locked && ticket.lockedBy === user?.id;
              const lockedByOther = locked && ticket.lockedBy !== user?.id;
              const canRelease = locked && (lockedByMe || user?.role === "owner" || user?.role === "admin");
              return (
                <div key={ticket.id} className={`px-4 py-3 hover:bg-muted/30 transition-colors ${isOverdue ? "bg-red-50/30 dark:bg-red-950/10" : ticket.status === "blocked" ? "bg-orange-50/20 dark:bg-orange-950/5" : ""}`} data-testid={`card-ticket-${ticket.id}`}>
                  {lockedByOther && (
                    <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg text-xs text-amber-700 dark:text-amber-400" data-testid={`lock-banner-${ticket.id}`}>
                      <Lock className="w-3 h-3 flex-shrink-0" />
                      <span className="flex-1">
                        <strong>{ticket.lockedByName}</strong> is working on this ticket
                        {ticket.lockedAt && ` (started ${formatDistanceToNow(new Date(ticket.lockedAt), { addSuffix: true })})`}
                      </span>
                      {canRelease && (
                        <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[10px] text-amber-700 dark:text-amber-400 hover:text-amber-900"
                          onClick={() => releaseTicket.mutate(ticket.id)} data-testid={`button-force-release-${ticket.id}`}>
                          <Unlock className="w-3 h-3 mr-0.5" /> Release
                        </Button>
                      )}
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-1 mt-1 h-10 rounded-full ${priorityIndicator(ticket.priority)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-sm leading-snug">{ticket.title}</h3>
                            <StatusBadge status={ticket.status} />
                            {(ticket.priority === "high" || ticket.priority === "urgent") && <StatusBadge status={ticket.priority} />}
                            {locked && (
                              <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${lockedByMe ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"}`} data-testid={`badge-locked-${ticket.id}`}>
                                <Lock className="w-2.5 h-2.5" />
                                {lockedByMe ? "You" : ticket.lockedByName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground mt-1">
                            <span className="font-medium text-foreground/70">{client?.companyName ?? "Unknown"}</span>
                            <span>·</span>
                            <span>{ticket.serviceType}</span>
                            {ticket.dueDate && (
                              <>
                                <span>·</span>
                                <span className={isOverdue ? "text-red-600 dark:text-red-400 font-semibold" : ""}>
                                  {isOverdue ? "Overdue " : "Due "}{format(new Date(ticket.dueDate), "MMM d")}
                                </span>
                              </>
                            )}
                            {ticket.assignedTo && (<><span>·</span><span>{ticket.assignedTo}</span></>)}
                          </div>
                          <RequiredDocsSection ticketId={ticket.id} />
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-1.5">
                          {lockedByMe ? (
                            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 border-blue-200 text-blue-700 dark:text-blue-300 dark:border-blue-800"
                              onClick={() => releaseTicket.mutate(ticket.id)} disabled={releaseTicket.isPending}
                              data-testid={`button-release-${ticket.id}`}>
                              <Unlock className="w-3 h-3" /> Release
                            </Button>
                          ) : !locked ? (
                            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1"
                              onClick={() => claimTicket.mutate(ticket.id)} disabled={claimTicket.isPending}
                              data-testid={`button-claim-${ticket.id}`}>
                              <Lock className="w-3 h-3" /> Start Working
                            </Button>
                          ) : null}
                          <Select
                            value={ticket.status}
                            onValueChange={(status) => updateStatus.mutate({ id: ticket.id, status })}
                            disabled={lockedByOther}
                          >
                            <SelectTrigger className={`w-[120px] h-7 text-[11px] ${lockedByOther ? "opacity-50" : ""}`} data-testid={`select-status-${ticket.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="on_hold">On Hold</SelectItem>
                              <SelectItem value="blocked">Blocked</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
