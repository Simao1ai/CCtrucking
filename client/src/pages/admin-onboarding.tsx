import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import type { Client } from "@shared/schema";
import { Plus, ClipboardList, CheckCircle, Circle, ArrowLeft, ChevronRight, Play, Pause } from "lucide-react";
import { format } from "date-fns";

export default function AdminOnboarding() {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addClientId, setAddClientId] = useState("");

  const { data: records, isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/onboarding"] });
  const { data: clients } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: stepsRef } = useQuery<any[]>({ queryKey: ["/api/admin/onboarding/steps"] });

  const selected = (records || []).find(r => r.id === selectedId);

  const createMutation = useMutation({
    mutationFn: async () => { await apiRequest("POST", "/api/admin/onboarding", { clientId: addClientId }); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/onboarding"] });
      setShowAdd(false);
      setAddClientId("");
      toast({ title: "Onboarding started" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateStepMutation = useMutation({
    mutationFn: async ({ recordId, stepIndex, status, notes }: { recordId: string; stepIndex: number; status: string; notes?: string }) => {
      const record = (records || []).find(r => r.id === recordId);
      if (!record) return;
      const updatedSteps = [...(record.steps || [])];
      updatedSteps[stepIndex] = {
        ...updatedSteps[stepIndex],
        status,
        completedAt: status === "completed" ? new Date().toISOString() : null,
        notes: notes !== undefined ? notes : updatedSteps[stepIndex].notes,
      };
      const completedCount = updatedSteps.filter(s => s.status === "completed").length;
      const nextStep = updatedSteps.findIndex(s => s.status !== "completed") + 1;
      const overallStatus = completedCount === updatedSteps.length ? "completed" : "in_progress";
      await apiRequest("PATCH", `/api/admin/onboarding/${recordId}`, {
        steps: updatedSteps,
        currentStep: nextStep || updatedSteps.length,
        status: overallStatus,
        ...(overallStatus === "completed" ? { completedAt: new Date().toISOString() } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/onboarding"] });
      toast({ title: "Step updated" });
    },
  });

  if (selected) {
    const steps = selected.steps || [];
    const completedCount = steps.filter((s: any) => s.status === "completed").length;
    const pct = Math.round((completedCount / steps.length) * 100);

    return (
      <div className="p-6 space-y-6" data-testid="page-onboarding-detail">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} data-testid="button-back-onboarding">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{selected.client?.companyName || "Carrier"} — Onboarding</h1>
            <p className="text-sm text-muted-foreground">
              {completedCount}/{steps.length} steps complete | Started {selected.createdAt ? format(new Date(selected.createdAt), "MMM dd, yyyy") : ""}
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                <div className="bg-emerald-500 h-4 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-lg font-bold">{pct}%</span>
            </div>

            <div className="space-y-3">
              {steps.map((step: any, idx: number) => (
                <div key={idx} className={`flex items-start gap-4 p-4 rounded-lg border ${step.status === "completed" ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800" : step.status === "in_progress" ? "bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800" : "bg-card"}`} data-testid={`onboarding-step-${idx}`}>
                  <div className="pt-0.5">
                    {step.status === "completed" ? (
                      <CheckCircle className="w-6 h-6 text-emerald-500" />
                    ) : step.status === "in_progress" ? (
                      <Play className="w-6 h-6 text-amber-500" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">Step {step.step}</span>
                      <span className="font-medium">{step.title}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">{step.description}</div>
                    {step.notes && <div className="text-xs mt-1 italic text-muted-foreground">{step.notes}</div>}
                    {step.completedAt && (
                      <div className="text-xs text-emerald-600 mt-1">Completed {format(new Date(step.completedAt), "MMM dd, yyyy")}</div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {step.status !== "completed" && (
                      <>
                        {step.status !== "in_progress" && (
                          <Button size="sm" variant="outline" onClick={() => updateStepMutation.mutate({ recordId: selected.id, stepIndex: idx, status: "in_progress" })}>
                            <Play className="w-3 h-3 mr-1" /> Start
                          </Button>
                        )}
                        <Button size="sm" variant="default" onClick={() => updateStepMutation.mutate({ recordId: selected.id, stepIndex: idx, status: "completed" })} data-testid={`button-complete-step-${idx}`}>
                          <CheckCircle className="w-3 h-3 mr-1" /> Complete
                        </Button>
                      </>
                    )}
                    {step.status === "completed" && (
                      <Button size="sm" variant="ghost" onClick={() => updateStepMutation.mutate({ recordId: selected.id, stepIndex: idx, status: "pending" })}>
                        Undo
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-admin-onboarding">
      <PageHeader title="Client Onboarding" description="Track new carrier setup with a 10-step compliance wizard" icon={<ClipboardList className="w-5 h-5" />} />

      <div className="flex items-center gap-3">
        <div className="flex-1" />
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button data-testid="button-start-onboarding"><Plus className="w-4 h-4 mr-1" /> Start Onboarding</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Start New Carrier Onboarding</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Select a carrier to begin the 10-step new authority setup process.</p>
            <div>
              <Label>Carrier</Label>
              <Select value={addClientId} onValueChange={setAddClientId}>
                <SelectTrigger data-testid="select-onboarding-client"><SelectValue placeholder="Select carrier..." /></SelectTrigger>
                <SelectContent>{(clients || []).map(c => <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate()} disabled={!addClientId || createMutation.isPending} data-testid="button-confirm-onboarding">Start</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : (records || []).length === 0 ? (
        <EmptyState icon={ClipboardList} title="No onboarding in progress" description="Start a new carrier onboarding to track their setup through all 10 compliance steps." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(records || []).map((r: any) => {
            const steps = r.steps || [];
            const completed = steps.filter((s: any) => s.status === "completed").length;
            const pct = Math.round((completed / steps.length) * 100);
            return (
              <Card key={r.id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setSelectedId(r.id)} data-testid={`card-onboarding-${r.id}`}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-bold">{r.client?.companyName || "Carrier"}</div>
                      <div className="text-xs text-muted-foreground">Started {r.createdAt ? format(new Date(r.createdAt), "MMM dd, yyyy") : ""}</div>
                    </div>
                    <Badge variant={r.status === "completed" ? "default" : "secondary"}>
                      {r.status === "completed" ? "Complete" : `Step ${r.currentStep}/10`}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-medium">{pct}%</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
