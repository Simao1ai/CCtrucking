import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { FormTemplate, FilledForm, Client, ServiceFormMapping } from "@shared/schema";
import {
  Plus, FileText, ClipboardList, Search, Send, CheckCircle, Clock,
  Pencil, Eye, Trash2, Printer, Save, GripVertical, X, FolderOpen, Zap, ArrowRight, Settings
} from "lucide-react";
import { format } from "date-fns";

const CATEGORIES = ["DOT Compliance", "IFTA Filing", "Tax Forms", "Business Setup", "General"];

interface FormField {
  id: string;
  label: string;
  type: "text" | "textarea" | "checkbox" | "date" | "select" | "number" | "email" | "phone";
  placeholder?: string;
  required?: boolean;
  options?: string[];
  autoFillKey?: string;
  width?: "full" | "half";
  section?: string;
}

const AUTO_FILL_KEYS = [
  { key: "company_name", label: "Company Name" },
  { key: "contact_name", label: "Contact Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "dot_number", label: "DOT Number" },
  { key: "mc_number", label: "MC Number" },
  { key: "ein_number", label: "EIN Number" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "zip_code", label: "ZIP Code" },
  { key: "today_date", label: "Today's Date" },
];

function getAutoFillValue(key: string, client: Client): string {
  const map: Record<string, string> = {
    company_name: client.companyName || "",
    contact_name: client.contactName || "",
    email: client.email || "",
    phone: client.phone || "",
    dot_number: client.dotNumber || "",
    mc_number: client.mcNumber || "",
    ein_number: client.einNumber || "",
    address: client.address || "",
    city: client.city || "",
    state: client.state || "",
    zip_code: client.zipCode || "",
    today_date: format(new Date(), "MM/dd/yyyy"),
  };
  return map[key] || "";
}

function generateFieldId(): string {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

const SERVICE_TYPES = [
  "Business Setup", "Quarterly Tax", "Annual Tax", "DOT Permit", "IFTA Permit",
  "UCR Registration", "IRP Registration", "BOC-3 Filing", "MCS-150 Update", "Other",
];

function AutomationTab({ mappings, templates, loading, onCreateMapping, onDeleteMapping, isPending }: {
  mappings: ServiceFormMapping[];
  templates: FormTemplate[];
  loading: boolean;
  onCreateMapping: (serviceType: string, templateId: string) => void;
  onDeleteMapping: (id: string) => void;
  isPending: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [newServiceType, setNewServiceType] = useState("");
  const [newTemplateId, setNewTemplateId] = useState("");

  const getTemplateName = (id: string) => templates.find(t => t.id === id)?.name || id;

  const groupedByType = SERVICE_TYPES.reduce((acc, type) => {
    const items = mappings.filter(m => m.serviceType === type);
    if (items.length > 0) acc[type] = items;
    return acc;
  }, {} as Record<string, ServiceFormMapping[]>);

  const unmatchedMappings = mappings.filter(m => !SERVICE_TYPES.includes(m.serviceType));
  if (unmatchedMappings.length > 0) {
    unmatchedMappings.forEach(m => {
      if (!groupedByType[m.serviceType]) groupedByType[m.serviceType] = [];
      groupedByType[m.serviceType].push(m);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Auto-Generate Forms on Ticket Creation</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Map service types to form templates. When a ticket is created, forms will be auto-generated and pre-filled with client data.
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-mapping">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Mapping
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New Automation Mapping</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>When a ticket has this service type:</Label>
                <Select value={newServiceType} onValueChange={setNewServiceType}>
                  <SelectTrigger data-testid="select-mapping-service-type">
                    <SelectValue placeholder="Select service type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <Label>Auto-generate this form template:</Label>
                <Select value={newTemplateId} onValueChange={setNewTemplateId}>
                  <SelectTrigger data-testid="select-mapping-template">
                    <SelectValue placeholder="Select form template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name} ({t.category})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  if (!newServiceType || !newTemplateId) return;
                  onCreateMapping(newServiceType, newTemplateId);
                  setNewServiceType("");
                  setNewTemplateId("");
                  setAddOpen(false);
                }}
                disabled={!newServiceType || !newTemplateId || isPending}
                data-testid="button-confirm-mapping"
              >
                <Zap className="w-4 h-4 mr-2" /> Create Mapping
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : Object.keys(groupedByType).length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Zap}
              title="No automation mappings yet"
              description="Add a mapping to auto-generate forms when tickets are created. For example, map 'DOT Compliance' tickets to auto-create your DOT compliance form templates."
              action={
                <Button size="sm" onClick={() => setAddOpen(true)} data-testid="button-empty-add-mapping">
                  <Plus className="w-4 h-4 mr-2" /> Add First Mapping
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByType).map(([serviceType, items]) => (
            <Card key={serviceType} data-testid={`card-mapping-group-${serviceType.replace(/\s+/g, '-').toLowerCase()}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-primary/10 text-primary text-xs">{serviceType}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {items.length} form{items.length !== 1 ? "s" : ""} auto-generated
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map(mapping => (
                    <div key={mapping.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md border border-border/50" data-testid={`mapping-item-${mapping.id}`}>
                      <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-sm font-medium">{getTemplateName(mapping.templateId)}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive"
                        onClick={() => onDeleteMapping(mapping.id)}
                        data-testid={`button-delete-mapping-${mapping.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex-shrink-0">
              <Settings className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h4 className="text-sm font-medium">How it works</h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                When a new service ticket is created (by staff or client portal), the system checks for matching mappings.
                For each match, a pre-filled form is automatically generated using the client's data (company name, DOT/MC numbers, contact info, etc.).
                Staff can then review, edit, and send the forms for signature — no manual setup needed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formStatusBadge(status: string) {
  const statusMap: Record<string, string> = { complete: "completed", sent_for_signature: "sent" };
  const labelMap: Record<string, string> = { complete: "Complete", sent_for_signature: "Sent for Signature", saved_to_documents: "Saved" };
  return <StatusBadge status={statusMap[status] || status} label={labelMap[status]} />;
}

function fieldValuesToContent(fields: FormField[], values: Record<string, any>): string {
  return fields.map(f => {
    const val = values[f.id];
    if (f.type === "checkbox") return `${f.label}: ${val ? "Yes" : "No"}`;
    return `${f.label}: ${val || ""}`;
  }).join("\n");
}

function FieldBuilder({ fields, onChange }: { fields: FormField[]; onChange: (fields: FormField[]) => void }) {
  const [editingField, setEditingField] = useState<FormField | null>(null);

  const addField = (type: FormField["type"]) => {
    const newField: FormField = {
      id: generateFieldId(),
      label: "",
      type,
      required: false,
      width: "full",
      placeholder: "",
    };
    setEditingField(newField);
  };

  const saveField = () => {
    if (!editingField || !editingField.label.trim()) return;
    const existing = fields.findIndex(f => f.id === editingField.id);
    if (existing >= 0) {
      const updated = [...fields];
      updated[existing] = editingField;
      onChange(updated);
    } else {
      onChange([...fields, editingField]);
    }
    setEditingField(null);
  };

  const removeField = (id: string) => {
    onChange(fields.filter(f => f.id !== id));
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= fields.length) return;
    const updated = [...fields];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated);
  };

  const fieldTypeLabels: Record<string, string> = {
    text: "Text", textarea: "Long Text", checkbox: "Checkbox", date: "Date",
    select: "Dropdown", number: "Number", email: "Email", phone: "Phone",
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {(["text", "textarea", "checkbox", "date", "select", "number", "email", "phone"] as FormField["type"][]).map(type => (
          <Button key={type} variant="outline" size="sm" className="text-xs h-7" onClick={() => addField(type)} data-testid={`button-add-field-${type}`}>
            <Plus className="w-3 h-3 mr-1" /> {fieldTypeLabels[type]}
          </Button>
        ))}
      </div>

      {fields.length > 0 && (
        <div className="space-y-1.5">
          {fields.map((field, idx) => (
            <div key={field.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md border border-border/50 group" data-testid={`field-item-${field.id}`}>
              <div className="flex flex-col gap-0.5">
                <button className="p-0.5 hover:bg-muted rounded" onClick={() => moveField(idx, -1)} disabled={idx === 0}><GripVertical className="w-3 h-3 text-muted-foreground" /></button>
              </div>
              <Badge variant="outline" className="text-[10px] flex-shrink-0">{fieldTypeLabels[field.type]}</Badge>
              <span className="text-sm font-medium truncate flex-1">{field.label || "(unnamed)"}</span>
              {field.required && <Badge className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Required</Badge>}
              {field.autoFillKey && <Badge variant="outline" className="text-[10px] text-blue-600">Auto: {field.autoFillKey}</Badge>}
              {field.width === "half" && <Badge variant="outline" className="text-[10px]">½</Badge>}
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setEditingField({ ...field })}><Pencil className="w-3 h-3" /></Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeField(field.id)}><X className="w-3 h-3" /></Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editingField} onOpenChange={(open) => { if (!open) setEditingField(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{fields.find(f => f.id === editingField?.id) ? "Edit" : "Add"} Field</DialogTitle>
          </DialogHeader>
          {editingField && (
            <div className="space-y-3">
              <div>
                <Label>Field Label</Label>
                <Input
                  value={editingField.label}
                  onChange={e => setEditingField({ ...editingField, label: e.target.value })}
                  placeholder="e.g., Driver's Name"
                  data-testid="input-field-label"
                />
              </div>
              <div>
                <Label>Placeholder Text</Label>
                <Input
                  value={editingField.placeholder || ""}
                  onChange={e => setEditingField({ ...editingField, placeholder: e.target.value })}
                  placeholder="Hint text shown in empty field"
                />
              </div>
              <div>
                <Label>Auto-Fill From Client Data</Label>
                <Select value={editingField.autoFillKey || "none"} onValueChange={v => setEditingField({ ...editingField, autoFillKey: v === "none" ? undefined : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (manual entry)</SelectItem>
                    {AUTO_FILL_KEYS.map(k => (
                      <SelectItem key={k.key} value={k.key}>{k.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Width</Label>
                  <Select value={editingField.width || "full"} onValueChange={v => setEditingField({ ...editingField, width: v as "full" | "half" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Width</SelectItem>
                      <SelectItem value="half">Half Width</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Section Header</Label>
                  <Input
                    value={editingField.section || ""}
                    onChange={e => setEditingField({ ...editingField, section: e.target.value || undefined })}
                    placeholder="e.g., Company Info"
                  />
                </div>
              </div>
              {editingField.type === "select" && (
                <div>
                  <Label>Options (one per line)</Label>
                  <Textarea
                    value={(editingField.options || []).join("\n")}
                    onChange={e => setEditingField({ ...editingField, options: e.target.value.split("\n").filter(Boolean) })}
                    placeholder={"Option 1\nOption 2\nOption 3"}
                    rows={4}
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingField.required || false}
                  onCheckedChange={v => setEditingField({ ...editingField, required: v })}
                />
                <Label>Required field</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingField(null)}>Cancel</Button>
            <Button onClick={saveField} disabled={!editingField?.label.trim()} data-testid="button-save-field">Save Field</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormFiller({ fields, values, onChange, client, readOnly }: {
  fields: FormField[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  client?: Client;
  readOnly?: boolean;
}) {
  let lastSection = "";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-4 gap-y-3">
        {fields.map(field => {
          const showSection = field.section && field.section !== lastSection;
          if (field.section) lastSection = field.section;
          const widthClass = field.width === "half" ? "w-full sm:w-[calc(50%-0.5rem)]" : "w-full";

          return (
            <div key={field.id} className={widthClass}>
              {showSection && (
                <div className="w-full mb-2 mt-3 first:mt-0">
                  <h3 className="text-sm font-semibold text-primary border-b pb-1">{field.section}</h3>
                </div>
              )}
              <div>
                <Label className="text-xs mb-1 block">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-0.5">*</span>}
                </Label>
                {field.type === "text" || field.type === "email" || field.type === "phone" || field.type === "number" ? (
                  <Input
                    type={field.type === "phone" ? "tel" : field.type}
                    value={values[field.id] || ""}
                    onChange={e => onChange({ ...values, [field.id]: e.target.value })}
                    placeholder={field.placeholder}
                    readOnly={readOnly}
                    data-testid={`field-input-${field.id}`}
                  />
                ) : field.type === "textarea" ? (
                  <Textarea
                    value={values[field.id] || ""}
                    onChange={e => onChange({ ...values, [field.id]: e.target.value })}
                    placeholder={field.placeholder}
                    rows={3}
                    readOnly={readOnly}
                    data-testid={`field-textarea-${field.id}`}
                  />
                ) : field.type === "checkbox" ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="checkbox"
                      checked={!!values[field.id]}
                      onChange={e => onChange({ ...values, [field.id]: e.target.checked })}
                      disabled={readOnly}
                      className="rounded"
                      data-testid={`field-checkbox-${field.id}`}
                    />
                    <span className="text-sm text-muted-foreground">{field.placeholder || "Check if applicable"}</span>
                  </div>
                ) : field.type === "date" ? (
                  <Input
                    type="date"
                    value={values[field.id] || ""}
                    onChange={e => onChange({ ...values, [field.id]: e.target.value })}
                    readOnly={readOnly}
                    data-testid={`field-date-${field.id}`}
                  />
                ) : field.type === "select" ? (
                  <Select
                    value={values[field.id] || ""}
                    onValueChange={v => onChange({ ...values, [field.id]: v })}
                    disabled={readOnly}
                  >
                    <SelectTrigger data-testid={`field-select-${field.id}`}>
                      <SelectValue placeholder={field.placeholder || "Select..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options || []).map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PrintableForm({ form, fields, fieldValues, clientName, companyName }: {
  form: FilledForm;
  fields: FormField[];
  fieldValues: Record<string, any>;
  clientName: string;
  companyName: string;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>${form.name}</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 30px; color: #1a1a1a; }
        h1 { font-size: 20px; color: #1e3a5f; margin-bottom: 4px; }
        .meta { font-size: 12px; color: #666; margin-bottom: 24px; border-bottom: 2px solid #1e3a5f; padding-bottom: 12px; }
        .section-header { font-size: 14px; font-weight: 600; color: #1e3a5f; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin: 20px 0 12px; }
        .field-row { display: flex; gap: 16px; margin-bottom: 10px; flex-wrap: wrap; }
        .field { flex: 1; min-width: 200px; }
        .field.half { flex: 0 0 calc(50% - 8px); }
        .field-label { font-size: 11px; color: #666; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 2px; }
        .field-value { font-size: 13px; padding: 6px 0; border-bottom: 1px solid #e5e5e5; min-height: 24px; }
        .field-value.checkbox { border-bottom: none; }
        .checkbox-box { display: inline-block; width: 14px; height: 14px; border: 1.5px solid #333; margin-right: 6px; vertical-align: middle; text-align: center; font-size: 11px; line-height: 14px; }
        .footer { margin-top: 40px; font-size: 11px; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 12px; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  let lastSection = "";

  return (
    <>
      <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-print-form">
        <Printer className="w-3.5 h-3.5 mr-1.5" /> Print
      </Button>
      <div ref={printRef} className="hidden">
        <h1>{form.name}</h1>
        <div className="meta">
          Client: {clientName} &nbsp;|&nbsp; Date: {format(new Date(form.createdAt), "MMMM d, yyyy")}
          {companyName && <> &nbsp;|&nbsp; {companyName}</>}
        </div>
        {fields.length > 0 ? (
          <>
            {fields.map(field => {
              const showSection = field.section && field.section !== lastSection;
              if (field.section) lastSection = field.section;
              const val = fieldValues[field.id];
              return (
                <div key={field.id}>
                  {showSection && <div className="section-header">{field.section}</div>}
                  <div className={`field ${field.width === "half" ? "half" : ""}`} style={{ marginBottom: "10px" }}>
                    <div className="field-label">{field.label}</div>
                    {field.type === "checkbox" ? (
                      <div className="field-value checkbox">
                        <span className="checkbox-box">{val ? "✓" : ""}</span>
                        {field.placeholder || ""}
                      </div>
                    ) : (
                      <div className="field-value">{val || ""}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <div style={{ whiteSpace: "pre-wrap", fontSize: "13px", lineHeight: "1.6" }}>{form.filledContent}</div>
        )}
        <div className="footer">
          Generated by {companyName || "CarrierDeskHQ"} &nbsp;|&nbsp; {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}
        </div>
      </div>
    </>
  );
}

export default function AdminForms() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [templateDialog, setTemplateDialog] = useState(false);
  const [editTemplate, setEditTemplate] = useState<FormTemplate | null>(null);
  const [fillDialog, setFillDialog] = useState(false);
  const [viewForm, setViewForm] = useState<FilledForm | null>(null);

  const [newTemplate, setNewTemplate] = useState({
    name: "", description: "", content: "", category: "General", createdBy: null as string | null,
    fields: [] as FormField[],
  });
  const [fillState, setFillState] = useState({
    templateId: "", clientId: "", name: "", filledContent: "",
    fieldValues: {} as Record<string, any>,
    fields: [] as FormField[],
  });
  const [editFields, setEditFields] = useState<FormField[]>([]);
  const [viewFieldValues, setViewFieldValues] = useState<Record<string, any>>({});
  const [showPreview, setShowPreview] = useState(false);

  const { data: templates = [], isLoading: loadingTemplates } = useQuery<FormTemplate[]>({
    queryKey: ["/api/admin/form-templates"],
  });
  const { data: filledForms = [], isLoading: loadingForms } = useQuery<FilledForm[]>({
    queryKey: ["/api/admin/filled-forms"],
  });
  const { data: clientsList = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });
  const { data: mappings = [], isLoading: loadingMappings } = useQuery<ServiceFormMapping[]>({
    queryKey: ["/api/admin/service-form-mappings"],
  });

  const createTemplate = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/admin/form-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/form-templates"] });
      setTemplateDialog(false);
      setNewTemplate({ name: "", description: "", content: "", category: "General", createdBy: null, fields: [] });
      toast({ title: "Template created" });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
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
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/admin/filled-forms", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/filled-forms"] });
      setFillDialog(false);
      setFillState({ templateId: "", clientId: "", name: "", filledContent: "", fieldValues: {}, fields: [] });
      toast({ title: "Form saved" });
    },
  });

  const updateFilledForm = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
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

  const saveToDocuments = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/admin/filled-forms/${id}/save-to-documents`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/filled-forms"] });
      toast({ title: "Saved to documents", description: "Form has been saved to the client's document folder." });
    },
  });

  const createMapping = useMutation({
    mutationFn: async (data: { serviceType: string; templateId: string }) => {
      await apiRequest("POST", "/api/admin/service-form-mappings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/service-form-mappings"] });
      toast({ title: "Mapping created", description: "Forms will be auto-generated for this service type." });
    },
  });

  const deleteMapping = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/service-form-mappings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/service-form-mappings"] });
      toast({ title: "Mapping removed" });
    },
  });

  const handleSelectTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    const tplFields = (template.fields as FormField[] | null) || [];
    const client = fillState.clientId ? clientsList.find(c => c.id === fillState.clientId) : undefined;
    const autoValues: Record<string, any> = {};
    if (client) {
      tplFields.forEach(f => {
        if (f.autoFillKey) autoValues[f.id] = getAutoFillValue(f.autoFillKey, client);
      });
    }
    setFillState(prev => ({
      ...prev,
      templateId,
      name: template.name,
      filledContent: template.content,
      fields: tplFields,
      fieldValues: autoValues,
    }));
  };

  const handleSelectClient = (clientId: string) => {
    const client = clientsList.find(c => c.id === clientId);
    setFillState(prev => {
      const autoValues = { ...prev.fieldValues };
      if (client) {
        prev.fields.forEach(f => {
          if (f.autoFillKey) autoValues[f.id] = getAutoFillValue(f.autoFillKey, client);
        });
      }
      return { ...prev, clientId, fieldValues: autoValues };
    });
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  );

  const getClientName = (clientId: string) => clientsList.find(c => c.id === clientId)?.companyName || clientId;

  const getFormFields = (form: FilledForm): FormField[] => {
    const template = templates.find(t => t.id === form.templateId);
    return (template?.fields as FormField[] | null) || [];
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Forms"
        description="Create form templates with fillable fields, fill them for clients, print, and send for signature"
        actions={
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
                      placeholder="e.g., DOT Compliance — Lone Star Freight"
                      data-testid="input-fill-name"
                    />
                  </div>

                  {fillState.fields.length > 0 ? (
                    <div className="border rounded-lg p-4 bg-background">
                      <FormFiller
                        fields={fillState.fields}
                        values={fillState.fieldValues}
                        onChange={vals => setFillState(prev => ({
                          ...prev,
                          fieldValues: vals,
                          filledContent: fieldValuesToContent(prev.fields, vals),
                        }))}
                        client={clientsList.find(c => c.id === fillState.clientId)}
                      />
                    </div>
                  ) : (
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
                  )}

                  <div className="flex gap-2 justify-end flex-wrap">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (!fillState.clientId || !fillState.name) {
                          toast({ title: "Missing fields", description: "Please select a client and name.", variant: "destructive" });
                          return;
                        }
                        const content = fillState.fields.length > 0
                          ? fieldValuesToContent(fillState.fields, fillState.fieldValues)
                          : fillState.filledContent;
                        createFilledForm.mutate({ ...fillState, filledContent: content, fieldValues: fillState.fieldValues });
                      }}
                      disabled={createFilledForm.isPending}
                      data-testid="button-save-draft"
                    >
                      <Clock className="w-4 h-4 mr-2" /> Save as Draft
                    </Button>
                    <Button
                      onClick={() => {
                        if (!fillState.clientId || !fillState.name) {
                          toast({ title: "Missing fields", description: "Please select a client and name.", variant: "destructive" });
                          return;
                        }
                        const content = fillState.fields.length > 0
                          ? fieldValuesToContent(fillState.fields, fillState.fieldValues)
                          : fillState.filledContent;
                        createFilledForm.mutate({ ...fillState, filledContent: content, fieldValues: fillState.fieldValues, status: "complete" } as any);
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
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                        <SelectTrigger data-testid="select-template-category"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      value={newTemplate.description || ""}
                      onChange={e => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description..."
                      data-testid="input-template-description"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">Form Fields</Label>
                    <p className="text-xs text-muted-foreground mb-2">Add structured fields that will be rendered as inputs when filling out this form. Each field can auto-fill from client data.</p>
                    <FieldBuilder fields={newTemplate.fields} onChange={fields => setNewTemplate(prev => ({ ...prev, fields }))} />
                  </div>
                  <div>
                    <Label>Additional Notes / Instructions (optional)</Label>
                    <Textarea
                      value={newTemplate.content}
                      onChange={e => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                      className="text-sm min-h-[100px]"
                      placeholder="Instructions, legal text, or additional form content..."
                      data-testid="textarea-template-content"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      if (!newTemplate.name) {
                        toast({ title: "Missing fields", description: "Name is required.", variant: "destructive" });
                        return;
                      }
                      if (newTemplate.fields.length === 0 && !newTemplate.content) {
                        toast({ title: "Missing fields", description: "Add at least one field or some content.", variant: "destructive" });
                        return;
                      }
                      createTemplate.mutate({ ...newTemplate, content: newTemplate.content || "(structured form)" });
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
        }
      />

      <Tabs defaultValue="templates">
        <TabsList data-testid="tabs-forms">
          <TabsTrigger value="templates" data-testid="tab-templates">
            <ClipboardList className="w-3.5 h-3.5 mr-1.5" /> Templates ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="filled" data-testid="tab-filled-forms">
            <FileText className="w-3.5 h-3.5 mr-1.5" /> Filled Forms ({filledForms.length})
          </TabsTrigger>
          <TabsTrigger value="automation" data-testid="tab-automation">
            <Zap className="w-3.5 h-3.5 mr-1.5" /> Automation ({mappings.length})
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
              <CardContent>
                <EmptyState
                  icon={ClipboardList}
                  title={search ? "No matching templates" : "No templates yet"}
                  description={search ? "No templates match your search." : "Create your first form template to get started."}
                  action={!search ? (
                    <Button onClick={() => setTemplateDialog(true)} data-testid="button-empty-create-template">
                      <Plus className="w-4 h-4 mr-2" /> New Template
                    </Button>
                  ) : undefined}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map(template => {
                const tplFields = (template.fields as FormField[] | null) || [];
                return (
                  <Card key={template.id} className="hover-elevate cursor-pointer" data-testid={`card-template-${template.id}`}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-sm">{template.name}</h3>
                        <Badge variant="outline" className="text-xs flex-shrink-0">{template.category}</Badge>
                      </div>
                      {template.description && (
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{template.description}</p>
                      )}
                      <div className="flex items-center gap-2 mb-3">
                        {tplFields.length > 0 && (
                          <Badge className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {tplFields.length} field{tplFields.length !== 1 ? "s" : ""}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {template.createdAt && format(new Date(template.createdAt), "MMM d, yyyy")}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setEditTemplate(template);
                            setEditFields((template.fields as FormField[] | null) || []);
                          }}
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
                );
              })}
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
              <CardContent>
                <EmptyState
                  icon={FileText}
                  title="No filled forms yet"
                  description="Click 'Fill Form' to fill out a template for a client."
                  action={
                    <Button variant="outline" onClick={() => setFillDialog(true)} data-testid="button-empty-fill-form">
                      <Pencil className="w-4 h-4 mr-2" /> Fill Form
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filledForms.map(form => (
                <Card
                  key={form.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => {
                    setViewForm(form);
                    setViewFieldValues((form.fieldValues as Record<string, any>) || {});
                  }}
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
                        {formStatusBadge(form.status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="automation" className="mt-4">
          <AutomationTab
            mappings={mappings}
            templates={templates}
            loading={loadingMappings}
            onCreateMapping={(serviceType, templateId) => createMapping.mutate({ serviceType, templateId })}
            onDeleteMapping={(id) => { if (confirm("Remove this automation mapping?")) deleteMapping.mutate(id); }}
            isPending={createMapping.isPending}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={!!editTemplate} onOpenChange={(open) => { if (!open) setEditTemplate(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                <Label className="mb-2 block">Form Fields</Label>
                <FieldBuilder fields={editFields} onChange={setEditFields} />
              </div>
              <div>
                <Label>Additional Notes / Instructions</Label>
                <Textarea
                  value={editTemplate.content}
                  onChange={e => setEditTemplate(prev => prev ? { ...prev, content: e.target.value } : null)}
                  className="text-sm min-h-[100px]"
                  data-testid="textarea-edit-template-content"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => updateTemplate.mutate({
                  id: editTemplate.id,
                  data: {
                    name: editTemplate.name,
                    description: editTemplate.description,
                    content: editTemplate.content,
                    category: editTemplate.category,
                    fields: editFields,
                  }
                })}
                disabled={updateTemplate.isPending}
                data-testid="button-save-template"
              >
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewForm} onOpenChange={(open) => { if (!open) { setViewForm(null); setShowPreview(false); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="truncate">{viewForm?.name}</span>
              {viewForm && (
                <PrintableForm
                  form={viewForm}
                  fields={getFormFields(viewForm)}
                  fieldValues={viewFieldValues}
                  clientName={getClientName(viewForm.clientId)}
                  companyName=""
                />
              )}
            </DialogTitle>
          </DialogHeader>
          {viewForm && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-sm text-muted-foreground">Client: <span className="font-medium text-foreground">{getClientName(viewForm.clientId)}</span></p>
                {formStatusBadge(viewForm.status)}
              </div>

              {getFormFields(viewForm).length > 0 ? (
                <div className="border rounded-lg p-4 bg-background">
                  <FormFiller
                    fields={getFormFields(viewForm)}
                    values={viewFieldValues}
                    onChange={vals => {
                      setViewFieldValues(vals);
                      setViewForm(prev => prev ? {
                        ...prev,
                        filledContent: fieldValuesToContent(getFormFields(prev), vals),
                      } : null);
                    }}
                    readOnly={viewForm.status === "sent_for_signature"}
                    client={clientsList.find(c => c.id === viewForm.clientId)}
                  />
                </div>
              ) : (
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
              )}

              {viewForm.status !== "sent_for_signature" && (
                <div className="flex gap-2 justify-end flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() => saveToDocuments.mutate(viewForm.id)}
                    disabled={saveToDocuments.isPending}
                    data-testid="button-save-to-documents"
                  >
                    <FolderOpen className="w-4 h-4 mr-2" /> Save to Documents
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => updateFilledForm.mutate({
                      id: viewForm.id,
                      data: {
                        filledContent: viewForm.filledContent,
                        fieldValues: viewFieldValues,
                        status: "draft",
                      }
                    })}
                    disabled={updateFilledForm.isPending}
                    data-testid="button-update-draft"
                  >
                    <Clock className="w-4 h-4 mr-2" /> Save as Draft
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => updateFilledForm.mutate({
                      id: viewForm.id,
                      data: {
                        filledContent: viewForm.filledContent,
                        fieldValues: viewFieldValues,
                        status: "complete",
                      }
                    })}
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
