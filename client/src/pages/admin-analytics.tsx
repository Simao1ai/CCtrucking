import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, AlertCircle, Calculator, Users, UserPlus, UserCheck, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const CHART_COLORS = [
  "hsl(215, 70%, 50%)",
  "hsl(150, 60%, 45%)",
  "hsl(45, 90%, 55%)",
  "hsl(0, 70%, 55%)",
  "hsl(280, 60%, 55%)",
];

interface AnalyticsData {
  revenue: { total: number; monthly: number; outstanding: number; avgInvoice: number };
  clients: { total: number; active: number; newThisMonth: number };
  tickets: { total: number; open: number; completed: number; completionRate: number };
  monthlyData: { month: string; revenue: number; invoiceCount: number; paidCount: number }[];
  serviceBreakdown: { name: string; count: number; revenue: number }[];
  aging: { current: number; thirtyDays: number; sixtyDays: number; ninetyPlus: number };
  clientRevenue: { name: string; revenue: number }[];
  invoiceSummary: { total: number; paid: number; pending: number; overdue: number };
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function KpiCard({ title, value, icon: Icon, loading, testId }: {
  title: string;
  value: string;
  icon: any;
  loading?: boolean;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" data-testid={`${testId}-skeleton`} />
        ) : (
          <div className="text-2xl font-bold" data-testid={`${testId}-value`}>{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminAnalytics() {
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics"],
    enabled: user?.role === "owner",
  });

  if (user?.role !== "owner") {
    return (
      <div className="p-6 max-w-7xl mx-auto" data-testid="page-analytics-restricted">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShieldAlert className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-1">Access Restricted</h2>
          <p className="text-sm text-muted-foreground">Business analytics is only available to the account owner.</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 max-w-7xl mx-auto" data-testid="page-analytics-error">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <h2 className="text-lg font-semibold mb-1">Failed to load analytics</h2>
          <p className="text-sm text-muted-foreground" data-testid="text-error-message">
            {error instanceof Error ? error.message : "An unexpected error occurred"}
          </p>
        </div>
      </div>
    );
  }

  const invoiceStatusData = data
    ? [
        { name: "Paid", value: data.invoiceSummary.paid },
        { name: "Pending", value: data.invoiceSummary.pending },
        { name: "Overdue", value: data.invoiceSummary.overdue },
      ]
    : [];

  const maxClientRevenue = data?.clientRevenue?.length
    ? Math.max(...data.clientRevenue.map((c) => c.revenue))
    : 1;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="page-admin-analytics">
      <div data-testid="section-header">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Business Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1" data-testid="text-page-subtitle">
          Financial overview and performance metrics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="section-kpi-cards">
        <KpiCard
          title="Total Revenue"
          value={data ? formatCurrency(data.revenue.total) : "$0.00"}
          icon={DollarSign}
          loading={isLoading}
          testId="kpi-total-revenue"
        />
        <KpiCard
          title="Monthly Revenue"
          value={data ? formatCurrency(data.revenue.monthly) : "$0.00"}
          icon={TrendingUp}
          loading={isLoading}
          testId="kpi-monthly-revenue"
        />
        <KpiCard
          title="Outstanding"
          value={data ? formatCurrency(data.revenue.outstanding) : "$0.00"}
          icon={AlertCircle}
          loading={isLoading}
          testId="kpi-outstanding"
        />
        <KpiCard
          title="Avg Invoice"
          value={data ? formatCurrency(data.revenue.avgInvoice) : "$0.00"}
          icon={Calculator}
          loading={isLoading}
          testId="kpi-avg-invoice"
        />
      </div>

      <Card data-testid="card-revenue-trend">
        <CardHeader>
          <CardTitle className="text-base font-semibold" data-testid="text-revenue-trend-title">
            Revenue Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" data-testid="skeleton-revenue-trend" />
          ) : (
            <div data-testid="chart-revenue-trend">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data?.monthlyData ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke={CHART_COLORS[0]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Revenue"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2" data-testid="section-invoice-client-row">
        <Card data-testid="card-invoice-status">
          <CardHeader>
            <CardTitle className="text-base font-semibold" data-testid="text-invoice-status-title">
              Invoice Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" data-testid="skeleton-invoice-status" />
            ) : (
              <div data-testid="chart-invoice-status">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={invoiceStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {invoiceStatusData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-client-metrics">
          <CardHeader>
            <CardTitle className="text-base font-semibold" data-testid="text-client-metrics-title">
              Client Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" data-testid={`skeleton-client-metric-${i}`} />
                ))}
              </div>
            ) : (
              <div className="space-y-6" data-testid="client-metrics-content">
                <div className="flex items-center gap-4 p-4 rounded-md bg-muted/50" data-testid="metric-total-clients">
                  <Users className="w-8 h-8 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{data?.clients.total ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Total Clients</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-md bg-muted/50" data-testid="metric-active-clients">
                  <UserCheck className="w-8 h-8 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{data?.clients.active ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Active Clients</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-md bg-muted/50" data-testid="metric-new-clients">
                  <UserPlus className="w-8 h-8 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{data?.clients.newThisMonth ?? 0}</p>
                    <p className="text-sm text-muted-foreground">New This Month</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-service-breakdown">
        <CardHeader>
          <CardTitle className="text-base font-semibold" data-testid="text-service-breakdown-title">
            Service Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" data-testid="skeleton-service-breakdown" />
          ) : (
            <div data-testid="chart-service-breakdown">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data?.serviceBreakdown ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="revenue" fill={CHART_COLORS[0]} name="Revenue" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div data-testid="section-aging">
        <h2 className="text-lg font-semibold mb-4" data-testid="text-aging-title">Accounts Receivable Aging</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="aging-current">
            <CardContent className="p-4">
              {isLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">Current</p>
                  <p className="text-xl font-bold" data-testid="aging-current-value">
                    {formatCurrency(data?.aging.current ?? 0)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card data-testid="aging-30-days">
            <CardContent className="p-4">
              {isLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">30 Days</p>
                  <p className="text-xl font-bold" data-testid="aging-30-days-value">
                    {formatCurrency(data?.aging.thirtyDays ?? 0)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card data-testid="aging-60-days">
            <CardContent className="p-4">
              {isLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">60 Days</p>
                  <p className="text-xl font-bold" data-testid="aging-60-days-value">
                    {formatCurrency(data?.aging.sixtyDays ?? 0)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card data-testid="aging-90-plus">
            <CardContent className="p-4">
              {isLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">90+ Days</p>
                  <p className="text-xl font-bold text-destructive" data-testid="aging-90-plus-value">
                    {formatCurrency(data?.aging.ninetyPlus ?? 0)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card data-testid="card-top-clients">
        <CardHeader>
          <CardTitle className="text-base font-semibold" data-testid="text-top-clients-title">
            Top Clients by Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" data-testid={`skeleton-top-client-${i}`} />
              ))}
            </div>
          ) : (data?.clientRevenue?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-client-revenue">
              No client revenue data available
            </p>
          ) : (
            <div className="space-y-3" data-testid="top-clients-list">
              {data?.clientRevenue
                .slice()
                .sort((a, b) => b.revenue - a.revenue)
                .map((client, index) => (
                  <div
                    key={client.name}
                    className="flex items-center gap-4"
                    data-testid={`top-client-${index}`}
                  >
                    <span className="text-sm font-medium w-40 truncate" data-testid={`top-client-name-${index}`}>
                      {client.name}
                    </span>
                    <div className="flex-1 h-6 rounded-md bg-muted/50 overflow-hidden">
                      <div
                        className="h-full rounded-md"
                        style={{
                          width: `${(client.revenue / maxClientRevenue) * 100}%`,
                          backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                        }}
                        data-testid={`top-client-bar-${index}`}
                      />
                    </div>
                    <span className="text-sm font-medium w-28 text-right" data-testid={`top-client-revenue-${index}`}>
                      {formatCurrency(client.revenue)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
