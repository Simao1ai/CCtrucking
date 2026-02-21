import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertInvoiceSchema, type Invoice, type Client } from "@shared/schema";
import { Plus, Search, Receipt, DollarSign, Calendar } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";

function statusColor(status: string): "default" | "secondary" | "destructive" {
  switch (status) {
    case "paid": return "secondary";
    case "sent": return "default";
    case "overdue": return "destructive";
    case "draft": return "secondary";
    default: return "secondary";
  }
}

const invoiceFormSchema = insertInvoiceSchema.extend({
  amount: z.string().min(1, "Amount is required"),
  dueDate: z.string().optional().nullable(),
  paidDate: z.string().optional().nullable(),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

function InvoiceForm({ onSuccess, clients }: { onSuccess: () => void; clients: Client[] }) {
  const { toast } = useToast();
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      clientId: "",
      ticketId: null,
      invoiceNumber: "",
      amount: "",
      status: "draft",
      dueDate: "",
      paidDate: null,
      description: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: InvoiceFormValues) => {
      const payload: any = { ...data };
      if (payload.dueDate) {
        payload.dueDate = new Date(payload.dueDate).toISOString();
      } else {
        payload.dueDate = null;
      }
      if (payload.paidDate) {
        payload.paidDate = new Date(payload.paidDate).toISOString();
      } else {
        payload.paidDate = null;
      }
      await apiRequest("POST", "/api/invoices", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice created", description: "Invoice has been created." });
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
                <SelectTrigger data-testid="select-invoice-client">
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
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="invoiceNumber" render={({ field }) => (
            <FormItem>
              <FormLabel>Invoice Number</FormLabel>
              <FormControl><Input {...field} placeholder="INV-001" data-testid="input-invoice-number" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="amount" render={({ field }) => (
            <FormItem>
              <FormLabel>Amount ($)</FormLabel>
              <FormControl><Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-amount" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-invoice-status">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="dueDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Due Date</FormLabel>
              <FormControl><Input {...field} type="date" value={field.value ?? ""} data-testid="input-invoice-due" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl><Textarea {...field} value={field.value ?? ""} placeholder="Invoice details..." data-testid="input-invoice-desc" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={mutation.isPending} data-testid="button-create-invoice">
            {mutation.isPending ? "Creating..." : "Create Invoice"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function Invoices() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState("all");

  const { data: invoices, isLoading } = useQuery<Invoice[]>({ queryKey: ["/api/invoices"] });
  const { data: clients } = useQuery<Client[]>({ queryKey: ["/api/clients"] });

  const clientMap = new Map(clients?.map(c => [c.id, c]) ?? []);

  const filtered = invoices?.filter(i => {
    const matchesSearch = i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (i.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (clientMap.get(i.clientId)?.companyName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesTab = tab === "all" || i.status === tab;
    return matchesSearch && matchesTab;
  }) ?? [];

  const totalPaid = invoices?.filter(i => i.status === "paid").reduce((sum, i) => sum + parseFloat(i.amount), 0) ?? 0;
  const totalPending = invoices?.filter(i => i.status === "sent" || i.status === "draft").reduce((sum, i) => sum + parseFloat(i.amount), 0) ?? 0;
  const totalOverdue = invoices?.filter(i => i.status === "overdue").reduce((sum, i) => sum + parseFloat(i.amount), 0) ?? 0;

  const statusCounts = {
    all: invoices?.length ?? 0,
    draft: invoices?.filter(i => i.status === "draft").length ?? 0,
    sent: invoices?.filter(i => i.status === "sent").length ?? 0,
    paid: invoices?.filter(i => i.status === "paid").length ?? 0,
    overdue: invoices?.filter(i => i.status === "overdue").length ?? 0,
  };

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const payload: any = { status };
      if (status === "paid") {
        payload.paidDate = new Date().toISOString();
      }
      await apiRequest("PATCH", `/api/invoices/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    },
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="page-invoices">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground text-sm mt-1">Billing and payment tracking</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-invoice">
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Invoice</DialogTitle>
            </DialogHeader>
            <InvoiceForm onSuccess={() => setDialogOpen(false)} clients={clients ?? []} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Total Paid</p>
                <p className="text-xl font-bold text-chart-2">${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              </div>
              <DollarSign className="w-5 h-5 text-chart-2" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-xl font-bold">${totalPending.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              </div>
              <Receipt className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Overdue</p>
                <p className="text-xl font-bold text-destructive">${totalOverdue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              </div>
              <Calendar className="w-5 h-5 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-invoices"
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-inv-all">All ({statusCounts.all})</TabsTrigger>
          <TabsTrigger value="draft" data-testid="tab-inv-draft">Draft ({statusCounts.draft})</TabsTrigger>
          <TabsTrigger value="sent" data-testid="tab-inv-sent">Sent ({statusCounts.sent})</TabsTrigger>
          <TabsTrigger value="paid" data-testid="tab-inv-paid">Paid ({statusCounts.paid})</TabsTrigger>
          <TabsTrigger value="overdue" data-testid="tab-inv-overdue">Overdue ({statusCounts.overdue})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Receipt className="w-12 h-12 text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-semibold mb-1">No invoices found</h3>
                <p className="text-sm text-muted-foreground">
                  {search || tab !== "all" ? "Try adjusting your filters" : "Create your first invoice"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map(invoice => (
                <Card key={invoice.id} data-testid={`card-invoice-${invoice.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="flex items-center justify-center w-10 h-10 rounded-md bg-muted flex-shrink-0">
                          <Receipt className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold">{invoice.invoiceNumber}</p>
                            <Badge variant={statusColor(invoice.status)} className="text-xs">
                              {invoice.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <span>{clientMap.get(invoice.clientId)?.companyName ?? "Unknown"}</span>
                            {invoice.dueDate && (
                              <>
                                <span>-</span>
                                <span>Due: {format(new Date(invoice.dueDate), "MMM d, yyyy")}</span>
                              </>
                            )}
                          </div>
                          {invoice.description && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">{invoice.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-bold">${parseFloat(invoice.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                          {invoice.paidDate && (
                            <p className="text-xs text-muted-foreground">Paid {format(new Date(invoice.paidDate), "MMM d")}</p>
                          )}
                        </div>
                        <Select
                          value={invoice.status}
                          onValueChange={(status) => updateStatus.mutate({ id: invoice.id, status })}
                        >
                          <SelectTrigger className="w-[110px]" data-testid={`select-inv-status-${invoice.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="sent">Sent</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="overdue">Overdue</SelectItem>
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
