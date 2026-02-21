import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Receipt, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import type { Invoice } from "@shared/schema";

export default function PortalInvoices() {
  const { toast } = useToast();
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

  return (
    <div className="p-6 space-y-6" data-testid="page-portal-invoices">
      <div>
        <h1 className="text-2xl font-bold">My Invoices</h1>
        <p className="text-muted-foreground">View and manage your invoices</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-sm text-muted-foreground">Total Paid</div>
                <div className="text-2xl font-bold text-green-600">${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-500" />
              <div>
                <div className="text-sm text-muted-foreground">Pending</div>
                <div className="text-2xl font-bold text-yellow-600">${totalPending.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <div>
                <div className="text-sm text-muted-foreground">Overdue</div>
                <div className="text-2xl font-bold text-red-600">${totalOverdue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No invoices yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map(invoice => (
            <Card key={invoice.id} data-testid={`invoice-${invoice.id}`}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">{invoice.invoiceNumber}</div>
                    <div className="text-sm text-muted-foreground">{invoice.description}</div>
                    {invoice.dueDate && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Due: {format(new Date(invoice.dueDate), "MMM d, yyyy")}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-semibold text-lg">${parseFloat(invoice.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                      <Badge variant={
                        invoice.status === "paid" ? "default" :
                        invoice.status === "overdue" ? "destructive" :
                        invoice.status === "approved" ? "default" : "secondary"
                      }>
                        {invoice.status === "approved" ? "Approved - Processing" : invoice.status}
                      </Badge>
                    </div>
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
