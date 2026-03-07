import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertDocumentSchema, type Document as DocType, type Client } from "@shared/schema";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Search, FileText, Clock, CheckCircle, AlertCircle, FolderOpen } from "lucide-react";
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

function statusIcon(status: string) {
  switch (status) {
    case "approved": return <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
    case "pending": return <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
    case "rejected": return <AlertCircle className="w-3.5 h-3.5 text-destructive" />;
    default: return <FileText className="w-3.5 h-3.5 text-muted-foreground" />;
  }
}

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
  const [filterType, setFilterType] = useState("all");

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
    const matchesType = filterType === "all" || d.status === filterType;
    return matchesSearch && matchesType;
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="page-documents">
      <PageHeader
        title="Documents"
        description="Track compliance documents and client files"
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-doc">
                <Plus className="w-4 h-4 mr-2" />
                Add Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Track Document</DialogTitle>
              </DialogHeader>
              <DocumentForm onSuccess={() => setDialogOpen(false)} clients={clients ?? []} />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Documents"
          value={statusCounts.all}
          icon={FileText}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-500/10"
        />
        <StatCard
          title="Pending Review"
          value={statusCounts.pending}
          icon={Clock}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-500/10"
          subtitle={statusCounts.pending > 0 ? "Awaiting review" : undefined}
        />
        <StatCard
          title="Approved"
          value={statusCounts.approved}
          icon={CheckCircle}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-500/10"
        />
        <StatCard
          title="Rejected"
          value={statusCounts.rejected}
          icon={AlertCircle}
          iconColor="text-red-600 dark:text-red-400"
          iconBg="bg-red-500/10"
        />
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-docs"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px]" data-testid="select-filter-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={FolderOpen}
              title="No documents found"
              description={search || filterType !== "all" ? "Try adjusting your filters" : "Start tracking compliance documents"}
              action={
                !search && filterType === "all" ? (
                  <Button onClick={() => setDialogOpen(true)} data-testid="button-empty-add-doc">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Document
                  </Button>
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(doc => (
            <Card key={doc.id} data-testid={`card-doc-${doc.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {statusIcon(doc.status)}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{clientMap.get(doc.clientId)?.companyName ?? "Unknown"}</span>
                        <span>-</span>
                        <span>{doc.type}</span>
                        <span>-</span>
                        <span>{format(new Date(doc.uploadedAt), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={doc.status} />
                    <Select
                      value={doc.status}
                      onValueChange={(status) => updateStatus.mutate({ id: doc.id, status })}
                    >
                      <SelectTrigger className="w-[120px]" data-testid={`select-doc-status-${doc.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
