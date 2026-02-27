import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AuditLog } from "@shared/schema";
import { History, Search, User, Clock, FileText, Users, Ticket, Receipt, PenLine, Stamp, ClipboardList, Shield } from "lucide-react";
import { format } from "date-fns";

const ENTITY_TYPES = [
  { value: "all", label: "All Types" },
  { value: "client", label: "Clients" },
  { value: "ticket", label: "Tickets" },
  { value: "invoice", label: "Invoices" },
  { value: "document", label: "Documents" },
  { value: "form_template", label: "Form Templates" },
  { value: "filled_form", label: "Filled Forms" },
  { value: "notarization", label: "Notarizations" },
  { value: "signature", label: "Signatures" },
  { value: "user", label: "Users" },
];

function entityIcon(type: string) {
  switch (type) {
    case "client": return <Users className="w-3.5 h-3.5" />;
    case "ticket": return <Ticket className="w-3.5 h-3.5" />;
    case "invoice": return <Receipt className="w-3.5 h-3.5" />;
    case "document": return <FileText className="w-3.5 h-3.5" />;
    case "form_template": case "filled_form": return <ClipboardList className="w-3.5 h-3.5" />;
    case "notarization": return <Stamp className="w-3.5 h-3.5" />;
    case "signature": return <PenLine className="w-3.5 h-3.5" />;
    case "user": return <Shield className="w-3.5 h-3.5" />;
    default: return <FileText className="w-3.5 h-3.5" />;
  }
}

function actionColor(action: string) {
  if (action === "created") return "default";
  if (action === "updated") return "secondary";
  if (action === "deleted") return "destructive";
  if (action.includes("signature") || action.includes("sent")) return "outline";
  return "secondary";
}

export default function AdminAudit() {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");

  const queryKey = entityFilter === "all"
    ? ["/api/admin/audit-logs"]
    : [`/api/admin/audit-logs?entityType=${entityFilter}`];

  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey,
  });

  const filtered = logs.filter(log => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (log.userName || "").toLowerCase().includes(s) ||
      log.action.toLowerCase().includes(s) ||
      log.entityType.toLowerCase().includes(s) ||
      (log.details || "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-audit-title">Audit Log</h1>
        <p className="text-sm text-muted-foreground">Track all actions performed in the system</p>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by user, action, or details..."
            className="pl-10"
            data-testid="input-search-audit"
          />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-entity-filter">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>{search || entityFilter !== "all" ? "No matching audit entries found." : "No audit entries yet. Actions will be logged as you use the system."}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(log => (
            <Card key={log.id} data-testid={`card-audit-${log.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted flex-shrink-0 mt-0.5">
                    {entityIcon(log.entityType)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium" data-testid={`text-audit-user-${log.id}`}>
                        {log.userName || "System"}
                      </span>
                      <Badge variant={actionColor(log.action)} className="text-xs">
                        {log.action}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {log.entityType.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    {log.details && (
                      <p className="text-xs text-muted-foreground mt-1" data-testid={`text-audit-details-${log.id}`}>
                        {log.details}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {log.createdAt && format(new Date(log.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
