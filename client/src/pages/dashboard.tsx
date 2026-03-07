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
  CalendarClock, FileWarning, Ban, TrendingUp, Eye
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import type { Client, ServiceTicket, Invoice, Document } from "@shared/schema";

export default function Dashboard() {
  const { data: clients, isLoading: loadingClients } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: tickets, isLoading: loadingTickets } = useQuery<ServiceTicket[]>({ queryKey: ["/api/tickets"] });
  const { data: invoices, isLoading: loadingInvoices } = useQuery<Invoice[]>({ queryKey: ["/api/invoices"] });
  const { data: documents, isLoading: loadingDocs } = useQuery<Document[]>({ queryKey: ["/api/documents"] });

  const loading = loadingClients || loadingTickets || loadingInvoices || loadingDocs;

  const activeClients = clients?.filter(c => c.status === "active").length ?? 0;
  const openTickets = tickets?.filter(t => t.status === "open" || t.status === "in_progress").length ?? 0;
  const blockedTickets = tickets?.filter(t => t.status === "blocked") ?? [];
  const pendingDocs = documents?.filter(d => d.status === "pending") ?? [];
  const overdueInvoices = invoices?.filter(i => i.status === "overdue") ?? [];
  const outstandingRevenue = invoices?.filter(i => i.status === "sent" || i.status === "overdue").reduce((sum, i) => sum + parseFloat(i.amount), 0) ?? 0;
  const paidThisMonth = invoices?.filter(i => {
    if (i.status !== "paid" || !i.paidDate) return false;
    const pd = new Date(i.paidDate);
    const now = new Date();
    return pd.getMonth() === now.getMonth() && pd.getFullYear() === now.getFullYear();
  }).reduce((sum, i) => sum + parseFloat(i.amount), 0) ?? 0;

  const allDeadlineTickets = tickets?.filter(t => t.dueDate && t.status !== "completed" && t.status !== "closed")
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()) ?? [];

  const overdueDeadlines = allDeadlineTickets.filter(t => t.dueDate && new Date(t.dueDate) < new Date());

  const upcomingDeadlines = allDeadlineTickets.slice(0, 6);

  const recentTickets = tickets?.slice().sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5) ?? [];

  const recentInvoices = invoices?.slice().sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5) ?? [];

  const clientMap = new Map(clients?.map(c => [c.id, c]) ?? []);

  const urgentItems = [
    ...overdueInvoices.map(i => ({ type: "invoice" as const, severity: "critical" as const, item: i })),
    ...blockedTickets.map(t => ({ type: "ticket" as const, severity: "high" as const, item: t })),
    ...overdueDeadlines.map(t => ({ type: "deadline" as const, severity: "high" as const, item: t })),
    ...pendingDocs.map(d => ({ type: "document" as const, severity: "medium" as const, item: d })),
  ];

  const today = new Date();
  const greeting = today.getHours() < 12 ? "Good morning" : today.getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="page-dashboard">
      <PageHeader
        title={`${greeting}`}
        description={`${format(today, "EEEE, MMMM d, yyyy")} — Operations Command Center`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/admin/tickets" data-testid="action-quick-ticket">
                <Plus className="w-3.5 h-3.5 mr-1" /> New Ticket
              </a>
            </Button>
            <Button size="sm" asChild>
              <a href="/admin/invoices" data-testid="action-quick-invoice">
                <Plus className="w-3.5 h-3.5 mr-1" /> New Invoice
              </a>
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-[120px] rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="stat-cards-row">
            <StatCard
              title="Active Clients"
              value={activeClients}
              subtitle={`${clients?.filter(c => c.status === "prospect").length ?? 0} prospects in pipeline`}
              icon={Users}
              iconColor="text-blue-600 dark:text-blue-400"
              iconBg="bg-blue-100 dark:bg-blue-900/50"
            />
            <StatCard
              title="Open Tickets"
              value={openTickets}
              subtitle={blockedTickets.length > 0 ? `${blockedTickets.length} blocked` : "All on track"}
              icon={Ticket}
              iconColor="text-amber-600 dark:text-amber-400"
              iconBg="bg-amber-100 dark:bg-amber-900/50"
            />
            <StatCard
              title="Outstanding"
              value={`$${outstandingRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              subtitle={overdueInvoices.length > 0 ? `${overdueInvoices.length} overdue` : "All invoices current"}
              icon={DollarSign}
              iconColor={overdueInvoices.length > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}
              iconBg={overdueInvoices.length > 0 ? "bg-red-100 dark:bg-red-900/50" : "bg-emerald-100 dark:bg-emerald-900/50"}
            />
            <StatCard
              title="Collected This Month"
              value={`$${paidThisMonth.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              subtitle={format(today, "MMMM yyyy")}
              icon={TrendingUp}
              iconColor="text-emerald-600 dark:text-emerald-400"
              iconBg="bg-emerald-100 dark:bg-emerald-900/50"
            />
          </div>

          {urgentItems.length > 0 ? (
            <Card className="border-red-200/60 dark:border-red-800/40 bg-gradient-to-r from-red-50/50 to-orange-50/30 dark:from-red-950/20 dark:to-orange-950/10" data-testid="card-needs-attention">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  Needs Your Attention
                  <span className="ml-auto text-sm font-medium text-red-600 dark:text-red-400">
                    {urgentItems.length} item{urgentItems.length !== 1 ? "s" : ""}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {overdueInvoices.length > 0 && (
                    <a href="/admin/invoices" className="group flex items-start gap-3 p-3.5 rounded-lg bg-white dark:bg-card border border-red-200 dark:border-red-800/50 hover:border-red-300 dark:hover:border-red-700 transition-colors cursor-pointer" data-testid="attention-overdue-invoices">
                      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                        <Receipt className="w-4.5 h-4.5 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-red-700 dark:text-red-300">{overdueInvoices.length} Overdue</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          ${overdueInvoices.reduce((s, i) => s + parseFloat(i.amount), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} unpaid
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                    </a>
                  )}
                  {blockedTickets.length > 0 && (
                    <a href="/admin/tickets" className="group flex items-start gap-3 p-3.5 rounded-lg bg-white dark:bg-card border border-orange-200 dark:border-orange-800/50 hover:border-orange-300 dark:hover:border-orange-700 transition-colors cursor-pointer" data-testid="attention-blocked-tickets">
                      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                        <Ban className="w-4.5 h-4.5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">{blockedTickets.length} Blocked</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Tickets need documents</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                    </a>
                  )}
                  {overdueDeadlines.length > 0 && (
                    <a href="/admin/tickets" className="group flex items-start gap-3 p-3.5 rounded-lg bg-white dark:bg-card border border-red-200 dark:border-red-800/50 hover:border-red-300 dark:hover:border-red-700 transition-colors cursor-pointer" data-testid="attention-overdue-deadlines">
                      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                        <CalendarClock className="w-4.5 h-4.5 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-red-700 dark:text-red-300">{overdueDeadlines.length} Past Due</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Overdue tickets</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                    </a>
                  )}
                  {pendingDocs.length > 0 && (
                    <a href="/admin/documents" className="group flex items-start gap-3 p-3.5 rounded-lg bg-white dark:bg-card border hover:border-amber-300 dark:hover:border-amber-700 transition-colors cursor-pointer" data-testid="attention-pending-docs">
                      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                        <FileWarning className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{pendingDocs.length} Pending</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Documents to review</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20" data-testid="card-all-clear">
              <CardContent className="flex items-center gap-3 py-4">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">All Clear</p>
                  <p className="text-xs text-muted-foreground">No urgent items need your attention right now</p>
                </div>
              </CardContent>
            </Card>
          )}

          {upcomingDeadlines.length > 0 && (
            <Card data-testid="card-upcoming-deadlines">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Upcoming Deadlines
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <a href="/admin/tickets" data-testid="link-view-all-deadlines">
                    View all <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </a>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {upcomingDeadlines.map(ticket => {
                    const isOverdue = ticket.dueDate && new Date(ticket.dueDate) < new Date();
                    const daysLeft = ticket.dueDate ? differenceInDays(new Date(ticket.dueDate), new Date()) : null;
                    const clientName = clientMap.get(ticket.clientId)?.companyName ?? "Unknown";
                    return (
                      <div key={ticket.id} className={`flex items-start gap-3 p-3.5 rounded-lg border ${isOverdue ? "border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-950/20" : daysLeft !== null && daysLeft <= 3 ? "border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/10" : "bg-muted/30"}`} data-testid={`deadline-item-${ticket.id}`}>
                        <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${isOverdue ? "bg-red-100 dark:bg-red-900/50" : "bg-muted"}`}>
                          {isOverdue ? (
                            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                          ) : (
                            <Clock className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{ticket.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{clientName}</p>
                          <p className={`text-xs font-semibold mt-1 ${isOverdue ? "text-red-600 dark:text-red-400" : daysLeft !== null && daysLeft <= 3 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                            {isOverdue ? `${Math.abs(daysLeft!)} days overdue` : daysLeft === 0 ? "Due today" : daysLeft === 1 ? "Due tomorrow" : `${daysLeft} days left`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card data-testid="card-recent-tickets">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
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
                {recentTickets.length === 0 ? (
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
                  <div className="space-y-1">
                    {recentTickets.map(ticket => (
                      <a href={`/admin/clients/${ticket.clientId}`} key={ticket.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group" data-testid={`ticket-item-${ticket.id}`}>
                        <div className={`flex-shrink-0 w-2 h-2 rounded-full ${ticket.status === "blocked" ? "bg-orange-500" : ticket.status === "open" ? "bg-blue-500" : ticket.status === "in_progress" ? "bg-amber-500" : "bg-emerald-500"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{ticket.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {clientMap.get(ticket.clientId)?.companyName ?? "Unknown"} · {ticket.serviceType}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusBadge status={ticket.status} />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(ticket.createdAt), "MMM d")}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-recent-invoices">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
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
                {recentInvoices.length === 0 ? (
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
                  <div className="space-y-1">
                    {recentInvoices.map(invoice => (
                      <div key={invoice.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors" data-testid={`invoice-item-${invoice.id}`}>
                        <div className={`flex-shrink-0 w-2 h-2 rounded-full ${invoice.status === "overdue" ? "bg-red-500" : invoice.status === "paid" ? "bg-emerald-500" : invoice.status === "sent" ? "bg-blue-500" : "bg-gray-400"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{invoice.invoiceNumber || `INV-${invoice.id}`}</p>
                            <span className="text-xs text-muted-foreground">·</span>
                            <p className="text-xs text-muted-foreground truncate">
                              {clientMap.get(invoice.clientId)?.companyName ?? "Unknown"}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(invoice.createdAt), "MMM d")}
                            {invoice.dueDate && ` · Due ${format(new Date(invoice.dueDate), "MMM d")}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5 flex-shrink-0">
                          <span className="text-sm font-semibold">
                            ${parseFloat(invoice.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                          <StatusBadge status={invoice.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
