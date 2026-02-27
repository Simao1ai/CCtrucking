import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

function statusColor(status: string) {
  switch (status) {
    case "active": case "paid": case "signed": case "completed": case "approved":
      return "default";
    case "inactive": case "overdue": case "expired":
      return "destructive";
    case "pending": case "draft": case "open": case "in_progress":
      return "secondary";
    default:
      return "outline";
  }
}

function priorityColor(priority: string) {
  switch (priority) {
    case "high": case "urgent": return "destructive";
    case "medium": return "secondary";
    default: return "outline";
  }
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
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (isError || (!isLoading && !data)) {
    return (
      <div className="p-6">
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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/clients")} data-testid="button-back-clients">
          <ArrowLeft className="w-4 h-4 mr-2" /> Clients
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-client-name">{client.companyName}</h1>
            <Badge variant={statusColor(client.status)} data-testid="badge-client-status">{client.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-client-contact">{client.contactName}</p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-stat-tickets">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Ticket className="w-4 h-4" />
              <span className="text-xs font-medium">Service Tickets</span>
            </div>
            <p className="text-2xl font-bold">{tickets.length}</p>
            <p className="text-xs text-muted-foreground">{openTickets} open</p>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-invoices">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium">Total Invoiced</span>
            </div>
            <p className="text-2xl font-bold">${totalInvoiced.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-muted-foreground">${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })} paid</p>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-outstanding">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Outstanding</span>
            </div>
            <p className="text-2xl font-bold">${totalOutstanding.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-muted-foreground">{invoices.filter(i => i.status === "overdue").length} overdue</p>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-documents">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-xs font-medium">Documents</span>
            </div>
            <p className="text-2xl font-bold">{documents.length}</p>
            <p className="text-xs text-muted-foreground">{signatures.length} signature requests</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1" data-testid="card-client-info">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Company Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Contact</p>
                  <p className="text-sm font-medium" data-testid="text-detail-contact">{client.contactName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm" data-testid="text-detail-email">{client.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm" data-testid="text-detail-phone">{client.phone}</p>
                </div>
              </div>
              {(client.address || client.city) && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
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
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Regulatory Numbers</p>
              {client.dotNumber && (
                <div className="flex items-center gap-3">
                  <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">DOT Number</p>
                    <p className="text-sm font-mono" data-testid="text-detail-dot">{client.dotNumber}</p>
                  </div>
                </div>
              )}
              {client.mcNumber && (
                <div className="flex items-center gap-3">
                  <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">MC Number</p>
                    <p className="text-sm font-mono" data-testid="text-detail-mc">{client.mcNumber}</p>
                  </div>
                </div>
              )}
              {client.einNumber && (
                <div className="flex items-center gap-3">
                  <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">EIN Number</p>
                    <p className="text-sm font-mono" data-testid="text-detail-ein">{client.einNumber}</p>
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
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Notes</p>
                  <p className="text-sm whitespace-pre-wrap" data-testid="text-detail-notes">{client.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Tabs defaultValue="tickets" className="w-full">
            <TabsList className="w-full flex flex-wrap" data-testid="tabs-client-detail">
              <TabsTrigger value="tickets" data-testid="tab-tickets" className="flex-1">
                <Ticket className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
                Tickets
              </TabsTrigger>
              <TabsTrigger value="invoices" data-testid="tab-invoices" className="flex-1">
                <Receipt className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
                Invoices
              </TabsTrigger>
              <TabsTrigger value="documents" data-testid="tab-documents" className="flex-1">
                <FileText className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
                Docs
              </TabsTrigger>
              <TabsTrigger value="forms" data-testid="tab-forms" className="flex-1">
                <ClipboardList className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
                Forms
              </TabsTrigger>
              <TabsTrigger value="signatures" data-testid="tab-signatures" className="flex-1">
                <PenLine className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
                Signing
              </TabsTrigger>
              <TabsTrigger value="notarizations" data-testid="tab-notarizations" className="flex-1">
                <Stamp className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
                Notary
              </TabsTrigger>
              <TabsTrigger value="messages" data-testid="tab-messages" className="flex-1">
                <MessageCircle className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
                Chat
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tickets" className="mt-4">
              {tickets.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Ticket className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No service tickets yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {tickets.map(ticket => (
                    <Card key={ticket.id} data-testid={`card-ticket-${ticket.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-medium text-sm">{ticket.title}</h4>
                            {ticket.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ticket.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">{ticket.serviceType}</Badge>
                              <Badge variant={priorityColor(ticket.priority)} className="text-xs">{ticket.priority}</Badge>
                              {ticket.assignedTo && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <User className="w-3 h-3" /> {ticket.assignedTo}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <Badge variant={statusColor(ticket.status)} className="text-xs">{ticket.status}</Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {ticket.createdAt && format(new Date(ticket.createdAt), "MMM d, yyyy")}
                            </p>
                            {ticket.dueDate && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
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
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No invoices yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {invoices.map(invoice => (
                    <Card key={invoice.id} data-testid={`card-invoice-${invoice.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="min-w-0">
                            <h4 className="font-medium text-sm font-mono">{invoice.invoiceNumber}</h4>
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
                            <Badge variant={statusColor(invoice.status)} className="text-xs mt-1">{invoice.status}</Badge>
                            {invoice.paidDate && (
                              <p className="text-xs text-muted-foreground mt-0.5">
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
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No documents on file</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {documents.map(doc => (
                    <Card key={doc.id} data-testid={`card-document-${doc.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="font-medium text-sm">{doc.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{doc.type}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {doc.uploadedAt && format(new Date(doc.uploadedAt), "MMM d, yyyy")}
                              </span>
                            </div>
                          </div>
                          <Badge variant={statusColor(doc.status)} className="text-xs flex-shrink-0">{doc.status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="signatures" className="mt-4">
              {signatures.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <PenLine className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No signature requests</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {signatures.map(sig => (
                    <Card key={sig.id} data-testid={`card-signature-${sig.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="min-w-0">
                            <h4 className="font-medium text-sm">{sig.documentName}</h4>
                            {sig.documentDescription && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{sig.documentDescription}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Sent {sig.sentAt && format(new Date(sig.sentAt), "MMM d, yyyy")}
                              {sig.signedAt && ` · Signed ${format(new Date(sig.signedAt), "MMM d, yyyy")}`}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <Badge variant={statusColor(sig.status)} className="text-xs">
                              {sig.status === "signed" ? (
                                <><CheckCircle className="w-3 h-3 mr-1" /> Signed</>
                              ) : (
                                <><Clock className="w-3 h-3 mr-1" /> Pending</>
                              )}
                            </Badge>
                            {sig.signerName && (
                              <p className="text-xs text-muted-foreground mt-1">By: {sig.signerName}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="forms" className="mt-4">
              {forms.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No filled forms yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {forms.map(form => (
                    <Card key={form.id} data-testid={`card-form-${form.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="min-w-0">
                            <h4 className="font-medium text-sm">{form.name}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {form.createdAt && format(new Date(form.createdAt), "MMM d, yyyy")}
                              {form.updatedAt && form.updatedAt !== form.createdAt && ` · Updated ${format(new Date(form.updatedAt), "MMM d, yyyy")}`}
                            </p>
                          </div>
                          <Badge variant={form.status === "complete" ? "default" : form.status === "sent_for_signature" ? "outline" : "secondary"} className="text-xs">
                            {form.status === "draft" && <><Clock className="w-3 h-3 mr-1" />Draft</>}
                            {form.status === "complete" && <><CheckCircle className="w-3 h-3 mr-1" />Complete</>}
                            {form.status === "sent_for_signature" && <><Send className="w-3 h-3 mr-1" />Sent for Signature</>}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="notarizations" className="mt-4">
              {notarizations.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Stamp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No notarization records</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {notarizations.map(n => (
                    <Card key={n.id} data-testid={`card-notary-${n.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-medium text-sm">{n.documentName}</h4>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                              <span>Notary: {n.notaryName}</span>
                              {n.notaryCommission && <span>#{n.notaryCommission}</span>}
                              {n.notarizationDate && <span>{format(new Date(n.notarizationDate), "MMM d, yyyy")}</span>}
                            </div>
                          </div>
                          <Badge variant={n.status === "notarized" ? "default" : n.status === "rejected" ? "destructive" : "secondary"} className="text-xs">
                            {n.status}
                          </Badge>
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
                  <div className="h-72 overflow-y-auto space-y-3 mb-4" data-testid="chat-messages-list">
                    {messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No messages yet</p>
                        </div>
                      </div>
                    ) : (
                      messages.map(msg => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.senderRole === "admin" ? "justify-end" : "justify-start"}`}
                          data-testid={`chat-msg-${msg.id}`}
                        >
                          <div className={`max-w-[75%] rounded-lg px-3 py-2 ${
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
