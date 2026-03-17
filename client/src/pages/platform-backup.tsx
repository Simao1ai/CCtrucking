import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Database, Users, Building2, FileText, DollarSign, HardDrive } from "lucide-react";

interface HealthData {
  uptime: number;
  databaseStats: Record<string, number>;
}

const EXPORT_TYPES = [
  {
    id: "tenants",
    title: "Tenants",
    description: "Export all tenant records including plan, status, and contact details.",
    icon: Building2,
    color: "text-blue-600",
  },
  {
    id: "users",
    title: "Users",
    description: "Export all user accounts with roles, tenant assignments, and contact info.",
    icon: Users,
    color: "text-green-600",
  },
  {
    id: "audit-logs",
    title: "Audit Logs",
    description: "Export the full audit trail (up to 10,000 most recent entries).",
    icon: FileText,
    color: "text-purple-600",
  },
  {
    id: "revenue",
    title: "Revenue / Invoices",
    description: "Export all invoices across all tenants with amounts and statuses.",
    icon: DollarSign,
    color: "text-amber-600",
  },
];

export default function PlatformBackupPage() {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: health, isLoading } = useQuery<HealthData>({
    queryKey: ["/api/platform/health"],
  });

  const handleExport = async (type: string) => {
    setDownloading(type);
    try {
      const response = await fetch(`/api/platform/export/${type}`, { credentials: "include" });
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const filename = disposition?.match(/filename="(.+)"/)?.[1] || `${type}_export.csv`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({ title: "Export complete", description: `${type} data has been downloaded.` });
    } catch (error: any) {
      toast({ title: "Export failed", description: error.message, variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const dbStats = health?.databaseStats || {};
  const totalRecords = Object.values(dbStats).reduce((sum, count) => sum + count, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6" data-testid="page-platform-backup">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Backup & Data Export</h1>
        <p className="text-muted-foreground">Export your platform data as CSV files for backup or analysis.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Database Overview
          </CardTitle>
          <CardDescription>Current state of your platform data.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold" data-testid="text-total-records">{totalRecords.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total Records</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold" data-testid="text-table-count">{Object.keys(dbStats).length}</div>
              <p className="text-xs text-muted-foreground">Tables</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold" data-testid="text-tenant-count">{dbStats.tenants || 0}</div>
              <p className="text-xs text-muted-foreground">Tenants</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold" data-testid="text-user-count">{dbStats.users || 0}</div>
              <p className="text-xs text-muted-foreground">Users</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Table Breakdown</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(dbStats).sort((a, b) => b[1] - a[1]).map(([table, count]) => (
                <Badge key={table} variant="outline" className="gap-1" data-testid={`badge-table-${table}`}>
                  {table.replace(/_/g, " ")}: {count}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EXPORT_TYPES.map((exp) => {
          const Icon = exp.icon;
          return (
            <Card key={exp.id} data-testid={`card-export-${exp.id}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className={`w-5 h-5 ${exp.color}`} />
                  {exp.title}
                </CardTitle>
                <CardDescription>{exp.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => handleExport(exp.id)}
                  disabled={downloading !== null}
                  variant="outline"
                  className="w-full"
                  data-testid={`button-export-${exp.id}`}
                >
                  {downloading === exp.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  {downloading === exp.id ? "Exporting..." : "Download CSV"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Export Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Exports are generated in real-time from the live database. Large datasets may take a moment to process.</p>
          <p>All exports are in CSV format, compatible with Excel, Google Sheets, and other spreadsheet applications.</p>
          <p>Revenue exports include all invoices across all tenants for comprehensive financial analysis.</p>
          <p>Audit log exports include up to 10,000 of the most recent entries. For older records, filter by date range on the Audit Log page.</p>
        </CardContent>
      </Card>
    </div>
  );
}
