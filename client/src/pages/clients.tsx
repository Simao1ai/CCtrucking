import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertClientSchema, type Client, type InsertClient, type CustomFieldDefinition, type CustomFieldValue } from "@shared/schema";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { format } from "date-fns";
import { Plus, Search, Building2, Phone, Mail, MapPin, Hash, Calendar, Users, UserCheck, UserPlus, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const PIPELINE_STAGES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "quoted", label: "Quoted" },
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "negotiating", label: "Negotiating" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY"
];

function ClientForm({ onSuccess, existingClient }: { onSuccess: () => void; existingClient?: Client }) {
  const { toast } = useToast();
  const [customFieldFormValues, setCustomFieldFormValues] = useState<Record<string, string>>({});

  const { data: customFieldDefs = [] } = useQuery<CustomFieldDefinition[]>({
    queryKey: ["/api/admin/custom-fields", "client"],
    queryFn: async () => {
      const res = await fetch("/api/admin/custom-fields?entityType=client");
      return res.json();
    },
  });

  const { data: existingCustomFieldValues = [] } = useQuery<CustomFieldValue[]>({
    queryKey: ["/api/custom-fields", "client", existingClient?.id],
    enabled: !!existingClient?.id,
  });

  useEffect(() => {
    if (existingCustomFieldValues.length > 0) {
      const vals: Record<string, string> = {};
      existingCustomFieldValues.forEach(v => {
        vals[v.fieldDefinitionId] = v.value ?? "";
      });
      setCustomFieldFormValues(vals);
    }
  }, [existingCustomFieldValues]);

  const activeNonIndustryFields = customFieldDefs.filter(d => d.isActive && !d.industryPackSource);

  const form = useForm<InsertClient>({
    resolver: zodResolver(insertClientSchema),
    defaultValues: {
      companyName: existingClient?.companyName ?? "",
      contactName: existingClient?.contactName ?? "",
      email: existingClient?.email ?? "",
      phone: existingClient?.phone ?? "",
      dotNumber: existingClient?.dotNumber ?? "",
      mcNumber: existingClient?.mcNumber ?? "",
      einNumber: existingClient?.einNumber ?? "",
      address: existingClient?.address ?? "",
      city: existingClient?.city ?? "",
      state: existingClient?.state ?? "",
      zipCode: existingClient?.zipCode ?? "",
      status: existingClient?.status ?? "active",
      notes: existingClient?.notes ?? "",
      pipelineStage: existingClient?.pipelineStage ?? "new",
      nextActionDate: existingClient?.nextActionDate ? new Date(existingClient.nextActionDate) : null,
      nextActionNote: existingClient?.nextActionNote ?? "",
    },
  });

  const watchedStatus = form.watch("status");

  const mutation = useMutation({
    mutationFn: async (data: InsertClient) => {
      let clientId = existingClient?.id;
      if (existingClient) {
        await apiRequest("PATCH", `/api/clients/${existingClient.id}`, data);
      } else {
        const res = await apiRequest("POST", "/api/clients", data);
        const created = await res.json();
        clientId = created.id;
      }
      if (clientId && activeNonIndustryFields.length > 0) {
        const fields = activeNonIndustryFields.map(def => ({
          fieldDefinitionId: def.id,
          value: customFieldFormValues[def.id] ?? "",
        }));
        await apiRequest("POST", `/api/custom-fields/client/${clientId}`, { fields });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: existingClient ? "Client updated" : "Client created", description: "The client record has been saved." });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="companyName" render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Company Name</FormLabel>
              <FormControl><Input {...field} placeholder="Company name" data-testid="input-company-name" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="contactName" render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Name</FormLabel>
              <FormControl><Input {...field} placeholder="Contact person" data-testid="input-contact-name" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl><Input {...field} type="email" placeholder="email@example.com" data-testid="input-email" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl><Input {...field} placeholder="(555) 555-0000" data-testid="input-phone" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="dotNumber" render={({ field }) => (
            <FormItem>
              <FormLabel>DOT Number</FormLabel>
              <FormControl><Input {...field} value={field.value ?? ""} placeholder="DOT-1234567" data-testid="input-dot" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="mcNumber" render={({ field }) => (
            <FormItem>
              <FormLabel>MC Number</FormLabel>
              <FormControl><Input {...field} value={field.value ?? ""} placeholder="MC-123456" data-testid="input-mc" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="einNumber" render={({ field }) => (
            <FormItem>
              <FormLabel>EIN Number</FormLabel>
              <FormControl><Input {...field} value={field.value ?? ""} placeholder="12-3456789" data-testid="input-ein" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="address" render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Address</FormLabel>
              <FormControl><Input {...field} value={field.value ?? ""} placeholder="Street address" data-testid="input-address" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="city" render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl><Input {...field} value={field.value ?? ""} placeholder="City" data-testid="input-city" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="state" render={({ field }) => (
            <FormItem>
              <FormLabel>State</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger data-testid="select-state">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {US_STATES.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="zipCode" render={({ field }) => (
            <FormItem>
              <FormLabel>ZIP Code</FormLabel>
              <FormControl><Input {...field} value={field.value ?? ""} placeholder="12345" data-testid="input-zip" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          {watchedStatus === "prospect" && (
            <>
              <FormField control={form.control} name="pipelineStage" render={({ field }) => (
                <FormItem>
                  <FormLabel>Pipeline Stage</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? "new"}>
                    <FormControl>
                      <SelectTrigger data-testid="select-pipeline-stage">
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PIPELINE_STAGES.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="nextActionDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Next Action Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      data-testid="input-next-action-date"
                      value={field.value ? format(new Date(field.value), "yyyy-MM-dd") : ""}
                      onChange={(e) => {
                        field.onChange(e.target.value ? new Date(e.target.value + "T00:00:00") : null);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="nextActionNote" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Next Action Note</FormLabel>
                  <FormControl><Textarea {...field} value={field.value ?? ""} placeholder="Describe the next action..." data-testid="input-next-action-note" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </>
          )}
          <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Notes</FormLabel>
              <FormControl><Textarea {...field} value={field.value ?? ""} placeholder="Additional notes..." data-testid="input-notes" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          {activeNonIndustryFields.length > 0 && (
            <>
              <div className="col-span-2">
                <p className="text-sm font-semibold text-muted-foreground mt-2">Custom Fields</p>
              </div>
              {activeNonIndustryFields.map(def => (
                <div key={def.id} className="space-y-1.5">
                  <label className="text-sm font-medium">{def.label}{def.required && <span className="text-destructive ml-0.5">*</span>}</label>
                  {def.fieldType === "select" && def.options ? (
                    <Select
                      value={customFieldFormValues[def.id] ?? ""}
                      onValueChange={(val) => setCustomFieldFormValues(prev => ({ ...prev, [def.id]: val }))}
                    >
                      <SelectTrigger data-testid={`input-custom-${def.name}`}>
                        <SelectValue placeholder={def.placeholder || `Select ${def.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {def.options.split(",").map(opt => (
                          <SelectItem key={opt.trim()} value={opt.trim()}>{opt.trim()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : def.fieldType === "textarea" ? (
                    <Textarea
                      value={customFieldFormValues[def.id] ?? ""}
                      onChange={(e) => setCustomFieldFormValues(prev => ({ ...prev, [def.id]: e.target.value }))}
                      placeholder={def.placeholder ?? ""}
                      data-testid={`input-custom-${def.name}`}
                    />
                  ) : (
                    <Input
                      type={def.fieldType === "number" ? "number" : "text"}
                      value={customFieldFormValues[def.id] ?? ""}
                      onChange={(e) => setCustomFieldFormValues(prev => ({ ...prev, [def.id]: e.target.value }))}
                      placeholder={def.placeholder ?? ""}
                      data-testid={`input-custom-${def.name}`}
                    />
                  )}
                </div>
              ))}
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={mutation.isPending} data-testid="button-save-client">
            {mutation.isPending ? "Saving..." : existingClient ? "Update Client" : "Add Client"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(current.trim());
        current = "";
      } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        row.push(current.trim());
        current = "";
        if (row.some(cell => cell !== "")) rows.push(row);
        row = [];
        if (ch === '\r') i++;
      } else {
        current += ch;
      }
    }
  }
  row.push(current.trim());
  if (row.some(cell => cell !== "")) rows.push(row);
  return rows;
}

const REQUIRED_FIELDS = ["companyName", "contactName", "email", "phone"];
const ALL_FIELDS = ["companyName", "contactName", "email", "phone", "address", "city", "state", "zipCode", "dotNumber", "mcNumber", "einNumber", "status", "notes"];

type ImportStep = "upload" | "preview" | "importing" | "results";
type ImportResult = {
  totalRows: number;
  successCount: number;
  errorCount: number;
  results: { row: number; status: string; error?: string; clientId?: number }[];
};

function CSVImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState<ImportStep>("upload");
  const [dataRows, setDataRows] = useState<Record<string, string>[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const resetState = () => {
    setStep("upload");
    setDataRows([]);
    setImportResult(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length < 2) {
        toast({ title: "Invalid CSV", description: "CSV must have a header row and at least one data row.", variant: "destructive" });
        return;
      }
      const hdrs = parsed[0];

      const autoMap: Record<number, string> = {};
      hdrs.forEach((h, i) => {
        const normalized = h.toLowerCase().replace(/[^a-z]/g, "");
        const match = ALL_FIELDS.find(f => f.toLowerCase() === normalized);
        if (match) autoMap[i] = match;
      });

      const rows = parsed.slice(1).map(row => {
        const obj: Record<string, string> = {};
        hdrs.forEach((_, i) => {
          const field = autoMap[i];
          if (field) obj[field] = row[i] ?? "";
        });
        return obj;
      });
      setDataRows(rows);
      setStep("preview");
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.name.endsWith('.csv')) {
      toast({ title: "Invalid file", description: "Please drop a .csv file.", variant: "destructive" });
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    handleFileChange({ target: input } as unknown as React.ChangeEvent<HTMLInputElement>);
  };

  const validationErrors = (row: Record<string, string>) => {
    return REQUIRED_FIELDS.filter(f => !row[f] || row[f].trim() === "");
  };

  const totalValid = dataRows.filter(r => validationErrors(r).length === 0).length;

  const importMutation = useMutation({
    mutationFn: async () => {
      setStep("importing");
      const res = await apiRequest("POST", "/api/admin/clients/import", { rows: dataRows });
      return await res.json() as ImportResult;
    },
    onSuccess: (data) => {
      setImportResult(data);
      setStep("results");
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
    onError: (error: Error) => {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
      setStep("preview");
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetState(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Import Clients from CSV
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-md p-8 text-center space-y-3 cursor-pointer"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              data-testid="dropzone-csv"
            >
              <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Drag and drop a CSV file here, or click to browse</p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-file-input"
                data-testid="input-csv-file"
              />
              <Button variant="outline" onClick={() => document.getElementById("csv-file-input")?.click()} data-testid="button-browse-csv">
                Browse Files
              </Button>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Required columns: companyName, contactName, email, phone</p>
              <p>Optional columns: address, city, state, zipCode, dotNumber, mcNumber, einNumber, status, notes</p>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm text-muted-foreground" data-testid="text-preview-count">
                {dataRows.length} rows found, {totalValid} valid
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetState} data-testid="button-back-upload">
                  Back
                </Button>
                <Button
                  onClick={() => importMutation.mutate()}
                  disabled={totalValid === 0}
                  data-testid="button-start-import"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import {totalValid} Clients
                </Button>
              </div>
            </div>

            <div className="border rounded-md overflow-auto max-h-72">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    {REQUIRED_FIELDS.map(f => (
                      <TableHead key={f} className="text-xs">{f}*</TableHead>
                    ))}
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataRows.slice(0, 5).map((row, i) => {
                    const errors = validationErrors(row);
                    return (
                      <TableRow key={i} data-testid={`row-preview-${i}`}>
                        <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                        {REQUIRED_FIELDS.map(f => (
                          <TableCell
                            key={f}
                            className={`text-xs ${errors.includes(f) ? "text-destructive bg-destructive/10" : ""}`}
                            data-testid={`cell-preview-${i}-${f}`}
                          >
                            {row[f] || <span className="italic text-destructive">missing</span>}
                          </TableCell>
                        ))}
                        <TableCell>
                          {errors.length === 0 ? (
                            <Badge variant="secondary" className="text-xs" data-testid={`badge-valid-${i}`}>
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Valid
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs" data-testid={`badge-invalid-${i}`}>
                              <AlertCircle className="w-3 h-3 mr-1" />
                              {errors.length} missing
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {dataRows.length > 5 && (
              <p className="text-xs text-muted-foreground">Showing first 5 of {dataRows.length} rows</p>
            )}

            <div className="text-sm" data-testid="text-import-summary">
              Ready to import {totalValid} clients
              {dataRows.length - totalValid > 0 && (
                <span className="text-destructive ml-1">({dataRows.length - totalValid} rows with errors will be skipped)</span>
              )}
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4" data-testid="importing-progress">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-foreground" />
            <p className="text-sm text-muted-foreground">Importing clients...</p>
          </div>
        )}

        {step === "results" && importResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold" data-testid="text-total-rows">{importResult.totalRows}</p>
                  <p className="text-xs text-muted-foreground">Total Rows</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-success-count">{importResult.successCount}</p>
                  <p className="text-xs text-muted-foreground">Imported</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-destructive" data-testid="text-error-count">{importResult.errorCount}</p>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </CardContent>
              </Card>
            </div>

            {importResult.results.filter(r => r.status === "error").length > 0 && (
              <div className="border rounded-md overflow-auto max-h-48">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Row</TableHead>
                      <TableHead className="text-xs">Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importResult.results.filter(r => r.status === "error").map((r, i) => (
                      <TableRow key={i} data-testid={`row-error-${i}`}>
                        <TableCell className="text-xs">{r.row}</TableCell>
                        <TableCell className="text-xs text-destructive">{r.error}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => { resetState(); onOpenChange(false); }} data-testid="button-close-import">
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Clients() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>();
  const [tab, setTab] = useState("all");
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const { data: clients, isLoading } = useQuery<Client[]>({ queryKey: ["/api/clients"] });

  const statusCounts = {
    all: clients?.length ?? 0,
    active: clients?.filter(c => c.status === "active").length ?? 0,
    prospect: clients?.filter(c => c.status === "prospect").length ?? 0,
    inactive: clients?.filter(c => c.status === "inactive").length ?? 0,
  };

  const filtered = clients?.filter(c => {
    const matchesSearch = c.companyName.toLowerCase().includes(search.toLowerCase()) ||
      c.contactName.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchesTab = tab === "all" || c.status === tab;
    return matchesSearch && matchesTab;
  }) ?? [];

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingClient(undefined);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="page-clients">
      <PageHeader
        title="Clients"
        description="Manage your trucking company accounts"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => window.open("/api/admin/clients/export/csv", "_blank")} data-testid="button-export-csv">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => setImportDialogOpen(true)} data-testid="button-import-csv">
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleClose(); else setDialogOpen(true); }}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingClient(undefined); setDialogOpen(true); }} data-testid="button-add-client">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Client
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingClient ? "Edit Client" : "Add New Client"}</DialogTitle>
                </DialogHeader>
                <ClientForm onSuccess={handleClose} existingClient={editingClient} />
              </DialogContent>
            </Dialog>
            <CSVImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Clients"
          value={statusCounts.all}
          icon={Users}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-500/10"
        />
        <StatCard
          title="Active"
          value={statusCounts.active}
          icon={UserCheck}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-500/10"
        />
        <StatCard
          title="Prospects"
          value={statusCounts.prospect}
          icon={UserPlus}
          iconColor="text-purple-600 dark:text-purple-400"
          iconBg="bg-purple-500/10"
        />
        <StatCard
          title="Inactive"
          value={statusCounts.inactive}
          icon={Building2}
          iconColor="text-gray-500 dark:text-gray-400"
          iconBg="bg-gray-500/10"
        />
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-clients"
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-clients-all">All ({statusCounts.all})</TabsTrigger>
          <TabsTrigger value="active" data-testid="tab-clients-active">Active ({statusCounts.active})</TabsTrigger>
          <TabsTrigger value="prospect" data-testid="tab-clients-prospect">Prospects ({statusCounts.prospect})</TabsTrigger>
          <TabsTrigger value="inactive" data-testid="tab-clients-inactive">Inactive ({statusCounts.inactive})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <Card key={i}><CardContent className="p-6"><div className="space-y-3"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-2/3" /></div></CardContent></Card>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={Building2}
                  title={search ? "No matching clients" : "No clients yet"}
                  description={search ? "Try adjusting your search" : "Add your first trucking client to get started"}
                  action={
                    !search ? (
                      <Button onClick={() => { setEditingClient(undefined); setDialogOpen(true); }} data-testid="button-empty-add-client">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Client
                      </Button>
                    ) : undefined
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map(client => (
                <Card
                  key={client.id}
                  className="hover-elevate active-elevate-2 cursor-pointer"
                  onClick={() => navigate(`/admin/clients/${client.id}`)}
                  data-testid={`card-client-${client.id}`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{client.companyName}</h3>
                        <p className="text-xs text-muted-foreground truncate">{client.contactName}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <StatusBadge status={client.status} data-testid={`badge-status-${client.id}`} />
                        {client.status === "prospect" && client.pipelineStage && (
                          <StatusBadge status={client.pipelineStage} data-testid={`badge-pipeline-${client.id}`} />
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                      {client.city && client.state && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{client.city}, {client.state}</span>
                        </div>
                      )}
                      {client.dotNumber && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Hash className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>DOT: {client.dotNumber}</span>
                        </div>
                      )}
                      {client.status === "prospect" && client.nextActionDate && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground" data-testid={`text-next-action-date-${client.id}`}>
                          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>Next: {format(new Date(client.nextActionDate), "MMM d, yyyy")}</span>
                        </div>
                      )}
                      {client.status === "prospect" && client.nextActionNote && (
                        <p className="text-xs text-muted-foreground truncate" data-testid={`text-next-action-note-${client.id}`}>
                          {client.nextActionNote}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
