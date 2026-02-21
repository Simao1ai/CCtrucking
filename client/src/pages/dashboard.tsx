import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Ticket, FileText, Receipt, TrendingUp, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import type { Client, ServiceTicket, Invoice, Document } from "@shared/schema";

function StatCard({ title, value, icon: Icon, description, loading }: {
  title: string;
  value: string | number;
  icon: any;
  description: string;
  loading?: boolean;
}) {
  return (
    <Card data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function statusColor(status: string) {
  switch (status) {
    case "open": return "default";
    case "in_progress": return "default";
    case "completed": return "secondary";
    case "overdue": return "destructive";
    case "paid": return "secondary";
    case "pending": return "default";
    case "draft": return "secondary";
    default: return "secondary";
  }
}

export default function Dashboard() {
  const { data: clients, isLoading: loadingClients } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: tickets, isLoading: loadingTickets } = useQuery<ServiceTicket[]>({ queryKey: ["/api/tickets"] });
  const { data: invoices, isLoading: loadingInvoices } = useQuery<Invoice[]>({ queryKey: ["/api/invoices"] });
  const { data: documents, isLoading: loadingDocs } = useQuery<Document[]>({ queryKey: ["/api/documents"] });

  const loading = loadingClients || loadingTickets || loadingInvoices || loadingDocs;

  const activeClients = clients?.filter(c => c.status === "active").length ?? 0;
  const openTickets = tickets?.filter(t => t.status === "open" || t.status === "in_progress").length ?? 0;
  const pendingDocs = documents?.filter(d => d.status === "pending").length ?? 0;
  const totalRevenue = invoices?.filter(i => i.status === "paid").reduce((sum, i) => sum + parseFloat(i.amount), 0) ?? 0;
  const overdueInvoices = invoices?.filter(i => i.status === "overdue").length ?? 0;

  const recentTickets = tickets?.slice().sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5) ?? [];

  const upcomingDue = tickets?.filter(t => t.dueDate && t.status !== "completed")
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5) ?? [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="page-dashboard">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Welcome to CC Trucking Services operations center</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Clients"
          value={activeClients}
          icon={Users}
          description="Currently managed accounts"
          loading={loading}
        />
        <StatCard
          title="Open Tickets"
          value={openTickets}
          icon={Ticket}
          description="Service requests in progress"
          loading={loading}
        />
        <StatCard
          title="Pending Documents"
          value={pendingDocs}
          icon={FileText}
          description="Awaiting review or upload"
          loading={loading}
        />
        <StatCard
          title="Revenue"
          value={`$${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
          description={overdueInvoices > 0 ? `${overdueInvoices} overdue invoice(s)` : "All invoices current"}
          loading={loading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-testid="card-recent-tickets">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Ticket className="w-4 h-4" />
              Recent Service Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : recentTickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No service tickets yet
              </div>
            ) : (
              <div className="space-y-3">
                {recentTickets.map(ticket => (
                  <div key={ticket.id} className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/50" data-testid={`ticket-item-${ticket.id}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ticket.title}</p>
                      <p className="text-xs text-muted-foreground">{ticket.serviceType}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant={statusColor(ticket.status)} className="text-xs">
                        {ticket.status.replace("_", " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(ticket.createdAt), "MMM d")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-upcoming-deadlines">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : upcomingDue.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm flex flex-col items-center gap-2">
                <CheckCircle className="w-8 h-8 text-muted-foreground/50" />
                No upcoming deadlines
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingDue.map(ticket => {
                  const isOverdue = ticket.dueDate && new Date(ticket.dueDate) < new Date();
                  return (
                    <div key={ticket.id} className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/50" data-testid={`deadline-item-${ticket.id}`}>
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {isOverdue ? (
                          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{ticket.title}</p>
                          <p className="text-xs text-muted-foreground">{ticket.serviceType}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-medium ${isOverdue ? "text-destructive" : ""}`}>
                          {format(new Date(ticket.dueDate!), "MMM d, yyyy")}
                        </p>
                        {isOverdue && <p className="text-xs text-destructive">Overdue</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card data-testid="card-invoice-summary">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Invoice Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Invoices</span>
                  <span className="text-sm font-medium">{invoices?.length ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Paid</span>
                  <span className="text-sm font-medium text-chart-2">
                    {invoices?.filter(i => i.status === "paid").length ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pending</span>
                  <span className="text-sm font-medium">
                    {invoices?.filter(i => i.status === "sent" || i.status === "draft").length ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Overdue</span>
                  <span className="text-sm font-medium text-destructive">{overdueInvoices}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2" data-testid="card-quick-actions">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <a href="/admin/clients" className="flex items-center gap-3 p-3 rounded-md bg-muted/50 hover-elevate active-elevate-2 cursor-pointer" data-testid="action-new-client">
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Add Client</p>
                  <p className="text-xs text-muted-foreground">Onboard new carrier</p>
                </div>
              </a>
              <a href="/admin/tickets" className="flex items-center gap-3 p-3 rounded-md bg-muted/50 hover-elevate active-elevate-2 cursor-pointer" data-testid="action-new-ticket">
                <Ticket className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">New Ticket</p>
                  <p className="text-xs text-muted-foreground">Create service request</p>
                </div>
              </a>
              <a href="/admin/invoices" className="flex items-center gap-3 p-3 rounded-md bg-muted/50 hover-elevate active-elevate-2 cursor-pointer" data-testid="action-new-invoice">
                <Receipt className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">New Invoice</p>
                  <p className="text-xs text-muted-foreground">Bill a client</p>
                </div>
              </a>
              <a href="/admin/documents" className="flex items-center gap-3 p-3 rounded-md bg-muted/50 hover-elevate active-elevate-2 cursor-pointer" data-testid="action-documents">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Documents</p>
                  <p className="text-xs text-muted-foreground">View all files</p>
                </div>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
