import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Building2, Users, DollarSign, Activity, Eye, UserCog,
  Server, Database, ScrollText, Clock,
} from "lucide-react";

interface PlatformAnalytics {
  tenantStatusBreakdown: { status: string; count: number }[];
  totalUsers: number;
  totalRevenue: string;
  totalClients: number;
  monthlyRevenue: { month: string; total: string }[];
  perTenantRevenue: { tenantId: string; total: string; tenantName: string }[];
}

interface PlatformTenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  contactEmail?: string;
  clientCount?: number;
  userCount?: number;
}

interface AIUsageData {
  totals: { totalTokens: string; promptTokens: string; completionTokens: string; requestCount: number };
  perFeature: { feature: string; totalTokens: string; count: number }[];
  perTenant: { tenantId: string; totalTokens: string; count: number }[];
  dailyTrend: { date: string; totalTokens: string; count: number }[];
}

interface HealthData {
  tenantsByStatus: { status: string; count: number }[];
  tableCounts: Record<string, number>;
  recentAuditLogCount: number;
  systemUptime: number;
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const tenantFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  plan: z.enum(["basic", "pro", "enterprise"]),
  status: z.enum(["active", "trial", "suspended", "cancelled"]),
  contactEmail: z.string().email("Invalid email").or(z.literal("")),
});

type TenantFormValues = z.infer<typeof tenantFormSchema>;

function PlanBadge({ plan }: { plan: string }) {
  const cls =
    plan === "enterprise"
      ? "bg-purple-500/15 text-purple-700 dark:text-purple-400"
      : plan === "pro"
        ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
        : "";
  return (
    <Badge className={`no-default-hover-elevate no-default-active-elevate ${cls}`} data-testid={`badge-plan-${plan}`}>
      {plan}
    </Badge>
  );
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

function TenantDetailDialog({
  tenant,
  open,
  onOpenChange,
}: {
  tenant: PlatformTenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantFormSchema),
    values: {
      name: tenant?.name ?? "",
      plan: (tenant?.plan as TenantFormValues["plan"]) ?? "basic",
      status: (tenant?.status as TenantFormValues["status"]) ?? "active",
      contactEmail: tenant?.contactEmail ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: TenantFormValues) => {
      await apiRequest("PATCH", `/api/platform/tenants/${tenant?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/analytics"] });
      toast({ title: "Tenant updated", description: "Changes saved successfully." });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-tenant-detail">
        <DialogHeader>
          <DialogTitle data-testid="text-dialog-title">Edit Tenant</DialogTitle>
        </DialogHeader>
        {tenant && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Slug</Label>
              <p className="text-sm font-medium" data-testid="text-tenant-slug">{tenant.slug}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tenant-name">Name</Label>
              <Input
                id="tenant-name"
                data-testid="input-tenant-name"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tenant-plan">Plan</Label>
              <Select
                value={form.watch("plan")}
                onValueChange={(v) => form.setValue("plan", v as TenantFormValues["plan"])}
              >
                <SelectTrigger data-testid="select-tenant-plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tenant-status">Status</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(v) => form.setValue("status", v as TenantFormValues["status"])}
              >
                <SelectTrigger data-testid="select-tenant-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tenant-email">Contact Email</Label>
              <Input
                id="tenant-email"
                data-testid="input-tenant-email"
                {...form.register("contactEmail")}
              />
              {form.formState.errors.contactEmail && (
                <p className="text-xs text-destructive">{form.formState.errors.contactEmail.message}</p>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            data-testid="button-save-tenant"
            onClick={form.handleSubmit((data) => mutation.mutate(data))}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PlatformDashboard() {
  const { toast } = useToast();
  const [selectedTenant, setSelectedTenant] = useState<PlatformTenant | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: analytics, isLoading: analyticsLoading } = useQuery<PlatformAnalytics>({
    queryKey: ["/api/platform/analytics"],
  });

  const { data: tenants, isLoading: tenantsLoading } = useQuery<PlatformTenant[]>({
    queryKey: ["/api/platform/tenants"],
  });

  const { data: aiUsage, isLoading: aiLoading } = useQuery<AIUsageData>({
    queryKey: ["/api/platform/ai-usage"],
  });

  const { data: health, isLoading: healthLoading } = useQuery<HealthData>({
    queryKey: ["/api/platform/health"],
  });

  const impersonateMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      await apiRequest("POST", `/api/platform/impersonate/${tenantId}`);
    },
    onSuccess: () => {
      toast({ title: "Impersonating tenant", description: "Session switched." });
      window.location.reload();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const totalTenants = analytics?.tenantStatusBreakdown
    ? analytics.tenantStatusBreakdown.reduce((s, v) => s + Number(v.count), 0)
    : 0;
  const activeTenants = analytics?.tenantStatusBreakdown?.find(s => s.status === "active")?.count ?? 0;
  const totalUsers = analytics?.totalUsers ?? 0;
  const totalRevenue = parseFloat(analytics?.totalRevenue ?? "0");

  const aiTotalTokens = parseInt(aiUsage?.totals?.totalTokens ?? "0", 10);
  const aiByFeature = (aiUsage?.perFeature ?? []).map(f => ({
    feature: f.feature,
    tokens: parseInt(f.totalTokens ?? "0", 10),
  }));
  const aiByTenant = (aiUsage?.perTenant ?? []).map(t => ({
    tenantId: t.tenantId || "unknown",
    tokens: parseInt(t.totalTokens ?? "0", 10),
  }));

  const maxFeatureTokens = aiByFeature.length
    ? Math.max(...aiByFeature.map((f) => f.tokens))
    : 1;

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto" data-testid="page-platform-dashboard">
      <PageHeader
        title="Platform Dashboard"
        description="CarrierDeskHQ platform overview — tenants, revenue, and system health"
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

      <Card data-testid="card-tenants-table">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          {tenantsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" data-testid={`skeleton-tenant-row-${i}`} />
              ))}
            </div>
          ) : (
            <Table data-testid="table-tenants">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Clients</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(tenants ?? []).map((tenant) => (
                  <TableRow key={tenant.id} data-testid={`row-tenant-${tenant.id}`}>
                    <TableCell className="font-medium" data-testid={`text-tenant-name-${tenant.id}`}>{tenant.name}</TableCell>
                    <TableCell className="text-muted-foreground" data-testid={`text-tenant-slug-${tenant.id}`}>{tenant.slug}</TableCell>
                    <TableCell><PlanBadge plan={tenant.plan} /></TableCell>
                    <TableCell><StatusBadge status={tenant.status} /></TableCell>
                    <TableCell data-testid={`text-tenant-clients-${tenant.id}`}>{tenant.clientCount ?? 0}</TableCell>
                    <TableCell data-testid={`text-tenant-users-${tenant.id}`}>{tenant.userCount ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-view-tenant-${tenant.id}`}
                          onClick={() => {
                            setSelectedTenant(tenant);
                            setDialogOpen(true);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-impersonate-tenant-${tenant.id}`}
                          onClick={() => impersonateMutation.mutate(tenant.id)}
                          disabled={impersonateMutation.isPending}
                        >
                          <UserCog className="w-3.5 h-3.5 mr-1" />
                          Impersonate
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(tenants ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8" data-testid="text-no-tenants">
                      No tenants found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2" data-testid="section-charts-row">
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

        <Card data-testid="card-ai-usage">
          <CardHeader>
            <CardTitle className="text-base font-semibold">AI Usage Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {aiLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-40" data-testid="skeleton-ai-total" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <div className="space-y-5">
                <div data-testid="ai-total-tokens">
                  <p className="text-sm text-muted-foreground">Total Tokens Used</p>
                  <p className="text-2xl font-bold">{aiTotalTokens.toLocaleString()}</p>
                </div>

                {aiByFeature.length > 0 && (
                  <div data-testid="ai-by-feature">
                    <p className="text-sm font-medium text-muted-foreground mb-2">By Feature</p>
                    <div className="space-y-2">
                      {aiByFeature.map((f, i) => (
                        <div key={f.feature} data-testid={`ai-feature-${i}`}>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-sm truncate">{f.feature}</span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{f.tokens.toLocaleString()}</span>
                          </div>
                          <Progress
                            value={(f.tokens / maxFeatureTokens) * 100}
                            className="h-2"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiByTenant.length > 0 && (
                  <div data-testid="ai-by-tenant">
                    <p className="text-sm font-medium text-muted-foreground mb-2">By Tenant</p>
                    <div className="space-y-1.5">
                      {aiByTenant.map((t, i) => (
                        <div key={t.tenantId} className="flex items-center justify-between gap-2" data-testid={`ai-tenant-${i}`}>
                          <span className="text-sm truncate">{t.tenantId}</span>
                          <span className="text-sm font-medium tabular-nums">{t.tokens.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-health-status">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Platform Health</CardTitle>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full" data-testid={`skeleton-health-${i}`} />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4" data-testid="health-stats">
              <div className="flex flex-col gap-1 p-4 rounded-md bg-muted/50" data-testid="health-uptime">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">Uptime</span>
                </div>
                <span className="text-lg font-bold" data-testid="value-uptime">{health?.systemUptime ? formatUptime(health.systemUptime) : "N/A"}</span>
              </div>
              <div className="flex flex-col gap-1 p-4 rounded-md bg-muted/50" data-testid="health-audit-logs">
                <div className="flex items-center gap-2">
                  <ScrollText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">Audit Logs (24h)</span>
                </div>
                <span className="text-lg font-bold" data-testid="value-audit-logs">{(health?.recentAuditLogCount ?? 0).toLocaleString()}</span>
              </div>
              {health?.tableCounts && Object.entries(health.tableCounts).map(([table, cnt]) => (
                <div key={table} className="flex flex-col gap-1 p-4 rounded-md bg-muted/50" data-testid={`health-db-${table}`}>
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium capitalize">{table}</span>
                  </div>
                  <span className="text-lg font-bold" data-testid={`value-db-${table}`}>{cnt.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TenantDetailDialog
        tenant={selectedTenant}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
