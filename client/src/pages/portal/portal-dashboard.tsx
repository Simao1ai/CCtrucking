import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Ticket, FileText, Receipt, Clock, Building2 } from "lucide-react";
import { format } from "date-fns";
import type { Client, ServiceTicket, Invoice, Document } from "@shared/schema";

export default function PortalDashboard() {
  const { data: account, isLoading: loadingAccount } = useQuery<Client>({ queryKey: ["/api/portal/account"] });
  const { data: tickets = [], isLoading: loadingTickets } = useQuery<ServiceTicket[]>({ queryKey: ["/api/portal/tickets"] });
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery<Invoice[]>({ queryKey: ["/api/portal/invoices"] });
  const { data: documents = [], isLoading: loadingDocs } = useQuery<Document[]>({ queryKey: ["/api/portal/documents"] });

  const openTickets = tickets.filter(t => t.status === "open" || t.status === "in_progress");
  const pendingInvoices = invoices.filter(i => i.status === "sent" || i.status === "draft");
  const totalOwed = pendingInvoices.reduce((sum, i) => sum + parseFloat(i.amount), 0);

  return (
    <div className="p-6 space-y-6" data-testid="page-portal-dashboard">
      <div>
        <h1 className="text-2xl font-bold">Welcome Back</h1>
        {loadingAccount ? (
          <Skeleton className="h-5 w-48 mt-1" />
        ) : (
          <p className="text-muted-foreground">{account?.companyName}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Services</CardTitle>
            <Ticket className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingTickets ? <Skeleton className="h-8 w-12" /> : (
              <>
                <div className="text-2xl font-bold">{openTickets.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Open service requests</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Documents</CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingDocs ? <Skeleton className="h-8 w-12" /> : (
              <>
                <div className="text-2xl font-bold">{documents.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Files on record</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Invoices</CardTitle>
            <Receipt className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingInvoices ? <Skeleton className="h-8 w-12" /> : (
              <>
                <div className="text-2xl font-bold">{pendingInvoices.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Awaiting payment</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Amount Due</CardTitle>
            <Receipt className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingInvoices ? <Skeleton className="h-8 w-12" /> : (
              <>
                <div className="text-2xl font-bold">${totalOwed.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                <p className="text-xs text-muted-foreground mt-1">Total outstanding</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Service Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTickets ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : openTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active service requests.</p>
            ) : (
              <div className="space-y-3">
                {openTickets.slice(0, 5).map(ticket => (
                  <div key={ticket.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <div className="font-medium text-sm">{ticket.title}</div>
                      <div className="text-xs text-muted-foreground">{ticket.serviceType}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={ticket.status === "in_progress" ? "default" : "secondary"}>
                        {ticket.status.replace("_", " ")}
                      </Badge>
                      {ticket.dueDate && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(ticket.dueDate), "MMM d")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingInvoices ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
            ) : (
              <div className="space-y-3">
                {invoices.slice(0, 5).map(invoice => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <div className="font-medium text-sm">{invoice.invoiceNumber}</div>
                      <div className="text-xs text-muted-foreground">{invoice.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">${parseFloat(invoice.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                      <Badge variant={invoice.status === "paid" ? "default" : invoice.status === "overdue" ? "destructive" : "secondary"}>
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {account && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div><span className="text-muted-foreground">Contact:</span> <span className="font-medium">{account.contactName}</span></div>
              <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{account.email}</span></div>
              <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{account.phone}</span></div>
              {account.dotNumber && <div><span className="text-muted-foreground">DOT #:</span> <span className="font-medium">{account.dotNumber}</span></div>}
              {account.mcNumber && <div><span className="text-muted-foreground">MC #:</span> <span className="font-medium">{account.mcNumber}</span></div>}
              {account.einNumber && <div><span className="text-muted-foreground">EIN:</span> <span className="font-medium">{account.einNumber}</span></div>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
