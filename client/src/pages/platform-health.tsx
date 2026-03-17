import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Server, Database, ScrollText, Clock } from "lucide-react";

interface HealthData {
  tenantsByStatus: { status: string; count: number }[];
  tableCounts: Record<string, number>;
  recentAuditLogCount: number;
  systemUptime: number;
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function PlatformHealth() {
  const { data: health, isLoading: healthLoading } = useQuery<HealthData>({
    queryKey: ["/api/platform/health"],
  });

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1400px] mx-auto" data-testid="page-platform-health">
      <PageHeader
        title="Platform Health"
        description="System uptime, audit logs, and database table counts"
        icon={<Server className="w-5 h-5 text-muted-foreground" />}
      />

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
    </div>
  );
}
