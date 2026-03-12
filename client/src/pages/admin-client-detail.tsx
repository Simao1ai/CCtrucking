import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import type { Client, ServiceTicket, Document as DocType, Invoice, ChatMessage, SignatureRequest, FilledForm, Notarization, ClientNote, CustomFieldDefinition, CustomFieldValue } from "@shared/schema";
import {
  ArrowLeft, Building2, Phone, Mail, MapPin, Hash, Ticket, FileText, Receipt,
  MessageCircle, PenLine, Clock, CheckCircle, AlertCircle, DollarSign,
  Calendar, User, Send, ClipboardList, Stamp, StickyNote, Pencil, Trash2, Plus, Mic, MicOff, Loader2, BookOpen,
  TrendingUp, Heart, Star, Award
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface ClientSummary {
  client: Client;
  tickets: ServiceTicket[];
  documents: DocType[];
  invoices: Invoice[];
  messages: ChatMessage[];
  signatures: SignatureRequest[];
  forms: FilledForm[];
  notarizations: Notarization[];
}

export default function AdminClientDetail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/admin/clients/:id");
  const clientId = params?.id;
  const { toast } = useToast();
  const { user } = useAuth();
  const [chatMessage, setChatMessage] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data, isLoading, isError } = useQuery<ClientSummary>({
    queryKey: [`/api/clients/${clientId}/summary`],
    enabled: !!clientId,
  });

  const { data: bookkeepingSub, isLoading: isLoadingBookkeeping } = useQuery<{ id: string; status: string; preparerId: string | null } | null>({
    queryKey: ["/api/admin/bookkeeping/subscriptions", clientId],
    queryFn: async () => {
      const res = await fetch("/api/admin/bookkeeping/subscriptions");
      const subs = await res.json();
      return subs.find((s: any) => s.clientId === clientId) ?? null;
    },
    enabled: !!clientId,
  });

  const { data: preparerUsers = [] } = useQuery<{ id: string; username: string; firstName: string; lastName: string }[]>({
    queryKey: ["/api/admin/bookkeeping/preparers"],
  });

  const assignPreparerMutation = useMutation({
    mutationFn: async (preparerId: string) => {
      await apiRequest("POST", "/api/admin/bookkeeping/preparer-assignments", { preparerId, clientId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookkeeping/subscriptions", clientId] });
      toast({ title: "Preparer assigned" });
    },
    onError: () => toast({ title: "Failed to assign preparer", variant: "destructive" }),
  });

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      if (!clientId) throw new Error("No client selected");
      await apiRequest("POST", `/api/admin/chats/${clientId}`, { message });
    },
    onSuccess: () => {
      setChatMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/summary`] });
      toast({ title: "Message sent" });
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  const { data: notes = [] } = useQuery<ClientNote[]>({
    queryKey: ["/api/clients", clientId, "notes"],
    enabled: !!clientId,
  });

  const { data: customFieldDefs = [] } = useQuery<CustomFieldDefinition[]>({
    queryKey: ["/api/admin/custom-fields", "client"],
    queryFn: async () => {
      const res = await fetch("/api/admin/custom-fields?entityType=client");
      return res.json();
    },
  });

  const { data: customFieldValues = [] } = useQuery<CustomFieldValue[]>({
    queryKey: ["/api/custom-fields", "client", clientId],
    enabled: !!clientId,
  });

  const addNote = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", `/api/clients/${clientId}/notes`, { content });
    },
    onSuccess: () => {
      setNoteContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "notes"] });
      toast({ title: "Note added" });
    },
    onError: () => toast({ title: "Failed to add note", variant: "destructive" }),
  });

  const updateNote = useMutation({
    mutationFn: async ({ noteId, content }: { noteId: string; content: string }) => {
      await apiRequest("PATCH", `/api/clients/${clientId}/notes/${noteId}`, { content });
    },
    onSuccess: () => {
      setEditingNoteId(null);
      setEditingNoteContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "notes"] });
      toast({ title: "Note updated" });
    },
    onError: () => toast({ title: "Failed to update note", variant: "destructive" }),
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      await apiRequest("DELETE", `/api/clients/${clientId}/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "notes"] });
      toast({ title: "Note deleted" });
    },
    onError: () => toast({ title: "Failed to delete note", variant: "destructive" }),
  });

  const dictateNote = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          resolve(dataUrl.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });
      const res = await apiRequest("POST", `/api/clients/${clientId}/notes/dictate`, { audio: base64 });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "notes"] });
      toast({ title: "Note created from dictation", description: "Your voice memo has been transcribed and summarized." });
    },
    onError: () => toast({ title: "Dictation failed", description: "Could not process the recording. Please try again.", variant: "destructive" }),
  });

  const cleanupRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      mediaRecorderRef.current = null;
    }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setIsRecording(false);
    setRecordingSeconds(0);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        if (audioBlob.size > 0) {
          dictateNote.mutate(audioBlob);
        } else {
          toast({ title: "Recording too short", description: "Please speak for at least a few seconds.", variant: "destructive" });
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch {
      toast({ title: "Microphone access denied", description: "Please allow microphone access in your browser to use voice dictation.", variant: "destructive" });
    }
  }, [clientId, dictateNote, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  }, []);

  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, [cleanupRecording]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (isError || (!isLoading && !data)) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/admin/clients")} data-testid="button-back-clients">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Clients
        </Button>
        <div className="mt-8 text-center text-muted-foreground">
          {isError ? "Failed to load client. Please try again." : "Client not found."}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { client, tickets, documents, invoices, messages, signatures, forms, notarizations } = data;

  const totalInvoiced = invoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
  const totalPaid = invoices.filter(i => i.status === "paid").reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
  const totalOutstanding = invoices.filter(i => ["sent", "overdue"].includes(i.status)).reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
  const openTickets = tickets.filter(t => t.status === "open" || t.status === "in_progress").length;
  const overdueCount = invoices.filter(i => i.status === "overdue").length;

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1400px] mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin/clients")} data-testid="button-back-clients" className="h-7 text-xs px-2 -ml-2">
        <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Clients
      </Button>

      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight" data-testid="text-client-name">{client.companyName}</h1>
            <StatusBadge status={client.status} />
          </div>
          <p className="text-[13px] text-muted-foreground" data-testid="text-client-contact">{client.contactName}</p>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Tickets" value={tickets.length} subtitle={`${openTickets} open`} icon={Ticket} iconColor="text-blue-600 dark:text-blue-400" iconBg="bg-blue-100 dark:bg-blue-900/40" accent="bg-blue-500" />
        <StatCard title="Invoiced" value={`$${totalInvoiced.toLocaleString("en-US", { minimumFractionDigits: 0 })}`} subtitle={`$${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 0 })} paid`} icon={DollarSign} iconColor="text-emerald-600 dark:text-emerald-400" iconBg="bg-emerald-100 dark:bg-emerald-900/40" accent="bg-emerald-500" />
        <StatCard title="Outstanding" value={`$${totalOutstanding.toLocaleString("en-US", { minimumFractionDigits: 0 })}`} subtitle={overdueCount > 0 ? `${overdueCount} overdue` : "Current"} icon={AlertCircle} iconColor={overdueCount > 0 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"} iconBg={overdueCount > 0 ? "bg-red-100 dark:bg-red-900/40" : "bg-amber-100 dark:bg-amber-900/40"} accent={overdueCount > 0 ? "bg-red-500" : "bg-amber-500"} />
        <StatCard title="Documents" value={documents.length} subtitle={`${signatures.length} signatures`} icon={FileText} iconColor="text-purple-600 dark:text-purple-400" iconBg="bg-purple-100 dark:bg-purple-900/40" accent="bg-purple-500" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 bg-card border border-card-border rounded-xl overflow-hidden" data-testid="card-client-info">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0"><p className="text-[11px] text-muted-foreground">Contact</p><p className="text-sm font-medium" data-testid="text-detail-contact">{client.contactName}</p></div>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0"><p className="text-[11px] text-muted-foreground">Email</p><p className="text-sm truncate" data-testid="text-detail-email">{client.email}</p></div>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0"><p className="text-[11px] text-muted-foreground">Phone</p><p className="text-sm" data-testid="text-detail-phone">{client.phone}</p></div>
              </div>
              {(client.address || client.city) && (
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0"><p className="text-[11px] text-muted-foreground">Address</p>{client.address && <p className="text-sm">{client.address}</p>}<p className="text-sm">{[client.city, client.state].filter(Boolean).join(", ")} {client.zipCode || ""}</p></div>
                </div>
              )}
            </div>

            {(client.dotNumber || client.mcNumber || client.einNumber) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Regulatory</p>
                  {client.dotNumber && <div className="flex items-center justify-between"><span className="text-[11px] text-muted-foreground">DOT</span><span className="text-sm font-mono font-medium" data-testid="text-detail-dot">{client.dotNumber}</span></div>}
                  {client.mcNumber && <div className="flex items-center justify-between"><span className="text-[11px] text-muted-foreground">MC</span><span className="text-sm font-mono font-medium" data-testid="text-detail-mc">{client.mcNumber}</span></div>}
                  {client.einNumber && <div className="flex items-center justify-between"><span className="text-[11px] text-muted-foreground">EIN</span><span className="text-sm font-mono font-medium" data-testid="text-detail-ein">{client.einNumber}</span></div>}
                </div>
              </>
            )}

            {(() => {
              const nonIndustryFields = customFieldDefs.filter(d => d.isActive && !d.industryPackSource);
              const fieldsWithValues = nonIndustryFields.filter(d => {
                const val = customFieldValues.find(v => v.fieldDefinitionId === d.id);
                return val && val.value;
              });
              if (fieldsWithValues.length === 0) return null;
              return (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Custom Fields</p>
                    {fieldsWithValues.map(def => {
                      const val = customFieldValues.find(v => v.fieldDefinitionId === def.id);
                      return (
                        <div key={def.id} className="flex items-center justify-between" data-testid={`text-custom-field-${def.name}`}>
                          <span className="text-[11px] text-muted-foreground">{def.label}</span>
                          <span className="text-sm font-medium">{val?.value}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}

            {client.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-sm whitespace-pre-wrap" data-testid="text-detail-notes">{client.notes}</p>
                </div>
              </>
            )}

            <Separator />
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3 h-3" />
                Bookkeeping & Preparer
              </p>
              {isLoadingBookkeeping ? (
                <Skeleton className="h-8 w-full" />
              ) : bookkeepingSub ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Status</span>
                    <StatusBadge status={bookkeepingSub.status} />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">Assigned Preparer</label>
                    <Select
                      value={bookkeepingSub.preparerId ?? ""}
                      onValueChange={val => assignPreparerMutation.mutate(val)}
                      disabled={assignPreparerMutation.isPending}
                    >
                      <SelectTrigger className="h-8 text-xs" data-testid="select-preparer-assignment">
                        <SelectValue placeholder="Select preparer..." />
                      </SelectTrigger>
                      <SelectContent>
                        {preparerUsers.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.firstName && p.lastName ? `${p.firstName} ${p.lastName}` : p.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground" data-testid="text-no-bookkeeping">
                  No bookkeeping subscription. Activate from the <button onClick={() => navigate("/admin/bookkeeping")} className="text-primary hover:underline font-medium">Bookkeeping</button> page.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="tickets" className="w-full">
            <TabsList className="w-full flex flex-wrap h-8 gap-0.5 p-0.5" data-testid="tabs-client-detail">
              <TabsTrigger value="tickets" data-testid="tab-tickets" className="flex-1 text-[11px] h-7 gap-1">
                Tickets ({tickets.length})
              </TabsTrigger>
              <TabsTrigger value="invoices" data-testid="tab-invoices" className="flex-1 text-[11px] h-7 gap-1">
                Invoices ({invoices.length})
              </TabsTrigger>
              <TabsTrigger value="documents" data-testid="tab-documents" className="flex-1 text-[11px] h-7 gap-1">
                Docs ({documents.length})
              </TabsTrigger>
              <TabsTrigger value="forms" data-testid="tab-forms" className="flex-1 text-[11px] h-7 gap-1">
                <ClipboardList className="w-3 h-3 hidden sm:inline" />
                Forms ({forms.length})
              </TabsTrigger>
              <TabsTrigger value="signatures" data-testid="tab-signatures" className="flex-1 text-xs gap-1">
                <PenLine className="w-3.5 h-3.5 hidden sm:inline" />
                Signing ({signatures.length})
              </TabsTrigger>
              <TabsTrigger value="notarizations" data-testid="tab-notarizations" className="flex-1 text-xs gap-1">
                <Stamp className="w-3.5 h-3.5 hidden sm:inline" />
                Notary ({notarizations.length})
              </TabsTrigger>
              <TabsTrigger value="messages" data-testid="tab-messages" className="flex-1 text-xs gap-1">
                <MessageCircle className="w-3.5 h-3.5 hidden sm:inline" />
                Chat ({messages.length})
              </TabsTrigger>
              <TabsTrigger value="notes" data-testid="tab-notes" className="flex-1 text-xs gap-1">
                <StickyNote className="w-3.5 h-3.5 hidden sm:inline" />
                Notes ({notes.length})
              </TabsTrigger>
              <TabsTrigger value="analytics" data-testid="tab-analytics" className="flex-1 text-xs gap-1">
                <TrendingUp className="w-3.5 h-3.5 hidden sm:inline" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tickets" className="mt-3">
              {tickets.length === 0 ? (
                <div className="bg-card border border-card-border rounded-xl"><EmptyState icon={Ticket} title="No tickets" description="Service tickets will appear here" compact /></div>
              ) : (
                <div className="bg-card border border-card-border rounded-xl overflow-hidden divide-y divide-border/40">
                  {tickets.map(ticket => (
                    <div key={ticket.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors" data-testid={`card-ticket-${ticket.id}`}>
                      <div className={`flex-shrink-0 w-1.5 h-8 rounded-full ${ticket.status === "open" ? "bg-blue-500" : ticket.status === "in_progress" ? "bg-amber-500" : ticket.status === "completed" || ticket.status === "closed" ? "bg-emerald-500" : "bg-gray-400"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2"><h4 className="font-medium text-sm truncate">{ticket.title}</h4><StatusBadge status={ticket.status} /></div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                          <span>{ticket.serviceType}</span>
                          {ticket.assignedTo && <><span>·</span><span>{ticket.assignedTo}</span></>}
                          {ticket.createdAt && <><span>·</span><span>{format(new Date(ticket.createdAt), "MMM d")}</span></>}
                        </div>
                      </div>
                      {ticket.dueDate && (
                        <span className={`text-[11px] flex-shrink-0 ${new Date(ticket.dueDate) < new Date() ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground"}`}>
                          Due {format(new Date(ticket.dueDate), "MMM d")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="invoices" className="mt-3">
              {invoices.length === 0 ? (
                <div className="bg-card border border-card-border rounded-xl"><EmptyState icon={Receipt} title="No invoices" description="Invoices will appear here" compact /></div>
              ) : (
                <div className="bg-card border border-card-border rounded-xl overflow-hidden divide-y divide-border/40">
                  {invoices.map(invoice => (
                    <div key={invoice.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors" data-testid={`card-invoice-${invoice.id}`}>
                      <div className={`flex-shrink-0 w-1.5 h-8 rounded-full ${invoice.status === "overdue" ? "bg-red-500" : invoice.status === "paid" ? "bg-emerald-500" : invoice.status === "sent" ? "bg-blue-500" : "bg-gray-300"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2"><h4 className="font-medium text-sm font-mono">{invoice.invoiceNumber}</h4><StatusBadge status={invoice.status} /></div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{invoice.description}{invoice.createdAt && ` · ${format(new Date(invoice.createdAt), "MMM d")}`}{invoice.dueDate && ` · Due ${format(new Date(invoice.dueDate), "MMM d")}`}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-sm font-semibold tabular-nums">${parseFloat(invoice.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        {invoice.paidDate && <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Paid {format(new Date(invoice.paidDate), "MMM d")}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="documents" className="mt-3">
              {documents.length === 0 ? (
                <div className="bg-card border border-card-border rounded-xl"><EmptyState icon={FileText} title="No documents" description="Documents will appear here" compact /></div>
              ) : (
                <div className="bg-card border border-card-border rounded-xl overflow-hidden divide-y divide-border/40">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors" data-testid={`card-document-${doc.id}`}>
                      <div className={`flex-shrink-0 w-1.5 h-8 rounded-full ${doc.status === "approved" ? "bg-emerald-500" : doc.status === "rejected" ? "bg-red-500" : "bg-amber-500"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2"><h4 className="font-medium text-sm truncate">{doc.name}</h4><StatusBadge status={doc.status} /></div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{doc.type}{doc.uploadedAt && ` · ${format(new Date(doc.uploadedAt), "MMM d, yyyy")}`}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="signatures" className="mt-3">
              {signatures.length === 0 ? (
                <div className="bg-card border border-card-border rounded-xl"><EmptyState icon={PenLine} title="No signature requests" description="Signature requests will appear here" compact /></div>
              ) : (
                <div className="bg-card border border-card-border rounded-xl overflow-hidden divide-y divide-border/40">
                  {signatures.map(sig => (
                    <div key={sig.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors" data-testid={`card-signature-${sig.id}`}>
                      <div className={`flex-shrink-0 w-1.5 h-8 rounded-full ${sig.status === "signed" ? "bg-emerald-500" : sig.status === "expired" ? "bg-red-500" : "bg-amber-500"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2"><h4 className="font-medium text-sm truncate">{sig.documentName}</h4><StatusBadge status={sig.status} /></div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {sig.sentAt && `Sent ${format(new Date(sig.sentAt), "MMM d")}`}
                          {sig.signedAt && ` · Signed ${format(new Date(sig.signedAt), "MMM d")}`}
                          {sig.signerName && ` · ${sig.signerName}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="forms" className="mt-3">
              {forms.length === 0 ? (
                <div className="bg-card border border-card-border rounded-xl"><EmptyState icon={ClipboardList} title="No forms" description="Forms will appear here" compact /></div>
              ) : (
                <div className="bg-card border border-card-border rounded-xl overflow-hidden divide-y divide-border/40">
                  {forms.map(form => (
                    <div key={form.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors" data-testid={`card-form-${form.id}`}>
                      <div className="flex-shrink-0 w-1.5 h-8 rounded-full bg-blue-500" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2"><h4 className="font-medium text-sm truncate">{form.name}</h4><StatusBadge status={form.status === "sent_for_signature" ? "sent" : form.status} label={form.status === "sent_for_signature" ? "Sent for Signature" : undefined} /></div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{form.createdAt && format(new Date(form.createdAt), "MMM d, yyyy")}{form.updatedAt && form.updatedAt !== form.createdAt && ` · Updated ${format(new Date(form.updatedAt), "MMM d")}`}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="notarizations" className="mt-3">
              {notarizations.length === 0 ? (
                <div className="bg-card border border-card-border rounded-xl"><EmptyState icon={Stamp} title="No notarizations" description="Notarization records will appear here" compact /></div>
              ) : (
                <div className="bg-card border border-card-border rounded-xl overflow-hidden divide-y divide-border/40">
                  {notarizations.map(n => (
                    <div key={n.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors" data-testid={`card-notary-${n.id}`}>
                      <div className={`flex-shrink-0 w-1.5 h-8 rounded-full ${n.status === "notarized" ? "bg-emerald-500" : "bg-amber-500"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2"><h4 className="font-medium text-sm truncate">{n.documentName}</h4><StatusBadge status={n.status === "notarized" ? "approved" : n.status} label={n.status === "notarized" ? "Notarized" : undefined} /></div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{n.notaryName}{n.notaryCommission && ` · #${n.notaryCommission}`}{n.notarizationDate && ` · ${format(new Date(n.notarizationDate), "MMM d, yyyy")}`}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="messages" className="mt-3">
              <div className="bg-card border border-card-border rounded-xl overflow-hidden">
                <div className="h-72 overflow-y-auto space-y-2 p-4" data-testid="chat-messages-list">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <EmptyState icon={MessageCircle} title="No messages" description="Start a conversation" compact />
                    </div>
                  ) : (
                    messages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.senderRole === "admin" ? "justify-end" : "justify-start"}`} data-testid={`chat-msg-${msg.id}`}>
                        <div className={`max-w-[75%] rounded-lg px-3 py-2 ${msg.senderRole === "admin" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <p className="text-[11px] font-medium opacity-80">{msg.senderName}</p>
                          <p className="text-sm mt-0.5">{msg.message}</p>
                          <p className="text-[10px] opacity-60 mt-1">{msg.createdAt && format(new Date(msg.createdAt), "MMM d, h:mm a")}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2 p-3 border-t border-border/50">
                  <Input value={chatMessage} onChange={e => setChatMessage(e.target.value)} placeholder="Type a message..." className="h-8 text-sm"
                    onKeyDown={e => { if (e.key === "Enter" && chatMessage.trim()) sendMessage.mutate(chatMessage.trim()); }}
                    data-testid="input-client-chat"
                  />
                  <Button size="sm" className="h-8" disabled={!clientId || !chatMessage.trim() || sendMessage.isPending} onClick={() => sendMessage.mutate(chatMessage.trim())} data-testid="button-send-chat">
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="mt-3">
              <div className="bg-card border border-card-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <StickyNote className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Internal Notes</span>
                  </div>
                </div>

                {(isRecording || dictateNote.isPending) && (
                  <div className={`mx-3 mt-3 flex items-center gap-3 px-4 py-3 rounded-lg border ${isRecording ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/50" : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/50"}`}
                    data-testid="dictation-panel">
                    {isRecording ? (
                      <>
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-700 dark:text-red-400">Recording... {formatTime(recordingSeconds)}</p>
                          <p className="text-[11px] text-red-600/70 dark:text-red-400/70">Speak your call summary now. Click stop when done.</p>
                        </div>
                        <Button size="sm" variant="destructive" className="h-7 text-xs gap-1"
                          onClick={stopRecording} data-testid="button-stop-recording">
                          <MicOff className="w-3 h-3" /> Stop
                        </Button>
                      </>
                    ) : (
                      <>
                        <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Processing dictation...</p>
                          <p className="text-[11px] text-blue-600/70 dark:text-blue-400/70">Transcribing and summarizing your notes with AI</p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="p-3 border-b border-border/50">
                  <Textarea
                    value={noteContent}
                    onChange={e => setNoteContent(e.target.value)}
                    placeholder="Add a note about this client..."
                    className="min-h-[60px] text-sm resize-none"
                    data-testid="input-add-note"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                      disabled={isRecording || dictateNote.isPending}
                      onClick={startRecording}
                      data-testid="button-dictate-note">
                      <Mic className="w-3 h-3" /> Dictate Notes
                    </Button>
                    <Button size="sm" className="h-7 text-xs gap-1"
                      disabled={!noteContent.trim() || addNote.isPending}
                      onClick={() => noteContent.trim() && addNote.mutate(noteContent.trim())}
                      data-testid="button-add-note">
                      <Plus className="w-3 h-3" />
                      {addNote.isPending ? "Adding..." : "Add Note"}
                    </Button>
                  </div>
                </div>

                {notes.length === 0 ? (
                  <div className="py-8">
                    <EmptyState icon={StickyNote} title="No notes yet" description="Add notes to keep track of important client info" compact />
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {notes.map(note => (
                      <div key={note.id} className="px-4 py-3 hover:bg-muted/20 transition-colors" data-testid={`note-${note.id}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="font-semibold text-foreground/70">{note.authorName}</span>
                            <span>·</span>
                            <span title={note.createdAt ? format(new Date(note.createdAt), "PPP 'at' p") : ""}>
                              {note.createdAt ? formatDistanceToNow(new Date(note.createdAt), { addSuffix: true }) : ""}
                            </span>
                            {note.updatedAt && note.createdAt && new Date(note.updatedAt).getTime() - new Date(note.createdAt).getTime() > 1000 && (
                              <span className="italic">(edited)</span>
                            )}
                          </div>
                          {note.authorId === user?.id && (
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => { setEditingNoteId(note.id); setEditingNoteContent(note.content); }}
                                data-testid={`button-edit-note-${note.id}`}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-muted-foreground hover:text-red-600"
                                onClick={() => deleteNote.mutate(note.id)}
                                data-testid={`button-delete-note-${note.id}`}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        {editingNoteId === note.id ? (
                          <div className="mt-2">
                            <Textarea value={editingNoteContent} onChange={e => setEditingNoteContent(e.target.value)}
                              className="min-h-[50px] text-sm resize-none" data-testid={`input-edit-note-${note.id}`} />
                            <div className="flex gap-1.5 mt-1.5 justify-end">
                              <Button size="sm" variant="ghost" className="h-6 text-[11px]"
                                onClick={() => { setEditingNoteId(null); setEditingNoteContent(""); }}
                                data-testid={`button-cancel-edit-${note.id}`}>
                                Cancel
                              </Button>
                              <Button size="sm" className="h-6 text-[11px]"
                                disabled={!editingNoteContent.trim() || updateNote.isPending}
                                onClick={() => updateNote.mutate({ noteId: note.id, content: editingNoteContent.trim() })}
                                data-testid={`button-save-note-${note.id}`}>
                                {updateNote.isPending ? "Saving..." : "Save"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm mt-1 whitespace-pre-wrap" data-testid={`text-note-content-${note.id}`}>{note.content}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="mt-3">
              <ClientAnalyticsTab clientId={clientId!} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

interface ClientAnalyticsData {
  lifetimeValue: number;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueAmount: number;
  overdueCount: number;
  invoiceCount: number;
  paidInvoiceCount: number;
  paymentRate: number;
  avgPaymentDays: number;
  clientSince: string | null;
  durationDays: number | null;
  durationMonths: number | null;
  durationYears: number | null;
  nextAnniversary: string | null;
  daysUntilAnniversary: number | null;
  revenueTimeline: { month: string; amount: number }[];
  serviceBreakdown: Record<string, { count: number }>;
  ticketCount: number;
  openTickets: number;
  completedTickets: number;
  ticketCompletionRate: number;
  documentCount: number;
  signatureCount: number;
  avgMonthlySpend: number;
  recentInvoices: { id: string; invoiceNumber: string; amount: number; status: string; createdAt: string; paidDate: string | null }[];
}

function ClientAnalyticsTab({ clientId }: { clientId: string }) {
  const { data: analytics, isLoading } = useQuery<ClientAnalyticsData>({
    queryKey: ["/api/clients", clientId, "analytics"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/analytics`);
      if (!res.ok) throw new Error("Failed to load analytics");
      return res.json();
    },
    enabled: !!clientId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!analytics) return null;

  const fmt = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 0 })}`;

  return (
    <div className="space-y-4" data-testid="section-client-analytics">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <div className="bg-card border border-card-border rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[11px] text-muted-foreground uppercase font-medium">Lifetime Value</span>
          </div>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-lifetime-value">{fmt(analytics.lifetimeValue)}</p>
          <p className="text-[11px] text-muted-foreground">{fmt(analytics.avgMonthlySpend)}/mo avg</p>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[11px] text-muted-foreground uppercase font-medium">Client Duration</span>
          </div>
          <p className="text-xl font-bold" data-testid="text-client-duration">
            {analytics.durationYears !== null && analytics.durationYears > 0
              ? `${analytics.durationYears}y ${(analytics.durationMonths || 0) % 12}m`
              : analytics.durationMonths !== null
                ? `${analytics.durationMonths}m`
                : analytics.durationDays !== null
                  ? `${analytics.durationDays}d`
                  : "N/A"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {analytics.clientSince ? `Since ${format(new Date(analytics.clientSince), "MMM d, yyyy")}` : ""}
          </p>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[11px] text-muted-foreground uppercase font-medium">Payment Rate</span>
          </div>
          <p className={`text-xl font-bold ${analytics.paymentRate >= 80 ? "text-emerald-600 dark:text-emerald-400" : analytics.paymentRate >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-payment-rate">
            {analytics.paymentRate}%
          </p>
          <p className="text-[11px] text-muted-foreground">{analytics.paidInvoiceCount}/{analytics.invoiceCount} invoices paid</p>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[11px] text-muted-foreground uppercase font-medium">Avg Payment Time</span>
          </div>
          <p className={`text-xl font-bold ${analytics.avgPaymentDays <= 15 ? "text-emerald-600 dark:text-emerald-400" : analytics.avgPaymentDays <= 30 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-avg-payment">
            {analytics.avgPaymentDays > 0 ? `${analytics.avgPaymentDays}d` : "N/A"}
          </p>
          <p className="text-[11px] text-muted-foreground">Days to pay invoices</p>
        </div>
      </div>

      {analytics.daysUntilAnniversary !== null && analytics.daysUntilAnniversary <= 30 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-800/50" data-testid="banner-anniversary">
          <Heart className="w-5 h-5 text-pink-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">
              {analytics.daysUntilAnniversary === 0 ? "Anniversary is today!" : `Anniversary in ${analytics.daysUntilAnniversary} days`}
            </p>
            <p className="text-xs text-muted-foreground">
              {analytics.nextAnniversary ? format(new Date(analytics.nextAnniversary), "MMMM d, yyyy") : ""} — Consider sending a thank-you email!
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
            Financial Summary
          </h3>
          <div className="space-y-2">
            {[
              { label: "Total Invoiced", value: fmt(analytics.totalInvoiced), color: "" },
              { label: "Total Paid", value: fmt(analytics.totalPaid), color: "text-emerald-600 dark:text-emerald-400" },
              { label: "Outstanding", value: fmt(analytics.totalOutstanding), color: analytics.totalOutstanding > 0 ? "text-amber-600 dark:text-amber-400" : "" },
              { label: "Overdue", value: `${fmt(analytics.overdueAmount)} (${analytics.overdueCount})`, color: analytics.overdueAmount > 0 ? "text-red-600 dark:text-red-400" : "" },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-border/30 last:border-0">
                <span className="text-sm text-muted-foreground">{row.label}</span>
                <span className={`text-sm font-medium ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Ticket className="w-3.5 h-3.5 text-blue-500" />
            Service Activity
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-1.5 border-b border-border/30">
              <span className="text-sm text-muted-foreground">Total Tickets</span>
              <span className="text-sm font-medium">{analytics.ticketCount}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-border/30">
              <span className="text-sm text-muted-foreground">Completion Rate</span>
              <span className="text-sm font-medium">{analytics.ticketCompletionRate}%</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-border/30">
              <span className="text-sm text-muted-foreground">Open/Active</span>
              <span className="text-sm font-medium">{analytics.openTickets}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-border/30">
              <span className="text-sm text-muted-foreground">Documents</span>
              <span className="text-sm font-medium">{analytics.documentCount}</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-sm text-muted-foreground">Signatures</span>
              <span className="text-sm font-medium">{analytics.signatureCount}</span>
            </div>
          </div>
        </div>
      </div>

      {Object.keys(analytics.serviceBreakdown).length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Award className="w-3.5 h-3.5 text-purple-500" />
            Services Used
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(analytics.serviceBreakdown).map(([svc, data]) => (
              <div key={svc} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50" data-testid={`badge-service-${svc}`}>
                <span className="text-sm">{svc}</span>
                <span className="text-xs font-medium text-muted-foreground bg-background rounded-full px-1.5">{data.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {analytics.recentInvoices.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Receipt className="w-3.5 h-3.5 text-emerald-500" />
            Recent Invoices
          </h3>
          <div className="space-y-1">
            {analytics.recentInvoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0" data-testid={`row-recent-invoice-${inv.id}`}>
                <div>
                  <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                  <p className="text-[11px] text-muted-foreground">{inv.createdAt ? format(new Date(inv.createdAt), "MMM d, yyyy") : ""}</p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <span className="text-sm font-medium">{fmt(inv.amount)}</span>
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${inv.status === "paid" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : inv.status === "overdue" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"}`}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
