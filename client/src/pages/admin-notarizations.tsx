import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Notarization, Client } from "@shared/schema";
import { Plus, Search, Stamp, CheckCircle, Clock, XCircle, Calendar, User, Eye } from "lucide-react";
import { format } from "date-fns";

function notaryStatusBadge(status: string) {
  switch (status) {
    case "pending": return <Badge variant="secondary" className="text-xs"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    case "notarized": return <Badge variant="default" className="text-xs"><CheckCircle className="w-3 h-3 mr-1" />Notarized</Badge>;
    case "rejected": return <Badge variant="destructive" className="text-xs"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
    default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}

export default function AdminNotarizations() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState<Notarization | null>(null);
  const [newRecord, setNewRecord] = useState({
    clientId: "",
    documentName: "",
    documentDescription: "",
    notaryName: "",
    notaryCommission: "",
    notarizationDate: "",
    expirationDate: "",
    status: "pending",
    notes: "",
    performedBy: null as string | null,
  });

  const { data: notarizations = [], isLoading } = useQuery<Notarization[]>({
    queryKey: ["/api/admin/notarizations"],
  });

  const { data: clientsList = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const createNotarization = useMutation({
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
      setNewRecord({ clientId: "", documentName: "", documentDescription: "", notaryName: "", notaryCommission: "", notarizationDate: "", expirationDate: "", status: "pending", notes: "", performedBy: null });
      toast({ title: "Notarization record created" });
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

  const getClientName = (clientId: string) => clientsList.find(c => c.id === clientId)?.companyName || clientId;

  const filtered = notarizations.filter(n =>
    n.documentName.toLowerCase().includes(search.toLowerCase()) ||
    n.notaryName.toLowerCase().includes(search.toLowerCase()) ||
    getClientName(n.clientId).toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: notarizations.length,
    pending: notarizations.filter(n => n.status === "pending").length,
    notarized: notarizations.filter(n => n.status === "notarized").length,
    rejected: notarizations.filter(n => n.status === "rejected").length,
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-notarizations-title">Notarizations</h1>
          <p className="text-sm text-muted-foreground">Track in-house notarization of client documents</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-notarization">
              <Plus className="w-4 h-4 mr-2" /> New Notarization
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record Notarization</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Client</Label>
                <Select value={newRecord.clientId} onValueChange={v => setNewRecord(prev => ({ ...prev, clientId: v }))}>
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
                <Input
                  value={newRecord.documentName}
                  onChange={e => setNewRecord(prev => ({ ...prev, documentName: e.target.value }))}
                  placeholder="e.g., Power of Attorney"
                  data-testid="input-notary-doc-name"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={newRecord.documentDescription}
                  onChange={e => setNewRecord(prev => ({ ...prev, documentDescription: e.target.value }))}
                  placeholder="Brief description..."
                  data-testid="input-notary-description"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Notary Name</Label>
                  <Input
                    value={newRecord.notaryName}
                    onChange={e => setNewRecord(prev => ({ ...prev, notaryName: e.target.value }))}
                    placeholder="Full name of notary"
                    data-testid="input-notary-name"
                  />
                </div>
                <div>
                  <Label>Commission Number</Label>
                  <Input
                    value={newRecord.notaryCommission}
                    onChange={e => setNewRecord(prev => ({ ...prev, notaryCommission: e.target.value }))}
                    placeholder="Notary commission #"
                    data-testid="input-notary-commission"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Notarization Date</Label>
                  <Input
                    type="date"
                    value={newRecord.notarizationDate}
                    onChange={e => setNewRecord(prev => ({ ...prev, notarizationDate: e.target.value }))}
                    data-testid="input-notary-date"
                  />
                </div>
                <div>
                  <Label>Commission Expiration</Label>
                  <Input
                    type="date"
                    value={newRecord.expirationDate}
                    onChange={e => setNewRecord(prev => ({ ...prev, expirationDate: e.target.value }))}
                    data-testid="input-notary-expiration"
                  />
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={newRecord.status} onValueChange={v => setNewRecord(prev => ({ ...prev, status: v }))}>
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
                <Textarea
                  value={newRecord.notes}
                  onChange={e => setNewRecord(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  data-testid="textarea-notary-notes"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  if (!newRecord.clientId || !newRecord.documentName || !newRecord.notaryName) {
                    toast({ title: "Missing fields", description: "Client, document name, and notary name are required.", variant: "destructive" });
                    return;
                  }
                  createNotarization.mutate(newRecord);
                }}
                disabled={createNotarization.isPending}
                data-testid="button-confirm-create-notarization"
              >
                Create Record
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-stat-total-notarizations">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Stamp className="w-4 h-4" />
              <span className="text-xs font-medium">Total Records</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">Pending</span>
            </div>
            <p className="text-2xl font-bold">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Notarized</span>
            </div>
            <p className="text-2xl font-bold">{stats.notarized}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <XCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Rejected</span>
            </div>
            <p className="text-2xl font-bold">{stats.rejected}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search notarizations..."
          className="pl-10"
          data-testid="input-search-notarizations"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Stamp className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>{search ? "No matching records found." : "No notarization records yet."}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(record => (
            <Card
              key={record.id}
              className="hover-elevate cursor-pointer"
              onClick={() => setViewRecord(record)}
              data-testid={`card-notarization-${record.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-sm">{record.documentName}</h4>
                    {record.documentDescription && (
                      <p className="text-xs text-muted-foreground mt-0.5">{record.documentDescription}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> Client: {getClientName(record.clientId)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Stamp className="w-3 h-3" /> Notary: {record.notaryName}
                      </span>
                      {record.notaryCommission && (
                        <span>Commission: {record.notaryCommission}</span>
                      )}
                      {record.notarizationDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {format(new Date(record.notarizationDate), "MMM d, yyyy")}
                        </span>
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
            <DialogTitle>{viewRecord?.documentName}</DialogTitle>
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
              {viewRecord.notes && (
                <div>
                  <span className="text-sm text-muted-foreground">Notes:</span>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{viewRecord.notes}</p>
                </div>
              )}
              <div>
                <Label>Update Status</Label>
                <Select
                  value={viewRecord.status}
                  onValueChange={v => updateNotarization.mutate({ id: viewRecord.id, data: { status: v } })}
                >
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
