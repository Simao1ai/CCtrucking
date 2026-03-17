import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Users, Ticket, Receipt, DollarSign, Clock,
  AlertTriangle, CheckCircle, Plus, ArrowRight, AlertCircle,
  CalendarClock, FileWarning, Ban, TrendingUp, ChevronRight,
  CheckCircle2, Circle, X, Rocket
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import type { Client, ServiceTicket, Invoice, Document } from "@shared/schema";

interface OnboardingStep {
  id: string;
  label: string;
  completed: boolean;
  link: string;
}

interface OnboardingData {
  steps: OnboardingStep[];
  completed: boolean;
  completedCount: number;
  totalSteps: number;
}

export default function Dashboard() {
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const { data: clients, isLoading: loadingClients } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: tickets, isLoading: loadingTickets } = useQuery<ServiceTicket[]>({ queryKey: ["/api/tickets"] });
  const { data: invoices, isLoading: loadingInvoices } = useQuery<Invoice[]>({ queryKey: ["/api/invoices"] });
  const { data: documents, isLoading: loadingDocs } = useQuery<Document[]>({ queryKey: ["/api/documents"] });
  const { data: onboarding } = useQuery<OnboardingData>({ queryKey: ["/api/tenant/onboarding"] });

  const loading = loadingClients || loadingTickets || loadingInvoices || loadingDocs;

  const activeClients = clients?.filter(c => c.status === "active").length ?? 0;
  const prospects = clients?.filter(c => c.status === "prospect").length ?? 0;
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
  ).slice(0, 6) ?? [];

  const recentInvoices = invoices?.slice().sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 6) ?? [];

  const clientMap = new Map(clients?.map(c => [c.id, c]) ?? []);

  const urgentCount = overdueInvoices.length + blockedTickets.length + overdueDeadlines.length + pendingDocs.length;

  const today = new Date();
  const greeting = today.getHours() < 12 ? "Good morning" : today.getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1400px] mx-auto" data-testid="page-dashboard">
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
        </div>
      ) : (
        <>
          {onboarding && !onboarding.completed && !onboardingDismissed && (
            <Card className="relative" data-testid="card-onboarding-checklist">
              <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="text-sm font-semibold" data-testid="text-onboarding-title">Getting Started</h2>
                    <p className="text-xs text-muted-foreground" data-testid="text-onboarding-progress">
                      {onboarding.completedCount} of {onboarding.totalSteps} steps completed
                    </p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setOnboardingDismissed(true)}
                  data-testid="button-dismiss-onboarding"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="px-4 pb-3">
                <Progress
                  value={(onboarding.completedCount / onboarding.totalSteps) * 100}
                  className="h-2"
                  data-testid="progress-onboarding"
                />
              </div>
              <div className="divide-y divide-border/50 px-4 pb-3">
                {onboarding.steps.map((step) => (
                  <div
                    key={step.id}
                    className="flex items-center gap-3 py-2.5"
                    data-testid={`onboarding-step-${step.id}`}
                  >
                    {step.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <span
                      className={`text-sm flex-1 ${step.completed ? "line-through text-muted-foreground" : "font-medium"}`}
                      data-testid={`text-step-label-${step.id}`}
                    >
                      {step.label}
                    </span>
                    <Button variant="ghost" size="sm" asChild data-testid={`button-step-go-${step.id}`}>
                      <Link href={step.link}>
                        Go <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="flex items-center justify-between" data-testid="page-header">
            <div>
              <h1 className="text-lg font-semibold tracking-tight" data-testid="page-title">{greeting}</h1>
              <p className="text-[13px] text-muted-foreground" data-testid="page-description">{format(today, "EEEE, MMMM d")} — {activeClients} active clients, {openTickets} open tickets</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                <a href="/admin/tickets" data-testid="action-quick-ticket"><Plus className="w-3.5 h-3.5 mr-1" />Ticket</a>
              </Button>
              <Button size="sm" className="h-8 text-xs" asChild>
                <a href="/admin/invoices" data-testid="action-quick-invoice"><Plus className="w-3.5 h-3.5 mr-1" />Invoice</a>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4" data-testid="stat-cards-row">
            <div className="relative bg-card border border-card-border rounded-xl p-3.5 overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Clients</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-bold tracking-tight">{activeClients}</span>
                {prospects > 0 && <span className="text-[11px] text-muted-foreground">+{prospects} prospects</span>}
              </div>
            </div>
            <div className="relative bg-card border border-card-border rounded-xl p-3.5 overflow-hidden">
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${blockedTickets.length > 0 ? "bg-orange-500" : "bg-amber-500"}`} />
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Open Tickets</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-bold tracking-tight">{openTickets}</span>
                {blockedTickets.length > 0 && <span className="text-[11px] text-orange-600 dark:text-orange-400 font-medium">{blockedTickets.length} blocked</span>}
              </div>
            </div>
            <div className="relative bg-card border border-card-border rounded-xl p-3.5 overflow-hidden">
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${overdueInvoices.length > 0 ? "bg-red-500" : "bg-emerald-500"}`} />
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Outstanding</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-bold tracking-tight">${outstandingRevenue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                {overdueInvoices.length > 0 && <span className="text-[11px] text-red-600 dark:text-red-400 font-medium">{overdueInvoices.length} overdue</span>}
              </div>
            </div>
            <div className="relative bg-card border border-card-border rounded-xl p-3.5 overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Collected</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-bold tracking-tight">${paidThisMonth.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                <span className="text-[11px] text-muted-foreground">{format(today, "MMM")}</span>
              </div>
            </div>
          </div>

          {urgentCount > 0 ? (
            <div className="bg-card border border-card-border rounded-xl overflow-hidden" data-testid="card-needs-attention">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50/80 dark:bg-red-950/30 border-b border-red-200/50 dark:border-red-800/30">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                <span className="text-xs font-semibold text-red-700 dark:text-red-300">Needs Attention</span>
                <span className="ml-auto text-[11px] font-medium text-red-600/80 dark:text-red-400/80">{urgentCount} item{urgentCount !== 1 ? "s" : ""}</span>
              </div>
              <div className="divide-y divide-border/50">
                {overdueInvoices.length > 0 && (
                  <a href="/admin/invoices" className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors group" data-testid="attention-overdue-invoices">
                    <Receipt className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-sm font-medium flex-1">{overdueInvoices.length} overdue invoice{overdueInvoices.length !== 1 ? "s" : ""}</span>
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400">${overdueInvoices.reduce((s, i) => s + parseFloat(i.amount), 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                  </a>
                )}
                {blockedTickets.length > 0 && (
                  <a href="/admin/tickets" className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors group" data-testid="attention-blocked-tickets">
                    <Ban className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    <span className="text-sm font-medium flex-1">{blockedTickets.length} blocked ticket{blockedTickets.length !== 1 ? "s" : ""}</span>
                    <span className="text-xs text-muted-foreground">Awaiting docs</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                  </a>
                )}
                {overdueDeadlines.length > 0 && (
                  <a href="/admin/tickets" className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors group" data-testid="attention-overdue-deadlines">
                    <CalendarClock className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-sm font-medium flex-1">{overdueDeadlines.length} past-due deadline{overdueDeadlines.length !== 1 ? "s" : ""}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                  </a>
                )}
                {pendingDocs.length > 0 && (
                  <a href="/admin/documents" className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors group" data-testid="attention-pending-docs">
                    <FileWarning className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span className="text-sm font-medium flex-1">{pendingDocs.length} document{pendingDocs.length !== 1 ? "s" : ""} pending review</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 rounded-xl" data-testid="card-all-clear">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">All clear</span>
              <span className="text-xs text-emerald-600/70 dark:text-emerald-400/70">No urgent items</span>
            </div>
          )}

          {upcomingDeadlines.length > 0 && (
            <div className="bg-card border border-card-border rounded-xl overflow-hidden" data-testid="card-upcoming-deadlines">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deadlines</span>
                </div>
                <a href="/admin/tickets" className="text-[11px] text-primary font-medium hover:underline flex items-center gap-0.5" data-testid="link-view-all-deadlines">
                  View all<ChevronRight className="w-3 h-3" />
                </a>
              </div>
              <div className="grid gap-px bg-border/30 sm:grid-cols-2 lg:grid-cols-3">
                {upcomingDeadlines.map(ticket => {
                  const isOverdue = ticket.dueDate && new Date(ticket.dueDate) < new Date();
                  const daysLeft = ticket.dueDate ? differenceInDays(new Date(ticket.dueDate), new Date()) : null;
                  const clientName = clientMap.get(ticket.clientId)?.companyName ?? "Unknown";
                  return (
                    <div key={ticket.id} className={`bg-card p-3 ${isOverdue ? "bg-red-50/40 dark:bg-red-950/10" : ""}`} data-testid={`deadline-item-${ticket.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate leading-snug">{ticket.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{clientName}</p>
                        </div>
                        <span className={`text-[11px] font-semibold whitespace-nowrap ${isOverdue ? "text-red-600 dark:text-red-400" : daysLeft !== null && daysLeft <= 3 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                          {isOverdue ? `${Math.abs(daysLeft!)}d over` : daysLeft === 0 ? "Today" : daysLeft === 1 ? "Tomorrow" : `${daysLeft}d`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="bg-card border border-card-border rounded-xl overflow-hidden" data-testid="card-recent-tickets">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Ticket className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Tickets</span>
                </div>
                <a href="/admin/tickets" className="text-[11px] text-primary font-medium hover:underline flex items-center gap-0.5" data-testid="link-view-all-tickets">
                  All tickets<ChevronRight className="w-3 h-3" />
                </a>
              </div>
              {recentTickets.length === 0 ? (
                <EmptyState icon={Ticket} title="No tickets yet" description="Service tickets will appear here" compact
                  action={<Button variant="outline" size="sm" className="h-7 text-xs" asChild><a href="/admin/tickets" data-testid="action-create-first-ticket"><Plus className="w-3 h-3 mr-1" />Create</a></Button>}
                />
              ) : (
                <div className="divide-y divide-border/40">
                  {recentTickets.map(ticket => (
                    <a href={`/admin/clients/${ticket.clientId}`} key={ticket.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors" data-testid={`ticket-item-${ticket.id}`}>
                      <div className={`flex-shrink-0 w-1.5 h-8 rounded-full ${ticket.status === "blocked" ? "bg-orange-500" : ticket.status === "open" ? "bg-blue-500" : ticket.status === "in_progress" ? "bg-amber-500" : "bg-emerald-500"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate leading-snug">{ticket.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{clientMap.get(ticket.clientId)?.companyName ?? "Unknown"} · {ticket.serviceType}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={ticket.status} />
                        <span className="text-[11px] text-muted-foreground">{format(new Date(ticket.createdAt), "MMM d")}</span>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card border border-card-border rounded-xl overflow-hidden" data-testid="card-recent-invoices">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Invoices</span>
                </div>
                <a href="/admin/invoices" className="text-[11px] text-primary font-medium hover:underline flex items-center gap-0.5" data-testid="link-view-all-invoices">
                  All invoices<ChevronRight className="w-3 h-3" />
                </a>
              </div>
              {recentInvoices.length === 0 ? (
                <EmptyState icon={Receipt} title="No invoices yet" description="Invoices will appear here" compact
                  action={<Button variant="outline" size="sm" className="h-7 text-xs" asChild><a href="/admin/invoices" data-testid="action-create-first-invoice"><Plus className="w-3 h-3 mr-1" />Create</a></Button>}
                />
              ) : (
                <div className="divide-y divide-border/40">
                  {recentInvoices.map(invoice => (
                    <div key={invoice.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors" data-testid={`invoice-item-${invoice.id}`}>
                      <div className={`flex-shrink-0 w-1.5 h-8 rounded-full ${invoice.status === "overdue" ? "bg-red-500" : invoice.status === "paid" ? "bg-emerald-500" : invoice.status === "sent" ? "bg-blue-500" : "bg-gray-300"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1.5">
                          <p className="text-sm font-medium">{invoice.invoiceNumber || `INV-${invoice.id}`}</p>
                          <span className="text-[11px] text-muted-foreground truncate">{clientMap.get(invoice.clientId)?.companyName}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {format(new Date(invoice.createdAt), "MMM d")}
                          {invoice.dueDate && ` · Due ${format(new Date(invoice.dueDate), "MMM d")}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-semibold tabular-nums">${parseFloat(invoice.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        <StatusBadge status={invoice.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
