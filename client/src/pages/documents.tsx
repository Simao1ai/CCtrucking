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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertDocumentSchema, type Document as DocType, type Client } from "@shared/schema";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Search, FileText, Clock, CheckCircle, AlertCircle, FolderOpen, Building2 } from "lucide-react";
import { format } from "date-fns";

const DOC_TYPES = [
  "EIN Letter",
  "Operating Agreement",
  "Insurance Certificate",
  "DOT Registration",
  "IFTA License",
  "UCR Registration",
  "IRP Cab Card",
  "BOC-3 Filing",
  "Tax Return",
  "Fuel Records",
  "Mileage Report",
  "Permit Document",
  "Power of Attorney",
  "Engagement Letter",
  "Other",
];

function DocumentForm({ onSuccess, clients }: { onSuccess: () => void; clients: Client[] }) {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(insertDocumentSchema),
    defaultValues: {
      clientId: "",
      ticketId: null as string | null,
      name: "",
      type: "",
      status: "pending",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/documents", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document added", description: "Document has been tracked." });
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
                <SelectTrigger data-testid="select-doc-client">
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
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Document Name</FormLabel>
            <FormControl><Input {...field} placeholder="e.g. Q1 2026 Fuel Records" data-testid="input-doc-name" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="type" render={({ field }) => (
          <FormItem>
            <FormLabel>Document Type</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger data-testid="select-doc-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {DOC_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="status" render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger data-testid="select-doc-status">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={mutation.isPending} data-testid="button-add-document">
            {mutation.isPending ? "Adding..." : "Add Document"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function Documents() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState("all");

  const { data: documents, isLoading } = useQuery<DocType[]>({ queryKey: ["/api/documents"] });
  const { data: clients } = useQuery<Client[]>({ queryKey: ["/api/clients"] });

  const clientMap = new Map(clients?.map(c => [c.id, c]) ?? []);

  const statusCounts = {
    all: documents?.length ?? 0,
    pending: documents?.filter(d => d.status === "pending").length ?? 0,
    approved: documents?.filter(d => d.status === "approved").length ?? 0,
    rejected: documents?.filter(d => d.status === "rejected").length ?? 0,
  };

  const filtered = documents?.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.type.toLowerCase().includes(search.toLowerCase()) ||
      (clientMap.get(d.clientId)?.companyName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesTab = tab === "all" || d.status === tab;
    return matchesSearch && matchesTab;
  }) ?? [];

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/documents/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
  });

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1400px] mx-auto" data-testid="page-documents">
      <div className="flex items-center justify-between" data-testid="page-header">
        <div>
          <h1 className="text-lg font-semibold tracking-tight" data-testid="page-title">Documents</h1>
          <p className="text-[13px] text-muted-foreground" data-testid="page-description">{statusCounts.all} tracked · {statusCounts.pending} pending review</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 text-xs" data-testid="button-add-doc"><Plus className="w-3.5 h-3.5 mr-1" />Add Document</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Track Document</DialogTitle></DialogHeader>
            <DocumentForm onSuccess={() => setDialogOpen(false)} clients={clients ?? []} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total" value={statusCounts.all} icon={FileText} iconColor="text-blue-600 dark:text-blue-400" iconBg="bg-blue-100 dark:bg-blue-900/40" accent="bg-blue-500" />
        <StatCard title="Pending" value={statusCounts.pending} icon={Clock} iconColor="text-amber-600 dark:text-amber-400" iconBg="bg-amber-100 dark:bg-amber-900/40" accent={statusCounts.pending > 0 ? "bg-amber-500" : undefined} subtitle={statusCounts.pending > 0 ? "Awaiting review" : undefined} />
        <StatCard title="Approved" value={statusCounts.approved} icon={CheckCircle} iconColor="text-emerald-600 dark:text-emerald-400" iconBg="bg-emerald-100 dark:bg-emerald-900/40" accent="bg-emerald-500" />
        <StatCard title="Rejected" value={statusCounts.rejected} icon={AlertCircle} iconColor="text-red-600 dark:text-red-400" iconBg="bg-red-100 dark:bg-red-900/40" accent={statusCounts.rejected > 0 ? "bg-red-500" : undefined} />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-sm" data-testid="input-search-docs" />
        </div>
        <Tabs value={tab} onValueChange={setTab} className="flex-1">
          <TabsList className="h-8 gap-0.5 p-0.5">
            <TabsTrigger value="all" data-testid="tab-all-docs" className="text-[11px] h-7 px-2.5">All</TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending-docs" className="text-[11px] h-7 px-2.5">Pending</TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-approved-docs" className="text-[11px] h-7 px-2.5">Approved</TabsTrigger>
            <TabsTrigger value="rejected" data-testid="tab-rejected-docs" className="text-[11px] h-7 px-2.5">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div>
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-card-border rounded-xl">
            <EmptyState icon={FolderOpen} title="No documents found" description={search || tab !== "all" ? "Try adjusting your filters" : "Start tracking compliance documents"} compact
              action={!search && tab === "all" ? <Button size="sm" className="h-7 text-xs" onClick={() => setDialogOpen(true)} data-testid="button-empty-add-doc"><Plus className="w-3 h-3 mr-1" />Add Document</Button> : undefined}
            />
          </div>
        ) : (
          <div className="bg-card border border-card-border rounded-xl overflow-hidden divide-y divide-border/40">
            {filtered.map(doc => {
              const client = clientMap.get(doc.clientId);
              return (
                <div key={doc.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors" data-testid={`card-doc-${doc.id}`}>
                  <div className={`flex-shrink-0 w-1.5 h-8 rounded-full ${doc.status === "approved" ? "bg-emerald-500" : doc.status === "rejected" ? "bg-red-500" : "bg-amber-500"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0 rounded font-medium">{doc.type}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      <span>{client?.companyName ?? "Unknown"}</span>
                      <span>·</span>
                      <span>{format(new Date(doc.uploadedAt), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={doc.status} />
                    <Select value={doc.status} onValueChange={(status) => updateStatus.mutate({ id: doc.id, status })}>
                      <SelectTrigger className="w-[100px] h-7 text-[11px]" data-testid={`select-doc-status-${doc.id}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
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
