import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TaxDocument, Client } from "@shared/schema";
import { insertTaxDocumentSchema } from "@shared/schema";
import {
  Plus, Search, FileText, Download, Brain, AlertTriangle, CheckCircle,
  Clock, Shield, Trash2, ChevronDown, ChevronUp, Upload, File, X, Paperclip
} from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";

const DOC_TYPES = [
  "W-2", "1099-NEC", "1099-INT", "1099-MISC", "1099-K", "1099-DIV",
  "1099-R", "1099-G", "1099-B", "Schedule C", "Schedule SE",
  "1098 Mortgage Interest", "Property Tax Statement", "Fuel Tax Records",
  "Vehicle Expense Log", "Other"
];

const TAX_YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

function confidenceBadge(level: string | null) {
  switch (level) {
    case "high": return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" data-testid="badge-confidence">High Confidence</Badge>;
    case "medium": return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" data-testid="badge-confidence">Medium Confidence</Badge>;
    case "low": return <Badge variant="destructive" data-testid="badge-confidence">Low Confidence</Badge>;
    default: return null;
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "analyzed": return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Analyzed</Badge>;
    case "pending": return <Badge variant="secondary">Pending</Badge>;
    case "review": return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Needs Review</Badge>;
    default: return <Badge variant="secondary">{status}</Badge>;
  }
}

function maskSSN(ssn: string | null) {
  if (!ssn) return "—";
  return `***-**-${ssn}`;
}

const taxDocFormSchema = insertTaxDocumentSchema.extend({
  taxYear: z.coerce.number().min(2000).max(2099),
});

type TaxDocFormValues = z.infer<typeof taxDocFormSchema>;

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileDropZone({ file, onFileSelect, onRemove }: {
  file: globalThis.File | null;
  onFileSelect: (f: globalThis.File) => void;
  onRemove: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFileSelect(dropped);
  }, [onFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  if (file) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30" data-testid="file-preview">
        <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 flex-shrink-0">
          <Paperclip className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" data-testid="text-file-name">{file.name}</p>
          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onRemove} data-testid="button-remove-file">
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => fileInputRef.current?.click()}
      data-testid="file-dropzone"
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFileSelect(f);
          e.target.value = "";
        }}
        data-testid="input-file-upload"
      />
      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
      <p className="text-sm font-medium">Drop file here or click to browse</p>
      <p className="text-xs text-muted-foreground mt-1">
        PDF, images, Word, Excel, CSV, or text — up to 10 MB
      </p>
    </div>
  );
}

function TaxDocForm({ onSuccess, clients }: { onSuccess: () => void; clients: Client[] }) {
  const { toast } = useToast();
  const [entryMode, setEntryMode] = useState<"upload" | "manual">("upload");
  const [uploadFile, setUploadFile] = useState<globalThis.File | null>(null);
  const [uploadClientId, setUploadClientId] = useState("");
  const [uploadTaxYear, setUploadTaxYear] = useState(String(new Date().getFullYear()));
  const [uploadDocType, setUploadDocType] = useState("");
  const [uploadPayerName, setUploadPayerName] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");

  const form = useForm<TaxDocFormValues>({
    resolver: zodResolver(taxDocFormSchema),
    defaultValues: {
      clientId: "",
      taxYear: new Date().getFullYear(),
      documentType: "",
      payerName: "",
      documentContent: "",
      notes: "",
      status: "pending",
    },
  });

  const manualMutation = useMutation({
    mutationFn: async (data: TaxDocFormValues) => {
      const res = await apiRequest("POST", "/api/admin/tax-documents", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tax-documents"] });
      toast({ title: "Tax document added", description: "You can now run AI analysis on this document." });
      form.reset();
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!uploadFile) throw new Error("No file selected");
      if (!uploadClientId) throw new Error("Please select a client");
      if (!uploadDocType) throw new Error("Please select a document type");

      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("clientId", uploadClientId);
      formData.append("taxYear", uploadTaxYear);
      formData.append("documentType", uploadDocType);
      if (uploadPayerName) formData.append("payerName", uploadPayerName);
      if (uploadNotes) formData.append("notes", uploadNotes);

      const res = await fetch("/api/admin/tax-documents/upload", {
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tax-documents"] });
      toast({ title: "Document uploaded", description: "File has been uploaded successfully. You can now run AI analysis." });
      setUploadFile(null);
      setUploadClientId("");
      setUploadTaxYear(String(new Date().getFullYear()));
      setUploadDocType("");
      setUploadPayerName("");
      setUploadNotes("");
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const sharedFields = (
    mode: "upload" | "manual",
    clientVal: string, setClient: (v: string) => void,
    yearVal: string, setYear: (v: string) => void,
    docTypeVal: string, setDocType: (v: string) => void,
    payerVal: string, setPayer: (v: string) => void,
    notesVal: string, setNotes: (v: string) => void,
  ) => (
    <>
      <div>
        <label className="text-sm font-medium">Client</label>
        <Select onValueChange={setClient} value={clientVal}>
          <SelectTrigger className="mt-1.5" data-testid={`select-tax-client-${mode}`}>
            <SelectValue placeholder="Select client" />
          </SelectTrigger>
          <SelectContent>
            {clients.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Tax Year</label>
          <Select onValueChange={setYear} value={yearVal}>
            <SelectTrigger className="mt-1.5" data-testid={`select-tax-year-${mode}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TAX_YEARS.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Document Type</label>
          <Select onValueChange={setDocType} value={docTypeVal}>
            <SelectTrigger className="mt-1.5" data-testid={`select-doc-type-${mode}`}>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Payer / Employer Name</label>
        <Input value={payerVal} onChange={(e) => setPayer(e.target.value)} placeholder="Enter payer or employer name" className="mt-1.5" data-testid={`input-payer-name-${mode}`} />
      </div>
      <div>
        <label className="text-sm font-medium">Internal Notes</label>
        <Textarea value={notesVal} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes about this document..." className="mt-1.5 min-h-[60px]" data-testid={`input-tax-notes-${mode}`} />
      </div>
    </>
  );

  return (
    <Tabs value={entryMode} onValueChange={(v) => setEntryMode(v as "upload" | "manual")} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="upload" data-testid="tab-upload">
          <Upload className="w-3.5 h-3.5 mr-1.5" />
          Upload File
        </TabsTrigger>
        <TabsTrigger value="manual" data-testid="tab-manual">
          <FileText className="w-3.5 h-3.5 mr-1.5" />
          Manual Entry
        </TabsTrigger>
      </TabsList>

      <TabsContent value="upload" className="space-y-4 mt-0">
        <FileDropZone
          file={uploadFile}
          onFileSelect={setUploadFile}
          onRemove={() => setUploadFile(null)}
        />
        {sharedFields("upload", uploadClientId, setUploadClientId, uploadTaxYear, setUploadTaxYear, uploadDocType, setUploadDocType, uploadPayerName, setUploadPayerName, uploadNotes, setUploadNotes)}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <Shield className="w-4 h-4 flex-shrink-0" />
          <span>Uploaded files are stored securely. SSNs are masked — only the last 4 digits are displayed. All access is audit-logged.</span>
        </div>
        <div className="flex justify-end pt-2">
          <Button
            type="button"
            disabled={uploadMutation.isPending || !uploadFile || !uploadClientId || !uploadDocType}
            onClick={() => uploadMutation.mutate()}
            data-testid="button-upload-tax-doc"
          >
            {uploadMutation.isPending ? "Uploading..." : "Upload Document"}
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="manual" className="mt-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => manualMutation.mutate(data))} className="space-y-4">
            <FormField control={form.control} name="clientId" render={({ field }) => (
              <FormItem>
                <FormLabel>Client</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-tax-client">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="taxYear" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax Year</FormLabel>
                  <Select onValueChange={(v) => field.onChange(parseInt(v))} value={String(field.value)}>
                    <FormControl>
                      <SelectTrigger data-testid="select-tax-year">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TAX_YEARS.map(y => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="documentType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-doc-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DOC_TYPES.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="payerName" render={({ field }) => (
              <FormItem>
                <FormLabel>Payer / Employer Name</FormLabel>
                <FormControl><Input {...field} value={field.value ?? ""} placeholder="Enter payer or employer name" data-testid="input-payer-name" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="documentContent" render={({ field }) => (
              <FormItem>
                <FormLabel>Document Details</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ""}
                    placeholder="Enter or paste the document information here. Include all amounts, box numbers, names, addresses, and identification numbers from the tax form. The AI will analyze this content to extract structured data.&#10;&#10;Example: Box 1 Wages: $45,000 / Box 2 Federal Tax Withheld: $6,750 / Box 17 State Tax: $2,250..."
                    className="min-h-[120px]"
                    data-testid="input-doc-content"
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">Enter all information from the tax document. Do not include full SSN — only last 4 digits if needed.</p>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Internal Notes</FormLabel>
                <FormControl><Textarea {...field} value={field.value ?? ""} placeholder="Any notes about this document..." className="min-h-[60px]" data-testid="input-tax-notes" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <Shield className="w-4 h-4 flex-shrink-0" />
              <span>Sensitive tax data is stored securely. SSNs are masked — only the last 4 digits are displayed. All access is audit-logged.</span>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={manualMutation.isPending} data-testid="button-create-tax-doc">
                {manualMutation.isPending ? "Adding..." : "Add Document"}
              </Button>
            </div>
          </form>
        </Form>
      </TabsContent>
    </Tabs>
  );
}

function ExtractedDataView({ doc }: { doc: TaxDocument }) {
  if (!doc.extractedData) return null;

  let data: any = {};
  try {
    data = JSON.parse(doc.extractedData);
  } catch {
    return <p className="text-sm text-muted-foreground">Could not parse extracted data.</p>;
  }

  let riskFlags: string[] = [];
  try {
    if (doc.riskFlags) riskFlags = JSON.parse(doc.riskFlags);
  } catch {
    if (doc.riskFlags) riskFlags = [doc.riskFlags];
  }

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground italic flex items-center gap-2">
        <Shield className="w-3 h-3" />
        This is an intake analysis, not tax advice.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Total Income</p>
          <p className="text-sm font-bold" data-testid="text-extracted-income">
            ${parseFloat(doc.totalIncome || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Federal Withholding</p>
          <p className="text-sm font-bold" data-testid="text-extracted-federal">
            ${parseFloat(doc.federalWithholding || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">State Withholding</p>
          <p className="text-sm font-bold" data-testid="text-extracted-state">
            ${parseFloat(doc.stateWithholding || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">SSN</p>
          <p className="text-sm font-medium" data-testid="text-ssn-masked">{maskSSN(doc.ssnLastFour)}</p>
        </div>
      </div>

      {data.extractedFields && Object.keys(data.extractedFields).length > 0 && (
        <div>
          <p className="text-xs font-medium mb-2">Extracted Fields</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(data.extractedFields).map(([key, value]) => (
              <div key={key} className="text-xs">
                <span className="text-muted-foreground">{key}: </span>
                <span className="font-medium">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.missingFields && data.missingFields.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-1 text-yellow-600 dark:text-yellow-400">Missing Fields</p>
          <div className="flex flex-wrap gap-1">
            {data.missingFields.map((f: string, i: number) => (
              <Badge key={i} variant="secondary" className="text-xs">{f}</Badge>
            ))}
          </div>
        </div>
      )}

      {riskFlags.length > 0 && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
          <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Risk Flags
          </p>
          <ul className="list-disc list-inside text-xs text-red-600 dark:text-red-400 space-y-0.5">
            {riskFlags.map((f: string, i: number) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {data.notes && (
        <div>
          <p className="text-xs font-medium mb-1">AI Notes</p>
          <p className="text-xs text-muted-foreground">{data.notes}</p>
        </div>
      )}

      <div className="flex items-center gap-2">
        {confidenceBadge(doc.confidenceLevel)}
        {doc.analyzedAt && (
          <span className="text-xs text-muted-foreground">
            Analyzed {format(new Date(doc.analyzedAt), "MMM d, yyyy 'at' h:mm a")}
          </span>
        )}
      </div>
    </div>
  );
}

export default function AdminTaxPrep() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: docs, isLoading } = useQuery<TaxDocument[]>({ queryKey: ["/api/admin/tax-documents"] });
  const { data: clients } = useQuery<Client[]>({ queryKey: ["/api/clients"] });

  const clientMap = new Map(clients?.map(c => [c.id, c]) ?? []);

  const filtered = (docs ?? []).filter(d => {
    const matchesSearch = search === "" ||
      d.documentType.toLowerCase().includes(search.toLowerCase()) ||
      (d.payerName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (clientMap.get(d.clientId)?.companyName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesYear = filterYear === "all" || d.taxYear === parseInt(filterYear);
    const matchesClient = filterClient === "all" || d.clientId === filterClient;
    return matchesSearch && matchesYear && matchesClient;
  });

  const analyzeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/tax-documents/${id}/analyze`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tax-documents"] });
      toast({ title: "Analysis complete", description: "AI has extracted and analyzed the document data." });
    },
    onError: (error: Error) => {
      toast({ title: "Analysis failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/tax-documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tax-documents"] });
      toast({ title: "Document deleted" });
    },
  });

  const handleExport = () => {
    const params = new URLSearchParams();
    if (filterClient !== "all") params.set("clientId", filterClient);
    if (filterYear !== "all") params.set("taxYear", filterYear);
    window.open(`/api/admin/tax-documents/export/csv?${params.toString()}`, "_blank");
  };

  const totalIncome = filtered.filter(d => d.status === "analyzed").reduce((s, d) => s + parseFloat(d.totalIncome || "0"), 0);
  const totalFederal = filtered.filter(d => d.status === "analyzed").reduce((s, d) => s + parseFloat(d.federalWithholding || "0"), 0);
  const analyzedCount = filtered.filter(d => d.status === "analyzed").length;
  const pendingCount = filtered.filter(d => d.status === "pending").length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="page-tax-prep">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tax Preparation</h1>
          <p className="text-muted-foreground text-sm mt-1">Collect and analyze tax documents year-round</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0} data-testid="button-export-csv">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-tax-doc">
                <Plus className="w-4 h-4 mr-2" />
                Add Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Tax Document</DialogTitle>
              </DialogHeader>
              <TaxDocForm onSuccess={() => setDialogOpen(false)} clients={clients ?? []} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Total Documents</p>
                <p className="text-xl font-bold" data-testid="text-total-docs">{filtered.length}</p>
              </div>
              <FileText className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Analyzed</p>
                <p className="text-xl font-bold text-chart-2" data-testid="text-analyzed-count">{analyzedCount}</p>
              </div>
              <CheckCircle className="w-5 h-5 text-chart-2" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Pending Analysis</p>
                <p className="text-xl font-bold text-yellow-600" data-testid="text-pending-count">{pendingCount}</p>
              </div>
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Total Income (Analyzed)</p>
                <p className="text-xl font-bold" data-testid="text-total-income">${totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              </div>
              <FileText className="w-5 h-5 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-tax"
          />
        </div>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-[120px]" data-testid="select-filter-year">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {TAX_YEARS.map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-[180px]" data-testid="select-filter-client">
            <SelectValue placeholder="Client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {(clients ?? []).map(c => (
              <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No tax documents found</h3>
            <p className="text-sm text-muted-foreground">
              {search || filterYear !== "all" || filterClient !== "all"
                ? "Try adjusting your filters"
                : "Start adding tax documents to prepare for tax season"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(doc => {
            const client = clientMap.get(doc.clientId);
            let riskCount = 0;
            try {
              if (doc.riskFlags) {
                const flags = JSON.parse(doc.riskFlags);
                riskCount = Array.isArray(flags) ? flags.length : 1;
              }
            } catch {}
            return (
              <Card key={doc.id} data-testid={`card-tax-doc-${doc.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1 cursor-pointer" onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}>
                      <div className="flex items-center justify-center w-10 h-10 rounded-md bg-muted flex-shrink-0">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold">{doc.documentType}</p>
                          {statusBadge(doc.status)}
                          {doc.fileName && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Paperclip className="w-3 h-3" />File
                            </Badge>
                          )}
                          {riskCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />{riskCount} risk{riskCount > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span>{client?.companyName ?? "Unknown Client"}</span>
                          <span>·</span>
                          <span>TY {doc.taxYear}</span>
                          {doc.payerName && (
                            <>
                              <span>·</span>
                              <span>{doc.payerName}</span>
                            </>
                          )}
                        </div>
                        {doc.totalIncome && parseFloat(doc.totalIncome) > 0 && (
                          <p className="text-xs mt-1">
                            <span className="text-muted-foreground">Income: </span>
                            <span className="font-medium">${parseFloat(doc.totalIncome).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                            {doc.federalWithholding && parseFloat(doc.federalWithholding) > 0 && (
                              <>
                                <span className="text-muted-foreground ml-2">Fed W/H: </span>
                                <span className="font-medium">${parseFloat(doc.federalWithholding).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                              </>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {doc.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => analyzeMutation.mutate(doc.id)}
                          disabled={analyzeMutation.isPending}
                          data-testid={`button-analyze-${doc.id}`}
                        >
                          <Brain className="w-3 h-3 mr-1" />
                          {analyzeMutation.isPending ? "Analyzing..." : "Analyze"}
                        </Button>
                      )}
                      {doc.status === "analyzed" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => analyzeMutation.mutate(doc.id)}
                          disabled={analyzeMutation.isPending}
                          data-testid={`button-reanalyze-${doc.id}`}
                        >
                          <Brain className="w-3 h-3 mr-1" />
                          Re-analyze
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate(doc.id)}
                        data-testid={`button-delete-tax-${doc.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                        data-testid={`button-expand-tax-${doc.id}`}
                      >
                        {expandedId === doc.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  {expandedId === doc.id && (
                    <div className="mt-4 pt-4 border-t">
                      {doc.fileName && (
                        <div className="mb-4 flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 flex-shrink-0">
                            <Paperclip className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" data-testid="text-attached-file">{doc.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.fileType}{doc.fileSize ? ` · ${formatFileSize(doc.fileSize)}` : ""}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`/api/admin/tax-documents/${doc.id}/download`, "_blank")}
                            data-testid={`button-download-file-${doc.id}`}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download
                          </Button>
                        </div>
                      )}
                      {doc.documentContent && (
                        <div className="mb-4">
                          <p className="text-xs font-medium mb-1">Document Content</p>
                          <pre className="text-xs bg-muted/50 p-3 rounded-lg whitespace-pre-wrap max-h-40 overflow-y-auto">{doc.documentContent}</pre>
                        </div>
                      )}
                      {doc.notes && (
                        <div className="mb-4">
                          <p className="text-xs font-medium mb-1">Notes</p>
                          <p className="text-xs text-muted-foreground">{doc.notes}</p>
                        </div>
                      )}
                      {doc.status === "analyzed" && <ExtractedDataView doc={doc} />}
                      {doc.status === "pending" && (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                          <Clock className="w-8 h-8 text-muted-foreground/40 mb-2" />
                          <p className="text-sm text-muted-foreground">Click "Analyze" to run AI intake analysis on this document.</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t text-xs text-muted-foreground">
                        <span>Added {format(new Date(doc.createdAt), "MMM d, yyyy")}</span>
                        {doc.updatedAt && doc.updatedAt !== doc.createdAt && (
                          <span>· Updated {format(new Date(doc.updatedAt), "MMM d, yyyy")}</span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {filtered.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium">Tax Season Summary</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Total Income</p>
                <p className="font-bold">${totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Federal Withholding</p>
                <p className="font-bold">${totalFederal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Documents Analyzed</p>
                <p className="font-bold">{analyzedCount} of {filtered.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ready for Export</p>
                <p className="font-bold">{analyzedCount > 0 ? "Yes" : "No"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
