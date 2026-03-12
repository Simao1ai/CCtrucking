import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, FileText, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import type { AuditLog } from "@shared/schema";

interface AuditLogResponse {
  logs: AuditLog[];
  total: number;
  tenants: { id: string; name: string }[];
}

const ENTITY_TYPES = [
  "client", "invoice", "document", "ticket", "notarization", "signature_request",
  "form_template", "filled_form", "user", "tenant", "platform_settings",
  "security_settings", "announcement", "data_export", "api_key",
];

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  update: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  delete: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  export: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  login: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  view: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function PlatformAuditLogPage() {
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    tenantId: "",
    entityType: "",
    action: "",
    startDate: "",
    endDate: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const pageSize = 50;

  const queryParams = new URLSearchParams();
  if (appliedFilters.tenantId) queryParams.set("tenantId", appliedFilters.tenantId);
  if (appliedFilters.entityType) queryParams.set("entityType", appliedFilters.entityType);
  if (appliedFilters.action) queryParams.set("action", appliedFilters.action);
  if (appliedFilters.startDate) queryParams.set("startDate", appliedFilters.startDate);
  if (appliedFilters.endDate) queryParams.set("endDate", appliedFilters.endDate);
  queryParams.set("limit", String(pageSize));
  queryParams.set("offset", String(page * pageSize));

  const { data, isLoading } = useQuery<AuditLogResponse>({
    queryKey: ["/api/platform/audit-logs", `?${queryParams.toString()}`],
  });

  const applyFilters = () => {
    setPage(0);
    setAppliedFilters({ ...filters });
  };

  const clearFilters = () => {
    const empty = { tenantId: "", entityType: "", action: "", startDate: "", endDate: "" };
    setFilters(empty);
    setAppliedFilters(empty);
    setPage(0);
  };

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" data-testid="page-platform-audit-log">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Audit Log</h1>
        <p className="text-muted-foreground">Complete audit trail of all actions across the platform.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tenant</Label>
              <Select value={filters.tenantId} onValueChange={(v) => setFilters({ ...filters, tenantId: v === "all" ? "" : v })}>
                <SelectTrigger data-testid="select-filter-tenant">
                  <SelectValue placeholder="All Tenants" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tenants</SelectItem>
                  {data?.tenants?.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Entity Type</Label>
              <Select value={filters.entityType} onValueChange={(v) => setFilters({ ...filters, entityType: v === "all" ? "" : v })}>
                <SelectTrigger data-testid="select-filter-entity">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {ENTITY_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Action</Label>
              <Input
                data-testid="input-filter-action"
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                placeholder="e.g., create, update"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Start Date</Label>
              <Input
                data-testid="input-filter-start-date"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End Date</Label>
              <Input
                data-testid="input-filter-end-date"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={applyFilters} data-testid="button-apply-filters">
              <Search className="w-4 h-4 mr-1" /> Apply Filters
            </Button>
            <Button size="sm" variant="outline" onClick={clearFilters} data-testid="button-clear-filters">
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4" />
              Logs
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {data ? `${data.total.toLocaleString()} total entries` : "Loading..."}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Tenant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.logs.map((log) => (
                      <TableRow key={log.id} data-testid={`row-audit-${log.id}`}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">{log.userName || "System"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={ACTION_COLORS[log.action] || ""}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{log.entityType.replace(/_/g, " ")}</span>
                          {log.entityId && (
                            <span className="text-xs text-muted-foreground ml-1">#{log.entityId.slice(0, 8)}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm max-w-[300px] truncate">{log.details}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {data?.tenants?.find(t => t.id === log.tenantId)?.name || log.tenantId || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!data?.logs || data.logs.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No audit logs found matching the current filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage(page - 1)}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage(page + 1)}
                      data-testid="button-next-page"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
