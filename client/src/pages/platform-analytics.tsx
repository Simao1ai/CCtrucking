import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { BarChart3, DollarSign, Building2, Activity } from "lucide-react";

interface PlatformAnalytics {
  tenantStatusBreakdown: { status: string; count: number }[];
  totalUsers: number;
  totalRevenue: string;
  totalClients: number;
  monthlyRevenue: { month: string; total: string }[];
  perTenantRevenue: { tenantId: string; total: string; tenantName: string }[];
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "active"
      ? "bg-green-500/15 text-green-700 dark:text-green-400"
      : status === "trial"
        ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
        : status === "suspended"
          ? "bg-red-500/15 text-red-700 dark:text-red-400"
          : "bg-gray-500/15 text-gray-700 dark:text-gray-400";
  return (
    <Badge className={`no-default-hover-elevate no-default-active-elevate ${cls}`} data-testid={`badge-status-${status}`}>
      {status}
    </Badge>
  );
}

export default function PlatformAnalytics() {
  const { data: analytics, isLoading: analyticsLoading } = useQuery<PlatformAnalytics>({
    queryKey: ["/api/platform/analytics"],
  });

  const totalRevenue = parseFloat(analytics?.totalRevenue ?? "0");
  const totalTenants = analytics?.tenantStatusBreakdown
    ? analytics.tenantStatusBreakdown.reduce((s, v) => s + Number(v.count), 0)
    : 0;
  const activeTenants = analytics?.tenantStatusBreakdown?.find(s => s.status === "active")?.count ?? 0;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto" data-testid="page-platform-analytics">
      <PageHeader
        title="Platform Analytics"
        description="Revenue charts, per-tenant revenue, and tenant status breakdown"
        icon={<BarChart3 className="w-5 h-5 text-muted-foreground" />}
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4" data-testid="section-analytics-overview">
        <Card data-testid="card-total-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-8 w-28" data-testid="skeleton-total-revenue" />
            ) : (
              <div className="text-2xl font-bold" data-testid="value-total-revenue">{formatCurrency(totalRevenue)}</div>
            )}
          </CardContent>
        </Card>
        <Card data-testid="card-total-tenants">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tenants</CardTitle>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-8 w-20" data-testid="skeleton-total-tenants" />
            ) : (
              <div className="text-2xl font-bold" data-testid="value-total-tenants">{totalTenants}</div>
            )}
          </CardContent>
        </Card>
        <Card data-testid="card-active-tenants">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Tenants</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-8 w-20" data-testid="skeleton-active-tenants" />
            ) : (
              <div className="text-2xl font-bold" data-testid="value-active-tenants">{activeTenants}</div>
            )}
          </CardContent>
        </Card>
        <Card data-testid="card-total-clients">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Clients</CardTitle>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-8 w-20" data-testid="skeleton-total-clients" />
            ) : (
              <div className="text-2xl font-bold" data-testid="value-total-clients">{analytics?.totalClients ?? 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-revenue-chart">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Monthly Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {analyticsLoading ? (
            <Skeleton className="h-[300px] w-full" data-testid="skeleton-revenue-chart" />
          ) : (
            <div data-testid="chart-monthly-revenue">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={(analytics?.monthlyRevenue ?? []).map(r => ({ month: r.month, revenue: parseFloat(r.total || "0") }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="revenue" fill="hsl(215, 70%, 50%)" name="Revenue" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2" data-testid="section-detail-charts">
        <Card data-testid="card-per-tenant-revenue">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Revenue by Tenant</CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" data-testid={`skeleton-tenant-revenue-${i}`} />
                ))}
              </div>
            ) : (
              <div className="space-y-3" data-testid="list-per-tenant-revenue">
                {(analytics?.perTenantRevenue ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-tenant-revenue">No revenue data available</p>
                ) : (
                  (analytics?.perTenantRevenue ?? []).map((t, i) => (
                    <div key={t.tenantId} className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50" data-testid={`tenant-revenue-${i}`}>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium" data-testid={`text-tenant-revenue-name-${i}`}>{t.tenantName || t.tenantId}</span>
                        <span className="text-xs text-muted-foreground" data-testid={`text-tenant-revenue-id-${i}`}>{t.tenantId}</span>
                      </div>
                      <span className="text-sm font-bold tabular-nums" data-testid={`value-tenant-revenue-${i}`}>{formatCurrency(parseFloat(t.total || "0"))}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-status-breakdown">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Tenant Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" data-testid={`skeleton-status-${i}`} />
                ))}
              </div>
            ) : (
              <div className="space-y-3" data-testid="list-status-breakdown">
                {(analytics?.tenantStatusBreakdown ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-status-data">No status data available</p>
                ) : (
                  (analytics?.tenantStatusBreakdown ?? []).map((s, i) => (
                    <div key={s.status} className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50" data-testid={`status-row-${i}`}>
                      <StatusBadge status={s.status} />
                      <span className="text-lg font-bold tabular-nums" data-testid={`value-status-count-${i}`}>{Number(s.count)}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
