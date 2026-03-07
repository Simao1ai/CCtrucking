import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import type { Client, ServiceTicket, Document as DocType, Invoice, ChatMessage, SignatureRequest, FilledForm, Notarization } from "@shared/schema";
import {
  ArrowLeft, Building2, Phone, Mail, MapPin, Hash, Ticket, FileText, Receipt,
  MessageCircle, PenLine, Clock, CheckCircle, AlertCircle, DollarSign,
  Calendar, User, Send, ClipboardList, Stamp
} from "lucide-react";
import { format } from "date-fns";

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
  const [chatMessage, setChatMessage] = useState("");

  const { data, isLoading, isError } = useQuery<ClientSummary>({
    queryKey: [`/api/clients/${clientId}/summary`],
    enabled: !!clientId,
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/clients")} data-testid="button-back-clients" className="h-8">
          <ArrowLeft className="w-4 h-4 mr-1" /> Clients
        </Button>
      </div>

      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Building2 className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-client-name">{client.companyName}</h1>
            <StatusBadge status={client.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5" data-testid="text-client-contact">{client.contactName}</p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Service Tickets"
          value={tickets.length}
          subtitle={`${openTickets} open`}
          icon={Ticket}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-100 dark:bg-blue-900/40"
        />
        <StatCard
          title="Total Invoiced"
          value={`$${totalInvoiced.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          subtitle={`$${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })} paid`}
          icon={DollarSign}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-100 dark:bg-emerald-900/40"
        />
        <StatCard
          title="Outstanding"
          value={`$${totalOutstanding.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          subtitle={overdueCount > 0 ? `${overdueCount} overdue` : "All current"}
          icon={AlertCircle}
          iconColor={overdueCount > 0 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}
          iconBg={overdueCount > 0 ? "bg-red-100 dark:bg-red-900/40" : "bg-amber-100 dark:bg-amber-900/40"}
        />
        <StatCard
          title="Documents"
          value={documents.length}
          subtitle={`${signatures.length} signatures`}
          icon={FileText}
          iconColor="text-purple-600 dark:text-purple-400"
          iconBg="bg-purple-100 dark:bg-purple-900/40"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1" data-testid="card-client-info">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Company Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center mt-0.5">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Contact</p>
                  <p className="text-sm font-medium" data-testid="text-detail-contact">{client.contactName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center mt-0.5">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm" data-testid="text-detail-email">{client.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center mt-0.5">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm" data-testid="text-detail-phone">{client.phone}</p>
                </div>
              </div>
              {(client.address || client.city) && (
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center mt-0.5">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Address</p>
                    {client.address && <p className="text-sm">{client.address}</p>}
                    <p className="text-sm">
                      {[client.city, client.state].filter(Boolean).join(", ")} {client.zipCode || ""}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Regulatory Numbers</p>
              {client.dotNumber && (
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">DOT Number</p>
                    <p className="text-sm font-mono font-medium" data-testid="text-detail-dot">{client.dotNumber}</p>
                  </div>
                </div>
              )}
              {client.mcNumber && (
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">MC Number</p>
                    <p className="text-sm font-mono font-medium" data-testid="text-detail-mc">{client.mcNumber}</p>
                  </div>
                </div>
              )}
              {client.einNumber && (
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">EIN Number</p>
                    <p className="text-sm font-mono font-medium" data-testid="text-detail-ein">{client.einNumber}</p>
                  </div>
                </div>
              )}
              {!client.dotNumber && !client.mcNumber && !client.einNumber && (
                <p className="text-xs text-muted-foreground italic">No regulatory numbers on file</p>
              )}
            </div>

            {client.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</p>
                  <p className="text-sm whitespace-pre-wrap" data-testid="text-detail-notes">{client.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Tabs defaultValue="tickets" className="w-full">
            <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1" data-testid="tabs-client-detail">
              <TabsTrigger value="tickets" data-testid="tab-tickets" className="flex-1 text-xs gap-1">
                <Ticket className="w-3.5 h-3.5 hidden sm:inline" />
                Tickets ({tickets.length})
              </TabsTrigger>
              <TabsTrigger value="invoices" data-testid="tab-invoices" className="flex-1 text-xs gap-1">
                <Receipt className="w-3.5 h-3.5 hidden sm:inline" />
                Invoices ({invoices.length})
              </TabsTrigger>
              <TabsTrigger value="documents" data-testid="tab-documents" className="flex-1 text-xs gap-1">
                <FileText className="w-3.5 h-3.5 hidden sm:inline" />
                Docs ({documents.length})
              </TabsTrigger>
              <TabsTrigger value="forms" data-testid="tab-forms" className="flex-1 text-xs gap-1">
                <ClipboardList className="w-3.5 h-3.5 hidden sm:inline" />
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
            </TabsList>

            <TabsContent value="tickets" className="mt-4">
              {tickets.length === 0 ? (
                <EmptyState icon={Ticket} title="No service tickets yet" description="Service tickets for this client will appear here" />
              ) : (
                <div className="space-y-2">
                  {tickets.map(ticket => (
                    <Card key={ticket.id} data-testid={`card-ticket-${ticket.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h4 className="font-medium text-sm">{ticket.title}</h4>
                              <StatusBadge status={ticket.status} />
                            </div>
                            {ticket.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ticket.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <StatusBadge status={ticket.serviceType.toLowerCase().replace(/\s+/g, '_')} label={ticket.serviceType} />
                              {(ticket.priority === "high" || ticket.priority === "urgent") && (
                                <StatusBadge status={ticket.priority} />
                              )}
                              {ticket.assignedTo && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <User className="w-3 h-3" /> {ticket.assignedTo}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 space-y-1">
                            <p className="text-xs text-muted-foreground">
                              {ticket.createdAt && format(new Date(ticket.createdAt), "MMM d, yyyy")}
                            </p>
                            {ticket.dueDate && (
                              <p className={`text-xs flex items-center gap-1 justify-end ${new Date(ticket.dueDate) < new Date() ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground"}`}>
                                <Calendar className="w-3 h-3" />
                                Due {format(new Date(ticket.dueDate), "MMM d")}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="invoices" className="mt-4">
              {invoices.length === 0 ? (
                <EmptyState icon={Receipt} title="No invoices yet" description="Invoices for this client will appear here" />
              ) : (
                <div className="space-y-2">
                  {invoices.map(invoice => (
                    <Card key={invoice.id} data-testid={`card-invoice-${invoice.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h4 className="font-medium text-sm font-mono">{invoice.invoiceNumber}</h4>
                              <StatusBadge status={invoice.status} />
                            </div>
                            {invoice.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{invoice.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Created {invoice.createdAt && format(new Date(invoice.createdAt), "MMM d, yyyy")}
                              {invoice.dueDate && ` · Due ${format(new Date(invoice.dueDate), "MMM d, yyyy")}`}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-lg font-bold">${parseFloat(invoice.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                            {invoice.paidDate && (
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                                Paid {format(new Date(invoice.paidDate), "MMM d, yyyy")}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              {documents.length === 0 ? (
                <EmptyState icon={FileText} title="No documents on file" description="Documents for this client will appear here" />
              ) : (
                <div className="space-y-2">
                  {documents.map(doc => (
                    <Card key={doc.id} data-testid={`card-document-${doc.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h4 className="font-medium text-sm">{doc.name}</h4>
                              <StatusBadge status={doc.status} />
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <StatusBadge status={doc.type.toLowerCase().replace(/\s+/g, '_')} label={doc.type} />
                              <span>{doc.uploadedAt && format(new Date(doc.uploadedAt), "MMM d, yyyy")}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="signatures" className="mt-4">
              {signatures.length === 0 ? (
                <EmptyState icon={PenLine} title="No signature requests" description="Signature requests for this client will appear here" />
              ) : (
                <div className="space-y-2">
                  {signatures.map(sig => (
                    <Card key={sig.id} data-testid={`card-signature-${sig.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h4 className="font-medium text-sm">{sig.documentName}</h4>
                              <StatusBadge status={sig.status} />
                            </div>
                            {sig.documentDescription && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{sig.documentDescription}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Sent {sig.sentAt && format(new Date(sig.sentAt), "MMM d, yyyy")}
                              {sig.signedAt && ` · Signed ${format(new Date(sig.signedAt), "MMM d, yyyy")}`}
                            </p>
                          </div>
                          {sig.signerName && (
                            <p className="text-xs text-muted-foreground flex-shrink-0">Signer: {sig.signerName}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="forms" className="mt-4">
              {forms.length === 0 ? (
                <EmptyState icon={ClipboardList} title="No filled forms yet" description="Forms for this client will appear here" />
              ) : (
                <div className="space-y-2">
                  {forms.map(form => (
                    <Card key={form.id} data-testid={`card-form-${form.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h4 className="font-medium text-sm">{form.name}</h4>
                              <StatusBadge status={form.status === "sent_for_signature" ? "sent" : form.status} label={form.status === "sent_for_signature" ? "Sent for Signature" : undefined} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {form.createdAt && format(new Date(form.createdAt), "MMM d, yyyy")}
                              {form.updatedAt && form.updatedAt !== form.createdAt && ` · Updated ${format(new Date(form.updatedAt), "MMM d, yyyy")}`}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="notarizations" className="mt-4">
              {notarizations.length === 0 ? (
                <EmptyState icon={Stamp} title="No notarization records" description="Notarization records for this client will appear here" />
              ) : (
                <div className="space-y-2">
                  {notarizations.map(n => (
                    <Card key={n.id} data-testid={`card-notary-${n.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h4 className="font-medium text-sm">{n.documentName}</h4>
                              <StatusBadge status={n.status === "notarized" ? "approved" : n.status} label={n.status === "notarized" ? "Notarized" : undefined} />
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                              <span>Notary: {n.notaryName}</span>
                              {n.notaryCommission && <span>#{n.notaryCommission}</span>}
                              {n.notarizationDate && <span>{format(new Date(n.notarizationDate), "MMM d, yyyy")}</span>}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="messages" className="mt-4">
              <Card>
                <CardContent className="p-4">
                  <div className="h-80 overflow-y-auto space-y-3 mb-4" data-testid="chat-messages-list">
                    {messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <EmptyState icon={MessageCircle} title="No messages yet" description="Start a conversation with this client" />
                      </div>
                    ) : (
                      messages.map(msg => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.senderRole === "admin" ? "justify-end" : "justify-start"}`}
                          data-testid={`chat-msg-${msg.id}`}
                        >
                          <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${
                            msg.senderRole === "admin"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}>
                            <p className="text-xs font-medium opacity-80">{msg.senderName}</p>
                            <p className="text-sm mt-0.5">{msg.message}</p>
                            <p className="text-xs opacity-60 mt-1">
                              {msg.createdAt && format(new Date(msg.createdAt), "MMM d, h:mm a")}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={chatMessage}
                      onChange={e => setChatMessage(e.target.value)}
                      placeholder="Type a message..."
                      onKeyDown={e => {
                        if (e.key === "Enter" && chatMessage.trim()) {
                          sendMessage.mutate(chatMessage.trim());
                        }
                      }}
                      data-testid="input-client-chat"
                    />
                    <Button
                      size="sm"
                      disabled={!clientId || !chatMessage.trim() || sendMessage.isPending}
                      onClick={() => sendMessage.mutate(chatMessage.trim())}
                      data-testid="button-send-chat"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
