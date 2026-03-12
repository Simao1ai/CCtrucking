import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { useLocation } from "wouter";
import { useState } from "react";
import {
  DollarSign, Users, TrendingUp, AlertTriangle, Heart, Calendar,
  ArrowUpRight, Clock, Award, Search, ChevronRight, Star
} from "lucide-react";
import { format } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";

interface ClientInsight {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  status: string;
  clientSince: string | null;
  durationDays: number | null;
  lifetimeValue: number;
  totalInvoiced: number;
  totalOutstanding: number;
  overdueAmount: number;
  overdueCount: number;
  invoiceCount: number;
  avgPaymentDays: number;
  daysUntilAnniversary: number | null;
  nextAnniversary: string | null;
  daysSinceLastInvoice: number | null;
}

interface InsightsData {
  summary: {
    totalClients: number;
    activeClients: number;
    totalRevenue: number;
    totalOutstanding: number;
    totalOverdue: number;
    avgClientValue: number;
  };
  topClients: ClientInsight[];
  atRiskClients: ClientInsight[];
  upcomingMilestones: ClientInsight[];
  revenueTimeline: { month: string; amount: number }[];
  allClients: ClientInsight[];
}

function formatCurrency(val: number) {
  return `$${val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDuration(days: number | null) {
  if (days === null) return "N/A";
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  if (years > 0 && months > 0) return `${years}y ${months}m`;
  if (years > 0) return `${years}y`;
  if (months > 0) return `${months}m`;
  return `${days}d`;
}

export default function ClientInsights() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<InsightsData>({
    queryKey: ["/api/admin/client-insights"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data) return null;

  const { summary, topClients, atRiskClients, upcomingMilestones, revenueTimeline, allClients } = data;

  const filteredClients = allClients.filter(c =>
    c.companyName.toLowerCase().includes(search.toLowerCase()) ||
    c.contactName.toLowerCase().includes(search.toLowerCase())
  );

  const chartColors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1"];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="page-client-insights">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Client Insights</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Client value, relationship milestones, and actionable insights
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Clients"
          value={summary.activeClients}
          subtitle={`${summary.totalClients} total`}
          icon={Users}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-100 dark:bg-blue-900/40"
          accent="bg-blue-500"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(summary.totalRevenue)}
          subtitle={`Avg ${formatCurrency(summary.avgClientValue)} per client`}
          icon={DollarSign}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-100 dark:bg-emerald-900/40"
          accent="bg-emerald-500"
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(summary.totalOutstanding)}
          subtitle={summary.totalOverdue > 0 ? `${formatCurrency(summary.totalOverdue)} overdue` : "No overdue"}
          icon={AlertTriangle}
          iconColor={summary.totalOverdue > 0 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}
          iconBg={summary.totalOverdue > 0 ? "bg-red-100 dark:bg-red-900/40" : "bg-amber-100 dark:bg-amber-900/40"}
          accent={summary.totalOverdue > 0 ? "bg-red-500" : "bg-amber-500"}
        />
        <StatCard
          title="Milestones"
          value={upcomingMilestones.length}
          subtitle="Anniversaries within 30 days"
          icon={Heart}
          iconColor="text-pink-600 dark:text-pink-400"
          iconBg="bg-pink-100 dark:bg-pink-900/40"
          accent="bg-pink-500"
        />
      </div>

      {upcomingMilestones.length > 0 && (
        <Card className="border-pink-200 dark:border-pink-800/50 bg-gradient-to-r from-pink-50/50 to-transparent dark:from-pink-950/20" data-testid="card-milestones">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-500" />
              Upcoming Anniversaries — Send Thank-You Emails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingMilestones.map(c => {
                const years = c.durationDays !== null ? Math.ceil(c.durationDays / 365) : null;
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/60 dark:bg-card/60 border border-pink-100 dark:border-pink-900/30 hover:bg-white dark:hover:bg-card transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/clients/${c.id}`)}
                    data-testid={`milestone-client-${c.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center">
                        <Star className="w-4 h-4 text-pink-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium" data-testid={`text-milestone-name-${c.id}`}>{c.companyName}</p>
                        <p className="text-xs text-muted-foreground">
                          {years}yr anniversary {c.nextAnniversary ? `on ${format(new Date(c.nextAnniversary), "MMM d")}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-pink-600 border-pink-200 dark:text-pink-400 dark:border-pink-800" data-testid={`badge-days-${c.id}`}>
                        {c.daysUntilAnniversary === 0 ? "Today!" : `${c.daysUntilAnniversary} days`}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatCurrency(c.lifetimeValue)} lifetime</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-testid="card-top-clients">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Top Clients by Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No revenue data yet</p>
            ) : (
              <div className="space-y-2">
                {topClients.map((c, i) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/clients/${c.id}`)}
                    data-testid={`top-client-${c.id}`}
                  >
                    <span className="w-5 text-xs font-bold text-muted-foreground text-right">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.companyName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {c.invoiceCount} invoices · {formatDuration(c.durationDays)} client
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400" data-testid={`text-top-value-${c.id}`}>
                        {formatCurrency(c.lifetimeValue)}
                      </p>
                      {c.totalOutstanding > 0 && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400">{formatCurrency(c.totalOutstanding)} owed</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-at-risk">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              At-Risk Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            {atRiskClients.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">All clients are in good standing</p>
              </div>
            ) : (
              <div className="space-y-2">
                {atRiskClients.slice(0, 10).map(c => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/clients/${c.id}`)}
                    data-testid={`risk-client-${c.id}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.companyName}</p>
                      <div className="flex gap-2 text-[11px] text-muted-foreground">
                        {c.overdueAmount > 0 && (
                          <span className="text-red-600 dark:text-red-400">{formatCurrency(c.overdueAmount)} overdue</span>
                        )}
                        {c.daysSinceLastInvoice !== null && c.daysSinceLastInvoice > 90 && (
                          <span>{c.daysSinceLastInvoice}d since last invoice</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {revenueTimeline.length > 0 && (
        <Card data-testid="card-revenue-chart">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Monthly Revenue (Last 12 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueTimeline}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => {
                      const d = new Date(v + "-01");
                      return d.toLocaleDateString("en-US", { month: "short" });
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v), "Revenue"]}
                    labelFormatter={(v) => {
                      const d = new Date(v + "-01");
                      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
                    }}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {revenueTimeline.map((_, i) => (
                      <Cell key={i} fill={chartColors[i % chartColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-all-clients">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">All Clients</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
                data-testid="input-search-clients"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Company</th>
                  <th className="pb-2 font-medium">Client Since</th>
                  <th className="pb-2 font-medium text-right">Lifetime Value</th>
                  <th className="pb-2 font-medium text-right">Outstanding</th>
                  <th className="pb-2 font-medium text-center">Payment Avg</th>
                  <th className="pb-2 font-medium text-center">Status</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map(c => (
                  <tr
                    key={c.id}
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => navigate(`/admin/clients/${c.id}`)}
                    data-testid={`row-client-${c.id}`}
                  >
                    <td className="py-2.5">
                      <p className="font-medium">{c.companyName}</p>
                      <p className="text-xs text-muted-foreground">{c.contactName}</p>
                    </td>
                    <td className="py-2.5">
                      <p>{c.clientSince ? format(new Date(c.clientSince), "MMM d, yyyy") : "—"}</p>
                      <p className="text-xs text-muted-foreground">{formatDuration(c.durationDays)}</p>
                    </td>
                    <td className="py-2.5 text-right">
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400" data-testid={`text-ltv-${c.id}`}>
                        {formatCurrency(c.lifetimeValue)}
                      </p>
                      <p className="text-xs text-muted-foreground">{c.invoiceCount} invoices</p>
                    </td>
                    <td className="py-2.5 text-right">
                      {c.totalOutstanding > 0 ? (
                        <p className="text-amber-600 dark:text-amber-400">{formatCurrency(c.totalOutstanding)}</p>
                      ) : (
                        <p className="text-muted-foreground">—</p>
                      )}
                      {c.overdueAmount > 0 && (
                        <p className="text-xs text-red-600 dark:text-red-400">{formatCurrency(c.overdueAmount)} overdue</p>
                      )}
                    </td>
                    <td className="py-2.5 text-center">
                      {c.avgPaymentDays > 0 ? (
                        <span className={`text-xs ${c.avgPaymentDays > 30 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {c.avgPaymentDays}d avg
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2.5 text-center">
                      <Badge
                        variant="outline"
                        className={
                          c.status === "active"
                            ? "text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800"
                            : "text-muted-foreground"
                        }
                      >
                        {c.status}
                      </Badge>
                    </td>
                    <td className="py-2.5">
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </td>
                  </tr>
                ))}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">No clients found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
