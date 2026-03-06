import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "./db";
import {
  clients, serviceTickets, documents, invoices, chatMessages, signatureRequests, notifications,
  formTemplates, filledForms, notarizations, auditLogs, serviceItems, invoiceLineItems, taxDocuments, pushSubscriptions,
  bookkeepingSubscriptions, bankTransactions, transactionCategories, monthlySummaries, preparerAssignments,
  ticketRequiredDocuments, recurringTemplates, clientRecurringSchedules,
  type Client, type InsertClient,
  type ServiceTicket, type InsertServiceTicket,
  type Document, type InsertDocument,
  type Invoice, type InsertInvoice,
  type ChatMessage, type InsertChatMessage,
  type SignatureRequest, type InsertSignatureRequest,
  type Notification, type InsertNotification,
  type FormTemplate, type InsertFormTemplate,
  type FilledForm, type InsertFilledForm,
  type Notarization, type InsertNotarization,
  type AuditLog, type InsertAuditLog,
  type ServiceItem, type InsertServiceItem,
  type InvoiceLineItem, type InsertInvoiceLineItem,
  type TaxDocument, type InsertTaxDocument,
  type PushSubscription, type InsertPushSubscription,
  type BookkeepingSubscription, type InsertBookkeepingSubscription,
  type BankTransaction, type InsertBankTransaction,
  type TransactionCategory, type InsertTransactionCategory,
  type MonthlySummary, type InsertMonthlySummary,
  type PreparerAssignment, type InsertPreparerAssignment,
  type TicketRequiredDocument, type InsertTicketRequiredDocument,
  type RecurringTemplate, type InsertRecurringTemplate,
  type ClientRecurringSchedule, type InsertClientRecurringSchedule,
} from "@shared/schema";

export interface IStorage {
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(data: InsertClient): Promise<Client>;
  updateClient(id: string, data: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<void>;

  getTickets(): Promise<ServiceTicket[]>;
  getTicket(id: string): Promise<ServiceTicket | undefined>;
  getTicketsByClient(clientId: string): Promise<ServiceTicket[]>;
  createTicket(data: InsertServiceTicket): Promise<ServiceTicket>;
  updateTicket(id: string, data: Partial<InsertServiceTicket>): Promise<ServiceTicket | undefined>;

  getDocuments(): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  getDocumentsByClient(clientId: string): Promise<Document[]>;
  createDocument(data: InsertDocument): Promise<Document>;
  updateDocument(id: string, data: Partial<InsertDocument>): Promise<Document | undefined>;

  getInvoices(): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  getInvoicesByClient(clientId: string): Promise<Invoice[]>;
  createInvoice(data: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, data: Partial<InsertInvoice>): Promise<Invoice | undefined>;

  getChatMessages(clientId: string): Promise<ChatMessage[]>;
  createChatMessage(data: InsertChatMessage): Promise<ChatMessage>;

  getSignatureRequests(): Promise<SignatureRequest[]>;
  getSignatureRequest(id: string): Promise<SignatureRequest | undefined>;
  getSignatureRequestsByClient(clientId: string): Promise<SignatureRequest[]>;
  createSignatureRequest(data: InsertSignatureRequest): Promise<SignatureRequest>;
  updateSignatureRequest(id: string, data: Partial<SignatureRequest>): Promise<SignatureRequest | undefined>;

  getNotificationsByUser(userId: string): Promise<Notification[]>;
  getUnreadCountByUser(userId: string): Promise<number>;
  createNotification(data: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string, userId: string): Promise<Notification | undefined>;
  markAllNotificationsRead(userId: string): Promise<void>;

  getFormTemplates(): Promise<FormTemplate[]>;
  getFormTemplate(id: string): Promise<FormTemplate | undefined>;
  createFormTemplate(data: InsertFormTemplate): Promise<FormTemplate>;
  updateFormTemplate(id: string, data: Partial<InsertFormTemplate>): Promise<FormTemplate | undefined>;
  deleteFormTemplate(id: string): Promise<void>;

  getFilledForms(): Promise<FilledForm[]>;
  getFilledForm(id: string): Promise<FilledForm | undefined>;
  getFilledFormsByClient(clientId: string): Promise<FilledForm[]>;
  createFilledForm(data: InsertFilledForm): Promise<FilledForm>;
  updateFilledForm(id: string, data: Partial<InsertFilledForm>): Promise<FilledForm | undefined>;

  getNotarizations(): Promise<Notarization[]>;
  getNotarization(id: string): Promise<Notarization | undefined>;
  getNotarizationsByClient(clientId: string): Promise<Notarization[]>;
  createNotarization(data: InsertNotarization): Promise<Notarization>;
  updateNotarization(id: string, data: Partial<InsertNotarization>): Promise<Notarization | undefined>;

  getAuditLogs(limit?: number, offset?: number): Promise<AuditLog[]>;
  getAuditLogsByEntity(entityType: string, entityId?: string): Promise<AuditLog[]>;
  createAuditLog(data: InsertAuditLog): Promise<AuditLog>;

  getServiceItems(): Promise<ServiceItem[]>;
  getServiceItem(id: string): Promise<ServiceItem | undefined>;
  createServiceItem(data: InsertServiceItem): Promise<ServiceItem>;
  updateServiceItem(id: string, data: Partial<InsertServiceItem>): Promise<ServiceItem | undefined>;
  deleteServiceItem(id: string): Promise<void>;

  getInvoiceLineItems(invoiceId: string): Promise<InvoiceLineItem[]>;
  createInvoiceLineItem(data: InsertInvoiceLineItem): Promise<InvoiceLineItem>;
  updateInvoiceLineItem(id: string, data: Partial<InsertInvoiceLineItem>): Promise<InvoiceLineItem | undefined>;
  deleteInvoiceLineItem(id: string): Promise<void>;

  getTaxDocuments(): Promise<TaxDocument[]>;
  getTaxDocumentsByClient(clientId: string): Promise<TaxDocument[]>;
  getTaxDocumentsByYear(taxYear: number): Promise<TaxDocument[]>;
  getTaxDocument(id: string): Promise<TaxDocument | undefined>;
  createTaxDocument(data: InsertTaxDocument): Promise<TaxDocument>;
  updateTaxDocument(id: string, data: Partial<InsertTaxDocument>): Promise<TaxDocument | undefined>;
  deleteTaxDocument(id: string): Promise<void>;

  getPushSubscriptionsByUser(userId: string): Promise<PushSubscription[]>;
  getAllPushSubscriptions(): Promise<PushSubscription[]>;
  createPushSubscription(data: InsertPushSubscription): Promise<PushSubscription>;
  deletePushSubscription(endpoint: string): Promise<void>;
  deletePushSubscriptionsByUser(userId: string): Promise<void>;

  getBookkeepingSubscriptions(): Promise<BookkeepingSubscription[]>;
  getBookkeepingSubscription(id: string): Promise<BookkeepingSubscription | undefined>;
  getBookkeepingSubscriptionByClient(clientId: string): Promise<BookkeepingSubscription | undefined>;
  createBookkeepingSubscription(data: InsertBookkeepingSubscription): Promise<BookkeepingSubscription>;
  updateBookkeepingSubscription(id: string, data: Partial<InsertBookkeepingSubscription>): Promise<BookkeepingSubscription | undefined>;

  getBankTransactions(clientId: string, month?: number, year?: number): Promise<BankTransaction[]>;
  getBankTransaction(id: string): Promise<BankTransaction | undefined>;
  createBankTransaction(data: InsertBankTransaction): Promise<BankTransaction>;
  createBankTransactions(data: InsertBankTransaction[]): Promise<BankTransaction[]>;
  updateBankTransaction(id: string, data: Partial<InsertBankTransaction>): Promise<BankTransaction | undefined>;
  deleteBankTransaction(id: string): Promise<void>;

  getTransactionCategories(): Promise<TransactionCategory[]>;
  createTransactionCategory(data: InsertTransactionCategory): Promise<TransactionCategory>;
  updateTransactionCategory(id: string, data: Partial<InsertTransactionCategory>): Promise<TransactionCategory | undefined>;
  deleteTransactionCategory(id: string): Promise<void>;

  getMonthlySummaries(clientId: string): Promise<MonthlySummary[]>;
  getMonthlySummary(clientId: string, month: number, year: number): Promise<MonthlySummary | undefined>;
  createMonthlySummary(data: InsertMonthlySummary): Promise<MonthlySummary>;
  updateMonthlySummary(id: string, data: Partial<InsertMonthlySummary>): Promise<MonthlySummary | undefined>;

  getPreparerAssignments(preparerId: string): Promise<PreparerAssignment[]>;
  getPreparerAssignmentsByClient(clientId: string): Promise<PreparerAssignment[]>;
  createPreparerAssignment(data: InsertPreparerAssignment): Promise<PreparerAssignment>;
  deletePreparerAssignment(id: string): Promise<void>;

  getTicketRequiredDocs(ticketId: string): Promise<TicketRequiredDocument[]>;
  createTicketRequiredDoc(data: InsertTicketRequiredDocument): Promise<TicketRequiredDocument>;
  updateTicketRequiredDoc(id: string, data: Partial<InsertTicketRequiredDocument>): Promise<TicketRequiredDocument | undefined>;
  deleteTicketRequiredDoc(id: string): Promise<void>;

  getRecurringTemplates(): Promise<RecurringTemplate[]>;
  getRecurringTemplate(id: string): Promise<RecurringTemplate | undefined>;
  createRecurringTemplate(data: InsertRecurringTemplate): Promise<RecurringTemplate>;
  updateRecurringTemplate(id: string, data: Partial<InsertRecurringTemplate>): Promise<RecurringTemplate | undefined>;
  deleteRecurringTemplate(id: string): Promise<void>;

  getClientRecurringSchedules(clientId?: string): Promise<ClientRecurringSchedule[]>;
  getActiveSchedules(): Promise<ClientRecurringSchedule[]>;
  createClientRecurringSchedule(data: InsertClientRecurringSchedule): Promise<ClientRecurringSchedule>;
  updateClientRecurringSchedule(id: string, data: Partial<InsertClientRecurringSchedule>): Promise<ClientRecurringSchedule | undefined>;
  deleteClientRecurringSchedule(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getClients(): Promise<Client[]> {
    return db.select().from(clients);
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(data: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(data).returning();
    return client;
  }

  async updateClient(id: string, data: Partial<InsertClient>): Promise<Client | undefined> {
    const [client] = await db.update(clients).set(data).where(eq(clients.id, id)).returning();
    return client;
  }

  async deleteClient(id: string): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  async getTickets(): Promise<ServiceTicket[]> {
    return db.select().from(serviceTickets);
  }

  async getTicket(id: string): Promise<ServiceTicket | undefined> {
    const [ticket] = await db.select().from(serviceTickets).where(eq(serviceTickets.id, id));
    return ticket;
  }

  async getTicketsByClient(clientId: string): Promise<ServiceTicket[]> {
    return db.select().from(serviceTickets).where(eq(serviceTickets.clientId, clientId));
  }

  async createTicket(data: InsertServiceTicket): Promise<ServiceTicket> {
    const [ticket] = await db.insert(serviceTickets).values(data).returning();
    return ticket;
  }

  async updateTicket(id: string, data: Partial<InsertServiceTicket>): Promise<ServiceTicket | undefined> {
    const [ticket] = await db.update(serviceTickets).set(data).where(eq(serviceTickets.id, id)).returning();
    return ticket;
  }

  async getDocuments(): Promise<Document[]> {
    return db.select().from(documents);
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async getDocumentsByClient(clientId: string): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.clientId, clientId));
  }

  async createDocument(data: InsertDocument): Promise<Document> {
    const [doc] = await db.insert(documents).values(data).returning();
    return doc;
  }

  async updateDocument(id: string, data: Partial<InsertDocument>): Promise<Document | undefined> {
    const [doc] = await db.update(documents).set(data).where(eq(documents.id, id)).returning();
    return doc;
  }

  async getInvoices(): Promise<Invoice[]> {
    return db.select().from(invoices);
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async getInvoicesByClient(clientId: string): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.clientId, clientId));
  }

  async createInvoice(data: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db.insert(invoices).values(data).returning();
    return invoice;
  }

  async updateInvoice(id: string, data: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [invoice] = await db.update(invoices).set(data).where(eq(invoices.id, id)).returning();
    return invoice;
  }

  async getChatMessages(clientId: string): Promise<ChatMessage[]> {
    return db.select().from(chatMessages).where(eq(chatMessages.clientId, clientId)).orderBy(chatMessages.createdAt);
  }

  async createChatMessage(data: InsertChatMessage): Promise<ChatMessage> {
    const [msg] = await db.insert(chatMessages).values(data).returning();
    return msg;
  }

  async getSignatureRequests(): Promise<SignatureRequest[]> {
    return db.select().from(signatureRequests).orderBy(desc(signatureRequests.sentAt));
  }

  async getSignatureRequest(id: string): Promise<SignatureRequest | undefined> {
    const [req] = await db.select().from(signatureRequests).where(eq(signatureRequests.id, id));
    return req;
  }

  async getSignatureRequestsByClient(clientId: string): Promise<SignatureRequest[]> {
    return db.select().from(signatureRequests).where(eq(signatureRequests.clientId, clientId)).orderBy(desc(signatureRequests.sentAt));
  }

  async createSignatureRequest(data: InsertSignatureRequest): Promise<SignatureRequest> {
    const [req] = await db.insert(signatureRequests).values(data).returning();
    return req;
  }

  async updateSignatureRequest(id: string, data: Partial<SignatureRequest>): Promise<SignatureRequest | undefined> {
    const [req] = await db.update(signatureRequests).set(data).where(eq(signatureRequests.id, id)).returning();
    return req;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async getUnreadCountByUser(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.read, "false")));
    return result[0]?.count ?? 0;
  }

  async createNotification(data: InsertNotification): Promise<Notification> {
    const [notif] = await db.insert(notifications).values(data).returning();
    return notif;
  }

  async markNotificationRead(id: string, userId: string): Promise<Notification | undefined> {
    const [notif] = await db.select().from(notifications).where(eq(notifications.id, id));
    if (!notif || notif.userId !== userId) return undefined;
    const [updated] = await db.update(notifications).set({ read: "true" }).where(eq(notifications.id, id)).returning();
    return updated;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ read: "true" }).where(eq(notifications.userId, userId));
  }

  async getFormTemplates(): Promise<FormTemplate[]> {
    return db.select().from(formTemplates).orderBy(desc(formTemplates.createdAt));
  }

  async getFormTemplate(id: string): Promise<FormTemplate | undefined> {
    const [t] = await db.select().from(formTemplates).where(eq(formTemplates.id, id));
    return t;
  }

  async createFormTemplate(data: InsertFormTemplate): Promise<FormTemplate> {
    const [t] = await db.insert(formTemplates).values(data).returning();
    return t;
  }

  async updateFormTemplate(id: string, data: Partial<InsertFormTemplate>): Promise<FormTemplate | undefined> {
    const [t] = await db.update(formTemplates).set(data).where(eq(formTemplates.id, id)).returning();
    return t;
  }

  async deleteFormTemplate(id: string): Promise<void> {
    await db.delete(formTemplates).where(eq(formTemplates.id, id));
  }

  async getFilledForms(): Promise<FilledForm[]> {
    return db.select().from(filledForms).orderBy(desc(filledForms.createdAt));
  }

  async getFilledForm(id: string): Promise<FilledForm | undefined> {
    const [f] = await db.select().from(filledForms).where(eq(filledForms.id, id));
    return f;
  }

  async getFilledFormsByClient(clientId: string): Promise<FilledForm[]> {
    return db.select().from(filledForms).where(eq(filledForms.clientId, clientId)).orderBy(desc(filledForms.createdAt));
  }

  async createFilledForm(data: InsertFilledForm): Promise<FilledForm> {
    const [f] = await db.insert(filledForms).values(data).returning();
    return f;
  }

  async updateFilledForm(id: string, data: Partial<InsertFilledForm>): Promise<FilledForm | undefined> {
    const [f] = await db.update(filledForms).set({ ...data, updatedAt: new Date() }).where(eq(filledForms.id, id)).returning();
    return f;
  }

  async getNotarizations(): Promise<Notarization[]> {
    return db.select().from(notarizations).orderBy(desc(notarizations.createdAt));
  }

  async getNotarization(id: string): Promise<Notarization | undefined> {
    const [n] = await db.select().from(notarizations).where(eq(notarizations.id, id));
    return n;
  }

  async getNotarizationsByClient(clientId: string): Promise<Notarization[]> {
    return db.select().from(notarizations).where(eq(notarizations.clientId, clientId)).orderBy(desc(notarizations.createdAt));
  }

  async createNotarization(data: InsertNotarization): Promise<Notarization> {
    const [n] = await db.insert(notarizations).values(data).returning();
    return n;
  }

  async updateNotarization(id: string, data: Partial<InsertNotarization>): Promise<Notarization | undefined> {
    const [n] = await db.update(notarizations).set(data).where(eq(notarizations.id, id)).returning();
    return n;
  }

  async getAuditLogs(limit = 100, offset = 0): Promise<AuditLog[]> {
    return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset);
  }

  async getAuditLogsByEntity(entityType: string, entityId?: string): Promise<AuditLog[]> {
    if (entityId) {
      return db.select().from(auditLogs).where(and(eq(auditLogs.entityType, entityId ? entityType : entityType), eq(auditLogs.entityId, entityId))).orderBy(desc(auditLogs.createdAt));
    }
    return db.select().from(auditLogs).where(eq(auditLogs.entityType, entityType)).orderBy(desc(auditLogs.createdAt));
  }

  async createAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(data).returning();
    return log;
  }

  async getServiceItems(): Promise<ServiceItem[]> {
    return db.select().from(serviceItems).orderBy(serviceItems.name);
  }

  async getServiceItem(id: string): Promise<ServiceItem | undefined> {
    const [item] = await db.select().from(serviceItems).where(eq(serviceItems.id, id));
    return item;
  }

  async createServiceItem(data: InsertServiceItem): Promise<ServiceItem> {
    const [item] = await db.insert(serviceItems).values(data).returning();
    return item;
  }

  async updateServiceItem(id: string, data: Partial<InsertServiceItem>): Promise<ServiceItem | undefined> {
    const [item] = await db.update(serviceItems).set(data).where(eq(serviceItems.id, id)).returning();
    return item;
  }

  async deleteServiceItem(id: string): Promise<void> {
    await db.delete(serviceItems).where(eq(serviceItems.id, id));
  }

  async getInvoiceLineItems(invoiceId: string): Promise<InvoiceLineItem[]> {
    return db.select().from(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, invoiceId)).orderBy(invoiceLineItems.createdAt);
  }

  async createInvoiceLineItem(data: InsertInvoiceLineItem): Promise<InvoiceLineItem> {
    const [item] = await db.insert(invoiceLineItems).values(data).returning();
    return item;
  }

  async updateInvoiceLineItem(id: string, data: Partial<InsertInvoiceLineItem>): Promise<InvoiceLineItem | undefined> {
    const [item] = await db.update(invoiceLineItems).set(data).where(eq(invoiceLineItems.id, id)).returning();
    return item;
  }

  async deleteInvoiceLineItem(id: string): Promise<void> {
    await db.delete(invoiceLineItems).where(eq(invoiceLineItems.id, id));
  }

  async getTaxDocuments(): Promise<TaxDocument[]> {
    return db.select().from(taxDocuments).orderBy(desc(taxDocuments.createdAt));
  }

  async getTaxDocumentsByClient(clientId: string): Promise<TaxDocument[]> {
    return db.select().from(taxDocuments).where(eq(taxDocuments.clientId, clientId)).orderBy(desc(taxDocuments.createdAt));
  }

  async getTaxDocumentsByYear(taxYear: number): Promise<TaxDocument[]> {
    return db.select().from(taxDocuments).where(eq(taxDocuments.taxYear, taxYear)).orderBy(desc(taxDocuments.createdAt));
  }

  async getTaxDocument(id: string): Promise<TaxDocument | undefined> {
    const [doc] = await db.select().from(taxDocuments).where(eq(taxDocuments.id, id));
    return doc;
  }

  async createTaxDocument(data: InsertTaxDocument): Promise<TaxDocument> {
    const [doc] = await db.insert(taxDocuments).values(data).returning();
    return doc;
  }

  async updateTaxDocument(id: string, data: Partial<InsertTaxDocument>): Promise<TaxDocument | undefined> {
    const [doc] = await db.update(taxDocuments).set({ ...data, updatedAt: new Date() }).where(eq(taxDocuments.id, id)).returning();
    return doc;
  }

  async deleteTaxDocument(id: string): Promise<void> {
    await db.delete(taxDocuments).where(eq(taxDocuments.id, id));
  }

  async getPushSubscriptionsByUser(userId: string): Promise<PushSubscription[]> {
    return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }

  async getAllPushSubscriptions(): Promise<PushSubscription[]> {
    return db.select().from(pushSubscriptions);
  }

  async createPushSubscription(data: InsertPushSubscription): Promise<PushSubscription> {
    const existing = await db.select().from(pushSubscriptions).where(
      and(eq(pushSubscriptions.userId, data.userId), eq(pushSubscriptions.endpoint, data.endpoint))
    );
    if (existing.length > 0) return existing[0];
    const [sub] = await db.insert(pushSubscriptions).values(data).returning();
    return sub;
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }

  async deletePushSubscriptionsByUser(userId: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }

  async getBookkeepingSubscriptions(): Promise<BookkeepingSubscription[]> {
    return db.select().from(bookkeepingSubscriptions).orderBy(desc(bookkeepingSubscriptions.createdAt));
  }

  async getBookkeepingSubscription(id: string): Promise<BookkeepingSubscription | undefined> {
    const [sub] = await db.select().from(bookkeepingSubscriptions).where(eq(bookkeepingSubscriptions.id, id));
    return sub;
  }

  async getBookkeepingSubscriptionByClient(clientId: string): Promise<BookkeepingSubscription | undefined> {
    const [sub] = await db.select().from(bookkeepingSubscriptions).where(eq(bookkeepingSubscriptions.clientId, clientId));
    return sub;
  }

  async createBookkeepingSubscription(data: InsertBookkeepingSubscription): Promise<BookkeepingSubscription> {
    const [sub] = await db.insert(bookkeepingSubscriptions).values(data).returning();
    return sub;
  }

  async updateBookkeepingSubscription(id: string, data: Partial<InsertBookkeepingSubscription>): Promise<BookkeepingSubscription | undefined> {
    const [sub] = await db.update(bookkeepingSubscriptions).set(data).where(eq(bookkeepingSubscriptions.id, id)).returning();
    return sub;
  }

  async getBankTransactions(clientId: string, month?: number, year?: number): Promise<BankTransaction[]> {
    const conditions = [eq(bankTransactions.clientId, clientId)];
    if (month !== undefined) conditions.push(eq(bankTransactions.statementMonth, month));
    if (year !== undefined) conditions.push(eq(bankTransactions.statementYear, year));
    return db.select().from(bankTransactions).where(and(...conditions)).orderBy(desc(bankTransactions.transactionDate));
  }

  async getBankTransaction(id: string): Promise<BankTransaction | undefined> {
    const [txn] = await db.select().from(bankTransactions).where(eq(bankTransactions.id, id));
    return txn;
  }

  async createBankTransaction(data: InsertBankTransaction): Promise<BankTransaction> {
    const [txn] = await db.insert(bankTransactions).values(data).returning();
    return txn;
  }

  async createBankTransactions(data: InsertBankTransaction[]): Promise<BankTransaction[]> {
    if (data.length === 0) return [];
    return db.insert(bankTransactions).values(data).returning();
  }

  async updateBankTransaction(id: string, data: Partial<InsertBankTransaction>): Promise<BankTransaction | undefined> {
    const [txn] = await db.update(bankTransactions).set(data).where(eq(bankTransactions.id, id)).returning();
    return txn;
  }

  async deleteBankTransaction(id: string): Promise<void> {
    await db.delete(bankTransactions).where(eq(bankTransactions.id, id));
  }

  async getTransactionCategories(): Promise<TransactionCategory[]> {
    return db.select().from(transactionCategories).orderBy(transactionCategories.name);
  }

  async createTransactionCategory(data: InsertTransactionCategory): Promise<TransactionCategory> {
    const [cat] = await db.insert(transactionCategories).values(data).returning();
    return cat;
  }

  async updateTransactionCategory(id: string, data: Partial<InsertTransactionCategory>): Promise<TransactionCategory | undefined> {
    const [cat] = await db.update(transactionCategories).set(data).where(eq(transactionCategories.id, id)).returning();
    return cat;
  }

  async deleteTransactionCategory(id: string): Promise<void> {
    await db.delete(transactionCategories).where(eq(transactionCategories.id, id));
  }

  async getMonthlySummaries(clientId: string): Promise<MonthlySummary[]> {
    return db.select().from(monthlySummaries).where(eq(monthlySummaries.clientId, clientId)).orderBy(desc(monthlySummaries.year), desc(monthlySummaries.month));
  }

  async getMonthlySummary(clientId: string, month: number, year: number): Promise<MonthlySummary | undefined> {
    const [summary] = await db.select().from(monthlySummaries).where(
      and(eq(monthlySummaries.clientId, clientId), eq(monthlySummaries.month, month), eq(monthlySummaries.year, year))
    );
    return summary;
  }

  async createMonthlySummary(data: InsertMonthlySummary): Promise<MonthlySummary> {
    const [summary] = await db.insert(monthlySummaries).values(data).returning();
    return summary;
  }

  async updateMonthlySummary(id: string, data: Partial<InsertMonthlySummary>): Promise<MonthlySummary | undefined> {
    const [summary] = await db.update(monthlySummaries).set(data).where(eq(monthlySummaries.id, id)).returning();
    return summary;
  }

  async getPreparerAssignments(preparerId: string): Promise<PreparerAssignment[]> {
    return db.select().from(preparerAssignments).where(eq(preparerAssignments.preparerId, preparerId)).orderBy(desc(preparerAssignments.createdAt));
  }

  async getPreparerAssignmentsByClient(clientId: string): Promise<PreparerAssignment[]> {
    return db.select().from(preparerAssignments).where(eq(preparerAssignments.clientId, clientId)).orderBy(desc(preparerAssignments.createdAt));
  }

  async createPreparerAssignment(data: InsertPreparerAssignment): Promise<PreparerAssignment> {
    const [assignment] = await db.insert(preparerAssignments).values(data).returning();
    return assignment;
  }

  async deletePreparerAssignment(id: string): Promise<void> {
    await db.delete(preparerAssignments).where(eq(preparerAssignments.id, id));
  }

  async getTicketRequiredDocs(ticketId: string): Promise<TicketRequiredDocument[]> {
    return db.select().from(ticketRequiredDocuments).where(eq(ticketRequiredDocuments.ticketId, ticketId)).orderBy(desc(ticketRequiredDocuments.createdAt));
  }

  async createTicketRequiredDoc(data: InsertTicketRequiredDocument): Promise<TicketRequiredDocument> {
    const [doc] = await db.insert(ticketRequiredDocuments).values(data).returning();
    return doc;
  }

  async updateTicketRequiredDoc(id: string, data: Partial<InsertTicketRequiredDocument>): Promise<TicketRequiredDocument | undefined> {
    const [doc] = await db.update(ticketRequiredDocuments).set(data).where(eq(ticketRequiredDocuments.id, id)).returning();
    return doc;
  }

  async deleteTicketRequiredDoc(id: string): Promise<void> {
    await db.delete(ticketRequiredDocuments).where(eq(ticketRequiredDocuments.id, id));
  }

  async getRecurringTemplates(): Promise<RecurringTemplate[]> {
    return db.select().from(recurringTemplates).orderBy(desc(recurringTemplates.createdAt));
  }

  async getRecurringTemplate(id: string): Promise<RecurringTemplate | undefined> {
    const [template] = await db.select().from(recurringTemplates).where(eq(recurringTemplates.id, id));
    return template;
  }

  async createRecurringTemplate(data: InsertRecurringTemplate): Promise<RecurringTemplate> {
    const [template] = await db.insert(recurringTemplates).values(data).returning();
    return template;
  }

  async updateRecurringTemplate(id: string, data: Partial<InsertRecurringTemplate>): Promise<RecurringTemplate | undefined> {
    const [template] = await db.update(recurringTemplates).set(data).where(eq(recurringTemplates.id, id)).returning();
    return template;
  }

  async deleteRecurringTemplate(id: string): Promise<void> {
    await db.delete(recurringTemplates).where(eq(recurringTemplates.id, id));
  }

  async getClientRecurringSchedules(clientId?: string): Promise<ClientRecurringSchedule[]> {
    if (clientId) {
      return db.select().from(clientRecurringSchedules).where(eq(clientRecurringSchedules.clientId, clientId)).orderBy(desc(clientRecurringSchedules.createdAt));
    }
    return db.select().from(clientRecurringSchedules).orderBy(desc(clientRecurringSchedules.createdAt));
  }

  async getActiveSchedules(): Promise<ClientRecurringSchedule[]> {
    return db.select().from(clientRecurringSchedules).where(eq(clientRecurringSchedules.isActive, true));
  }

  async createClientRecurringSchedule(data: InsertClientRecurringSchedule): Promise<ClientRecurringSchedule> {
    const [schedule] = await db.insert(clientRecurringSchedules).values(data).returning();
    return schedule;
  }

  async updateClientRecurringSchedule(id: string, data: Partial<InsertClientRecurringSchedule>): Promise<ClientRecurringSchedule | undefined> {
    const [schedule] = await db.update(clientRecurringSchedules).set(data).where(eq(clientRecurringSchedules.id, id)).returning();
    return schedule;
  }

  async deleteClientRecurringSchedule(id: string): Promise<void> {
    await db.delete(clientRecurringSchedules).where(eq(clientRecurringSchedules.id, id));
  }
}

export const storage = new DatabaseStorage();
