import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2, Users, DollarSign, Activity,
  Server, ArrowRight, Brain, BarChart3,
} from "lucide-react";

interface PlatformAnalytics {
  tenantStatusBreakdown: { status: string; count: number }[];
  totalUsers: number;
  totalRevenue: string;
  totalClients: number;
  monthlyRevenue: { month: string; total: string }[];
}

interface AIUsageData {
  totals: { totalTokens: string; promptTokens: string; completionTokens: string; requestCount: number };
}

interface HealthData {
  systemUptime: number;
  recentAuditLogCount: number;
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function PlatformDashboard() {
  const { data: analytics, isLoading: analyticsLoading } = useQuery<PlatformAnalytics>({
    queryKey: ["/api/platform/analytics"],
  });

  const { data: aiUsage, isLoading: aiLoading } = useQuery<AIUsageData>({
    queryKey: ["/api/platform/ai-usage"],
  });

  const { data: health, isLoading: healthLoading } = useQuery<HealthData>({
    queryKey: ["/api/platform/health"],
  });

  const totalTenants = analytics?.tenantStatusBreakdown
    ? analytics.tenantStatusBreakdown.reduce((s, v) => s + Number(v.count), 0)
    : 0;
  const activeTenants = Number(analytics?.tenantStatusBreakdown?.find(s => s.status === "active")?.count ?? 0);
  const totalUsers = analytics?.totalUsers ?? 0;
  const totalRevenue = parseFloat(analytics?.totalRevenue ?? "0");
  const aiTotalTokens = parseInt(aiUsage?.totals?.totalTokens ?? "0", 10);

  const quickLinks = [
    {
      title: "Tenants",
      description: "Manage subscription clients, create new tenants, and impersonate",
      href: "/platform/tenants",
      icon: Building2,
      stat: `${totalTenants} total, ${activeTenants} active`,
      loading: analyticsLoading,
    },
    {
      title: "Analytics",
      description: "Revenue trends, per-tenant breakdown, and status overview",
      href: "/platform/analytics",
      icon: BarChart3,
      stat: formatCurrency(totalRevenue) + " total revenue",
      loading: analyticsLoading,
    },
    {
      title: "AI Usage",
      description: "Token consumption by feature and tenant, daily trends",
      href: "/platform/ai-usage",
      icon: Brain,
      stat: aiTotalTokens.toLocaleString() + " tokens used",
      loading: aiLoading,
    },
    {
      title: "System Health",
      description: "Uptime, audit logs, and database statistics",
      href: "/platform/health",
      icon: Activity,
      stat: health?.systemUptime ? `Uptime: ${formatUptime(health.systemUptime)}` : "Loading...",
      loading: healthLoading,
    },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto" data-testid="page-platform-dashboard">
      <PageHeader
        title="Platform Dashboard"
        description="CarrierDeskHQ platform overview"
        icon={<Server className="w-5 h-5 text-muted-foreground" />}
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4" data-testid="section-overview-cards">
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
        <Card data-testid="card-total-users">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-8 w-20" data-testid="skeleton-total-users" />
            ) : (
              <div className="text-2xl font-bold" data-testid="value-total-users">{totalUsers}</div>
            )}
          </CardContent>
        </Card>
        <Card data-testid="card-platform-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Platform Revenue</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-8 w-28" data-testid="skeleton-platform-revenue" />
            ) : (
              <div className="text-2xl font-bold" data-testid="value-platform-revenue">{formatCurrency(totalRevenue)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2" data-testid="section-quick-links">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="hover-elevate cursor-pointer transition-shadow h-full" data-testid={`card-link-${link.title.toLowerCase().replace(/\s+/g, "-")}`}>
              <CardContent className="flex items-start gap-4 p-5">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
                  <link.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm">{link.title}</h3>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{link.description}</p>
                  {link.loading ? (
                    <Skeleton className="h-4 w-32 mt-2" />
                  ) : (
                    <p className="text-xs font-medium text-primary mt-2" data-testid={`stat-${link.title.toLowerCase().replace(/\s+/g, "-")}`}>{link.stat}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
