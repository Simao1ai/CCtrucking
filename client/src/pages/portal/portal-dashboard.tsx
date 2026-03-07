import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Ticket, FileText, Receipt, Clock, Building2, AlertTriangle, PenLine, DollarSign, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { format } from "date-fns";
import type { Client, ServiceTicket, Invoice, Document } from "@shared/schema";

export default function PortalDashboard() {
  const { data: account, isLoading: loadingAccount } = useQuery<Client>({ queryKey: ["/api/portal/account"] });
  const { data: tickets = [], isLoading: loadingTickets } = useQuery<ServiceTicket[]>({ queryKey: ["/api/portal/tickets"] });
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery<Invoice[]>({ queryKey: ["/api/portal/invoices"] });
  const { data: documents = [], isLoading: loadingDocs } = useQuery<Document[]>({ queryKey: ["/api/portal/documents"] });

  const openTickets = tickets.filter(t => t.status === "open" || t.status === "in_progress");
  const pendingInvoices = invoices.filter(i => i.status === "sent" || i.status === "overdue");
  const overdueInvoices = invoices.filter(i => i.status === "overdue");
  const totalOwed = pendingInvoices.reduce((sum, i) => sum + parseFloat(i.amount), 0);
  const pendingDocs = documents.filter(d => d.status === "pending" || d.status === "requested");
  const completedTickets = tickets.filter(t => t.status === "completed" || t.status === "closed");

  const isLoading = loadingAccount || loadingTickets || loadingInvoices || loadingDocs;

  const hasActionsNeeded = pendingInvoices.length > 0 || pendingDocs.length > 0;

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  })();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="page-portal-dashboard">
      <PageHeader
        title={`${greeting}${account ? `, ${account.contactName?.split(' ')[0] || ''}` : ''}`}
        description={loadingAccount ? undefined : account?.companyName || "Your client portal"}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {hasActionsNeeded && (
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20" data-testid="section-actions-needed">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Actions Needed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {overdueInvoices.length > 0 && (
                    <Link href="/portal/invoices" data-testid="action-overdue-invoices">
                      <div className="flex items-center justify-between p-3 rounded-md bg-red-50/80 dark:bg-red-950/30 border border-red-200 dark:border-red-800 hover-elevate cursor-pointer">
                        <div className="flex items-center gap-3">
                          <DollarSign className="w-4 h-4 text-red-600 dark:text-red-400" />
                          <span className="text-sm font-medium">{overdueInvoices.length} overdue invoice{overdueInvoices.length !== 1 ? 's' : ''} need payment</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </Link>
                  )}
                  {pendingInvoices.filter(i => i.status === "sent").length > 0 && (
                    <Link href="/portal/invoices" data-testid="action-pending-invoices">
                      <div className="flex items-center justify-between p-3 rounded-md bg-card border hover-elevate cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-medium">{pendingInvoices.filter(i => i.status === "sent").length} invoice{pendingInvoices.filter(i => i.status === "sent").length !== 1 ? 's' : ''} awaiting payment</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </Link>
                  )}
                  {pendingDocs.length > 0 && (
                    <Link href="/portal/documents" data-testid="action-pending-docs">
                      <div className="flex items-center justify-between p-3 rounded-md bg-card border hover-elevate cursor-pointer">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          <span className="text-sm font-medium">{pendingDocs.length} document{pendingDocs.length !== 1 ? 's' : ''} requested</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Active Services"
              value={openTickets.length}
              subtitle="Open service requests"
              icon={Ticket}
              iconColor="text-blue-600 dark:text-blue-400"
              iconBg="bg-blue-100 dark:bg-blue-900/40"
            />
            <StatCard
              title="Documents"
              value={documents.length}
              subtitle="Files on record"
              icon={FileText}
              iconColor="text-emerald-600 dark:text-emerald-400"
              iconBg="bg-emerald-100 dark:bg-emerald-900/40"
            />
            <StatCard
              title="Pending Invoices"
              value={pendingInvoices.length}
              subtitle="Awaiting payment"
              icon={Receipt}
              iconColor="text-amber-600 dark:text-amber-400"
              iconBg="bg-amber-100 dark:bg-amber-900/40"
            />
            <StatCard
              title="Amount Due"
              value={`$${totalOwed.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              subtitle="Total outstanding"
              icon={DollarSign}
              iconColor="text-red-600 dark:text-red-400"
              iconBg="bg-red-100 dark:bg-red-900/40"
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base font-semibold">Recent Service Requests</CardTitle>
                <Link href="/portal/services">
                  <Button variant="ghost" size="sm" data-testid="link-view-all-tickets">
                    View All
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {openTickets.length === 0 && completedTickets.length === 0 ? (
                  <EmptyState
                    icon={Ticket}
                    title="No Service Requests"
                    description="You don't have any service requests yet."
                    action={
                      <Link href="/portal/services">
                        <Button size="sm" data-testid="button-request-service">Request a Service</Button>
                      </Link>
                    }
                  />
                ) : (
                  <div className="space-y-2">
                    {[...openTickets, ...completedTickets].slice(0, 5).map(ticket => (
                      <div key={ticket.id} className="flex items-center justify-between gap-2 p-3 rounded-md border" data-testid={`ticket-row-${ticket.id}`}>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate">{ticket.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{ticket.serviceType?.replace(/_/g, ' ')}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                          <StatusBadge status={ticket.status} />
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
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base font-semibold">Recent Invoices</CardTitle>
                <Link href="/portal/invoices">
                  <Button variant="ghost" size="sm" data-testid="link-view-all-invoices">
                    View All
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <EmptyState
                    icon={Receipt}
                    title="No Invoices"
                    description="You don't have any invoices yet."
                  />
                ) : (
                  <div className="space-y-2">
                    {invoices.slice(0, 5).map(invoice => (
                      <div key={invoice.id} className="flex items-center justify-between gap-2 p-3 rounded-md border" data-testid={`invoice-row-${invoice.id}`}>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm">{invoice.invoiceNumber}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">{invoice.description}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                          <span className="font-semibold text-sm">${parseFloat(invoice.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                          <StatusBadge status={invoice.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {account && (
            <Card data-testid="card-account-info">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2 flex-wrap">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div className="space-y-0.5">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Contact</span>
                    <p className="font-medium" data-testid="text-contact-name">{account.contactName}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Email</span>
                    <p className="font-medium" data-testid="text-contact-email">{account.email}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Phone</span>
                    <p className="font-medium" data-testid="text-contact-phone">{account.phone}</p>
                  </div>
                  {account.dotNumber && (
                    <div className="space-y-0.5">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">DOT #</span>
                      <p className="font-medium" data-testid="text-dot-number">{account.dotNumber}</p>
                    </div>
                  )}
                  {account.mcNumber && (
                    <div className="space-y-0.5">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">MC #</span>
                      <p className="font-medium" data-testid="text-mc-number">{account.mcNumber}</p>
                    </div>
                  )}
                  {account.einNumber && (
                    <div className="space-y-0.5">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">EIN</span>
                      <p className="font-medium" data-testid="text-ein-number">{account.einNumber}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
