import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText, Search, File, Shield, Fuel, FileCheck } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import type { Document } from "@shared/schema";

const typeIcons: Record<string, any> = {
  "Fuel Records": Fuel,
  "Insurance Certificate": Shield,
  "DOT Registration": FileCheck,
  "EIN Letter": File,
};

export default function PortalDocuments() {
  const [search, setSearch] = useState("");
  const { data: documents = [], isLoading } = useQuery<Document[]>({ queryKey: ["/api/portal/documents"] });

  const filtered = documents.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.type.toLowerCase().includes(search.toLowerCase())
  );

  const pendingCount = documents.filter(d => d.status === "pending").length;

  return (
    <div className="p-6 space-y-6" data-testid="page-portal-documents">
      <PageHeader
        title="My Documents"
        description="All your compliance documents and files"
        badge={pendingCount > 0 ? <StatusBadge status="pending" label={`${pendingCount} pending`} /> : undefined}
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-search-docs"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={FileText}
              title={search ? "No matching documents" : "No documents on file"}
              description={search ? "Try adjusting your search terms." : "Documents will appear here once they are uploaded by your team."}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(doc => {
            const Icon = typeIcons[doc.type] || FileText;
            return (
              <Card key={doc.id} data-testid={`doc-${doc.id}`}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate" data-testid={`text-doc-name-${doc.id}`}>{doc.name}</div>
                        <div className="text-sm text-muted-foreground">{doc.type}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusBadge status={doc.status} />
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(doc.uploadedAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
