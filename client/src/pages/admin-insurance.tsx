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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import type { Client } from "@shared/schema";
import { Plus, Search, Shield, AlertTriangle, CheckCircle, Clock, XCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";

const POLICY_TYPES = [
  "Auto Liability", "Cargo Insurance", "General Liability", "Physical Damage",
  "Workers Compensation", "Umbrella / Excess", "Non-Trucking Liability", "Occupational Accident",
];

export default function AdminInsurance() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    clientId: "", policyType: "", policyNumber: "", carrier: "",
    effectiveDate: "", expirationDate: "", premiumAmount: "", coverageAmount: "",
    agentName: "", agentPhone: "", agentEmail: "", notes: "",
  });

  const { data: policies, isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/insurance"] });
  const { data: clients } = useQuery<Client[]>({ queryKey: ["/api/clients"] });

  const addMutation = useMutation({
    mutationFn: async () => { await apiRequest("POST", "/api/admin/insurance", form); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/insurance"] });
      setShowAdd(false);
      setForm({ clientId: "", policyType: "", policyNumber: "", carrier: "", effectiveDate: "", expirationDate: "", premiumAmount: "", coverageAmount: "", agentName: "", agentPhone: "", agentEmail: "", notes: "" });
      toast({ title: "Policy added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/admin/insurance/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/insurance"] });
      toast({ title: "Policy removed" });
    },
  });

  const now = new Date();
  const filtered = (policies || []).filter(p => {
    const q = search.toLowerCase();
    return !q || p.policyType?.toLowerCase().includes(q) || p.carrier?.toLowerCase().includes(q) ||
      p.policyNumber?.toLowerCase().includes(q) || p.client?.companyName?.toLowerCase().includes(q);
  });

  const counts = {
    total: (policies || []).length,
    active: (policies || []).filter(p => p.expirationDate && new Date(p.expirationDate) > now).length,
    expiringSoon: (policies || []).filter(p => {
      if (!p.expirationDate) return false;
      const days = (new Date(p.expirationDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return days > 0 && days <= 30;
    }).length,
    expired: (policies || []).filter(p => p.expirationDate && new Date(p.expirationDate) < now).length,
  };

  function getStatusBadge(expirationDate: string | null) {
    if (!expirationDate) return <Badge variant="outline">No Expiry</Badge>;
    const days = Math.ceil((new Date(expirationDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><XCircle className="w-3 h-3 mr-1" />Expired</Badge>;
    if (days <= 30) return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><Clock className="w-3 h-3 mr-1" />{days}d left</Badge>;
    return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-admin-insurance">
      <PageHeader title="Insurance Policies" description="Track insurance certificates and policy expirations" icon={<Shield className="w-5 h-5" />} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{counts.total}</div><div className="text-xs text-muted-foreground">Total Policies</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-emerald-600">{counts.active}</div><div className="text-xs text-muted-foreground">Active</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-amber-600">{counts.expiringSoon}</div><div className="text-xs text-muted-foreground">Expiring Soon</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-red-600">{counts.expired}</div><div className="text-xs text-muted-foreground">Expired</div></CardContent></Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search policies..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-insurance" />
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-policy"><Plus className="w-4 h-4 mr-1" /> Add Policy</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Insurance Policy</DialogTitle></DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <Label>Carrier *</Label>
                <Select value={form.clientId} onValueChange={v => setForm(f => ({ ...f, clientId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select carrier..." /></SelectTrigger>
                  <SelectContent>{(clients || []).map(c => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Policy Type *</Label>
                  <Select value={form.policyType} onValueChange={v => setForm(f => ({ ...f, policyType: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{POLICY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Policy Number</Label><Input value={form.policyNumber} onChange={e => setForm(f => ({ ...f, policyNumber: e.target.value }))} /></div>
              </div>
              <div><Label>Insurance Carrier *</Label><Input value={form.carrier} onChange={e => setForm(f => ({ ...f, carrier: e.target.value }))} placeholder="e.g. Progressive, Great West" data-testid="input-insurance-carrier" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Effective Date</Label><Input type="date" value={form.effectiveDate} onChange={e => setForm(f => ({ ...f, effectiveDate: e.target.value }))} /></div>
                <div><Label>Expiration Date *</Label><Input type="date" value={form.expirationDate} onChange={e => setForm(f => ({ ...f, expirationDate: e.target.value }))} data-testid="input-policy-expiration" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Premium ($)</Label><Input type="number" value={form.premiumAmount} onChange={e => setForm(f => ({ ...f, premiumAmount: e.target.value }))} /></div>
                <div><Label>Coverage ($)</Label><Input type="number" value={form.coverageAmount} onChange={e => setForm(f => ({ ...f, coverageAmount: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Agent Name</Label><Input value={form.agentName} onChange={e => setForm(f => ({ ...f, agentName: e.target.value }))} /></div>
                <div><Label>Agent Phone</Label><Input value={form.agentPhone} onChange={e => setForm(f => ({ ...f, agentPhone: e.target.value }))} /></div>
                <div><Label>Agent Email</Label><Input value={form.agentEmail} onChange={e => setForm(f => ({ ...f, agentEmail: e.target.value }))} /></div>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={() => addMutation.mutate()} disabled={!form.clientId || !form.policyType || !form.carrier || addMutation.isPending} data-testid="button-save-policy">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Shield} title="No policies found" description="Add your first insurance policy to start tracking coverage." />
      ) : (
        <div className="space-y-2">
          {filtered.map(p => (
            <Card key={p.id} data-testid={`card-policy-${p.id}`}>
              <CardContent className="py-3 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{p.policyType}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.client?.companyName} | {p.carrier} | #{p.policyNumber || "N/A"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.effectiveDate ? format(new Date(p.effectiveDate), "MM/dd/yyyy") : "?"} — {p.expirationDate ? format(new Date(p.expirationDate), "MM/dd/yyyy") : "?"}
                    {p.coverageAmount && ` | Coverage: $${Number(p.coverageAmount).toLocaleString()}`}
                  </div>
                </div>
                {getStatusBadge(p.expirationDate)}
                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteMutation.mutate(p.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
