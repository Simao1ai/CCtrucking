import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { ServiceTicket } from "@shared/schema";

const serviceTypes = [
  { value: "Business Setup", label: "Open New Business (LLC Formation)" },
  { value: "IFTA Permit", label: "IFTA Filing" },
  { value: "Quarterly Tax", label: "Quarterly Taxes" },
  { value: "Corporate Tax", label: "Corporate Taxes" },
  { value: "Personal Tax", label: "Personal Taxes" },
  { value: "Plates", label: "Plates / Tags" },
  { value: "IRP", label: "IRP (International Registration Plan)" },
  { value: "DOT Permit", label: "DOT Compliance / Permit" },
  { value: "UCR Registration", label: "UCR Registration" },
  { value: "MCS-150 Update", label: "MCS-150 Biennial Update" },
  { value: "BOC-3", label: "BOC-3 Filing" },
  { value: "EIN Application", label: "EIN Application" },
  { value: "Other", label: "Other Service" },
];

const statusConfig: Record<string, { icon: any; color: string }> = {
  open: { icon: AlertCircle, color: "secondary" },
  in_progress: { icon: Loader2, color: "default" },
  completed: { icon: CheckCircle, color: "default" },
  on_hold: { icon: Clock, color: "secondary" },
};

export default function PortalServices() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [serviceType, setServiceType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tab, setTab] = useState("all");

  const { data: tickets = [], isLoading } = useQuery<ServiceTicket[]>({ queryKey: ["/api/portal/tickets"] });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/portal/tickets", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/tickets"] });
      toast({ title: "Service requested!", description: "Your request has been submitted. We'll get started soon." });
      setOpen(false);
      setServiceType("");
      setTitle("");
      setDescription("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit request. Please try again.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceType || !title) return;
    createMutation.mutate({ serviceType, title, description });
  };

  const filtered = tab === "all" ? tickets : tickets.filter(t => t.status === tab);

  const tabs = [
    { key: "all", label: "All", count: tickets.length },
    { key: "open", label: "Open", count: tickets.filter(t => t.status === "open").length },
    { key: "in_progress", label: "In Progress", count: tickets.filter(t => t.status === "in_progress").length },
    { key: "completed", label: "Completed", count: tickets.filter(t => t.status === "completed").length },
  ];

  return (
    <div className="p-6 space-y-6" data-testid="page-portal-services">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Service Requests</h1>
          <p className="text-muted-foreground">Request new services or track existing ones</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-service">
              <Plus className="w-4 h-4 mr-2" />
              Request Service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request a New Service</DialogTitle>
              <DialogDescription>Choose a service type and provide details about what you need.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Service Type</Label>
                <Select value={serviceType} onValueChange={setServiceType}>
                  <SelectTrigger data-testid="select-service-type">
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Brief description of what you need"
                  required
                  data-testid="input-service-title"
                />
              </div>
              <div className="space-y-2">
                <Label>Details</Label>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Any additional details, deadlines, or special requirements..."
                  rows={4}
                  data-testid="input-service-description"
                />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending || !serviceType || !title} data-testid="button-submit-service">
                {createMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 border-b">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            data-testid={`tab-${t.key}`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No service requests found.</p>
            <Button variant="outline" className="mt-4" onClick={() => setOpen(true)}>Request Your First Service</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(ticket => {
            const config = statusConfig[ticket.status] || statusConfig.open;
            const StatusIcon = config.icon;
            return (
              <Card key={ticket.id} data-testid={`ticket-${ticket.id}`}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <StatusIcon className={`w-5 h-5 mt-0.5 ${ticket.status === "in_progress" ? "animate-spin text-primary" : ticket.status === "completed" ? "text-green-500" : "text-muted-foreground"}`} />
                      <div>
                        <div className="font-medium">{ticket.title}</div>
                        <div className="text-sm text-muted-foreground mt-1">{ticket.serviceType}</div>
                        {ticket.description && <p className="text-sm text-muted-foreground mt-2">{ticket.description}</p>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant={config.color as any}>{ticket.status.replace("_", " ")}</Badge>
                      {ticket.dueDate && (
                        <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1 justify-end">
                          <Clock className="w-3 h-3" />
                          Due {format(new Date(ticket.dueDate), "MMM d, yyyy")}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        Opened {format(new Date(ticket.createdAt), "MMM d, yyyy")}
                      </div>
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
