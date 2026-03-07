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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertInvoiceSchema, type Invoice, type Client, type ServiceItem, type InvoiceLineItem } from "@shared/schema";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Search, Receipt, DollarSign, Calendar, X, ChevronDown, ChevronUp, Download, Send, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";

interface LineItemEntry {
  serviceItemId: string | null;
  description: string;
  quantity: number;
  unitPrice: string;
  amount: string;
}

const invoiceFormSchema = insertInvoiceSchema.extend({
  amount: z.string().min(1, "Amount is required"),
  dueDate: z.string().optional().nullable(),
  paidDate: z.string().optional().nullable(),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

function LineItemsEditor({ lineItems, setLineItems, serviceItems }: {
  lineItems: LineItemEntry[];
  setLineItems: (items: LineItemEntry[]) => void;
  serviceItems: ServiceItem[];
}) {
  const addItem = () => {
    setLineItems([...lineItems, { serviceItemId: null, description: "", quantity: 1, unitPrice: "0.00", amount: "0.00" }]);
  };

  const removeItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, updates: Partial<LineItemEntry>) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], ...updates };
    const qty = newItems[index].quantity;
    const price = parseFloat(newItems[index].unitPrice) || 0;
    newItems[index].amount = (qty * price).toFixed(2);
    setLineItems(newItems);
  };

  const selectServiceItem = (index: number, serviceItemId: string) => {
    const si = serviceItems.find(s => s.id === serviceItemId);
    if (si) {
      updateItem(index, { serviceItemId, description: si.name, unitPrice: si.defaultPrice });
    }
  };

  const total = lineItems.reduce((sum, li) => sum + (parseFloat(li.amount) || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Line Items</p>
        <Button type="button" variant="outline" size="sm" onClick={addItem} data-testid="button-add-line-item">
          <Plus className="w-3 h-3 mr-1" /> Add Item
        </Button>
      </div>
      {lineItems.map((li, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2" data-testid={`line-item-${i}`}>
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              <Select value={li.serviceItemId || "custom"} onValueChange={(v) => v === "custom" ? updateItem(i, { serviceItemId: null }) : selectServiceItem(i, v)}>
                <SelectTrigger className="text-xs" data-testid={`select-service-item-${i}`}>
                  <SelectValue placeholder="Select service..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Item</SelectItem>
                  {serviceItems.filter(s => s.isActive).map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} — ${s.defaultPrice}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={li.description}
                onChange={(e) => updateItem(i, { description: e.target.value })}
                placeholder="Description"
                className="text-xs"
                data-testid={`input-line-desc-${i}`}
              />
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(i)} data-testid={`button-remove-line-${i}`}>
              <X className="w-3 h-3" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Qty</label>
              <Input
                type="number"
                min="1"
                value={li.quantity}
                onChange={(e) => updateItem(i, { quantity: parseInt(e.target.value) || 1 })}
                className="text-xs"
                data-testid={`input-line-qty-${i}`}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Unit Price</label>
              <Input
                type="number"
                step="0.01"
                value={li.unitPrice}
                onChange={(e) => updateItem(i, { unitPrice: e.target.value })}
                className="text-xs"
                data-testid={`input-line-price-${i}`}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Amount</label>
              <Input value={`$${li.amount}`} readOnly className="text-xs bg-muted" data-testid={`text-line-amount-${i}`} />
            </div>
          </div>
        </div>
      ))}
      {lineItems.length > 0 && (
        <div className="flex justify-end border-t pt-2">
          <p className="text-sm font-bold" data-testid="text-line-items-total">Total: ${total.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}

function InvoiceForm({ onSuccess, clients }: { onSuccess: () => void; clients: Client[] }) {
  const { toast } = useToast();
  const [lineItems, setLineItems] = useState<LineItemEntry[]>([]);
  const { data: serviceItems } = useQuery<ServiceItem[]>({ queryKey: ["/api/admin/service-items"] });
  const { data: nextNumData } = useQuery<{ nextNumber: string; currentCount: number }>({
    queryKey: ["/api/invoices/next-number"],
  });

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      clientId: "",
      ticketId: null,
      invoiceNumber: "",
      amount: "0.00",
      status: "draft",
      dueDate: "",
      paidDate: null,
      description: "",
    },
  });

  const currentInvNum = form.watch("invoiceNumber");
  if (nextNumData && !currentInvNum) {
    form.setValue("invoiceNumber", nextNumData.nextNumber);
  }

  const total = lineItems.reduce((sum, li) => sum + (parseFloat(li.amount) || 0), 0);

  const mutation = useMutation({
    mutationFn: async (data: InvoiceFormValues) => {
      const payload: any = { ...data };
      payload.amount = lineItems.length > 0 ? total.toFixed(2) : data.amount;
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
      const res = await apiRequest("POST", "/api/invoices", payload);
      const invoice = await res.json();

      for (const li of lineItems) {
        if (li.description && parseFloat(li.amount) > 0) {
          await apiRequest("POST", `/api/invoices/${invoice.id}/line-items`, {
            serviceItemId: li.serviceItemId || null,
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            amount: li.amount,
          });
        }
      }
      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/next-number"] });
      toast({ title: "Invoice created", description: "Invoice has been created." });
      setLineItems([]);
      form.reset();
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
              <FormControl><Input {...field} placeholder="Auto-generated" data-testid="input-invoice-number" /></FormControl>
              <p className="text-xs text-muted-foreground">Auto-generated. Edit to override.</p>
              <FormMessage />
            </FormItem>
          )} />
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
        </div>
        <FormField control={form.control} name="dueDate" render={({ field }) => (
          <FormItem>
            <FormLabel>Due Date</FormLabel>
            <FormControl><Input {...field} type="date" value={field.value ?? ""} data-testid="input-invoice-due" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl><Textarea {...field} value={field.value ?? ""} placeholder="Invoice details..." data-testid="input-invoice-desc" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <LineItemsEditor lineItems={lineItems} setLineItems={setLineItems} serviceItems={serviceItems ?? []} />

        {lineItems.length === 0 && (
          <FormField control={form.control} name="amount" render={({ field }) => (
            <FormItem>
              <FormLabel>Amount ($)</FormLabel>
              <FormControl><Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-amount" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={mutation.isPending} data-testid="button-create-invoice">
            {mutation.isPending ? "Creating..." : `Create Invoice${lineItems.length > 0 ? ` — $${total.toFixed(2)}` : ""}`}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function InvoiceDetail({ invoice, clients }: { invoice: Invoice; clients: Client[] }) {
  const { toast } = useToast();
  const clientMap = new Map(clients.map(c => [c.id, c]));
  const [addingItem, setAddingItem] = useState(false);
  const [newItem, setNewItem] = useState<LineItemEntry>({ serviceItemId: null, description: "", quantity: 1, unitPrice: "0.00", amount: "0.00" });

  const sendInvoiceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/invoices/${invoice.id}/send`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice sent!", description: data.message });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    },
  });
  const { data: serviceItems } = useQuery<ServiceItem[]>({ queryKey: ["/api/admin/service-items"] });
  const { data: lineItems, isLoading } = useQuery<InvoiceLineItem[]>({
    queryKey: ["/api/invoices", invoice.id, "line-items"],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${invoice.id}/line-items`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const addLineItem = useMutation({
    mutationFn: async (item: LineItemEntry) => {
      await apiRequest("POST", `/api/invoices/${invoice.id}/line-items`, {
        serviceItemId: item.serviceItemId || null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoice.id, "line-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setAddingItem(false);
      setNewItem({ serviceItemId: null, description: "", quantity: 1, unitPrice: "0.00", amount: "0.00" });
      toast({ title: "Line item added" });
    },
  });

  const deleteLineItem = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/invoice-line-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoice.id, "line-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Line item removed" });
    },
  });

  const selectService = (serviceItemId: string) => {
    const si = (serviceItems ?? []).find(s => s.id === serviceItemId);
    if (si) {
      const qty = newItem.quantity;
      const price = si.defaultPrice;
      setNewItem({ serviceItemId, description: si.name, quantity: qty, unitPrice: price, amount: (qty * parseFloat(price)).toFixed(2) });
    }
  };

  const updateNewItem = (updates: Partial<LineItemEntry>) => {
    setNewItem(prev => {
      const updated = { ...prev, ...updates };
      const qty = updated.quantity;
      const price = parseFloat(updated.unitPrice) || 0;
      updated.amount = (qty * price).toFixed(2);
      return updated;
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Client</p>
          <p className="font-medium">{clientMap.get(invoice.clientId)?.companyName ?? "Unknown"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Status</p>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={invoice.status} />
            {(invoice as any).reminderCount > 0 && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300" data-testid={`badge-reminder-${invoice.id}`}>
                {(invoice as any).reminderCount === 1 ? "1st Reminder" : (invoice as any).reminderCount === 2 ? "2nd Notice" : "Final Notice"}
              </Badge>
            )}
          </div>
        </div>
        <div>
          <p className="text-muted-foreground">Due Date</p>
          <p className="font-medium">{invoice.dueDate ? format(new Date(invoice.dueDate), "MMM d, yyyy") : "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Total Amount</p>
          <p className="font-bold text-lg">${parseFloat(invoice.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
        </div>
      </div>
      {invoice.description && (
        <div className="text-sm">
          <p className="text-muted-foreground">Description</p>
          <p>{invoice.description}</p>
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(`/api/invoices/${invoice.id}/pdf`, "_blank")}
          data-testid={`button-download-pdf-${invoice.id}`}
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Download PDF
        </Button>
        <Button
          size="sm"
          onClick={() => sendInvoiceMutation.mutate()}
          disabled={sendInvoiceMutation.isPending}
          data-testid={`button-send-invoice-${invoice.id}`}
        >
          {sendInvoiceMutation.isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Email Invoice to Client
            </>
          )}
        </Button>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">Line Items</p>
          {!addingItem && (
            <Button variant="outline" size="sm" onClick={() => setAddingItem(true)} data-testid="button-add-existing-line-item">
              <Plus className="w-3 h-3 mr-1" /> Add Item
            </Button>
          )}
        </div>
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <>
            {lineItems && lineItems.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2 font-medium">Description</th>
                      <th className="text-right p-2 font-medium">Qty</th>
                      <th className="text-right p-2 font-medium">Price</th>
                      <th className="text-right p-2 font-medium">Amount</th>
                      <th className="w-10 p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map(li => (
                      <tr key={li.id} className="border-t" data-testid={`line-item-row-${li.id}`}>
                        <td className="p-2">{li.description}</td>
                        <td className="p-2 text-right">{li.quantity}</td>
                        <td className="p-2 text-right">${parseFloat(li.unitPrice).toFixed(2)}</td>
                        <td className="p-2 text-right font-medium">${parseFloat(li.amount).toFixed(2)}</td>
                        <td className="p-2">
                          <Button variant="ghost" size="icon" onClick={() => deleteLineItem.mutate(li.id)} data-testid={`button-delete-line-${li.id}`}>
                            <X className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30 border-t">
                    <tr>
                      <td colSpan={3} className="p-2 text-right font-medium">Total</td>
                      <td className="p-2 text-right font-bold">${parseFloat(invoice.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
            {addingItem && (
              <div className="border rounded-lg p-3 mt-2 space-y-2">
                <Select value={newItem.serviceItemId || "custom"} onValueChange={(v) => v === "custom" ? updateNewItem({ serviceItemId: null }) : selectService(v)}>
                  <SelectTrigger className="text-xs" data-testid="select-add-service-item">
                    <SelectValue placeholder="Select service..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom Item</SelectItem>
                    {(serviceItems ?? []).filter(s => s.isActive).map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name} — ${s.defaultPrice}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input value={newItem.description} onChange={(e) => updateNewItem({ description: e.target.value })} placeholder="Description" className="text-xs" data-testid="input-add-line-desc" />
                <div className="grid grid-cols-3 gap-2">
                  <Input type="number" min="1" value={newItem.quantity} onChange={(e) => updateNewItem({ quantity: parseInt(e.target.value) || 1 })} className="text-xs" data-testid="input-add-line-qty" />
                  <Input type="number" step="0.01" value={newItem.unitPrice} onChange={(e) => updateNewItem({ unitPrice: e.target.value })} className="text-xs" data-testid="input-add-line-price" />
                  <Input value={`$${newItem.amount}`} readOnly className="text-xs bg-muted" />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setAddingItem(false)} data-testid="button-cancel-add-line">Cancel</Button>
                  <Button size="sm" onClick={() => addLineItem.mutate(newItem)} disabled={!newItem.description || addLineItem.isPending} data-testid="button-save-line-item">
                    {addLineItem.isPending ? "Adding..." : "Add"}
                  </Button>
                </div>
              </div>
            )}
            {(!lineItems || lineItems.length === 0) && !addingItem && (
              <p className="text-xs text-muted-foreground">No line items. Click "Add Item" to itemize this invoice.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function Invoices() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
      <PageHeader
        title="Invoices"
        description="Billing and payment tracking"
        actions={
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
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Paid"
          value={`$${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-500/10"
          subtitle={`${statusCounts.paid} invoices`}
        />
        <StatCard
          title="Pending"
          value={`$${totalPending.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          icon={Receipt}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-500/10"
          subtitle={`${statusCounts.draft + statusCounts.sent} invoices`}
        />
        <StatCard
          title="Overdue"
          value={`$${totalOverdue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          icon={AlertTriangle}
          iconColor="text-red-600 dark:text-red-400"
          iconBg="bg-red-500/10"
          subtitle={statusCounts.overdue > 0 ? `${statusCounts.overdue} overdue` : undefined}
        />
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
              <CardContent>
                <EmptyState
                  icon={Receipt}
                  title="No invoices found"
                  description={search || tab !== "all" ? "Try adjusting your filters" : "Create your first invoice"}
                  action={
                    !search && tab === "all" ? (
                      <Button onClick={() => setDialogOpen(true)} data-testid="button-empty-add-invoice">
                        <Plus className="w-4 h-4 mr-2" />
                        New Invoice
                      </Button>
                    ) : undefined
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map(invoice => (
                <Card key={invoice.id} data-testid={`card-invoice-${invoice.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0 flex-1 cursor-pointer" onClick={() => setExpandedId(expandedId === invoice.id ? null : invoice.id)}>
                        <div className="flex items-center justify-center w-10 h-10 rounded-md bg-muted flex-shrink-0">
                          <Receipt className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold">{invoice.invoiceNumber}</p>
                            <StatusBadge status={invoice.status} />
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
                        <Button variant="ghost" size="icon" onClick={() => setExpandedId(expandedId === invoice.id ? null : invoice.id)} data-testid={`button-expand-invoice-${invoice.id}`}>
                          {expandedId === invoice.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    {expandedId === invoice.id && (
                      <div className="mt-4 pt-4 border-t">
                        <InvoiceDetail invoice={invoice} clients={clients ?? []} />
                      </div>
                    )}
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
