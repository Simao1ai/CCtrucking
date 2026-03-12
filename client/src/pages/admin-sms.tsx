import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  MessageSquare, Phone, Send, Plus, Trash2, Clock, CheckCircle,
  AlertCircle, Zap, FileText, Search, Users, Loader2, X, Settings, BarChart3
} from "lucide-react";
import { format } from "date-fns";
import type { Client } from "@shared/schema";

interface SmsStats {
  phoneNumbers: number;
  campaigns: number;
  templates: number;
  activeAutomations: number;
  totalMessages: number;
  sentMessages: number;
  failedMessages: number;
  smsEnabled: boolean;
}

const MERGE_TOKENS = [
  { token: "{{clientName}}", label: "Client Name" },
  { token: "{{companyName}}", label: "Company Name" },
  { token: "{{email}}", label: "Email" },
  { token: "{{phone}}", label: "Phone" },
  { token: "{{invoiceNumber}}", label: "Invoice #" },
  { token: "{{amount}}", label: "Amount" },
  { token: "{{dueDate}}", label: "Due Date" },
];

const TRIGGER_TYPES = [
  { value: "invoice_due_reminder", label: "Invoice Due Reminder", desc: "Send before an invoice is due" },
  { value: "overdue_invoice", label: "Overdue Invoice Alert", desc: "Send when invoice becomes overdue" },
  { value: "welcome_message", label: "New Client Welcome", desc: "Send when a new client is added" },
  { value: "compliance_reminder", label: "Compliance Reminder", desc: "Send before compliance deadlines" },
];

const TEMPLATE_CATEGORIES = [
  { value: "payment", label: "Payment" },
  { value: "reminder", label: "Reminder" },
  { value: "compliance", label: "Compliance" },
  { value: "welcome", label: "Welcome" },
  { value: "promotion", label: "Promotion" },
  { value: "general", label: "General" },
];

export default function AdminSms() {
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<SmsStats>({
    queryKey: ["/api/admin/sms/stats"],
  });

  if (statsLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="page-admin-sms">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Text Campaigns</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Send SMS reminders, alerts, and campaigns to your clients
        </p>
      </div>

      {!stats?.smsEnabled && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50" data-testid="banner-sms-not-configured">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">SMS service not yet activated</p>
            <p className="text-xs text-muted-foreground">
              Twilio credentials need to be configured by the platform administrator before text messages can be sent. You can still create campaigns, templates, and automations.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Phone Numbers" value={stats?.phoneNumbers || 0} subtitle="Active numbers" icon={Phone} iconColor="text-blue-600 dark:text-blue-400" iconBg="bg-blue-100 dark:bg-blue-900/40" accent="bg-blue-500" />
        <StatCard title="Campaigns" value={stats?.campaigns || 0} subtitle={`${stats?.sentMessages || 0} messages sent`} icon={Send} iconColor="text-emerald-600 dark:text-emerald-400" iconBg="bg-emerald-100 dark:bg-emerald-900/40" accent="bg-emerald-500" />
        <StatCard title="Templates" value={stats?.templates || 0} subtitle="Message templates" icon={FileText} iconColor="text-purple-600 dark:text-purple-400" iconBg="bg-purple-100 dark:bg-purple-900/40" accent="bg-purple-500" />
        <StatCard title="Automations" value={stats?.activeAutomations || 0} subtitle="Active triggers" icon={Zap} iconColor="text-amber-600 dark:text-amber-400" iconBg="bg-amber-100 dark:bg-amber-900/40" accent="bg-amber-500" />
      </div>

      <Tabs defaultValue="campaigns" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-0.5 p-0.5" data-testid="tabs-sms">
          <TabsTrigger value="campaigns" data-testid="tab-campaigns" className="flex-1 text-xs gap-1">
            <Send className="w-3.5 h-3.5" /> Campaigns
          </TabsTrigger>
          <TabsTrigger value="templates" data-testid="tab-templates" className="flex-1 text-xs gap-1">
            <FileText className="w-3.5 h-3.5" /> Templates
          </TabsTrigger>
          <TabsTrigger value="automations" data-testid="tab-automations" className="flex-1 text-xs gap-1">
            <Zap className="w-3.5 h-3.5" /> Automations
          </TabsTrigger>
          <TabsTrigger value="numbers" data-testid="tab-numbers" className="flex-1 text-xs gap-1">
            <Phone className="w-3.5 h-3.5" /> Phone Numbers
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history" className="flex-1 text-xs gap-1">
            <Clock className="w-3.5 h-3.5" /> History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="mt-4"><CampaignsTab /></TabsContent>
        <TabsContent value="templates" className="mt-4"><TemplatesTab /></TabsContent>
        <TabsContent value="automations" className="mt-4"><AutomationsTab /></TabsContent>
        <TabsContent value="numbers" className="mt-4"><PhoneNumbersTab /></TabsContent>
        <TabsContent value="history" className="mt-4"><HistoryTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function CampaignsTab() {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);

  const { data: campaigns = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/sms/campaigns"],
  });

  const { data: allClients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/sms/templates"],
  });

  const { data: phoneNumbers = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/sms/phone-numbers"],
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/admin/sms/campaigns/${id}/send`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sms/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sms/stats"] });
      toast({ title: "Campaign sent", description: "Messages are being delivered" });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/sms/campaigns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sms/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sms/stats"] });
    },
  });

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Campaigns</h2>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-create-campaign">
              <Plus className="w-3.5 h-3.5 mr-1" /> New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <CreateCampaignForm
              clients={allClients}
              templates={templates}
              phoneNumbers={phoneNumbers}
              onClose={() => setShowCreate(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Send className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No campaigns yet. Create your first text campaign.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {campaigns.map((c: any) => (
            <Card key={c.id} data-testid={`card-campaign-${c.id}`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium truncate" data-testid={`text-campaign-name-${c.id}`}>{c.name}</h3>
                      <Badge variant="outline" className={
                        c.status === "sent" ? "text-emerald-600 border-emerald-200 dark:text-emerald-400" :
                        c.status === "scheduled" ? "text-blue-600 border-blue-200 dark:text-blue-400" :
                        "text-muted-foreground"
                      } data-testid={`badge-campaign-status-${c.id}`}>
                        {c.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.messageBody}</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      <span><Users className="w-3 h-3 inline mr-0.5" />{c.audienceType}</span>
                      {c.sentAt && <span>Sent {format(new Date(c.sentAt), "MMM d, yyyy")}</span>}
                      {c.totalRecipients > 0 && (
                        <span>{c.delivered} delivered · {c.failed} failed</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {c.status === "draft" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => sendMutation.mutate(c.id)}
                        disabled={sendMutation.isPending}
                        data-testid={`button-send-campaign-${c.id}`}
                      >
                        <Send className="w-3 h-3 mr-1" /> Send
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => deleteMutation.mutate(c.id)}
                      data-testid={`button-delete-campaign-${c.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateCampaignForm({ clients, templates, phoneNumbers, onClose }: {
  clients: Client[];
  templates: any[];
  phoneNumbers: any[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [audienceType, setAudienceType] = useState("all");
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [fromNumberId, setFromNumberId] = useState("");
  const [templateId, setTemplateId] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/sms/campaigns", {
        name,
        messageBody,
        audienceType,
        clientIds: audienceType === "selected" ? selectedClients : [],
        fromNumberId: fromNumberId || null,
        templateId: templateId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sms/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sms/stats"] });
      toast({ title: "Campaign created" });
      onClose();
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create Campaign</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Campaign Name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Payment Reminder - March" data-testid="input-campaign-name" />
        </div>

        {templates.length > 0 && (
          <div>
            <Label>Use Template (optional)</Label>
            <Select value={templateId} onValueChange={v => {
              setTemplateId(v);
              const t = templates.find(t => t.id === v);
              if (t) setMessageBody(t.body);
            }}>
              <SelectTrigger data-testid="select-campaign-template">
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label>Message Body</Label>
          <Textarea
            value={messageBody}
            onChange={e => setMessageBody(e.target.value)}
            placeholder="Hi {{clientName}}, this is a reminder..."
            rows={4}
            data-testid="textarea-campaign-body"
          />
          <div className="flex flex-wrap gap-1 mt-1.5">
            {MERGE_TOKENS.map(t => (
              <button
                key={t.token}
                type="button"
                className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted-foreground/10 border border-border/50 text-muted-foreground"
                onClick={() => setMessageBody(prev => prev + t.token)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">{messageBody.length}/160 characters</p>
        </div>

        <div>
          <Label>Audience</Label>
          <Select value={audienceType} onValueChange={setAudienceType}>
            <SelectTrigger data-testid="select-audience-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Active Clients</SelectItem>
              <SelectItem value="selected">Selected Clients</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {audienceType === "selected" && (
          <div>
            <Label>Select Clients</Label>
            <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
              {clients.filter(c => c.phone).map(c => (
                <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5">
                  <input
                    type="checkbox"
                    checked={selectedClients.includes(c.id)}
                    onChange={e => {
                      if (e.target.checked) setSelectedClients(prev => [...prev, c.id]);
                      else setSelectedClients(prev => prev.filter(id => id !== c.id));
                    }}
                    className="rounded"
                  />
                  <span>{c.companyName}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{c.phone}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {phoneNumbers.length > 0 && (
          <div>
            <Label>Send From Number</Label>
            <Select value={fromNumberId} onValueChange={setFromNumberId}>
              <SelectTrigger data-testid="select-from-number">
                <SelectValue placeholder="Use default number" />
              </SelectTrigger>
              <SelectContent>
                {phoneNumbers.map(n => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.friendlyName || n.phoneNumber} ({n.phoneNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => createMutation.mutate()}
          disabled={!name || !messageBody || createMutation.isPending}
          data-testid="button-save-campaign"
        >
          {createMutation.isPending && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
          Create Campaign
        </Button>
      </DialogFooter>
    </>
  );
}

function TemplatesTab() {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("general");
  const [body, setBody] = useState("");

  const { data: templates = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/sms/templates"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/sms/templates", { name, category, body });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sms/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sms/stats"] });
      toast({ title: "Template created" });
      setShowCreate(false);
      setName(""); setCategory("general"); setBody("");
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/sms/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sms/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sms/stats"] });
    },
  });

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Message Templates</h2>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-create-template">
              <Plus className="w-3.5 h-3.5 mr-1" /> New Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Template Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Payment Reminder" data-testid="input-template-name" />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger data-testid="select-template-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Message Body</Label>
                <Textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Hi {{clientName}}, your invoice {{invoiceNumber}} for {{amount}} is due on {{dueDate}}."
                  rows={4}
                  data-testid="textarea-template-body"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {MERGE_TOKENS.map(t => (
                    <button
                      key={t.token}
                      type="button"
                      className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted-foreground/10 border border-border/50 text-muted-foreground"
                      onClick={() => setBody(prev => prev + t.token)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{body.length}/160 characters</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!name || !body || createMutation.isPending}
                data-testid="button-save-template"
              >
                {createMutation.isPending && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                Create Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No templates yet. Create reusable message templates.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {templates.map((t: any) => (
            <Card key={t.id} data-testid={`card-template-${t.id}`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium">{t.name}</h3>
                    <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => deleteMutation.mutate(t.id)} data-testid={`button-delete-template-${t.id}`}>
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{t.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AutomationsTab() {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("invoice_due_reminder");
  const [daysBefore, setDaysBefore] = useState("3");
  const [daysOverdue, setDaysOverdue] = useState("1");
  const [messageBody, setMessageBody] = useState("");

  const { data: automations = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/sms/automations"],
  });

  const { data: phoneNumbers = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/sms/phone-numbers"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const triggerConfig: any = {};
      if (triggerType === "invoice_due_reminder") triggerConfig.daysBefore = parseInt(daysBefore) || 3;
      if (triggerType === "overdue_invoice") triggerConfig.daysOverdue = parseInt(daysOverdue) || 1;
      if (triggerType === "compliance_reminder") triggerConfig.daysBefore = parseInt(daysBefore) || 7;

      await apiRequest("POST", "/api/admin/sms/automations", {
        name,
        triggerType,
        triggerConfig,
        messageBody,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sms/automations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sms/stats"] });
      toast({ title: "Automation created" });
      setShowCreate(false);
      setName(""); setMessageBody("");
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiRequest("PATCH", `/api/admin/sms/automations/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sms/automations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sms/stats"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/sms/automations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sms/automations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sms/stats"] });
    },
  });

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Automated Triggers</h2>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-create-automation">
              <Plus className="w-3.5 h-3.5 mr-1" /> New Automation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Automation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Automation Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 3-Day Payment Reminder" data-testid="input-automation-name" />
              </div>
              <div>
                <Label>Trigger Type</Label>
                <Select value={triggerType} onValueChange={setTriggerType}>
                  <SelectTrigger data-testid="select-trigger-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {TRIGGER_TYPES.find(t => t.value === triggerType)?.desc}
                </p>
              </div>

              {(triggerType === "invoice_due_reminder" || triggerType === "compliance_reminder") && (
                <div>
                  <Label>Days Before Due Date</Label>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={daysBefore}
                    onChange={e => setDaysBefore(e.target.value)}
                    data-testid="input-days-before"
                  />
                </div>
              )}

              {triggerType === "overdue_invoice" && (
                <div>
                  <Label>Days After Due Date</Label>
                  <Input
                    type="number"
                    min="1"
                    max="90"
                    value={daysOverdue}
                    onChange={e => setDaysOverdue(e.target.value)}
                    data-testid="input-days-overdue"
                  />
                </div>
              )}

              <div>
                <Label>Message Body</Label>
                <Textarea
                  value={messageBody}
                  onChange={e => setMessageBody(e.target.value)}
                  placeholder="Hi {{clientName}}, your invoice {{invoiceNumber}} for {{amount}} is due on {{dueDate}}."
                  rows={4}
                  data-testid="textarea-automation-body"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {MERGE_TOKENS.map(t => (
                    <button
                      key={t.token}
                      type="button"
                      className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted-foreground/10 border border-border/50 text-muted-foreground"
                      onClick={() => setMessageBody(prev => prev + t.token)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!name || !messageBody || createMutation.isPending}
                data-testid="button-save-automation"
              >
                {createMutation.isPending && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                Create Automation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {automations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No automations yet. Set up automatic triggers to send texts.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {automations.map((a: any) => {
            const trigger = TRIGGER_TYPES.find(t => t.value === a.triggerType);
            const config = a.triggerConfig as any;
            return (
              <Card key={a.id} data-testid={`card-automation-${a.id}`}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Zap className={`w-3.5 h-3.5 ${a.isActive ? "text-amber-500" : "text-muted-foreground"}`} />
                        <h3 className="text-sm font-medium">{a.name}</h3>
                        <Badge variant="outline" className={a.isActive ? "text-emerald-600 border-emerald-200 dark:text-emerald-400" : "text-muted-foreground"}>
                          {a.isActive ? "Active" : "Paused"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {trigger?.label}
                        {config?.daysBefore && ` - ${config.daysBefore} days before`}
                        {config?.daysOverdue && ` - ${config.daysOverdue} days after`}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                        <span>{a.totalSent || 0} messages sent</span>
                        {a.lastTriggeredAt && <span>Last run: {format(new Date(a.lastTriggeredAt), "MMM d")}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <Switch
                        checked={a.isActive}
                        onCheckedChange={checked => toggleMutation.mutate({ id: a.id, isActive: checked })}
                        data-testid={`switch-automation-${a.id}`}
                      />
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => deleteMutation.mutate(a.id)} data-testid={`button-delete-automation-${a.id}`}>
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
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

function PhoneNumbersTab() {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [friendlyName, setFriendlyName] = useState("");

  const { data: numbers = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/sms/phone-numbers"],
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/sms/phone-numbers", { phoneNumber, friendlyName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sms/phone-numbers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sms/stats"] });
      toast({ title: "Phone number added" });
      setShowAdd(false);
      setPhoneNumber(""); setFriendlyName("");
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/sms/phone-numbers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sms/phone-numbers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sms/stats"] });
    },
  });

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Phone Numbers</h2>
          <p className="text-xs text-muted-foreground">Numbers used to send text messages to your clients</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-number">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Number
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Phone Number</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Phone Number</Label>
                <Input
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="+15551234567"
                  data-testid="input-phone-number"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Enter a Twilio phone number in E.164 format (e.g., +15551234567)
                </p>
              </div>
              <div>
                <Label>Friendly Name (optional)</Label>
                <Input
                  value={friendlyName}
                  onChange={e => setFriendlyName(e.target.value)}
                  placeholder="e.g. Main Business Line"
                  data-testid="input-friendly-name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button
                onClick={() => addMutation.mutate()}
                disabled={!phoneNumber || addMutation.isPending}
                data-testid="button-save-number"
              >
                {addMutation.isPending && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                Add Number
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {numbers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Phone className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No phone numbers configured yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Add a Twilio phone number to start sending texts.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {numbers.map((n: any) => (
            <Card key={n.id} data-testid={`card-number-${n.id}`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{n.friendlyName || n.phoneNumber}</p>
                      <p className="text-xs text-muted-foreground">{n.phoneNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={n.isActive ? "text-emerald-600 border-emerald-200" : "text-muted-foreground"}>
                      {n.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => deleteMutation.mutate(n.id)} data-testid={`button-delete-number-${n.id}`}>
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryTab() {
  const [search, setSearch] = useState("");
  const { data: messages = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/sms/messages"],
  });

  if (isLoading) return <Skeleton className="h-48" />;

  const filteredMessages = messages.filter((m: any) =>
    m.toNumber.includes(search) || m.body.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Message History</h2>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search messages..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
            data-testid="input-search-messages"
          />
        </div>
      </div>

      {filteredMessages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {messages.length === 0 ? "No messages sent yet" : "No matching messages"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {filteredMessages.map((m: any) => (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors" data-testid={`row-message-${m.id}`}>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                m.status === "sent" || m.status === "delivered" ? "bg-emerald-500" :
                m.status === "failed" ? "bg-red-500" :
                "bg-amber-500"
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{m.toNumber}</span>
                  <Badge variant="outline" className={`text-[10px] ${
                    m.status === "sent" || m.status === "delivered" ? "text-emerald-600 border-emerald-200" :
                    m.status === "failed" ? "text-red-600 border-red-200" :
                    "text-amber-600 border-amber-200"
                  }`}>
                    {m.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{m.body}</p>
                {m.errorMessage && (
                  <p className="text-[11px] text-red-500 mt-0.5">{m.errorMessage}</p>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                {m.sentAt ? format(new Date(m.sentAt), "MMM d, h:mm a") : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
