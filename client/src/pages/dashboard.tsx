import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Users, Ticket, FileText, Receipt, DollarSign, Clock,
  AlertTriangle, CheckCircle, Plus, ArrowRight, AlertCircle,
  CalendarClock, FileWarning, Ban
} from "lucide-react";
import { format } from "date-fns";
import type { Client, ServiceTicket, Invoice, Document } from "@shared/schema";

export default function Dashboard() {
  const { data: clients, isLoading: loadingClients } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: tickets, isLoading: loadingTickets } = useQuery<ServiceTicket[]>({ queryKey: ["/api/tickets"] });
  const { data: invoices, isLoading: loadingInvoices } = useQuery<Invoice[]>({ queryKey: ["/api/invoices"] });
  const { data: documents, isLoading: loadingDocs } = useQuery<Document[]>({ queryKey: ["/api/documents"] });

  const loading = loadingClients || loadingTickets || loadingInvoices || loadingDocs;

  const activeClients = clients?.filter(c => c.status === "active").length ?? 0;
  const openTickets = tickets?.filter(t => t.status === "open" || t.status === "in_progress").length ?? 0;
  const pendingDocs = documents?.filter(d => d.status === "pending").length ?? 0;
  const outstandingRevenue = invoices?.filter(i => i.status === "sent" || i.status === "overdue").reduce((sum, i) => sum + parseFloat(i.amount), 0) ?? 0;
  const overdueInvoices = invoices?.filter(i => i.status === "overdue") ?? [];
  const blockedTickets = tickets?.filter(t => t.status === "blocked") ?? [];
  const pendingDocsList = documents?.filter(d => d.status === "pending") ?? [];

  const upcomingDeadlines = tickets?.filter(t => t.dueDate && t.status !== "completed" && t.status !== "closed")
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5) ?? [];

  const recentTickets = tickets?.slice().sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5) ?? [];

  const recentInvoices = invoices?.slice().sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5) ?? [];

  const needsAttentionCount = overdueInvoices.length + blockedTickets.length + pendingDocsList.length +
    upcomingDeadlines.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length;

  const today = new Date();
  const greeting = today.getHours() < 12 ? "Good morning" : today.getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="page-dashboard">
      <PageHeader
        title={`${greeting}`}
        description={`${format(today, "EEEE, MMMM d, yyyy")} — Operations Command Center`}
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-[120px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="stat-cards-row">
          <StatCard
            title="Active Clients"
            value={activeClients}
            subtitle="Currently managed accounts"
            icon={Users}
            iconColor="text-blue-600 dark:text-blue-400"
            iconBg="bg-blue-100 dark:bg-blue-900/50"
          />
          <StatCard
            title="Open Tickets"
            value={openTickets}
            subtitle="Service requests in progress"
            icon={Ticket}
            iconColor="text-amber-600 dark:text-amber-400"
            iconBg="bg-amber-100 dark:bg-amber-900/50"
          />
          <StatCard
            title="Pending Documents"
            value={pendingDocs}
            subtitle="Awaiting review or upload"
            icon={FileText}
            iconColor="text-purple-600 dark:text-purple-400"
            iconBg="bg-purple-100 dark:bg-purple-900/50"
          />
          <StatCard
            title="Outstanding Revenue"
            value={`$${outstandingRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
            subtitle={overdueInvoices.length > 0 ? `${overdueInvoices.length} overdue` : "All invoices current"}
            icon={DollarSign}
            iconColor="text-emerald-600 dark:text-emerald-400"
            iconBg="bg-emerald-100 dark:bg-emerald-900/50"
          />
        </div>
      )}

      {!loading && needsAttentionCount > 0 && (
        <Card className="border-destructive/30 bg-destructive/5 dark:bg-destructive/10" data-testid="card-needs-attention">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Needs Attention
              <StatusBadge status="urgent" label={`${needsAttentionCount} item${needsAttentionCount > 1 ? "s" : ""}`} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {overdueInvoices.length > 0 && (
                <a href="/admin/invoices" className="flex items-start gap-3 p-3 rounded-md bg-card border border-card-border hover-elevate active-elevate-2 cursor-pointer" data-testid="attention-overdue-invoices">
                  <div className="flex-shrink-0 w-8 h-8 rounded-md bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                    <Receipt className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{overdueInvoices.length} Overdue Invoice{overdueInvoices.length > 1 ? "s" : ""}</p>
                    <p className="text-xs text-muted-foreground">
                      ${overdueInvoices.reduce((s, i) => s + parseFloat(i.amount), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} outstanding
                    </p>
                  </div>
                </a>
              )}
              {blockedTickets.length > 0 && (
                <a href="/admin/tickets" className="flex items-start gap-3 p-3 rounded-md bg-card border border-card-border hover-elevate active-elevate-2 cursor-pointer" data-testid="attention-blocked-tickets">
                  <div className="flex-shrink-0 w-8 h-8 rounded-md bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                    <Ban className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{blockedTickets.length} Blocked Ticket{blockedTickets.length > 1 ? "s" : ""}</p>
                    <p className="text-xs text-muted-foreground">Requires action to proceed</p>
                  </div>
                </a>
              )}
              {pendingDocsList.length > 0 && (
                <a href="/admin/documents" className="flex items-start gap-3 p-3 rounded-md bg-card border border-card-border hover-elevate active-elevate-2 cursor-pointer" data-testid="attention-pending-docs">
                  <div className="flex-shrink-0 w-8 h-8 rounded-md bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center">
                    <FileWarning className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{pendingDocsList.length} Pending Document{pendingDocsList.length > 1 ? "s" : ""}</p>
                    <p className="text-xs text-muted-foreground">Awaiting review</p>
                  </div>
                </a>
              )}
              {upcomingDeadlines.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length > 0 && (
                <a href="/admin/tickets" className="flex items-start gap-3 p-3 rounded-md bg-card border border-card-border hover-elevate active-elevate-2 cursor-pointer" data-testid="attention-overdue-deadlines">
                  <div className="flex-shrink-0 w-8 h-8 rounded-md bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                    <CalendarClock className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {upcomingDeadlines.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length} Past Deadline{upcomingDeadlines.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length > 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">Overdue service tickets</p>
                  </div>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && needsAttentionCount === 0 && (
        <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20" data-testid="card-all-clear">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="w-8 h-8 rounded-md bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium">All Clear</p>
              <p className="text-xs text-muted-foreground">No urgent items need your attention right now</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-testid="card-recent-tickets">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Ticket className="w-4 h-4" />
              Recent Tickets
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <a href="/admin/tickets" data-testid="link-view-all-tickets">
                View all <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </a>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-md" />)}
              </div>
            ) : recentTickets.length === 0 ? (
              <EmptyState
                icon={Ticket}
                title="No tickets yet"
                description="Service tickets will appear here once created"
                action={
                  <Button variant="outline" size="sm" asChild>
                    <a href="/admin/tickets" data-testid="action-create-first-ticket">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Create Ticket
                    </a>
                  </Button>
                }
              />
            ) : (
              <div className="space-y-2">
                {recentTickets.map(ticket => (
                  <div key={ticket.id} className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/40" data-testid={`ticket-item-${ticket.id}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ticket.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{ticket.serviceType}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge status={ticket.status} />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(ticket.createdAt), "MMM d")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-recent-invoices">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Recent Invoices
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <a href="/admin/invoices" data-testid="link-view-all-invoices">
                View all <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </a>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-md" />)}
              </div>
            ) : recentInvoices.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No invoices yet"
                description="Invoices will appear here once created"
                action={
                  <Button variant="outline" size="sm" asChild>
                    <a href="/admin/invoices" data-testid="action-create-first-invoice">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Create Invoice
                    </a>
                  </Button>
                }
              />
            ) : (
              <div className="space-y-2">
                {recentInvoices.map(invoice => (
                  <div key={invoice.id} className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/40" data-testid={`invoice-item-${invoice.id}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {invoice.invoiceNumber || `INV-${invoice.id}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ${parseFloat(invoice.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge status={invoice.status} />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(invoice.createdAt), "MMM d")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-upcoming-deadlines">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Upcoming Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-md" />)}
            </div>
          ) : upcomingDeadlines.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="No upcoming deadlines"
              description="All service tickets are on track with no pending deadlines"
            />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingDeadlines.map(ticket => {
                const isOverdue = ticket.dueDate && new Date(ticket.dueDate) < new Date();
                return (
                  <div key={ticket.id} className={`flex items-start gap-3 p-3 rounded-md ${isOverdue ? "bg-red-50/50 dark:bg-red-950/20" : "bg-muted/40"}`} data-testid={`deadline-item-${ticket.id}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center ${isOverdue ? "bg-red-100 dark:bg-red-900/50" : "bg-muted"}`}>
                      {isOverdue ? (
                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{ticket.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{ticket.serviceType}</p>
                      <p className={`text-xs font-medium mt-1 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                        {isOverdue ? "Overdue: " : "Due: "}{format(new Date(ticket.dueDate!), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-quick-actions">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <a href="/admin/clients" className="flex items-center gap-3 p-4 rounded-md bg-muted/40 hover-elevate active-elevate-2 cursor-pointer" data-testid="action-new-client">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">Add Client</p>
                <p className="text-xs text-muted-foreground">Onboard new carrier</p>
              </div>
            </a>
            <a href="/admin/tickets" className="flex items-center gap-3 p-4 rounded-md bg-muted/40 hover-elevate active-elevate-2 cursor-pointer" data-testid="action-new-ticket">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <Ticket className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">New Ticket</p>
                <p className="text-xs text-muted-foreground">Create service request</p>
              </div>
            </a>
            <a href="/admin/invoices" className="flex items-center gap-3 p-4 rounded-md bg-muted/40 hover-elevate active-elevate-2 cursor-pointer" data-testid="action-new-invoice">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">New Invoice</p>
                <p className="text-xs text-muted-foreground">Bill a client</p>
              </div>
            </a>
            <a href="/admin/documents" className="flex items-center gap-3 p-4 rounded-md bg-muted/40 hover-elevate active-elevate-2 cursor-pointer" data-testid="action-documents">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">Documents</p>
                <p className="text-xs text-muted-foreground">View all files</p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
