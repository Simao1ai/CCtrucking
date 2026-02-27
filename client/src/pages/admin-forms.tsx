import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { FormTemplate, FilledForm, Client } from "@shared/schema";
import { Plus, FileText, ClipboardList, Search, Send, CheckCircle, Clock, Pencil, Eye, Trash2 } from "lucide-react";
import { format } from "date-fns";

const CATEGORIES = ["DOT Compliance", "IFTA Filing", "Tax Forms", "Business Setup", "General"];

const PLACEHOLDERS = [
  "{{client_name}}", "{{contact_name}}", "{{email}}", "{{phone}}",
  "{{dot_number}}", "{{mc_number}}", "{{ein_number}}",
  "{{address}}", "{{city}}", "{{state}}", "{{zip_code}}", "{{date}}",
];

function replacePlaceholders(content: string, client: Client): string {
  return content
    .replace(/\{\{client_name\}\}/g, client.companyName || "")
    .replace(/\{\{contact_name\}\}/g, client.contactName || "")
    .replace(/\{\{email\}\}/g, client.email || "")
    .replace(/\{\{phone\}\}/g, client.phone || "")
    .replace(/\{\{dot_number\}\}/g, client.dotNumber || "")
    .replace(/\{\{mc_number\}\}/g, client.mcNumber || "")
    .replace(/\{\{ein_number\}\}/g, client.einNumber || "")
    .replace(/\{\{address\}\}/g, client.address || "")
    .replace(/\{\{city\}\}/g, client.city || "")
    .replace(/\{\{state\}\}/g, client.state || "")
    .replace(/\{\{zip_code\}\}/g, client.zipCode || "")
    .replace(/\{\{date\}\}/g, format(new Date(), "MM/dd/yyyy"));
}

function statusBadge(status: string) {
  switch (status) {
    case "draft": return <Badge variant="secondary" className="text-xs"><Clock className="w-3 h-3 mr-1" />Draft</Badge>;
    case "complete": return <Badge variant="default" className="text-xs"><CheckCircle className="w-3 h-3 mr-1" />Complete</Badge>;
    case "sent_for_signature": return <Badge className="text-xs bg-blue-600"><Send className="w-3 h-3 mr-1" />Sent for Signature</Badge>;
    default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}

export default function AdminForms() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [templateDialog, setTemplateDialog] = useState(false);
  const [editTemplate, setEditTemplate] = useState<FormTemplate | null>(null);
  const [fillDialog, setFillDialog] = useState(false);
  const [viewForm, setViewForm] = useState<FilledForm | null>(null);
  const [newTemplate, setNewTemplate] = useState({ name: "", description: "", content: "", category: "General", createdBy: null as string | null });
  const [fillState, setFillState] = useState({ templateId: "", clientId: "", name: "", filledContent: "" });

  const { data: templates = [], isLoading: loadingTemplates } = useQuery<FormTemplate[]>({
    queryKey: ["/api/admin/form-templates"],
  });

  const { data: filledForms = [], isLoading: loadingForms } = useQuery<FilledForm[]>({
    queryKey: ["/api/admin/filled-forms"],
  });

  const { data: clientsList = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const createTemplate = useMutation({
    mutationFn: async (data: typeof newTemplate) => {
      await apiRequest("POST", "/api/admin/form-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/form-templates"] });
      setTemplateDialog(false);
      setNewTemplate({ name: "", description: "", content: "", category: "General", createdBy: null });
      toast({ title: "Template created" });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FormTemplate> }) => {
      await apiRequest("PATCH", `/api/admin/form-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/form-templates"] });
      setEditTemplate(null);
      toast({ title: "Template updated" });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/form-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/form-templates"] });
      toast({ title: "Template deleted" });
    },
  });

  const createFilledForm = useMutation({
    mutationFn: async (data: typeof fillState) => {
      await apiRequest("POST", "/api/admin/filled-forms", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/filled-forms"] });
      setFillDialog(false);
      setFillState({ templateId: "", clientId: "", name: "", filledContent: "" });
      toast({ title: "Form saved" });
    },
  });

  const updateFilledForm = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FilledForm> }) => {
      await apiRequest("PATCH", `/api/admin/filled-forms/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/filled-forms"] });
      setViewForm(null);
      toast({ title: "Form updated" });
    },
  });

  const sendForSignature = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/admin/filled-forms/${id}/send-for-signature`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/filled-forms"] });
      setViewForm(null);
      toast({ title: "Sent for signature", description: "The client will be notified." });
    },
  });

  const handleSelectTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    setFillState(prev => {
      const client = prev.clientId ? clientsList.find(c => c.id === prev.clientId) : undefined;
      return {
        ...prev,
        templateId,
        name: template.name,
        filledContent: client
          ? replacePlaceholders(template.content, client)
          : template.content,
      };
    });
  };

  const handleSelectClient = (clientId: string) => {
    const client = clientsList.find(c => c.id === clientId);
    setFillState(prev => {
      const template = templates.find(t => t.id === prev.templateId);
      const baseContent = template ? template.content : prev.filledContent;
      return {
        ...prev,
        clientId,
        filledContent: client ? replacePlaceholders(baseContent, client) : baseContent,
      };
    });
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  );

  const getClientName = (clientId: string) => clientsList.find(c => c.id === clientId)?.companyName || clientId;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-forms-title">Forms</h1>
          <p className="text-sm text-muted-foreground">Manage form templates and fill out forms for clients</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={fillDialog} onOpenChange={setFillDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-fill-form">
                <Pencil className="w-4 h-4 mr-2" /> Fill Form
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Fill Out Form</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Template</Label>
                    <Select value={fillState.templateId} onValueChange={handleSelectTemplate}>
                      <SelectTrigger data-testid="select-fill-template">
                        <SelectValue placeholder="Select a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name} ({t.category})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Client</Label>
                    <Select value={fillState.clientId} onValueChange={handleSelectClient}>
                      <SelectTrigger data-testid="select-fill-client">
                        <SelectValue placeholder="Select a client..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clientsList.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Form Name</Label>
                  <Input
                    value={fillState.name}
                    onChange={e => setFillState(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., DOT Compliance Form — Lone Star Freight"
                    data-testid="input-fill-name"
                  />
                </div>
                {fillState.filledContent && (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Available placeholders: {PLACEHOLDERS.join(", ")}</p>
                  </div>
                )}
                <div>
                  <Label>Form Content</Label>
                  <Textarea
                    value={fillState.filledContent}
                    onChange={e => setFillState(prev => ({ ...prev, filledContent: e.target.value }))}
                    className="font-mono text-sm min-h-[300px]"
                    placeholder="Select a template and client to auto-fill, or type content directly..."
                    data-testid="textarea-fill-content"
                  />
                </div>
                <div className="flex gap-2 justify-end flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!fillState.clientId || !fillState.name || !fillState.filledContent) {
                        toast({ title: "Missing fields", description: "Please select a client, name, and content.", variant: "destructive" });
                        return;
                      }
                      createFilledForm.mutate({ ...fillState });
                    }}
                    disabled={createFilledForm.isPending}
                    data-testid="button-save-draft"
                  >
                    <Clock className="w-4 h-4 mr-2" /> Save as Draft
                  </Button>
                  <Button
                    onClick={() => {
                      if (!fillState.clientId || !fillState.name || !fillState.filledContent) {
                        toast({ title: "Missing fields", description: "Please select a client, name, and content.", variant: "destructive" });
                        return;
                      }
                      createFilledForm.mutate({ ...fillState, status: "complete" } as any);
                    }}
                    disabled={createFilledForm.isPending}
                    data-testid="button-save-complete"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" /> Save as Complete
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={templateDialog} onOpenChange={setTemplateDialog}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-template">
                <Plus className="w-4 h-4 mr-2" /> New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Form Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Template Name</Label>
                    <Input
                      value={newTemplate.name}
                      onChange={e => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., DOT Compliance Form"
                      data-testid="input-template-name"
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={newTemplate.category} onValueChange={v => setNewTemplate(prev => ({ ...prev, category: v }))}>
                      <SelectTrigger data-testid="select-template-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={newTemplate.description || ""}
                    onChange={e => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of this form..."
                    data-testid="input-template-description"
                  />
                </div>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground">Use these placeholders and they'll be auto-filled with client data:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {PLACEHOLDERS.map(p => (
                      <Badge key={p} variant="outline" className="text-xs font-mono">{p}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Template Content</Label>
                  <Textarea
                    value={newTemplate.content}
                    onChange={e => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                    className="font-mono text-sm min-h-[250px]"
                    placeholder="Type your form template here. Use placeholders like {{client_name}} for auto-fill..."
                    data-testid="textarea-template-content"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    if (!newTemplate.name || !newTemplate.content) {
                      toast({ title: "Missing fields", description: "Name and content are required.", variant: "destructive" });
                      return;
                    }
                    createTemplate.mutate(newTemplate);
                  }}
                  disabled={createTemplate.isPending}
                  data-testid="button-confirm-create-template"
                >
                  Create Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="templates">
        <TabsList data-testid="tabs-forms">
          <TabsTrigger value="templates" data-testid="tab-templates">
            <ClipboardList className="w-3.5 h-3.5 mr-1.5" /> Templates ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="filled" data-testid="tab-filled-forms">
            <FileText className="w-3.5 h-3.5 mr-1.5" /> Filled Forms ({filledForms.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4">
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search templates..."
                className="pl-10"
                data-testid="input-search-templates"
              />
            </div>
          </div>
          {loadingTemplates ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No templates yet. Create your first form template to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map(template => (
                <Card key={template.id} className="hover-elevate cursor-pointer" data-testid={`card-template-${template.id}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-sm">{template.name}</h3>
                      <Badge variant="outline" className="text-xs flex-shrink-0">{template.category}</Badge>
                    </div>
                    {template.description && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{template.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mb-3">
                      {template.createdAt && format(new Date(template.createdAt), "MMM d, yyyy")}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setEditTemplate(template)}
                        data-testid={`button-edit-template-${template.id}`}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> View/Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => { if (confirm("Delete this template?")) deleteTemplate.mutate(template.id); }}
                        data-testid={`button-delete-template-${template.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="filled" className="mt-4">
          {loadingForms ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : filledForms.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No filled forms yet. Click "Fill Form" to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filledForms.map(form => (
                <Card
                  key={form.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => setViewForm(form)}
                  data-testid={`card-filled-form-${form.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <h4 className="font-medium text-sm">{form.name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Client: {getClientName(form.clientId)}
                          {form.createdAt && ` · ${format(new Date(form.createdAt), "MMM d, yyyy")}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {statusBadge(form.status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!editTemplate} onOpenChange={(open) => { if (!open) setEditTemplate(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template: {editTemplate?.name}</DialogTitle>
          </DialogHeader>
          {editTemplate && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={editTemplate.name}
                    onChange={e => setEditTemplate(prev => prev ? { ...prev, name: e.target.value } : null)}
                    data-testid="input-edit-template-name"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={editTemplate.category} onValueChange={v => setEditTemplate(prev => prev ? { ...prev, category: v } : null)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={editTemplate.description || ""}
                  onChange={e => setEditTemplate(prev => prev ? { ...prev, description: e.target.value } : null)}
                />
              </div>
              <div>
                <Label>Content</Label>
                <Textarea
                  value={editTemplate.content}
                  onChange={e => setEditTemplate(prev => prev ? { ...prev, content: e.target.value } : null)}
                  className="font-mono text-sm min-h-[250px]"
                  data-testid="textarea-edit-template-content"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => updateTemplate.mutate({ id: editTemplate.id, data: { name: editTemplate.name, description: editTemplate.description, content: editTemplate.content, category: editTemplate.category } })}
                disabled={updateTemplate.isPending}
                data-testid="button-save-template"
              >
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewForm} onOpenChange={(open) => { if (!open) setViewForm(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewForm?.name}</DialogTitle>
          </DialogHeader>
          {viewForm && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-sm text-muted-foreground">Client: <span className="font-medium text-foreground">{getClientName(viewForm.clientId)}</span></p>
                {statusBadge(viewForm.status)}
              </div>
              <div>
                <Label>Content</Label>
                <Textarea
                  value={viewForm.filledContent}
                  onChange={e => setViewForm(prev => prev ? { ...prev, filledContent: e.target.value } : null)}
                  className="font-mono text-sm min-h-[300px]"
                  readOnly={viewForm.status === "sent_for_signature"}
                  data-testid="textarea-view-form-content"
                />
              </div>
              {viewForm.status !== "sent_for_signature" && (
                <div className="flex gap-2 justify-end flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() => updateFilledForm.mutate({ id: viewForm.id, data: { filledContent: viewForm.filledContent, status: "draft" } })}
                    disabled={updateFilledForm.isPending}
                    data-testid="button-update-draft"
                  >
                    <Clock className="w-4 h-4 mr-2" /> Save as Draft
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => updateFilledForm.mutate({ id: viewForm.id, data: { filledContent: viewForm.filledContent, status: "complete" } })}
                    disabled={updateFilledForm.isPending}
                    data-testid="button-mark-complete"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" /> Mark Complete
                  </Button>
                  <Button
                    onClick={() => sendForSignature.mutate(viewForm.id)}
                    disabled={sendForSignature.isPending}
                    data-testid="button-send-for-signature"
                  >
                    <Send className="w-4 h-4 mr-2" /> Send for Signature
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
