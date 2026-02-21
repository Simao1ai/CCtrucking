import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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

  return (
    <div className="p-6 space-y-6" data-testid="page-portal-documents">
      <div>
        <h1 className="text-2xl font-bold">My Documents</h1>
        <p className="text-muted-foreground">All your compliance documents and files</p>
      </div>

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
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{search ? "No documents match your search." : "No documents on file yet."}</p>
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
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium">{doc.name}</div>
                        <div className="text-sm text-muted-foreground">{doc.type}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={doc.status === "approved" ? "default" : "secondary"}>
                        {doc.status}
                      </Badge>
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
