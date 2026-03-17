import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Receipt, CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronUp, Download } from "lucide-react";
import { format } from "date-fns";
import type { Invoice, InvoiceLineItem } from "@shared/schema";

function InvoiceLineItems({ invoiceId }: { invoiceId: string }) {
  const { data: lineItems, isLoading } = useQuery<InvoiceLineItem[]>({
    queryKey: ["/api/portal/invoices", invoiceId, "line-items"],
    queryFn: async () => {
      const res = await fetch(`/api/portal/invoices/${invoiceId}/line-items`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  if (isLoading) return <Skeleton className="h-16 w-full" />;
  if (!lineItems || lineItems.length === 0) return null;

  return (
    <div className="mt-3 border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-2 font-medium">Service</th>
            <th className="text-right p-2 font-medium">Qty</th>
            <th className="text-right p-2 font-medium">Price</th>
            <th className="text-right p-2 font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map(li => (
            <tr key={li.id} className="border-t" data-testid={`portal-line-item-${li.id}`}>
              <td className="p-2">{li.description}</td>
              <td className="p-2 text-right">{li.quantity}</td>
              <td className="p-2 text-right">${parseFloat(li.unitPrice).toFixed(2)}</td>
              <td className="p-2 text-right font-medium">${parseFloat(li.amount).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PortalInvoices() {
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({ queryKey: ["/api/portal/invoices"] });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/portal/invoices/${id}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/invoices"] });
      toast({ title: "Invoice approved", description: "Payment will be processed automatically." });
    },
  });

  const paid = invoices.filter(i => i.status === "paid");
  const pending = invoices.filter(i => i.status === "sent" || i.status === "draft" || i.status === "approved");
  const overdue = invoices.filter(i => i.status === "overdue");

  const totalPaid = paid.reduce((s, i) => s + parseFloat(i.amount), 0);
  const totalPending = pending.reduce((s, i) => s + parseFloat(i.amount), 0);
  const totalOverdue = overdue.reduce((s, i) => s + parseFloat(i.amount), 0);

  const actionNeeded = invoices.filter(i => i.status === "sent" || i.status === "overdue");

  return (
    <div className="p-6 space-y-6" data-testid="page-portal-invoices">
      <PageHeader
        title="My Invoices"
        description="View and manage your invoices"
        badge={actionNeeded.length > 0 ? <StatusBadge status="pending" label={`${actionNeeded.length} need attention`} /> : undefined}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Paid"
          value={`$${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          icon={CheckCircle}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-100 dark:bg-emerald-950"
          subtitle={`${paid.length} invoice${paid.length !== 1 ? "s" : ""}`}
        />
        <StatCard
          title="Pending"
          value={`$${totalPending.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-100 dark:bg-amber-950"
          subtitle={`${pending.length} invoice${pending.length !== 1 ? "s" : ""}`}
        />
        <StatCard
          title="Overdue"
          value={`$${totalOverdue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          icon={AlertTriangle}
          iconColor="text-red-600"
          iconBg="bg-red-100 dark:bg-red-950"
          subtitle={overdue.length > 0 ? `${overdue.length} need${overdue.length === 1 ? "s" : ""} payment` : "All caught up"}
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Receipt}
              title="No invoices yet"
              description="Your invoices will appear here once they are created by your service team."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map(invoice => (
            <Card key={invoice.id} data-testid={`invoice-${invoice.id}`}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="cursor-pointer flex-1 min-w-0" onClick={() => setExpandedId(expandedId === invoice.id ? null : invoice.id)}>
                    <div className="font-medium" data-testid={`text-invoice-number-${invoice.id}`}>{invoice.invoiceNumber}</div>
                    <div className="text-sm text-muted-foreground truncate">{invoice.description}</div>
                    {invoice.dueDate && (
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Due: {format(new Date(invoice.dueDate), "MMM d, yyyy")}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 flex-wrap">
                    <div className="text-right">
                      <div className="font-semibold text-lg" data-testid={`text-invoice-amount-${invoice.id}`}>
                        ${parseFloat(invoice.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </div>
                      <StatusBadge
                        status={invoice.status === "approved" ? "approved" : invoice.status}
                        label={invoice.status === "approved" ? "Approved - Processing" : undefined}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/api/portal/invoices/${invoice.id}/pdf`, "_blank")}
                      data-testid={`button-download-pdf-${invoice.id}`}
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      PDF
                    </Button>
                    {(invoice.status === "sent" || invoice.status === "overdue") && (
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(invoice.id)}
                        disabled={approveMutation.isPending}
                        data-testid={`button-approve-${invoice.id}`}
                      >
                        Approve Payment
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setExpandedId(expandedId === invoice.id ? null : invoice.id)} data-testid={`button-expand-portal-invoice-${invoice.id}`}>
                      {expandedId === invoice.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                {expandedId === invoice.id && (
                  <InvoiceLineItems invoiceId={invoice.id} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
