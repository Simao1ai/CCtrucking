import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
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
  Mail, Send, Plus, Trash2, Clock, CheckCircle,
  AlertCircle, Zap, FileText, Users, Loader2, Eye, BarChart3, Edit
} from "lucide-react";
import { format } from "date-fns";
import type { Client } from "@shared/schema";

function sanitizeHtmlPreview(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('script, iframe, object, embed, form, link, style').forEach(el => el.remove());
  div.querySelectorAll('*').forEach(el => {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith('on') || attr.value.startsWith('javascript:')) {
        el.removeAttribute(attr.name);
      }
    }
  });
  return div.innerHTML;
}

interface EmailStats {
  campaigns: number;
  templates: number;
  activeAutomations: number;
  totalMessages: number;
  sentMessages: number;
  failedMessages: number;
  emailEnabled: boolean;
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
  { value: "invoice", label: "Invoice" },
  { value: "reminder", label: "Reminder" },
  { value: "compliance", label: "Compliance" },
  { value: "welcome", label: "Welcome" },
  { value: "newsletter", label: "Newsletter" },
  { value: "promotion", label: "Promotion" },
  { value: "general", label: "General" },
];

export default function AdminEmailCampaigns() {
  const { data: stats, isLoading: statsLoading } = useQuery<EmailStats>({
    queryKey: ["/api/admin/email-campaigns/stats"],
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="page-admin-email-campaigns">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Email Campaigns</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create and send email campaigns, templates, and automated emails to your clients
        </p>
      </div>

      {!stats?.emailEnabled && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50" data-testid="banner-email-not-configured">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Email service not yet configured</p>
            <p className="text-xs text-muted-foreground">
              SMTP credentials need to be configured by the platform administrator before emails can be sent. You can still create campaigns, templates, and automations.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Campaigns" value={stats?.campaigns || 0} subtitle={`${stats?.sentMessages || 0} emails sent`} icon={Send} iconColor="text-blue-600 dark:text-blue-400" iconBg="bg-blue-100 dark:bg-blue-900/40" accent="bg-blue-500" />
        <StatCard title="Templates" value={stats?.templates || 0} subtitle="Email templates" icon={FileText} iconColor="text-purple-600 dark:text-purple-400" iconBg="bg-purple-100 dark:bg-purple-900/40" accent="bg-purple-500" />
        <StatCard title="Automations" value={stats?.activeAutomations || 0} subtitle="Active triggers" icon={Zap} iconColor="text-amber-600 dark:text-amber-400" iconBg="bg-amber-100 dark:bg-amber-900/40" accent="bg-amber-500" />
        <StatCard title="Delivered" value={stats?.sentMessages || 0} subtitle={`${stats?.failedMessages || 0} failed`} icon={CheckCircle} iconColor="text-emerald-600 dark:text-emerald-400" iconBg="bg-emerald-100 dark:bg-emerald-900/40" accent="bg-emerald-500" />
      </div>

      <Tabs defaultValue="campaigns" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-0.5 p-0.5" data-testid="tabs-email-campaigns">
          <TabsTrigger value="campaigns" data-testid="tab-campaigns" className="flex-1 text-xs gap-1">
            <Send className="w-3.5 h-3.5" /> Campaigns
          </TabsTrigger>
          <TabsTrigger value="templates" data-testid="tab-templates" className="flex-1 text-xs gap-1">
            <FileText className="w-3.5 h-3.5" /> Templates
          </TabsTrigger>
          <TabsTrigger value="automations" data-testid="tab-automations" className="flex-1 text-xs gap-1">
            <Zap className="w-3.5 h-3.5" /> Automations
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history" className="flex-1 text-xs gap-1">
            <Clock className="w-3.5 h-3.5" /> History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="mt-4"><CampaignsTab /></TabsContent>
        <TabsContent value="templates" className="mt-4"><TemplatesTab /></TabsContent>
        <TabsContent value="automations" className="mt-4"><AutomationsTab /></TabsContent>
        <TabsContent value="history" className="mt-4"><HistoryTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function MergeTokenButtons({ onInsert }: { onInsert: (token: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {MERGE_TOKENS.map(t => (
        <button
          key={t.token}
          type="button"
          className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted-foreground/10 border border-border/50 text-muted-foreground"
          onClick={() => onInsert(t.token)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function CampaignsTab() {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);

  const { data: campaigns = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/email-campaigns/campaigns"],
  });

  const { data: allClients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/email-campaigns/templates"],
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/admin/email-campaigns/campaigns/${id}/send`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-campaigns/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-campaigns/stats"] });
      toast({ title: "Campaign sent", description: "Emails are being delivered" });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/email-campaigns/campaigns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-campaigns/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-campaigns/stats"] });
    },
  });

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Email Campaigns</h2>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-create-email-campaign">
              <Plus className="w-3.5 h-3.5 mr-1" /> New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <CreateCampaignForm
              clients={allClients}
              templates={templates}
              onClose={() => setShowCreate(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No email campaigns yet. Create your first email campaign.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {campaigns.map((c: any) => (
            <Card key={c.id} data-testid={`card-email-campaign-${c.id}`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium truncate" data-testid={`text-email-campaign-name-${c.id}`}>{c.name}</h3>
                      <Badge variant="outline" className={
                        c.status === "sent" ? "text-emerald-600 border-emerald-200 dark:text-emerald-400" :
                        c.status === "scheduled" ? "text-blue-600 border-blue-200 dark:text-blue-400" :
                        "text-muted-foreground"
                      } data-testid={`badge-email-campaign-status-${c.id}`}>
                        {c.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">Subject: {c.subject}</p>
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
                        data-testid={`button-send-email-campaign-${c.id}`}
                      >
                        <Send className="w-3 h-3 mr-1" /> Send
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => deleteMutation.mutate(c.id)}
                      data-testid={`button-delete-email-campaign-${c.id}`}
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

function CreateCampaignForm({ clients, templates, onClose }: {
  clients: Client[];
  templates: any[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [audienceType, setAudienceType] = useState("all");
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/email-campaigns/campaigns", {
        name,
        subject,
        bodyHtml,
        audienceType,
        clientIds: audienceType === "selected" ? selectedClients : [],
        templateId: templateId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-campaigns/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-campaigns/stats"] });
      toast({ title: "Email campaign created" });
      onClose();
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create Email Campaign</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Campaign Name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. March Newsletter" data-testid="input-email-campaign-name" />
        </div>

        {templates.length > 0 && (
          <div>
            <Label>Use Template (optional)</Label>
            <Select value={templateId} onValueChange={v => {
              setTemplateId(v);
              const t = templates.find((t: any) => t.id === v);
              if (t) {
                setSubject(t.subject);
                setBodyHtml(t.bodyHtml);
              }
            }}>
              <SelectTrigger data-testid="select-email-campaign-template">
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label>Subject Line</Label>
          <Input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="e.g. Important Update from {{companyName}}"
            data-testid="input-email-campaign-subject"
          />
          <MergeTokenButtons onInsert={token => setSubject(prev => prev + token)} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>Email Body (HTML)</Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs gap-1"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="w-3 h-3" /> {showPreview ? "Edit" : "Preview"}
            </Button>
          </div>
          {showPreview ? (
            <div className="border rounded-lg p-4 min-h-[200px] bg-white dark:bg-gray-950" data-testid="preview-email-body">
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtmlPreview(bodyHtml) }} />
            </div>
          ) : (
            <Textarea
              value={bodyHtml}
              onChange={e => setBodyHtml(e.target.value)}
              placeholder="<p>Hello {{clientName}},</p><p>We wanted to let you know...</p>"
              rows={8}
              className="font-mono text-xs"
              data-testid="textarea-email-campaign-body"
            />
          )}
          <MergeTokenButtons onInsert={token => setBodyHtml(prev => prev + token)} />
        </div>

        <div>
          <Label>Audience</Label>
          <Select value={audienceType} onValueChange={setAudienceType}>
            <SelectTrigger data-testid="select-email-audience-type">
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
              {clients.filter(c => c.email).map(c => (
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
                  <span className="text-xs text-muted-foreground ml-auto">{c.email}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => createMutation.mutate()}
          disabled={!name || !subject || !bodyHtml || createMutation.isPending}
          data-testid="button-save-email-campaign"
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
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [bodyHtml, setBodyHtml] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const { data: templates = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/email-campaigns/templates"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/email-campaigns/templates", { name, subject, category, bodyHtml });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-campaigns/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-campaigns/stats"] });
      toast({ title: "Template created" });
      setShowCreate(false);
      setName(""); setSubject(""); setCategory("general"); setBodyHtml("");
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/email-campaigns/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-campaigns/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-campaigns/stats"] });
    },
  });

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Email Templates</h2>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-create-email-template">
              <Plus className="w-3.5 h-3.5 mr-1" /> New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Email Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Template Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Monthly Newsletter" data-testid="input-email-template-name" />
              </div>
              <div>
                <Label>Subject Line</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Your Monthly Update from {{companyName}}" data-testid="input-email-template-subject" />
                <MergeTokenButtons onInsert={token => setSubject(prev => prev + token)} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger data-testid="select-email-template-category">
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
                <div className="flex items-center justify-between mb-1">
                  <Label>Email Body (HTML)</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs gap-1"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    <Eye className="w-3 h-3" /> {showPreview ? "Edit" : "Preview"}
                  </Button>
                </div>
                {showPreview ? (
                  <div className="border rounded-lg p-4 min-h-[200px] bg-white dark:bg-gray-950">
                    <div dangerouslySetInnerHTML={{ __html: sanitizeHtmlPreview(bodyHtml) }} />
                  </div>
                ) : (
                  <Textarea
                    value={bodyHtml}
                    onChange={e => setBodyHtml(e.target.value)}
                    placeholder="<h2>Hello {{clientName}},</h2><p>Here is your monthly update...</p>"
                    rows={8}
                    className="font-mono text-xs"
                    data-testid="textarea-email-template-body"
                  />
                )}
                <MergeTokenButtons onInsert={token => setBodyHtml(prev => prev + token)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!name || !subject || !bodyHtml || createMutation.isPending}
                data-testid="button-save-email-template"
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
            <p className="text-sm text-muted-foreground">No email templates yet. Create your first template.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {templates.map((t: any) => (
            <Card key={t.id} data-testid={`card-email-template-${t.id}`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium truncate">{t.name}</h3>
                      <Badge variant="outline" className="text-xs">{t.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">Subject: {t.subject}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => deleteMutation.mutate(t.id)}
                    data-testid={`button-delete-email-template-${t.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
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

function AutomationsTab() {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("");
  const [triggerConfig, setTriggerConfig] = useState<any>({});
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");

  const { data: automations = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/email-campaigns/automations"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/email-campaigns/automations", {
        name,
        triggerType,
        triggerConfig,
        subject,
        bodyHtml,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-campaigns/automations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-campaigns/stats"] });
      toast({ title: "Automation created" });
      setShowCreate(false);
      setName(""); setTriggerType(""); setTriggerConfig({}); setSubject(""); setBodyHtml("");
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      await apiRequest("PATCH", `/api/admin/email-campaigns/automations/${id}`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-campaigns/automations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-campaigns/stats"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/email-campaigns/automations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-campaigns/automations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-campaigns/stats"] });
    },
  });

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Email Automations</h2>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-create-email-automation">
              <Plus className="w-3.5 h-3.5 mr-1" /> New Automation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Email Automation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Automation Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Welcome Email" data-testid="input-email-automation-name" />
              </div>
              <div>
                <Label>Trigger Type</Label>
                <Select value={triggerType} onValueChange={setTriggerType}>
                  <SelectTrigger data-testid="select-email-trigger-type">
                    <SelectValue placeholder="Choose a trigger..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {triggerType && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {TRIGGER_TYPES.find(t => t.value === triggerType)?.desc}
                  </p>
                )}
              </div>

              {triggerType === "invoice_due_reminder" && (
                <div>
                  <Label>Days Before Due Date</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={triggerConfig.daysBefore || 3}
                    onChange={e => setTriggerConfig({ daysBefore: parseInt(e.target.value) || 3 })}
                    data-testid="input-email-days-before"
                  />
                </div>
              )}
              {triggerType === "overdue_invoice" && (
                <div>
                  <Label>Days After Due Date</Label>
                  <Input
                    type="number"
                    min={1}
                    max={90}
                    value={triggerConfig.daysOverdue || 1}
                    onChange={e => setTriggerConfig({ daysOverdue: parseInt(e.target.value) || 1 })}
                    data-testid="input-email-days-overdue"
                  />
                </div>
              )}

              <div>
                <Label>Subject Line</Label>
                <Input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. Reminder: Invoice {{invoiceNumber}} Due Soon"
                  data-testid="input-email-automation-subject"
                />
                <MergeTokenButtons onInsert={token => setSubject(prev => prev + token)} />
              </div>

              <div>
                <Label>Email Body (HTML)</Label>
                <Textarea
                  value={bodyHtml}
                  onChange={e => setBodyHtml(e.target.value)}
                  placeholder="<p>Hello {{clientName}},</p><p>This is a reminder that your invoice {{invoiceNumber}} for {{amount}} is due on {{dueDate}}.</p>"
                  rows={6}
                  className="font-mono text-xs"
                  data-testid="textarea-email-automation-body"
                />
                <MergeTokenButtons onInsert={token => setBodyHtml(prev => prev + token)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!name || !triggerType || !subject || !bodyHtml || createMutation.isPending}
                data-testid="button-save-email-automation"
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
            <p className="text-sm text-muted-foreground">No email automations yet. Set up automated email triggers.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {automations.map((a: any) => (
            <Card key={a.id} data-testid={`card-email-automation-${a.id}`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium truncate">{a.name}</h3>
                      <Badge variant="outline" className={
                        a.isActive ? "text-emerald-600 border-emerald-200 dark:text-emerald-400" : "text-muted-foreground"
                      }>
                        {a.isActive ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {TRIGGER_TYPES.find(t => t.value === a.triggerType)?.label || a.triggerType}
                      {a.subject && <span className="ml-2">Subject: {a.subject}</span>}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      <span>{a.totalSent || 0} emails sent</span>
                      {a.lastTriggeredAt && <span>Last run {format(new Date(a.lastTriggeredAt), "MMM d, yyyy")}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <Switch
                      checked={a.isActive}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: a.id, enabled: checked })}
                      data-testid={`switch-email-automation-${a.id}`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => deleteMutation.mutate(a.id)}
                      data-testid={`button-delete-email-automation-${a.id}`}
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

function HistoryTab() {
  const { data: messages = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/email-campaigns/messages"],
  });

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Email History</h2>

      {messages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No emails sent yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {messages.map((m: any) => (
            <Card key={m.id} data-testid={`card-email-message-${m.id}`}>
              <CardContent className="py-2.5 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{m.toEmail}</span>
                      <Badge variant="outline" className={
                        m.status === "sent" ? "text-emerald-600 border-emerald-200 dark:text-emerald-400" :
                        m.status === "failed" ? "text-red-600 border-red-200 dark:text-red-400" :
                        "text-muted-foreground"
                      }>
                        {m.status === "sent" ? <CheckCircle className="w-2.5 h-2.5 mr-0.5" /> :
                         m.status === "failed" ? <AlertCircle className="w-2.5 h-2.5 mr-0.5" /> : null}
                        {m.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">Subject: {m.subject}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                      {m.sentAt && <span>{format(new Date(m.sentAt), "MMM d, yyyy h:mm a")}</span>}
                      {m.errorMessage && <span className="text-red-500 truncate max-w-[200px]">{m.errorMessage}</span>}
                    </div>
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
