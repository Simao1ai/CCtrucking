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
import { Plus, Calendar, CheckCircle, Clock, AlertTriangle, XCircle, Wand2, Filter } from "lucide-react";
import { format } from "date-fns";

const DEADLINE_TYPES = [
  { value: "mcs150_biennial", label: "MCS-150 Biennial Update" },
  { value: "ucr_annual", label: "UCR Annual Filing" },
  { value: "ifta_quarterly", label: "IFTA Quarterly Return" },
  { value: "hvut_2290", label: "HVUT Form 2290" },
  { value: "annual_inspection", label: "Annual Vehicle Inspection" },
  { value: "medical_card", label: "Medical Card Expiration" },
  { value: "mvr_pull", label: "Annual MVR Pull" },
  { value: "insurance_renewal", label: "Insurance Policy Renewal" },
  { value: "irp_renewal", label: "IRP Registration Renewal" },
  { value: "clearinghouse_query", label: "Clearinghouse Annual Query" },
  { value: "boc3_update", label: "BOC-3 Update" },
  { value: "custom", label: "Custom Deadline" },
];

function UrgencyBadge({ urgency, daysUntil }: { urgency: string; daysUntil: number }) {
  if (urgency === "red") return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><XCircle className="w-3 h-3 mr-1" />{Math.abs(daysUntil)} days overdue</Badge>;
  if (urgency === "orange") return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"><AlertTriangle className="w-3 h-3 mr-1" />{daysUntil} days left</Badge>;
  if (urgency === "yellow") return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><Clock className="w-3 h-3 mr-1" />{daysUntil} days left</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"><CheckCircle className="w-3 h-3 mr-1" />{daysUntil} days</Badge>;
}

export default function AdminComplianceCalendar() {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [showAutoGen, setShowAutoGen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [form, setForm] = useState({ clientId: "", title: "", deadlineType: "custom", dueDate: "", description: "", notes: "" });
  const [autoGenClientId, setAutoGenClientId] = useState("");

  const { data: deadlines, isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/compliance-calendar"] });
  const { data: clients } = useQuery<Client[]>({ queryKey: ["/api/clients"] });

  const addMutation = useMutation({
    mutationFn: async () => { await apiRequest("POST", "/api/admin/compliance-calendar", form); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/compliance-calendar"] });
      setShowAdd(false);
      setForm({ clientId: "", title: "", deadlineType: "custom", dueDate: "", description: "", notes: "" });
      toast({ title: "Deadline added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("PATCH", `/api/admin/compliance-calendar/${id}`, { status: "completed", completedAt: new Date().toISOString() }); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/compliance-calendar"] });
      toast({ title: "Marked as complete" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/admin/compliance-calendar/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/compliance-calendar"] });
      toast({ title: "Deadline removed" });
    },
  });

  const autoGenMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", "/api/admin/compliance-calendar/auto-generate", { clientId: autoGenClientId }); return res.json(); },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/compliance-calendar"] });
      setShowAutoGen(false);
      toast({ title: `Generated ${data.created} deadlines` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = (deadlines || []).filter(d => {
    if (filter !== "all" && d.urgency !== filter && d.status !== filter) return false;
    if (clientFilter !== "all" && d.clientId !== clientFilter) return false;
    return true;
  });

  const counts = {
    overdue: (deadlines || []).filter(d => d.urgency === "red" && d.status !== "completed").length,
    urgent: (deadlines || []).filter(d => d.urgency === "orange" && d.status !== "completed").length,
    upcoming: (deadlines || []).filter(d => d.urgency === "yellow" && d.status !== "completed").length,
    compliant: (deadlines || []).filter(d => (d.urgency === "green" || d.status === "completed")).length,
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-compliance-calendar">
      <PageHeader title="Compliance Calendar" description="Track all regulatory deadlines across carriers" icon={<Calendar className="w-5 h-5" />} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer border-red-200 dark:border-red-800/50" onClick={() => setFilter("red")} data-testid="card-overdue">
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-red-600">{counts.overdue}</div>
            <div className="text-xs text-muted-foreground">Overdue</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer border-orange-200 dark:border-orange-800/50" onClick={() => setFilter("orange")} data-testid="card-urgent">
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{counts.urgent}</div>
            <div className="text-xs text-muted-foreground">Due in 7 Days</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer border-amber-200 dark:border-amber-800/50" onClick={() => setFilter("yellow")} data-testid="card-upcoming">
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{counts.upcoming}</div>
            <div className="text-xs text-muted-foreground">Due in 30 Days</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer border-emerald-200 dark:border-emerald-800/50" onClick={() => setFilter("all")} data-testid="card-compliant-count">
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{counts.compliant}</div>
            <div className="text-xs text-muted-foreground">Compliant</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-[200px]" data-testid="select-client-filter"><SelectValue placeholder="All Carriers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Carriers</SelectItem>
            {(clients || []).map(c => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}
          </SelectContent>
        </Select>
        {filter !== "all" && (
          <Button variant="ghost" size="sm" onClick={() => setFilter("all")}>Clear Filter</Button>
        )}
        <div className="flex-1" />
        <Dialog open={showAutoGen} onOpenChange={setShowAutoGen}>
          <DialogTrigger asChild>
            <Button variant="outline" data-testid="button-auto-generate"><Wand2 className="w-4 h-4 mr-1" /> Auto-Generate</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Auto-Generate Deadlines</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Automatically create compliance deadlines (UCR, IFTA, MCS-150, 2290) for a carrier based on their data.</p>
            <div>
              <Label>Carrier</Label>
              <Select value={autoGenClientId} onValueChange={setAutoGenClientId}>
                <SelectTrigger><SelectValue placeholder="Select carrier..." /></SelectTrigger>
                <SelectContent>{(clients || []).map(c => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAutoGen(false)}>Cancel</Button>
              <Button onClick={() => autoGenMutation.mutate()} disabled={!autoGenClientId || autoGenMutation.isPending} data-testid="button-confirm-auto-generate">Generate</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-deadline"><Plus className="w-4 h-4 mr-1" /> Add Deadline</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Compliance Deadline</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Carrier *</Label>
                <Select value={form.clientId} onValueChange={v => setForm(f => ({ ...f, clientId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select carrier..." /></SelectTrigger>
                  <SelectContent>{(clients || []).map(c => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Deadline Type</Label>
                <Select value={form.deadlineType} onValueChange={v => setForm(f => ({ ...f, deadlineType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DEADLINE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. IFTA Q1 2026 Filing" data-testid="input-deadline-title" /></div>
              <div><Label>Due Date *</Label><Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} data-testid="input-deadline-date" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={() => addMutation.mutate()} disabled={!form.clientId || !form.title || !form.dueDate || addMutation.isPending} data-testid="button-save-deadline">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Calendar} title="No deadlines" description="Add deadlines or auto-generate them from carrier data." />
      ) : (
        <div className="space-y-2">
          {filtered.map(d => (
            <Card key={d.id} className={`${d.status === "completed" ? "opacity-60" : ""}`} data-testid={`card-deadline-${d.id}`}>
              <CardContent className="py-3 flex items-center gap-4">
                <div className={`w-2 h-12 rounded-full ${d.urgency === "red" ? "bg-red-500" : d.urgency === "orange" ? "bg-orange-500" : d.urgency === "yellow" ? "bg-amber-500" : "bg-emerald-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{d.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.client?.companyName} | Due: {format(new Date(d.dueDate), "MMM dd, yyyy")}
                    {d.description && ` | ${d.description}`}
                  </div>
                </div>
                <UrgencyBadge urgency={d.status === "completed" ? "green" : d.urgency} daysUntil={d.daysUntil} />
                <div className="flex gap-1">
                  {d.status !== "completed" && (
                    <Button size="sm" variant="outline" onClick={() => completeMutation.mutate(d.id)} data-testid={`button-complete-${d.id}`}>
                      <CheckCircle className="w-3 h-3 mr-1" /> Done
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteMutation.mutate(d.id)}>
                    <XCircle className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
