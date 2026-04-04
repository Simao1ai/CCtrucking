import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import type { Client } from "@shared/schema";
import {
  Plus, Search, UserCheck, AlertTriangle, XCircle, CheckCircle, Clock,
  Upload, Trash2, ArrowLeft, FileText, Shield, Users, Eye, ChevronRight,
} from "lucide-react";
import { format } from "date-fns";

const CDL_CLASSES = ["Class A", "Class B", "Class C"];
const DRIVER_STATUSES = ["active", "inactive", "terminated"];

function ComplianceBadge({ status }: { status: string }) {
  if (status === "compliant") return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" data-testid="badge-compliant"><CheckCircle className="w-3 h-3 mr-1" />Compliant</Badge>;
  if (status === "expiring_soon") return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" data-testid="badge-expiring"><Clock className="w-3 h-3 mr-1" />Expiring Soon</Badge>;
  return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" data-testid="badge-non-compliant"><XCircle className="w-3 h-3 mr-1" />Non-Compliant</Badge>;
}

function DocStatusIcon({ status }: { status: string }) {
  if (status === "valid") return <CheckCircle className="w-5 h-5 text-emerald-500" />;
  if (status === "expiring_soon") return <Clock className="w-5 h-5 text-amber-500" />;
  if (status === "expired") return <XCircle className="w-5 h-5 text-red-500" />;
  return <AlertTriangle className="w-5 h-5 text-gray-400" />;
}

export default function AdminDrivers() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadDocType, setUploadDocType] = useState("");
  const [addForm, setAddForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", cdlNumber: "", cdlState: "",
    cdlClass: "", cdlExpiration: "", dateOfBirth: "", dateOfHire: "", clientId: "", notes: "",
  });
  const [uploadForm, setUploadForm] = useState({ fileName: "", fileData: "", expirationDate: "", issuedDate: "", notes: "" });

  const { data: driversData, isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/drivers"] });
  const { data: clients } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: selectedDriver, isLoading: loadingDetail } = useQuery<any>({
    queryKey: ["/api/admin/drivers", selectedDriverId],
    enabled: !!selectedDriverId,
  });
  const { data: complianceSummary } = useQuery<any>({ queryKey: ["/api/admin/drivers/compliance/summary"] });
  const { data: docTypes } = useQuery<any[]>({ queryKey: ["/api/admin/dqf-document-types"] });

  const addMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/drivers", addForm);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers/compliance/summary"] });
      setShowAddDialog(false);
      setAddForm({ firstName: "", lastName: "", email: "", phone: "", cdlNumber: "", cdlState: "", cdlClass: "", cdlExpiration: "", dateOfBirth: "", dateOfHire: "", clientId: "", notes: "" });
      toast({ title: "Driver added successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/drivers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      setSelectedDriverId(null);
      toast({ title: "Driver removed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const uploadDocMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/admin/drivers/${selectedDriverId}/documents`, {
        documentType: uploadDocType,
        ...uploadForm,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers", selectedDriverId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      setShowUploadDialog(false);
      setUploadForm({ fileName: "", fileData: "", expirationDate: "", issuedDate: "", notes: "" });
      toast({ title: "Document uploaded" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      await apiRequest("DELETE", `/api/admin/drivers/${selectedDriverId}/documents/${docId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers", selectedDriverId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/drivers"] });
      toast({ title: "Document removed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUploadForm(f => ({ ...f, fileName: file.name, fileData: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const filteredDrivers = (driversData || []).filter(d => {
    const q = search.toLowerCase();
    return !q || `${d.firstName} ${d.lastName}`.toLowerCase().includes(q) ||
      d.client?.companyName?.toLowerCase().includes(q) ||
      d.cdlNumber?.toLowerCase().includes(q);
  });

  if (selectedDriverId && selectedDriver) {
    return (
      <div className="p-6 space-y-6" data-testid="page-driver-detail">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedDriverId(null)} data-testid="button-back-drivers">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-driver-name">{selectedDriver.firstName} {selectedDriver.lastName}</h1>
            <p className="text-sm text-muted-foreground">{selectedDriver.client?.companyName} | CDL: {selectedDriver.cdlNumber || "N/A"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm space-y-2">
                <div><span className="text-muted-foreground">Email:</span> {selectedDriver.email || "—"}</div>
                <div><span className="text-muted-foreground">Phone:</span> {selectedDriver.phone || "—"}</div>
                <div><span className="text-muted-foreground">CDL Class:</span> {selectedDriver.cdlClass || "—"}</div>
                <div><span className="text-muted-foreground">CDL State:</span> {selectedDriver.cdlState || "—"}</div>
                <div><span className="text-muted-foreground">CDL Exp:</span> {selectedDriver.cdlExpiration ? format(new Date(selectedDriver.cdlExpiration), "MM/dd/yyyy") : "—"}</div>
                <div><span className="text-muted-foreground">Hired:</span> {selectedDriver.dateOfHire ? format(new Date(selectedDriver.dateOfHire), "MM/dd/yyyy") : "—"}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline">{selectedDriver.status}</Badge></div>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4" /> DQF Compliance Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const docs = selectedDriver.documents || [];
                const valid = docs.filter((d: any) => d.status === "valid").length;
                const expiring = docs.filter((d: any) => d.status === "expiring_soon").length;
                const expired = docs.filter((d: any) => d.status === "expired").length;
                const missing = docs.filter((d: any) => d.status === "missing").length;
                const pct = Math.round((valid / docs.length) * 100);
                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div className="bg-emerald-500 h-3 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-medium">{pct}%</span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-emerald-600">{valid} complete</span>
                      <span className="text-amber-600">{expiring} expiring</span>
                      <span className="text-red-600">{expired} expired</span>
                      <span className="text-gray-500">{missing} missing</span>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" /> Driver Qualification File — Required Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(selectedDriver.documents || []).map((item: any, idx: number) => (
                <div key={item.key} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors" data-testid={`dqf-item-${item.key}`}>
                  <DocStatusIcon status={item.status} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{item.label}</div>
                    {item.document ? (
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{item.document.fileName}</span>
                        {item.daysUntilExpiry !== null && (
                          <span className={item.daysUntilExpiry < 0 ? "text-red-500" : item.daysUntilExpiry <= 30 ? "text-amber-500" : "text-emerald-500"}>
                            {item.daysUntilExpiry < 0 ? `Expired ${Math.abs(item.daysUntilExpiry)} days ago` : `Expires in ${item.daysUntilExpiry} days`}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">Not uploaded</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => { setUploadDocType(item.key); setShowUploadDialog(true); }} data-testid={`button-upload-${item.key}`}>
                      <Upload className="w-3 h-3 mr-1" /> {item.document ? "Replace" : "Upload"}
                    </Button>
                    {item.document && (
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteDocMutation.mutate(item.document.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Document Type</Label>
                <Input value={docTypes?.find(d => d.key === uploadDocType)?.label || uploadDocType} disabled />
              </div>
              <div>
                <Label>File</Label>
                <Input type="file" onChange={handleFileSelect} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" data-testid="input-doc-file" />
                {uploadForm.fileName && <p className="text-xs text-muted-foreground mt-1">{uploadForm.fileName}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Issued Date</Label>
                  <Input type="date" value={uploadForm.issuedDate} onChange={e => setUploadForm(f => ({ ...f, issuedDate: e.target.value }))} data-testid="input-issued-date" />
                </div>
                <div>
                  <Label>Expiration Date</Label>
                  <Input type="date" value={uploadForm.expirationDate} onChange={e => setUploadForm(f => ({ ...f, expirationDate: e.target.value }))} data-testid="input-expiration-date" />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={uploadForm.notes} onChange={e => setUploadForm(f => ({ ...f, notes: e.target.value }))} data-testid="input-doc-notes" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>Cancel</Button>
              <Button onClick={() => uploadDocMutation.mutate()} disabled={!uploadForm.fileName || uploadDocMutation.isPending} data-testid="button-save-document">
                <Upload className="w-4 h-4 mr-1" /> Save Document
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-admin-drivers">
      <PageHeader
        title="Drivers"
        description="Manage driver qualification files and compliance for all carriers"
        icon={<Users className="w-5 h-5" />}
      />

      <Tabs defaultValue="drivers">
        <TabsList>
          <TabsTrigger value="drivers" data-testid="tab-drivers">All Drivers</TabsTrigger>
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">Compliance Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="drivers" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search drivers by name, carrier, CDL..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-drivers" />
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-driver"><Plus className="w-4 h-4 mr-1" /> Add Driver</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add New Driver</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  <div>
                    <Label>Carrier / Client *</Label>
                    <Select value={addForm.clientId} onValueChange={v => setAddForm(f => ({ ...f, clientId: v }))}>
                      <SelectTrigger data-testid="select-driver-client"><SelectValue placeholder="Select carrier..." /></SelectTrigger>
                      <SelectContent>
                        {(clients || []).map(c => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>First Name *</Label><Input value={addForm.firstName} onChange={e => setAddForm(f => ({ ...f, firstName: e.target.value }))} data-testid="input-driver-first-name" /></div>
                    <div><Label>Last Name *</Label><Input value={addForm.lastName} onChange={e => setAddForm(f => ({ ...f, lastName: e.target.value }))} data-testid="input-driver-last-name" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Email</Label><Input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} data-testid="input-driver-email" /></div>
                    <div><Label>Phone</Label><Input value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} data-testid="input-driver-phone" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>CDL Number</Label><Input value={addForm.cdlNumber} onChange={e => setAddForm(f => ({ ...f, cdlNumber: e.target.value }))} data-testid="input-driver-cdl" /></div>
                    <div>
                      <Label>CDL Class</Label>
                      <Select value={addForm.cdlClass} onValueChange={v => setAddForm(f => ({ ...f, cdlClass: v }))}>
                        <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                        <SelectContent>{CDL_CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>CDL State</Label><Input value={addForm.cdlState} onChange={e => setAddForm(f => ({ ...f, cdlState: e.target.value }))} maxLength={2} placeholder="TX" data-testid="input-driver-cdl-state" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>CDL Expiration</Label><Input type="date" value={addForm.cdlExpiration} onChange={e => setAddForm(f => ({ ...f, cdlExpiration: e.target.value }))} /></div>
                    <div><Label>Date of Hire</Label><Input type="date" value={addForm.dateOfHire} onChange={e => setAddForm(f => ({ ...f, dateOfHire: e.target.value }))} /></div>
                  </div>
                  <div><Label>Notes</Label><Textarea value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                  <Button onClick={() => addMutation.mutate()} disabled={!addForm.firstName || !addForm.lastName || !addForm.clientId || addMutation.isPending} data-testid="button-save-driver">
                    Add Driver
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
          ) : filteredDrivers.length === 0 ? (
            <EmptyState icon={Users} title="No drivers found" description="Add your first driver to start managing qualification files." />
          ) : (
            <div className="space-y-2">
              {filteredDrivers.map(driver => (
                <Card key={driver.id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setSelectedDriverId(driver.id)} data-testid={`card-driver-${driver.id}`}>
                  <CardContent className="py-3 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      {driver.firstName[0]}{driver.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{driver.firstName} {driver.lastName}</div>
                      <div className="text-xs text-muted-foreground">
                        {driver.client?.companyName} | CDL: {driver.cdlNumber || "N/A"} | {driver.cdlClass || "N/A"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right text-xs">
                        <div>{driver.compliance.uploaded}/{driver.compliance.totalRequired} docs</div>
                        {driver.compliance.expiringSoon > 0 && <div className="text-amber-500">{driver.compliance.expiringSoon} expiring</div>}
                        {driver.compliance.expired > 0 && <div className="text-red-500">{driver.compliance.expired} expired</div>}
                      </div>
                      <ComplianceBadge status={driver.compliance.status} />
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          {complianceSummary ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-3xl font-bold" data-testid="text-total-drivers">{complianceSummary.totalDrivers}</div>
                    <div className="text-sm text-muted-foreground">Total Drivers</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-3xl font-bold text-emerald-600" data-testid="text-compliant">{complianceSummary.compliant}</div>
                    <div className="text-sm text-muted-foreground">Compliant</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-3xl font-bold text-amber-600" data-testid="text-expiring">{complianceSummary.expiringSoon}</div>
                    <div className="text-sm text-muted-foreground">Expiring Soon</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="text-3xl font-bold text-red-600" data-testid="text-non-compliant">{complianceSummary.nonCompliant}</div>
                    <div className="text-sm text-muted-foreground">Non-Compliant</div>
                  </CardContent>
                </Card>
              </div>

              {complianceSummary.expiringDocuments?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Expiring Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {complianceSummary.expiringDocuments.map((doc: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded border text-sm">
                          <Clock className="w-4 h-4 text-amber-500" />
                          <div className="flex-1">
                            <span className="font-medium">{doc.driverName}</span> — {docTypes?.find(t => t.key === doc.documentType)?.label || doc.documentType}
                          </div>
                          <Badge variant="outline" className="text-amber-600">
                            {doc.daysUntilExpiry} days left
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Skeleton className="h-40" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
