import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Ticket, FileText, Receipt, Clock, Building2, AlertTriangle, DollarSign, CheckCircle2, ArrowRight, Phone, Mail, Hash, CheckCircle } from "lucide-react";
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
  const totalPaid = invoices.filter(i => i.status === "paid").reduce((sum, i) => sum + parseFloat(i.amount), 0);

  const isLoading = loadingAccount || loadingTickets || loadingInvoices || loadingDocs;

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  })();

  const firstName = account?.contactName?.split(' ')[0] || '';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="page-portal-dashboard">
      <PageHeader
        title={`${greeting}${firstName ? `, ${firstName}` : ''}`}
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
          {(overdueInvoices.length > 0 || pendingInvoices.length > 0 || pendingDocs.length > 0) && (
            <div className="space-y-2" data-testid="section-actions-needed">
              {overdueInvoices.length > 0 && (
                <Link href="/portal/invoices" data-testid="action-overdue-invoices">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-red-50 to-red-50/50 dark:from-red-950/30 dark:to-red-950/10 border border-red-200 dark:border-red-800/50 hover:border-red-300 dark:hover:border-red-700 transition-colors cursor-pointer group">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                        {overdueInvoices.length} overdue invoice{overdueInvoices.length !== 1 ? 's' : ''} — ${overdueInvoices.reduce((s, i) => s + parseFloat(i.amount), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} past due
                      </p>
                      <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-0.5">Tap to view and arrange payment</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-red-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              )}
              {pendingInvoices.filter(i => i.status === "sent").length > 0 && (
                <Link href="/portal/invoices" data-testid="action-pending-invoices">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-card border hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer group">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">
                        {pendingInvoices.filter(i => i.status === "sent").length} invoice{pendingInvoices.filter(i => i.status === "sent").length !== 1 ? 's' : ''} awaiting payment
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ${pendingInvoices.filter(i => i.status === "sent").reduce((s, i) => s + parseFloat(i.amount), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} total
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              )}
              {pendingDocs.length > 0 && (
                <Link href="/portal/documents" data-testid="action-pending-docs">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-card border hover:border-amber-300 dark:hover:border-amber-700 transition-colors cursor-pointer group">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">
                        {pendingDocs.length} document{pendingDocs.length !== 1 ? 's' : ''} requested by your team
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Upload requested documents to avoid delays</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Active Services"
              value={openTickets.length}
              subtitle={`${completedTickets.length} completed`}
              icon={Ticket}
              iconColor="text-blue-600 dark:text-blue-400"
              iconBg="bg-blue-100 dark:bg-blue-900/40"
            />
            <StatCard
              title="Amount Due"
              value={`$${totalOwed.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              subtitle={overdueInvoices.length > 0 ? `${overdueInvoices.length} overdue` : "Current"}
              icon={DollarSign}
              iconColor={overdueInvoices.length > 0 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}
              iconBg={overdueInvoices.length > 0 ? "bg-red-100 dark:bg-red-900/40" : "bg-amber-100 dark:bg-amber-900/40"}
            />
            <StatCard
              title="Total Paid"
              value={`$${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              subtitle="All time"
              icon={CheckCircle}
              iconColor="text-emerald-600 dark:text-emerald-400"
              iconBg="bg-emerald-100 dark:bg-emerald-900/40"
            />
            <StatCard
              title="Documents"
              value={documents.length}
              subtitle={`${pendingDocs.length} pending`}
              icon={FileText}
              iconColor="text-purple-600 dark:text-purple-400"
              iconBg="bg-purple-100 dark:bg-purple-900/40"
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Service Requests</CardTitle>
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
                  <div className="space-y-1">
                    {[...openTickets, ...completedTickets].slice(0, 5).map(ticket => (
                      <div key={ticket.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors" data-testid={`ticket-row-${ticket.id}`}>
                        <div className={`flex-shrink-0 w-2 h-2 rounded-full ${ticket.status === "open" ? "bg-blue-500" : ticket.status === "in_progress" ? "bg-amber-500" : "bg-emerald-500"}`} />
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
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Invoices</CardTitle>
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
                  <div className="space-y-1">
                    {invoices.slice(0, 5).map(invoice => (
                      <div key={invoice.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors" data-testid={`invoice-row-${invoice.id}`}>
                        <div className={`flex-shrink-0 w-2 h-2 rounded-full ${invoice.status === "overdue" ? "bg-red-500" : invoice.status === "paid" ? "bg-emerald-500" : invoice.status === "sent" ? "bg-blue-500" : "bg-gray-400"}`} />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm">{invoice.invoiceNumber}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">{invoice.description}</div>
                        </div>
                        <div className="flex items-center gap-2.5 flex-shrink-0">
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
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Contact</p>
                      <p className="text-sm font-medium truncate" data-testid="text-contact-name">{account.contactName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium truncate" data-testid="text-contact-email">{account.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm font-medium" data-testid="text-contact-phone">{account.phone}</p>
                    </div>
                  </div>
                  {account.dotNumber && (
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">DOT #</p>
                        <p className="text-sm font-medium font-mono" data-testid="text-dot-number">{account.dotNumber}</p>
                      </div>
                    </div>
                  )}
                  {account.mcNumber && (
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">MC #</p>
                        <p className="text-sm font-medium font-mono" data-testid="text-mc-number">{account.mcNumber}</p>
                      </div>
                    </div>
                  )}
                  {account.einNumber && (
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">EIN</p>
                        <p className="text-sm font-medium font-mono" data-testid="text-ein-number">{account.einNumber}</p>
                      </div>
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
