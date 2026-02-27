import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PenLine, Plus, Send, Clock, CheckCircle, Bell, Eye, Mail, MessageSquare, Upload, FileText, Building2, User, MapPin } from "lucide-react";
import { format } from "date-fns";
import type { SignatureRequest, Client, Document as DocType } from "@shared/schema";

const CLIENT_BLOCK_START = "<!-- CLIENT_INFO_START -->";
const CLIENT_BLOCK_END = "<!-- CLIENT_INFO_END -->";

function buildClientInfoBlock(client: Client): string {
  const lines: string[] = [];
  lines.push(CLIENT_BLOCK_START);
  lines.push("=== CLIENT INFORMATION ===");
  lines.push("");
  lines.push(`Company Name: ${client.companyName}`);
  lines.push(`Contact Name: ${client.contactName}`);
  lines.push(`Email: ${client.email}`);
  lines.push(`Phone: ${client.phone}`);
  if (client.dotNumber) lines.push(`DOT Number: ${client.dotNumber}`);
  if (client.mcNumber) lines.push(`MC Number: ${client.mcNumber}`);
  if (client.einNumber) lines.push(`EIN Number: ${client.einNumber}`);
  if (client.address || client.city || client.state || client.zipCode) {
    lines.push("");
    lines.push("Address:");
    if (client.address) lines.push(`  ${client.address}`);
    const cityLine = [client.city, client.state].filter(Boolean).join(", ");
    if (cityLine || client.zipCode) lines.push(`  ${cityLine} ${client.zipCode || ""}`.trim());
  }
  lines.push("");
  lines.push("===========================");
  lines.push(CLIENT_BLOCK_END);
  lines.push("");
  return lines.join("\n");
}

function replaceClientBlock(content: string, newBlock: string): string {
  const startIdx = content.indexOf(CLIENT_BLOCK_START);
  const endIdx = content.indexOf(CLIENT_BLOCK_END);
  if (startIdx !== -1 && endIdx !== -1) {
    const afterEnd = content.substring(endIdx + CLIENT_BLOCK_END.length).replace(/^\n/, "");
    return newBlock + afterEnd;
  }
  return newBlock + content;
}

const ALLOWED_TEXT_EXTENSIONS = [".txt", ".md", ".csv", ".rtf", ".html", ".htm", ".xml", ".json"];

function isTextFile(fileName: string): boolean {
  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf("."));
  return ALLOWED_TEXT_EXTENSIONS.includes(ext);
}

export default function AdminSignatures() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<SignatureRequest | null>(null);
  const [reminderDialog, setReminderDialog] = useState<SignatureRequest | null>(null);
  const [reminderMethod, setReminderMethod] = useState("email");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newDoc, setNewDoc] = useState({
    clientId: "",
    documentName: "",
    documentDescription: "",
    documentContent: "",
  });
  const [uploadedFileName, setUploadedFileName] = useState("");

  const { data: signatures = [], isLoading } = useQuery<SignatureRequest[]>({
    queryKey: ["/api/admin/signatures"],
  });

  const { data: clientsList = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: allDocuments = [] } = useQuery<DocType[]>({
    queryKey: ["/api/documents"],
  });

  const selectedClient = clientsList.find(c => c.id === newDoc.clientId);
  const clientDocuments = allDocuments.filter(d => d.clientId === newDoc.clientId);

  useEffect(() => {
    if (newDoc.clientId && selectedClient && createOpen) {
      const block = buildClientInfoBlock(selectedClient);
      setNewDoc(prev => ({
        ...prev,
        documentContent: replaceClientBlock(prev.documentContent, block),
      }));
    }
  }, [newDoc.clientId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isTextFile(file.name)) {
      toast({
        title: "Unsupported file type",
        description: "Please upload a text-based file (.txt, .md, .csv, .rtf, .html). PDF and Word documents are not supported for direct upload — paste the text content instead.",
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploadedFileName(file.name);

    const docName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    if (!newDoc.documentName) {
      setNewDoc(prev => ({ ...prev, documentName: docName }));
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) {
        let content = text;
        if (selectedClient) {
          content = buildClientInfoBlock(selectedClient) + text;
        }
        setNewDoc(prev => ({ ...prev, documentContent: content }));
        toast({ title: "File loaded", description: `Content from "${file.name}" has been loaded into the document.` });
      }
    };
    reader.onerror = () => {
      toast({ title: "Error", description: "Could not read the file. Please try a different text-based file.", variant: "destructive" });
    };
    reader.readAsText(file);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleInsertClientInfo = () => {
    if (!selectedClient) return;
    const block = buildClientInfoBlock(selectedClient);
    setNewDoc(prev => ({
      ...prev,
      documentContent: replaceClientBlock(prev.documentContent, block),
    }));
    toast({ title: "Client info inserted", description: "Company details have been added to the document." });
  };

  const resetForm = () => {
    setNewDoc({ clientId: "", documentName: "", documentDescription: "", documentContent: "" });
    setUploadedFileName("");
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof newDoc) => {
      await apiRequest("POST", "/api/admin/signatures", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/signatures"] });
      setCreateOpen(false);
      resetForm();
      toast({ title: "Document sent", description: "The document has been sent to the client's portal for signature." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const reminderMutation = useMutation({
    mutationFn: async ({ id, method }: { id: string; method: string }) => {
      const res = await apiRequest("POST", `/api/admin/signatures/${id}/remind`, { method });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/signatures"] });
      setReminderDialog(null);
      toast({
        title: data.sent ? "Reminder sent" : "Could not send",
        description: data.message,
        variant: data.sent ? "default" : "destructive",
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send reminder", variant: "destructive" });
    },
  });

  const pendingCount = signatures.filter(s => s.status === "pending").length;
  const signedCount = signatures.filter(s => s.status === "signed").length;

  return (
    <div className="p-6 space-y-6" data-testid="page-admin-signatures">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PenLine className="w-6 h-6" />
            Document Signing
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Send documents for client signatures and track status</p>
        </div>
        <Button onClick={() => { resetForm(); setCreateOpen(true); }} data-testid="button-send-for-signature">
          <Plus className="w-4 h-4 mr-1" />
          Send for Signature
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold">{signatures.length}</div>
            <div className="text-sm text-muted-foreground">Total Documents</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-orange-500">{pendingCount}</div>
            <div className="text-sm text-muted-foreground">Awaiting Signature</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-green-600">{signedCount}</div>
            <div className="text-sm text-muted-foreground">Signed</div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : signatures.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <PenLine className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No documents sent for signature yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Click "Send for Signature" to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {signatures.map(sig => {
            const client = clientsList.find(c => c.id === sig.clientId);
            return (
              <Card key={sig.id} data-testid={`sig-card-${sig.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full ${sig.status === "signed" ? "bg-green-100 dark:bg-green-900/30" : "bg-orange-100 dark:bg-orange-900/30"}`}>
                        {sig.status === "signed" ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-orange-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{sig.documentName}</p>
                        <p className="text-xs text-muted-foreground">
                          {client?.companyName || "Unknown"} - Sent {format(new Date(sig.sentAt), "MMM d, yyyy")}
                        </p>
                        {sig.status === "signed" && sig.signedAt && (
                          <p className="text-xs text-green-600">
                            Signed by {sig.signerName} on {format(new Date(sig.signedAt), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        )}
                        {sig.reminderSentAt && (
                          <p className="text-xs text-muted-foreground">
                            Reminder sent via {sig.reminderMethod} on {format(new Date(sig.reminderSentAt), "MMM d")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={sig.status === "signed" ? "default" : "secondary"}>
                        {sig.status === "signed" ? "Signed" : "Pending"}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => setViewDoc(sig)} data-testid={`button-view-sig-${sig.id}`}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {sig.status === "pending" && (
                        <Button variant="outline" size="sm" onClick={() => { setReminderDialog(sig); setReminderMethod("email"); }} data-testid={`button-remind-${sig.id}`}>
                          <Bell className="w-4 h-4 mr-1" />
                          Remind
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) resetForm(); setCreateOpen(open); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Send Document for Signature</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(newDoc);
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Client *</Label>
              <Select value={newDoc.clientId} onValueChange={(v) => setNewDoc(prev => ({ ...prev, clientId: v }))}>
                <SelectTrigger data-testid="select-sig-client">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clientsList.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedClient && (
              <Card className="bg-muted/30">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      Client Info on File
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleInsertClientInfo}
                      data-testid="button-insert-client-info"
                    >
                      Insert into Document
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Contact:</span>
                      <span className="font-medium">{selectedClient.contactName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium truncate">{selectedClient.email}</span>
                    </div>
                    {selectedClient.dotNumber && (
                      <div><span className="text-muted-foreground">DOT:</span> <span className="font-medium">{selectedClient.dotNumber}</span></div>
                    )}
                    {selectedClient.mcNumber && (
                      <div><span className="text-muted-foreground">MC:</span> <span className="font-medium">{selectedClient.mcNumber}</span></div>
                    )}
                    {selectedClient.einNumber && (
                      <div><span className="text-muted-foreground">EIN:</span> <span className="font-medium">{selectedClient.einNumber}</span></div>
                    )}
                    {selectedClient.phone && (
                      <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{selectedClient.phone}</span></div>
                    )}
                    {(selectedClient.address || selectedClient.city) && (
                      <div className="col-span-2 flex items-start gap-1">
                        <MapPin className="w-3 h-3 text-muted-foreground mt-0.5" />
                        <span className="text-muted-foreground">Address:</span>
                        <span className="font-medium">
                          {[selectedClient.address, [selectedClient.city, selectedClient.state].filter(Boolean).join(", "), selectedClient.zipCode].filter(Boolean).join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                  {(!selectedClient.dotNumber && !selectedClient.mcNumber && !selectedClient.einNumber) && (
                    <p className="text-xs text-orange-500 mt-2">Some compliance info (DOT/MC/EIN) is missing. You can type it directly in the document below.</p>
                  )}
                  {clientDocuments.length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Existing documents on file: {clientDocuments.length}</p>
                      <div className="flex flex-wrap gap-1">
                        {clientDocuments.slice(0, 5).map(d => (
                          <Badge key={d.id} variant="secondary" className="text-[10px]">
                            {d.name} ({d.type})
                          </Badge>
                        ))}
                        {clientDocuments.length > 5 && (
                          <Badge variant="secondary" className="text-[10px]">+{clientDocuments.length - 5} more</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="space-y-1.5">
              <Label>Document Name *</Label>
              <Input
                value={newDoc.documentName}
                onChange={(e) => setNewDoc(prev => ({ ...prev, documentName: e.target.value }))}
                placeholder="e.g. Power of Attorney, BOC-3 Filing"
                required
                data-testid="input-sig-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                value={newDoc.documentDescription}
                onChange={(e) => setNewDoc(prev => ({ ...prev, documentDescription: e.target.value }))}
                placeholder="Brief description for the client"
                data-testid="input-sig-description"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Document Content *</Label>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.csv,.rtf,.html,.htm,.xml,.json"
                    className="hidden"
                    onChange={handleFileUpload}
                    data-testid="input-file-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-upload-file"
                  >
                    <Upload className="w-3 h-3 mr-1" />
                    Upload File
                  </Button>
                </div>
              </div>
              {uploadedFileName && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                  <FileText className="w-3 h-3" />
                  Loaded from: {uploadedFileName}
                </div>
              )}
              <Textarea
                value={newDoc.documentContent}
                onChange={(e) => setNewDoc(prev => ({ ...prev, documentContent: e.target.value }))}
                placeholder="Paste, type, or upload the document text that the client needs to review and sign. Client info will be auto-filled when you select a client above."
                rows={12}
                required
                className="font-mono text-sm"
                data-testid="textarea-sig-content"
              />
              <p className="text-xs text-muted-foreground">
                You can edit all content above before sending. The client will see this exact text and sign it.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { resetForm(); setCreateOpen(false); }}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || !newDoc.clientId || !newDoc.documentName || !newDoc.documentContent} data-testid="button-confirm-send-sig">
                <Send className="w-4 h-4 mr-1" />
                {createMutation.isPending ? "Sending..." : "Send to Client"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewDoc} onOpenChange={(open) => !open && setViewDoc(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{viewDoc?.documentName}</DialogTitle>
          </DialogHeader>
          {viewDoc && (
            <div className="space-y-4">
              {viewDoc.documentDescription && (
                <p className="text-sm text-muted-foreground">{viewDoc.documentDescription}</p>
              )}
              <div className="border rounded-md p-4 bg-muted/30 whitespace-pre-wrap text-sm leading-relaxed">
                {viewDoc.documentContent}
              </div>
              {viewDoc.status === "signed" && viewDoc.signatureData && (
                <div className="border rounded-md p-4 space-y-2">
                  <p className="text-sm font-medium">Signature</p>
                  <img src={viewDoc.signatureData} alt="Signature" className="max-h-24 border rounded" />
                  <p className="text-xs text-muted-foreground">
                    Signed by {viewDoc.signerName} on {viewDoc.signedAt ? format(new Date(viewDoc.signedAt), "MMM d, yyyy 'at' h:mm a") : ""}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!reminderDialog} onOpenChange={(open) => !open && setReminderDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Send Reminder</DialogTitle>
          </DialogHeader>
          {reminderDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Send a reminder to sign <strong>"{reminderDialog.documentName}"</strong>
              </p>
              <div className="space-y-1.5">
                <Label>Reminder Method</Label>
                <Select value={reminderMethod} onValueChange={setReminderMethod}>
                  <SelectTrigger data-testid="select-reminder-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">
                      <span className="flex items-center gap-2"><Mail className="w-3 h-3" /> Email</span>
                    </SelectItem>
                    <SelectItem value="sms">
                      <span className="flex items-center gap-2"><MessageSquare className="w-3 h-3" /> Text Message (SMS)</span>
                    </SelectItem>
                    <SelectItem value="both">
                      <span className="flex items-center gap-2"><Bell className="w-3 h-3" /> Both Email & SMS</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setReminderDialog(null)}>Cancel</Button>
                <Button
                  onClick={() => reminderMutation.mutate({ id: reminderDialog.id, method: reminderMethod })}
                  disabled={reminderMutation.isPending}
                  data-testid="button-confirm-remind"
                >
                  <Send className="w-4 h-4 mr-1" />
                  {reminderMutation.isPending ? "Sending..." : "Send Reminder"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
