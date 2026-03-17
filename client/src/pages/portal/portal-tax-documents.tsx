import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  FileText, Upload, CheckCircle2, XCircle, Clock, Eye, AlertCircle, Download,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/context/tenant-context";
import type { TaxDocument } from "@shared/schema";
import { format } from "date-fns";

const DOC_TYPES = [
  "W-2", "1099-MISC", "1099-NEC", "1099-K", "1099-INT", "1099-DIV", "1099-R",
  "1098", "Schedule K-1", "IFTA Return", "Fuel Tax Report",
  "Mileage Log", "Expense Report", "Bank Statement", "Other",
];

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

function statusBadge(status: string) {
  switch (status) {
    case "ready_for_review":
      return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800"><Eye className="w-3 h-3 mr-1" />Needs Your Review</Badge>;
    case "approved":
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
    case "rejected":
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
    case "analyzed":
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800"><CheckCircle2 className="w-3 h-3 mr-1" />Analyzed</Badge>;
    case "pending":
    default:
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  }
}

function useUploaderLabel() {
  const branding = useTenant();
  return (role?: string | null) => {
    if (role === "client") return "You";
    if (role === "preparer") return "Tax Preparer";
    if (role === "admin" || role === "owner") return `${branding.shortName} Staff`;
    return "Staff";
  };
}

export default function PortalTaxDocuments() {
  const { toast } = useToast();
  const uploaderLabel = useUploaderLabel();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState("");
  const [taxYear, setTaxYear] = useState(String(new Date().getFullYear()));
  const [payerName, setPayerName] = useState("");
  const [rejectDocId, setRejectDocId] = useState<string | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState("");

  const { data: docs = [], isLoading } = useQuery<TaxDocument[]>({
    queryKey: ["/api/portal/tax-documents"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("taxYear", taxYear);
      formData.append("documentType", docType);
      formData.append("payerName", payerName);
      const res = await fetch("/api/portal/tax-documents/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/tax-documents"] });
      toast({ title: "Document uploaded successfully" });
      setDocType("");
      setPayerName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (e: Error) => toast({ title: "Upload failed", description: e.message, variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: async (docId: string) => {
      const res = await apiRequest("POST", `/api/portal/tax-documents/${docId}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/tax-documents"] });
      toast({ title: "Tax return approved" });
    },
    onError: (e: Error) => toast({ title: "Approval failed", description: e.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ docId, feedback }: { docId: string; feedback: string }) => {
      const res = await apiRequest("POST", `/api/portal/tax-documents/${docId}/reject`, { feedback });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/tax-documents"] });
      toast({ title: "Tax return rejected" });
      setRejectDocId(null);
      setRejectFeedback("");
    },
    onError: (e: Error) => toast({ title: "Rejection failed", description: e.message, variant: "destructive" }),
  });

  const handleUpload = () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return toast({ title: "No file selected", variant: "destructive" });
    if (!docType) return toast({ title: "Select a document type", variant: "destructive" });
    uploadMutation.mutate(file);
  };

  const reviewDocs = docs.filter(d => d.status === "ready_for_review");
  const otherDocs = docs.filter(d => d.status !== "ready_for_review");

  const groupedByYear = otherDocs.reduce((acc, doc) => {
    const yr = doc.taxYear;
    if (!acc[yr]) acc[yr] = [];
    acc[yr].push(doc);
    return acc;
  }, {} as Record<number, TaxDocument[]>);

  const sortedYears = Object.keys(groupedByYear).map(Number).sort((a, b) => b - a);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Tax Documents</h1>
        <p className="text-sm text-muted-foreground mt-1">Upload your tax documents and review prepared returns</p>
      </div>

      {reviewDocs.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Tax Returns Ready for Your Review ({reviewDocs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {reviewDocs.map(doc => (
              <div
                key={doc.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-card rounded-lg border"
                data-testid={`review-doc-${doc.id}`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileText className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate" data-testid={`text-doc-name-${doc.id}`}>
                      {doc.fileName || doc.documentType}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {doc.documentType} - Tax Year {doc.taxYear}
                      {doc.uploadedByRole && ` - Uploaded by ${uploaderLabel(doc.uploadedByRole)}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {doc.filePath && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/api/portal/tax-documents/${doc.id}/download`, "_blank")}
                      data-testid={`button-download-${doc.id}`}
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      Download
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => approveMutation.mutate(doc.id)}
                    disabled={approveMutation.isPending}
                    data-testid={`button-approve-${doc.id}`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => { setRejectDocId(doc.id); setRejectFeedback(""); }}
                    data-testid={`button-reject-${doc.id}`}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload Tax Document
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Upload your W-2s, 1099s, and other tax documents for your preparer to review.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="h-9 text-sm" data-testid="select-doc-type">
                <SelectValue placeholder="Document type..." />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={taxYear} onValueChange={setTaxYear}>
              <SelectTrigger className="h-9 text-sm" data-testid="select-tax-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={payerName}
              onChange={e => setPayerName(e.target.value)}
              placeholder="Payer name (optional)"
              className="h-9 text-sm"
              data-testid="input-payer-name"
            />
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv,.txt"
                className="text-sm file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 flex-1"
                data-testid="input-file-upload"
              />
              <Button size="sm" onClick={handleUpload} disabled={uploadMutation.isPending} className="h-9" data-testid="button-upload">
                <Upload className="w-3.5 h-3.5 mr-1" />
                Upload
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : docs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No tax documents yet"
          description="Upload your W-2s, 1099s, and other tax forms to get started with tax preparation."
        />
      ) : (
        <div className="space-y-4">
          {sortedYears.map(year => (
            <Card key={year}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Tax Year {year}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid={`table-docs-${year}`}>
                    <thead>
                      <tr className="border-b text-left bg-muted/30">
                        <th className="py-2.5 px-3 font-medium text-muted-foreground text-xs">Document</th>
                        <th className="py-2.5 px-3 font-medium text-muted-foreground text-xs">Type</th>
                        <th className="py-2.5 px-3 font-medium text-muted-foreground text-xs">Uploaded By</th>
                        <th className="py-2.5 px-3 font-medium text-muted-foreground text-xs">Status</th>
                        <th className="py-2.5 px-3 font-medium text-muted-foreground text-xs">Date</th>
                        <th className="py-2.5 px-3 font-medium text-muted-foreground text-xs">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedByYear[year].map(doc => (
                        <tr key={doc.id} className="border-b hover:bg-muted/20 transition-colors" data-testid={`row-doc-${doc.id}`}>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium truncate max-w-[200px]">{doc.fileName || "Manual Entry"}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge variant="outline" className="text-xs">{doc.documentType}</Badge>
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground text-xs">
                            {uploaderLabel(doc.uploadedByRole)}
                          </td>
                          <td className="py-2.5 px-3">{statusBadge(doc.status)}</td>
                          <td className="py-2.5 px-3 text-muted-foreground text-xs">
                            {doc.createdAt ? format(new Date(doc.createdAt), "MMM d, yyyy") : "—"}
                          </td>
                          <td className="py-2.5 px-3">
                            {doc.filePath && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => window.open(`/api/portal/tax-documents/${doc.id}/download`, "_blank")}
                                data-testid={`button-download-${doc.id}`}
                              >
                                <Download className="w-3 h-3 mr-1" />
                                Download
                              </Button>
                            )}
                            {doc.status === "rejected" && doc.rejectionFeedback && (
                              <span className="text-xs text-red-600 ml-2" data-testid={`text-feedback-${doc.id}`}>
                                Feedback: {doc.rejectionFeedback}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!rejectDocId} onOpenChange={(open) => { if (!open) setRejectDocId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Tax Return</DialogTitle>
            <DialogDescription>
              Please provide feedback so the preparer can make corrections.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectFeedback}
            onChange={e => setRejectFeedback(e.target.value)}
            placeholder="What needs to be corrected..."
            rows={4}
            data-testid="input-reject-feedback"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDocId(null)} data-testid="button-cancel-reject">Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => rejectDocId && rejectMutation.mutate({ docId: rejectDocId, feedback: rejectFeedback })}
              disabled={rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              Reject with Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
