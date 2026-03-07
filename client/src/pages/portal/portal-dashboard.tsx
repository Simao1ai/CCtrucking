import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Ticket, FileText, Receipt, Clock, Building2, AlertTriangle, DollarSign, CheckCircle, ChevronRight, Phone, Mail, Hash } from "lucide-react";
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
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  const firstName = account?.contactName?.split(' ')[0] || '';

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1400px] mx-auto" data-testid="page-portal-dashboard">
      <div data-testid="page-header">
        <h1 className="text-lg font-semibold tracking-tight" data-testid="page-title">{greeting}{firstName ? `, ${firstName}` : ''}</h1>
        <p className="text-[13px] text-muted-foreground" data-testid="page-description">{loadingAccount ? '' : account?.companyName || "Your client portal"}</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <>
          {(overdueInvoices.length > 0 || pendingInvoices.filter(i => i.status === "sent").length > 0 || pendingDocs.length > 0) && (
            <div className="bg-card border border-card-border rounded-xl overflow-hidden" data-testid="section-actions-needed">
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-50/60 dark:bg-amber-950/20 border-b border-amber-200/40 dark:border-amber-800/20">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Action Needed</span>
              </div>
              <div className="divide-y divide-border/40">
                {overdueInvoices.length > 0 && (
                  <Link href="/portal/invoices" data-testid="action-overdue-invoices">
                    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors group bg-red-50/30 dark:bg-red-950/10">
                      <Receipt className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <span className="text-sm font-medium flex-1">{overdueInvoices.length} overdue invoice{overdueInvoices.length !== 1 ? 's' : ''}</span>
                      <span className="text-xs font-semibold text-red-600 dark:text-red-400">${overdueInvoices.reduce((s, i) => s + parseFloat(i.amount), 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                    </div>
                  </Link>
                )}
                {pendingInvoices.filter(i => i.status === "sent").length > 0 && (
                  <Link href="/portal/invoices" data-testid="action-pending-invoices">
                    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors group">
                      <Receipt className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="text-sm font-medium flex-1">{pendingInvoices.filter(i => i.status === "sent").length} invoice{pendingInvoices.filter(i => i.status === "sent").length !== 1 ? 's' : ''} awaiting payment</span>
                      <span className="text-xs text-muted-foreground">${pendingInvoices.filter(i => i.status === "sent").reduce((s, i) => s + parseFloat(i.amount), 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                    </div>
                  </Link>
                )}
                {pendingDocs.length > 0 && (
                  <Link href="/portal/documents" data-testid="action-pending-docs">
                    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors group">
                      <FileText className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <span className="text-sm font-medium flex-1">{pendingDocs.length} document{pendingDocs.length !== 1 ? 's' : ''} requested</span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                    </div>
                  </Link>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard title="Active Services" value={openTickets.length} subtitle={`${completedTickets.length} completed`} icon={Ticket} iconColor="text-blue-600 dark:text-blue-400" iconBg="bg-blue-100 dark:bg-blue-900/40" accent="bg-blue-500" />
            <StatCard title="Amount Due" value={`$${totalOwed.toLocaleString("en-US", { minimumFractionDigits: 0 })}`} subtitle={overdueInvoices.length > 0 ? `${overdueInvoices.length} overdue` : "Current"} icon={DollarSign} iconColor={overdueInvoices.length > 0 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"} iconBg={overdueInvoices.length > 0 ? "bg-red-100 dark:bg-red-900/40" : "bg-amber-100 dark:bg-amber-900/40"} accent={overdueInvoices.length > 0 ? "bg-red-500" : "bg-amber-500"} />
            <StatCard title="Total Paid" value={`$${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 0 })}`} subtitle="All time" icon={CheckCircle} iconColor="text-emerald-600 dark:text-emerald-400" iconBg="bg-emerald-100 dark:bg-emerald-900/40" accent="bg-emerald-500" />
            <StatCard title="Documents" value={documents.length} subtitle={`${pendingDocs.length} pending`} icon={FileText} iconColor="text-purple-600 dark:text-purple-400" iconBg="bg-purple-100 dark:bg-purple-900/40" accent="bg-purple-500" />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-card border border-card-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Ticket className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Services</span>
                </div>
                <Link href="/portal/services">
                  <span className="text-[11px] text-primary font-medium hover:underline flex items-center gap-0.5" data-testid="link-view-all-tickets">All services<ChevronRight className="w-3 h-3" /></span>
                </Link>
              </div>
              {openTickets.length === 0 && completedTickets.length === 0 ? (
                <EmptyState icon={Ticket} title="No services yet" description="You don't have any service requests." compact
                  action={<Link href="/portal/services"><Button size="sm" className="h-7 text-xs" data-testid="button-request-service">Request Service</Button></Link>}
                />
              ) : (
                <div className="divide-y divide-border/40">
                  {[...openTickets, ...completedTickets].slice(0, 5).map(ticket => (
                    <div key={ticket.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors" data-testid={`ticket-row-${ticket.id}`}>
                      <div className={`flex-shrink-0 w-1.5 h-8 rounded-full ${ticket.status === "open" ? "bg-blue-500" : ticket.status === "in_progress" ? "bg-amber-500" : "bg-emerald-500"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate leading-snug">{ticket.title}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{ticket.serviceType?.replace(/_/g, ' ')}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={ticket.status} />
                        {ticket.dueDate && <span className="text-[11px] text-muted-foreground">{format(new Date(ticket.dueDate), "MMM d")}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card border border-card-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invoices</span>
                </div>
                <Link href="/portal/invoices">
                  <span className="text-[11px] text-primary font-medium hover:underline flex items-center gap-0.5" data-testid="link-view-all-invoices">All invoices<ChevronRight className="w-3 h-3" /></span>
                </Link>
              </div>
              {invoices.length === 0 ? (
                <EmptyState icon={Receipt} title="No invoices yet" description="You don't have any invoices." compact />
              ) : (
                <div className="divide-y divide-border/40">
                  {invoices.slice(0, 5).map(invoice => (
                    <div key={invoice.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors" data-testid={`invoice-row-${invoice.id}`}>
                      <div className={`flex-shrink-0 w-1.5 h-8 rounded-full ${invoice.status === "overdue" ? "bg-red-500" : invoice.status === "paid" ? "bg-emerald-500" : invoice.status === "sent" ? "bg-blue-500" : "bg-gray-300"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm">{invoice.invoiceNumber}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{invoice.description}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-semibold text-sm tabular-nums">${parseFloat(invoice.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        <StatusBadge status={invoice.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {account && (
            <div className="bg-card border border-card-border rounded-xl overflow-hidden" data-testid="card-account-info">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 p-4">
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground">Contact</p>
                    <p className="text-sm font-medium truncate" data-testid="text-contact-name">{account.contactName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground">Email</p>
                    <p className="text-sm font-medium truncate" data-testid="text-contact-email">{account.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium" data-testid="text-contact-phone">{account.phone}</p>
                  </div>
                </div>
                {account.dotNumber && (
                  <div className="flex items-center gap-2.5">
                    <Hash className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground">DOT #</p>
                      <p className="text-sm font-medium font-mono" data-testid="text-dot-number">{account.dotNumber}</p>
                    </div>
                  </div>
                )}
                {account.mcNumber && (
                  <div className="flex items-center gap-2.5">
                    <Hash className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground">MC #</p>
                      <p className="text-sm font-medium font-mono" data-testid="text-mc-number">{account.mcNumber}</p>
                    </div>
                  </div>
                )}
                {account.einNumber && (
                  <div className="flex items-center gap-2.5">
                    <Hash className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground">EIN</p>
                      <p className="text-sm font-medium font-mono" data-testid="text-ein-number">{account.einNumber}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
