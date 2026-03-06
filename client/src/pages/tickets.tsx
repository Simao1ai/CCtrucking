import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertServiceTicketSchema, type ServiceTicket, type InsertServiceTicket, type Client, type TicketRequiredDocument } from "@shared/schema";
import type { User } from "@shared/models/auth";
import { Plus, Search, Ticket, Calendar, User as UserIcon, ChevronDown, AlertTriangle, FileText, Check, X, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";

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

function statusColor(status: string): "default" | "secondary" | "destructive" {
  switch (status) {
    case "open": return "default";
    case "in_progress": return "default";
    case "completed": return "secondary";
    case "on_hold": return "secondary";
    case "blocked": return "destructive";
    default: return "secondary";
  }
}

function priorityColor(priority: string): "default" | "secondary" | "destructive" {
  switch (priority) {
    case "urgent": return "destructive";
    case "high": return "destructive";
    case "medium": return "default";
    case "low": return "secondary";
    default: return "secondary";
  }
}

function docStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" {
  switch (status) {
    case "received": return "default";
    case "waived": return "secondary";
    case "pending": return "destructive";
    default: return "secondary";
  }
}

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
        <Button variant="ghost" size="sm" className="gap-1 mt-2" data-testid={`button-toggle-docs-${ticketId}`}>
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
              className="gap-1 mt-1"
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
                  <SelectItem key={member.id} value={`${member.firstName || ''} ${member.lastName || ''}`.trim() || member.username} data-testid={`option-member-${member.id}`}>
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

export default function Tickets() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState("all");

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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="page-tickets">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Service Tickets</h1>
          <p className="text-muted-foreground text-sm mt-1">Track trucking compliance and service workflows</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-ticket">
              <Plus className="w-4 h-4 mr-2" />
              New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Service Ticket</DialogTitle>
            </DialogHeader>
            <TicketForm onSuccess={() => setDialogOpen(false)} clients={clients ?? []} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-tickets"
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">All ({statusCounts.all})</TabsTrigger>
          <TabsTrigger value="open" data-testid="tab-open">Open ({statusCounts.open})</TabsTrigger>
          <TabsTrigger value="in_progress" data-testid="tab-in-progress">In Progress ({statusCounts.in_progress})</TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">Completed ({statusCounts.completed})</TabsTrigger>
          <TabsTrigger value="on_hold" data-testid="tab-on-hold">On Hold ({statusCounts.on_hold})</TabsTrigger>
          <TabsTrigger value="blocked" data-testid="tab-blocked">Blocked ({statusCounts.blocked})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Ticket className="w-12 h-12 text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-semibold mb-1">No tickets found</h3>
                <p className="text-sm text-muted-foreground">
                  {search ? "Try adjusting your search" : "Create a service ticket to get started"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map(ticket => (
                <Card key={ticket.id} data-testid={`card-ticket-${ticket.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-sm">{ticket.title}</h3>
                          <Badge variant={statusColor(ticket.status)} className="text-xs" data-testid={`badge-status-${ticket.id}`}>
                            {ticket.status.replace("_", " ")}
                          </Badge>
                          {ticket.status === "blocked" && (
                            <Badge variant="destructive" className="text-xs gap-1" data-testid={`badge-blocked-warning-${ticket.id}`}>
                              <AlertTriangle className="w-3 h-3" />
                              Blocked
                            </Badge>
                          )}
                          <Badge variant={priorityColor(ticket.priority)} className="text-xs">
                            {ticket.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap mt-2">
                          <span className="flex items-center gap-1">
                            <Ticket className="w-3 h-3" />
                            {ticket.serviceType}
                          </span>
                          <span className="flex items-center gap-1">
                            <UserIcon className="w-3 h-3" />
                            {clientMap.get(ticket.clientId)?.companyName ?? "Unknown"}
                          </span>
                          {ticket.dueDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Due: {format(new Date(ticket.dueDate), "MMM d, yyyy")}
                            </span>
                          )}
                          {ticket.assignedTo && (
                            <span className="flex items-center gap-1">
                              <UserIcon className="w-3 h-3" />
                              {ticket.assignedTo}
                            </span>
                          )}
                        </div>
                        {ticket.description && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{ticket.description}</p>
                        )}
                        <RequiredDocsSection ticketId={ticket.id} />
                      </div>
                      <div className="flex-shrink-0">
                        <Select
                          value={ticket.status}
                          onValueChange={(status) => updateStatus.mutate({ id: ticket.id, status })}
                        >
                          <SelectTrigger className="w-[130px]" data-testid={`select-status-${ticket.id}`}>
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
