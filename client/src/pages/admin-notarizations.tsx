import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { Notarization, Client } from "@shared/schema";
import {
  Plus, Search, Stamp, CheckCircle, Clock, XCircle, Calendar, User, Eye,
  Globe, Home, RefreshCw, ExternalLink, Settings, Shield, Send,
} from "lucide-react";
import { format } from "date-fns";

function notaryStatusBadge(status: string) {
  const labelMap: Record<string, string> = {
    notarized: "Notarized",
    sent: "Sent to Signer",
    in_progress: "In Progress",
  };
  const statusMap: Record<string, string> = {
    notarized: "completed",
    sent: "sent",
    in_progress: "in_progress",
  };
  return <StatusBadge status={statusMap[status] || status} label={labelMap[status]} />;
}

function providerBadge(provider: string) {
  if (provider === "notarize") {
    return <Badge variant="outline" className="text-xs gap-1"><Globe className="w-3 h-3" />Notarize.com</Badge>;
  }
  return <Badge variant="outline" className="text-xs gap-1"><Home className="w-3 h-3" />In-House</Badge>;
}

interface NotarySettings {
  provider: string;
  hasApiKey: boolean;
  apiKeyMasked: string | null;
}

export default function AdminNotarizations() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"in_house" | "notarize">("in_house");
  const [viewRecord, setViewRecord] = useState<Notarization | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [providerPref, setProviderPref] = useState("in_house");

  const [newInHouse, setNewInHouse] = useState({
    clientId: "", documentName: "", documentDescription: "", notaryName: "",
    notaryCommission: "", notarizationDate: "", expirationDate: "", status: "pending",
    notes: "", performedBy: null as string | null,
  });

  const [newOnline, setNewOnline] = useState({
    clientId: "", documentName: "", documentDescription: "",
    signerEmail: "", signerFirstName: "", signerLastName: "", notes: "",
  });

  const { data: notarizations = [], isLoading } = useQuery<Notarization[]>({
    queryKey: ["/api/admin/notarizations"],
  });

  const { data: clientsList = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: notarySettings } = useQuery<NotarySettings>({
    queryKey: ["/api/admin/notary-settings"],
  });

  const createInHouse = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        notarizationDate: data.notarizationDate ? new Date(data.notarizationDate).toISOString() : null,
        expirationDate: data.expirationDate ? new Date(data.expirationDate).toISOString() : null,
      };
      await apiRequest("POST", "/api/admin/notarizations", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notarizations"] });
      setCreateOpen(false);
      setNewInHouse({ clientId: "", documentName: "", documentDescription: "", notaryName: "", notaryCommission: "", notarizationDate: "", expirationDate: "", status: "pending", notes: "", performedBy: null });
      toast({ title: "In-house notarization record created" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create", description: err.message, variant: "destructive" });
    },
  });

  const createOnline = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/notarizations/online", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notarizations"] });
      setCreateOpen(false);
      setNewOnline({ clientId: "", documentName: "", documentDescription: "", signerEmail: "", signerFirstName: "", signerLastName: "", notes: "" });
      toast({ title: "Notarize.com transaction created", description: "The signer will receive an email to complete the notarization online." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create", description: err.message, variant: "destructive" });
    },
  });

  const updateNotarization = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest("PATCH", `/api/admin/notarizations/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notarizations"] });
      setViewRecord(null);
      toast({ title: "Notarization updated" });
    },
  });

  const refreshStatus = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/notarizations/${id}/refresh-status`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notarizations"] });
      setViewRecord(data);
      toast({ title: "Status refreshed from Notarize.com" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to refresh", description: err.message, variant: "destructive" });
    },
  });

  const saveSettings = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/notary-settings", {
        provider: providerPref,
        apiKey: apiKeyInput || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notary-settings"] });
      setSettingsOpen(false);
      setApiKeyInput("");
      toast({ title: "Notary settings saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  const testConnection = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/notary-settings/test", {
        apiKey: apiKeyInput || undefined,
      });
      return res.json();
    },
    onSuccess: (result: { success: boolean; message: string }) => {
      toast({
        title: result.success ? "Connection successful" : "Connection failed",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Test failed", description: err.message, variant: "destructive" });
    },
  });

  const getClientName = (clientId: string) => clientsList.find(c => c.id === clientId)?.companyName || clientId;
  const getClient = (clientId: string) => clientsList.find(c => c.id === clientId);

  const filtered = notarizations.filter(n =>
    n.documentName.toLowerCase().includes(search.toLowerCase()) ||
    n.notaryName.toLowerCase().includes(search.toLowerCase()) ||
    getClientName(n.clientId).toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: notarizations.length,
    pending: notarizations.filter(n => n.status === "pending").length,
    notarized: notarizations.filter(n => n.status === "notarized").length,
    online: notarizations.filter(n => n.provider === "notarize").length,
  };

  const handleClientSelectOnline = (clientId: string) => {
    const client = getClient(clientId);
    setNewOnline(prev => ({
      ...prev,
      clientId,
      signerEmail: client?.email || prev.signerEmail,
      signerFirstName: client?.contactName?.split(" ")[0] || prev.signerFirstName,
      signerLastName: client?.contactName?.split(" ").slice(1).join(" ") || prev.signerLastName,
    }));
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="page-admin-notarizations">
      <PageHeader
        title="Notarizations"
        description="Manage in-house and online remote notarizations"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => { setProviderPref(notarySettings?.provider || "in_house"); setSettingsOpen(true); }} data-testid="button-notary-settings">
              <Settings className="w-4 h-4 mr-2" /> Settings
            </Button>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-notarization">
                  <Plus className="w-4 h-4 mr-2" /> New Notarization
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>New Notarization</DialogTitle>
                </DialogHeader>
                <Tabs value={createMode} onValueChange={v => setCreateMode(v as any)}>
                  <TabsList className="w-full">
                    <TabsTrigger value="in_house" className="flex-1 gap-1" data-testid="tab-in-house">
                      <Home className="w-3.5 h-3.5" /> In-House
                    </TabsTrigger>
                    <TabsTrigger value="notarize" className="flex-1 gap-1" data-testid="tab-notarize"
                      disabled={!notarySettings?.hasApiKey}
                    >
                      <Globe className="w-3.5 h-3.5" /> Notarize.com
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="in_house" className="space-y-4 mt-4">
                    <div>
                      <Label>Client</Label>
                      <Select value={newInHouse.clientId} onValueChange={v => setNewInHouse(prev => ({ ...prev, clientId: v }))}>
                        <SelectTrigger data-testid="select-notary-client">
                          <SelectValue placeholder="Select a client..." />
                        </SelectTrigger>
                        <SelectContent>
                          {clientsList.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Document Name</Label>
                      <Input value={newInHouse.documentName} onChange={e => setNewInHouse(prev => ({ ...prev, documentName: e.target.value }))} placeholder="e.g., Power of Attorney" data-testid="input-notary-doc-name" />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input value={newInHouse.documentDescription} onChange={e => setNewInHouse(prev => ({ ...prev, documentDescription: e.target.value }))} placeholder="Brief description..." data-testid="input-notary-description" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>Notary Name</Label>
                        <Input value={newInHouse.notaryName} onChange={e => setNewInHouse(prev => ({ ...prev, notaryName: e.target.value }))} placeholder="Full name of notary" data-testid="input-notary-name" />
                      </div>
                      <div>
                        <Label>Commission Number</Label>
                        <Input value={newInHouse.notaryCommission} onChange={e => setNewInHouse(prev => ({ ...prev, notaryCommission: e.target.value }))} placeholder="Notary commission #" data-testid="input-notary-commission" />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>Notarization Date</Label>
                        <Input type="date" value={newInHouse.notarizationDate} onChange={e => setNewInHouse(prev => ({ ...prev, notarizationDate: e.target.value }))} data-testid="input-notary-date" />
                      </div>
                      <div>
                        <Label>Commission Expiration</Label>
                        <Input type="date" value={newInHouse.expirationDate} onChange={e => setNewInHouse(prev => ({ ...prev, expirationDate: e.target.value }))} data-testid="input-notary-expiration" />
                      </div>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select value={newInHouse.status} onValueChange={v => setNewInHouse(prev => ({ ...prev, status: v }))}>
                        <SelectTrigger data-testid="select-notary-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="notarized">Notarized</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Textarea value={newInHouse.notes} onChange={e => setNewInHouse(prev => ({ ...prev, notes: e.target.value }))} placeholder="Additional notes..." data-testid="textarea-notary-notes" />
                    </div>
                    <Button className="w-full" onClick={() => {
                      if (!newInHouse.clientId || !newInHouse.documentName || !newInHouse.notaryName) {
                        toast({ title: "Missing fields", description: "Client, document name, and notary name are required.", variant: "destructive" });
                        return;
                      }
                      createInHouse.mutate(newInHouse);
                    }} disabled={createInHouse.isPending} data-testid="button-confirm-create-notarization">
                      {createInHouse.isPending ? "Creating..." : "Create In-House Record"}
                    </Button>
                  </TabsContent>

                  <TabsContent value="notarize" className="space-y-4 mt-4">
                    {!notarySettings?.hasApiKey ? (
                      <div className="text-center p-6 space-y-3">
                        <Globe className="w-10 h-10 text-muted-foreground mx-auto" />
                        <p className="text-sm text-muted-foreground">
                          Connect your Notarize.com account to send documents for remote online notarization.
                        </p>
                        <Button variant="outline" onClick={() => { setCreateOpen(false); setSettingsOpen(true); }}>
                          <Settings className="w-4 h-4 mr-2" /> Configure Notarize.com
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            The signer will receive an email from Notarize.com with a link to complete the notarization via live video session with a commissioned notary.
                          </p>
                        </div>
                        <div>
                          <Label>Client</Label>
                          <Select value={newOnline.clientId} onValueChange={handleClientSelectOnline}>
                            <SelectTrigger data-testid="select-online-client">
                              <SelectValue placeholder="Select a client..." />
                            </SelectTrigger>
                            <SelectContent>
                              {clientsList.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Document Name</Label>
                          <Input value={newOnline.documentName} onChange={e => setNewOnline(prev => ({ ...prev, documentName: e.target.value }))} placeholder="e.g., Power of Attorney" data-testid="input-online-doc-name" />
                        </div>
                        <div>
                          <Label>Description (optional)</Label>
                          <Input value={newOnline.documentDescription} onChange={e => setNewOnline(prev => ({ ...prev, documentDescription: e.target.value }))} placeholder="Brief description..." data-testid="input-online-description" />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <Label>Signer First Name</Label>
                            <Input value={newOnline.signerFirstName} onChange={e => setNewOnline(prev => ({ ...prev, signerFirstName: e.target.value }))} placeholder="First name" data-testid="input-signer-first" />
                          </div>
                          <div>
                            <Label>Signer Last Name</Label>
                            <Input value={newOnline.signerLastName} onChange={e => setNewOnline(prev => ({ ...prev, signerLastName: e.target.value }))} placeholder="Last name" data-testid="input-signer-last" />
                          </div>
                        </div>
                        <div>
                          <Label>Signer Email</Label>
                          <Input type="email" value={newOnline.signerEmail} onChange={e => setNewOnline(prev => ({ ...prev, signerEmail: e.target.value }))} placeholder="signer@example.com" data-testid="input-signer-email" />
                        </div>
                        <div>
                          <Label>Notes (optional)</Label>
                          <Textarea value={newOnline.notes} onChange={e => setNewOnline(prev => ({ ...prev, notes: e.target.value }))} placeholder="Internal notes..." data-testid="textarea-online-notes" />
                        </div>
                        <Button className="w-full" onClick={() => {
                          if (!newOnline.clientId || !newOnline.documentName || !newOnline.signerEmail || !newOnline.signerFirstName || !newOnline.signerLastName) {
                            toast({ title: "Missing fields", description: "Client, document name, signer name, and email are required.", variant: "destructive" });
                            return;
                          }
                          createOnline.mutate(newOnline);
                        }} disabled={createOnline.isPending} data-testid="button-confirm-create-online">
                          <Send className="w-4 h-4 mr-2" />
                          {createOnline.isPending ? "Sending..." : "Send to Notarize.com"}
                        </Button>
                      </>
                    )}
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Records" value={stats.total} icon={Stamp} />
        <StatCard title="Pending" value={stats.pending} icon={Clock} iconColor="text-amber-600" iconBg="bg-amber-100 dark:bg-amber-900/30" />
        <StatCard title="Notarized" value={stats.notarized} icon={CheckCircle} iconColor="text-emerald-600" iconBg="bg-emerald-100 dark:bg-emerald-900/30" />
        <StatCard title="Online (Notarize.com)" value={stats.online} icon={Globe} iconColor="text-blue-600" iconBg="bg-blue-100 dark:bg-blue-900/30" />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notarizations..." className="pl-10" data-testid="input-search-notarizations" />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Stamp}
              title={search ? "No matching records" : "No notarization records yet"}
              description={search ? "No records match your search criteria." : "Click 'New Notarization' to record your first notarization."}
              action={!search ? (
                <Button onClick={() => setCreateOpen(true)} data-testid="button-empty-create-notarization">
                  <Plus className="w-4 h-4 mr-2" /> New Notarization
                </Button>
              ) : undefined}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(record => (
            <Card key={record.id} className="hover-elevate cursor-pointer" onClick={() => setViewRecord(record)} data-testid={`card-notarization-${record.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{record.documentName}</h4>
                      {providerBadge(record.provider || "in_house")}
                    </div>
                    {record.documentDescription && (
                      <p className="text-xs text-muted-foreground mt-0.5">{record.documentDescription}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> Client: {getClientName(record.clientId)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Stamp className="w-3 h-3" /> {record.provider === "notarize" ? "Remote Notary" : record.notaryName}
                      </span>
                      {record.notaryCommission && record.provider !== "notarize" && (
                        <span>Commission: {record.notaryCommission}</span>
                      )}
                      {record.notarizationDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {format(new Date(record.notarizationDate), "MMM d, yyyy")}
                        </span>
                      )}
                      {record.provider === "notarize" && record.externalStatus && (
                        <span className="text-blue-600 dark:text-blue-400">API: {record.externalStatus}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {notaryStatusBadge(record.status)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!viewRecord} onOpenChange={(open) => { if (!open) setViewRecord(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewRecord?.documentName}
              {viewRecord && providerBadge(viewRecord.provider || "in_house")}
            </DialogTitle>
          </DialogHeader>
          {viewRecord && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-sm">Client: <span className="font-medium">{getClientName(viewRecord.clientId)}</span></p>
                {notaryStatusBadge(viewRecord.status)}
              </div>
              {viewRecord.documentDescription && (
                <p className="text-sm text-muted-foreground">{viewRecord.documentDescription}</p>
              )}

              {viewRecord.provider === "notarize" && (
                <Card className="border-blue-200 dark:border-blue-900">
                  <CardContent className="pt-4 space-y-3">
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" /> Notarize.com Details
                    </p>
                    <div className="grid gap-2 text-sm">
                      {viewRecord.signerEmail && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Signer</span>
                          <span className="font-medium">{viewRecord.signerFirstName} {viewRecord.signerLastName} ({viewRecord.signerEmail})</span>
                        </div>
                      )}
                      {viewRecord.externalTransactionId && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Transaction ID</span>
                          <span className="font-mono text-xs">{viewRecord.externalTransactionId}</span>
                        </div>
                      )}
                      {viewRecord.externalStatus && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">API Status</span>
                          <Badge variant="outline">{viewRecord.externalStatus}</Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => refreshStatus.mutate(viewRecord.id)} disabled={refreshStatus.isPending} data-testid="button-refresh-status">
                        <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshStatus.isPending ? "animate-spin" : ""}`} />
                        {refreshStatus.isPending ? "Refreshing..." : "Refresh Status"}
                      </Button>
                      {viewRecord.signerLink && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={viewRecord.signerLink} target="_blank" rel="noopener noreferrer" data-testid="link-signer-portal">
                            <ExternalLink className="w-3.5 h-3.5 mr-1" /> Signer Link
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {viewRecord.provider !== "notarize" && (
                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Notary:</span>
                    <p className="font-medium">{viewRecord.notaryName}</p>
                  </div>
                  {viewRecord.notaryCommission && (
                    <div>
                      <span className="text-muted-foreground">Commission #:</span>
                      <p className="font-medium font-mono">{viewRecord.notaryCommission}</p>
                    </div>
                  )}
                  {viewRecord.notarizationDate && (
                    <div>
                      <span className="text-muted-foreground">Notarization Date:</span>
                      <p className="font-medium">{format(new Date(viewRecord.notarizationDate), "MMMM d, yyyy")}</p>
                    </div>
                  )}
                  {viewRecord.expirationDate && (
                    <div>
                      <span className="text-muted-foreground">Commission Expires:</span>
                      <p className="font-medium">{format(new Date(viewRecord.expirationDate), "MMMM d, yyyy")}</p>
                    </div>
                  )}
                </div>
              )}

              {viewRecord.notes && (
                <div>
                  <span className="text-sm text-muted-foreground">Notes:</span>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{viewRecord.notes}</p>
                </div>
              )}

              {viewRecord.provider !== "notarize" && (
                <div>
                  <Label>Update Status</Label>
                  <Select value={viewRecord.status} onValueChange={v => updateNotarization.mutate({ id: viewRecord.id, data: { status: v } })}>
                    <SelectTrigger data-testid="select-update-notary-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="notarized">Notarized</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-4 h-4" /> Notary Settings
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label className="text-sm font-medium">Notary Provider</Label>
              <p className="text-xs text-muted-foreground mb-3">Choose the default notarization method for your organization</p>
              <div className="space-y-3">
                <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${providerPref === "in_house" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"}`}>
                  <input type="radio" name="provider" value="in_house" checked={providerPref === "in_house"} onChange={() => setProviderPref("in_house")} className="mt-1" />
                  <div>
                    <p className="font-medium text-sm flex items-center gap-1"><Home className="w-3.5 h-3.5" /> In-House Notary</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Use your own commissioned notary. Manage records manually.</p>
                  </div>
                </label>
                <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${providerPref === "notarize" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"}`}>
                  <input type="radio" name="provider" value="notarize" checked={providerPref === "notarize"} onChange={() => setProviderPref("notarize")} className="mt-1" />
                  <div>
                    <p className="font-medium text-sm flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Notarize.com (Remote Online)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Send documents for remote notarization via live video. Requires API key.</p>
                  </div>
                </label>
                <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${providerPref === "both" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"}`}>
                  <input type="radio" name="provider" value="both" checked={providerPref === "both"} onChange={() => setProviderPref("both")} className="mt-1" />
                  <div>
                    <p className="font-medium text-sm flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Both (Recommended)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Use in-house for on-site notarizations and Notarize.com for remote clients.</p>
                  </div>
                </label>
              </div>
            </div>

            {(providerPref === "notarize" || providerPref === "both") && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="apiKey">Notarize.com API Key</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Get your API key from <a href="https://app.proof.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">app.proof.com</a> under Settings &gt; API Keys
                  </p>
                  <Input
                    id="apiKey"
                    type="password"
                    value={apiKeyInput}
                    onChange={e => setApiKeyInput(e.target.value)}
                    placeholder={notarySettings?.hasApiKey ? notarySettings.apiKeyMasked || "API key configured" : "Enter your API key"}
                    data-testid="input-notarize-api-key"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => testConnection.mutate()} disabled={testConnection.isPending} data-testid="button-test-notarize">
                  {testConnection.isPending ? "Testing..." : "Test Connection"}
                </Button>
              </div>
            )}

            <Button className="w-full" onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending} data-testid="button-save-notary-settings">
              {saveSettings.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
