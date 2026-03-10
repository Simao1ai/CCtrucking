import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "./db";
import {
  clients, serviceTickets, documents, invoices, chatMessages, signatureRequests, notifications,
  formTemplates, filledForms, notarizations, auditLogs, serviceItems, invoiceLineItems, taxDocuments, pushSubscriptions,
  bookkeepingSubscriptions, bankTransactions, transactionCategories, monthlySummaries, preparerAssignments,
  ticketRequiredDocuments, recurringTemplates, clientRecurringSchedules, staffMessages, clientNotes, knowledgeArticles,
  customFieldDefinitions, customFieldValues, tenants, tenantBranding, tenantSettings,
  type Tenant, type InsertTenant, type TenantBranding, type InsertTenantBranding,
  type TenantSettings, type InsertTenantSettings,
  type Client, type InsertClient,
  type ServiceTicket, type InsertServiceTicket,
  type Document, type InsertDocument,
  type Invoice, type InsertInvoice,
  type ChatMessage, type InsertChatMessage,
  type StaffMessage, type InsertStaffMessage,
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
  type ClientNote, type InsertClientNote,
  type KnowledgeArticle, type InsertKnowledgeArticle,
  type CustomFieldDefinition, type InsertCustomFieldDefinition,
  type CustomFieldValue, type InsertCustomFieldValue,
} from "@shared/schema";

export interface IStorage {
  getClients(tenantId?: string): Promise<Client[]>;
  getClient(id: string, tenantId?: string): Promise<Client | undefined>;
  createClient(data: InsertClient): Promise<Client>;
  updateClient(id: string, data: Partial<InsertClient>, tenantId?: string): Promise<Client | undefined>;
  deleteClient(id: string, tenantId?: string): Promise<void>;

  getTickets(tenantId?: string): Promise<ServiceTicket[]>;
  getTicket(id: string, tenantId?: string): Promise<ServiceTicket | undefined>;
  getTicketsByClient(clientId: string, tenantId?: string): Promise<ServiceTicket[]>;
  createTicket(data: InsertServiceTicket): Promise<ServiceTicket>;
  updateTicket(id: string, data: Partial<InsertServiceTicket>, tenantId?: string): Promise<ServiceTicket | undefined>;

  getDocuments(tenantId?: string): Promise<Document[]>;
  getDocument(id: string, tenantId?: string): Promise<Document | undefined>;
  getDocumentsByClient(clientId: string, tenantId?: string): Promise<Document[]>;
  createDocument(data: InsertDocument): Promise<Document>;
  updateDocument(id: string, data: Partial<InsertDocument>, tenantId?: string): Promise<Document | undefined>;

  getInvoices(tenantId?: string): Promise<Invoice[]>;
  getInvoice(id: string, tenantId?: string): Promise<Invoice | undefined>;
  getInvoicesByClient(clientId: string, tenantId?: string): Promise<Invoice[]>;
  createInvoice(data: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, data: Partial<InsertInvoice>, tenantId?: string): Promise<Invoice | undefined>;

  getChatMessages(clientId: string, tenantId?: string): Promise<ChatMessage[]>;
  createChatMessage(data: InsertChatMessage): Promise<ChatMessage>;

  getStaffMessages(userId: string, tenantId?: string): Promise<StaffMessage[]>;
  getStaffConversation(userId1: string, userId2: string, tenantId?: string): Promise<StaffMessage[]>;
  createStaffMessage(data: InsertStaffMessage): Promise<StaffMessage>;
  markStaffMessagesRead(recipientId: string, senderId: string, tenantId?: string): Promise<void>;
  getUnreadStaffMessageCount(userId: string): Promise<number>;

  getSignatureRequests(tenantId?: string): Promise<SignatureRequest[]>;
  getSignatureRequest(id: string, tenantId?: string): Promise<SignatureRequest | undefined>;
  getSignatureRequestsByClient(clientId: string, tenantId?: string): Promise<SignatureRequest[]>;
  createSignatureRequest(data: InsertSignatureRequest): Promise<SignatureRequest>;
  updateSignatureRequest(id: string, data: Partial<SignatureRequest>, tenantId?: string): Promise<SignatureRequest | undefined>;

  getNotificationsByUser(userId: string, tenantId?: string): Promise<Notification[]>;
  getUnreadCountByUser(userId: string): Promise<number>;
  createNotification(data: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string, userId: string, tenantId?: string): Promise<Notification | undefined>;
  markAllNotificationsRead(userId: string, tenantId?: string): Promise<void>;

  getFormTemplates(tenantId?: string): Promise<FormTemplate[]>;
  getFormTemplate(id: string, tenantId?: string): Promise<FormTemplate | undefined>;
  createFormTemplate(data: InsertFormTemplate): Promise<FormTemplate>;
  updateFormTemplate(id: string, data: Partial<InsertFormTemplate>, tenantId?: string): Promise<FormTemplate | undefined>;
  deleteFormTemplate(id: string, tenantId?: string): Promise<void>;

  getFilledForms(tenantId?: string): Promise<FilledForm[]>;
  getFilledForm(id: string, tenantId?: string): Promise<FilledForm | undefined>;
  getFilledFormsByClient(clientId: string, tenantId?: string): Promise<FilledForm[]>;
  createFilledForm(data: InsertFilledForm): Promise<FilledForm>;
  updateFilledForm(id: string, data: Partial<InsertFilledForm>, tenantId?: string): Promise<FilledForm | undefined>;

  getNotarizations(tenantId?: string): Promise<Notarization[]>;
  getNotarization(id: string, tenantId?: string): Promise<Notarization | undefined>;
  getNotarizationsByClient(clientId: string, tenantId?: string): Promise<Notarization[]>;
  createNotarization(data: InsertNotarization): Promise<Notarization>;
  updateNotarization(id: string, data: Partial<InsertNotarization>, tenantId?: string): Promise<Notarization | undefined>;

  getAuditLogs(limit?: number, offset?: number, tenantId?: string): Promise<AuditLog[]>;
  getAuditLogsByEntity(entityType: string, entityId?: string, tenantId?: string): Promise<AuditLog[]>;
  createAuditLog(data: InsertAuditLog): Promise<AuditLog>;

  getServiceItems(tenantId?: string): Promise<ServiceItem[]>;
  getServiceItem(id: string, tenantId?: string): Promise<ServiceItem | undefined>;
  createServiceItem(data: InsertServiceItem): Promise<ServiceItem>;
  updateServiceItem(id: string, data: Partial<InsertServiceItem>, tenantId?: string): Promise<ServiceItem | undefined>;
  deleteServiceItem(id: string, tenantId?: string): Promise<void>;

  getInvoiceLineItems(invoiceId: string, tenantId?: string): Promise<InvoiceLineItem[]>;
  createInvoiceLineItem(data: InsertInvoiceLineItem): Promise<InvoiceLineItem>;
  updateInvoiceLineItem(id: string, data: Partial<InsertInvoiceLineItem>, tenantId?: string): Promise<InvoiceLineItem | undefined>;
  deleteInvoiceLineItem(id: string, tenantId?: string): Promise<void>;

  getTaxDocuments(tenantId?: string): Promise<TaxDocument[]>;
  getTaxDocumentsByClient(clientId: string, tenantId?: string): Promise<TaxDocument[]>;
  getTaxDocumentsByYear(taxYear: number, tenantId?: string): Promise<TaxDocument[]>;
  getTaxDocument(id: string, tenantId?: string): Promise<TaxDocument | undefined>;
  createTaxDocument(data: InsertTaxDocument): Promise<TaxDocument>;
  updateTaxDocument(id: string, data: Partial<InsertTaxDocument>, tenantId?: string): Promise<TaxDocument | undefined>;
  deleteTaxDocument(id: string, tenantId?: string): Promise<void>;

  getPushSubscriptionsByUser(userId: string): Promise<PushSubscription[]>;
  getAllPushSubscriptions(tenantId?: string): Promise<PushSubscription[]>;
  createPushSubscription(data: InsertPushSubscription): Promise<PushSubscription>;
  deletePushSubscription(endpoint: string): Promise<void>;
  deletePushSubscriptionsByUser(userId: string): Promise<void>;

  getBookkeepingSubscriptions(tenantId?: string): Promise<BookkeepingSubscription[]>;
  getBookkeepingSubscription(id: string, tenantId?: string): Promise<BookkeepingSubscription | undefined>;
  getBookkeepingSubscriptionByClient(clientId: string, tenantId?: string): Promise<BookkeepingSubscription | undefined>;
  createBookkeepingSubscription(data: InsertBookkeepingSubscription): Promise<BookkeepingSubscription>;
  updateBookkeepingSubscription(id: string, data: Partial<InsertBookkeepingSubscription>, tenantId?: string): Promise<BookkeepingSubscription | undefined>;

  getBankTransactions(clientId: string, month?: number, year?: number, tenantId?: string): Promise<BankTransaction[]>;
  getBankTransaction(id: string, tenantId?: string): Promise<BankTransaction | undefined>;
  createBankTransaction(data: InsertBankTransaction): Promise<BankTransaction>;
  createBankTransactions(data: InsertBankTransaction[]): Promise<BankTransaction[]>;
  updateBankTransaction(id: string, data: Partial<InsertBankTransaction>, tenantId?: string): Promise<BankTransaction | undefined>;
  deleteBankTransaction(id: string, tenantId?: string): Promise<void>;

  getTransactionCategories(tenantId?: string): Promise<TransactionCategory[]>;
  createTransactionCategory(data: InsertTransactionCategory): Promise<TransactionCategory>;
  updateTransactionCategory(id: string, data: Partial<InsertTransactionCategory>, tenantId?: string): Promise<TransactionCategory | undefined>;
  deleteTransactionCategory(id: string, tenantId?: string): Promise<void>;

  getMonthlySummaries(clientId: string, tenantId?: string): Promise<MonthlySummary[]>;
  getMonthlySummary(clientId: string, month: number, year: number): Promise<MonthlySummary | undefined>;
  createMonthlySummary(data: InsertMonthlySummary): Promise<MonthlySummary>;
  updateMonthlySummary(id: string, data: Partial<InsertMonthlySummary>, tenantId?: string): Promise<MonthlySummary | undefined>;

  getPreparerAssignments(preparerId: string, tenantId?: string): Promise<PreparerAssignment[]>;
  getPreparerAssignmentsByClient(clientId: string, tenantId?: string): Promise<PreparerAssignment[]>;
  createPreparerAssignment(data: InsertPreparerAssignment): Promise<PreparerAssignment>;
  deletePreparerAssignment(id: string, tenantId?: string): Promise<void>;

  getTicketRequiredDocs(ticketId: string, tenantId?: string): Promise<TicketRequiredDocument[]>;
  createTicketRequiredDoc(data: InsertTicketRequiredDocument): Promise<TicketRequiredDocument>;
  updateTicketRequiredDoc(id: string, data: Partial<InsertTicketRequiredDocument>, tenantId?: string): Promise<TicketRequiredDocument | undefined>;
  deleteTicketRequiredDoc(id: string, tenantId?: string): Promise<void>;

  getRecurringTemplates(tenantId?: string): Promise<RecurringTemplate[]>;
  getRecurringTemplate(id: string, tenantId?: string): Promise<RecurringTemplate | undefined>;
  createRecurringTemplate(data: InsertRecurringTemplate): Promise<RecurringTemplate>;
  updateRecurringTemplate(id: string, data: Partial<InsertRecurringTemplate>, tenantId?: string): Promise<RecurringTemplate | undefined>;
  deleteRecurringTemplate(id: string, tenantId?: string): Promise<void>;

  getClientRecurringSchedules(clientId?: string, tenantId?: string): Promise<ClientRecurringSchedule[]>;
  getActiveSchedules(tenantId?: string): Promise<ClientRecurringSchedule[]>;
  createClientRecurringSchedule(data: InsertClientRecurringSchedule): Promise<ClientRecurringSchedule>;
  updateClientRecurringSchedule(id: string, data: Partial<InsertClientRecurringSchedule>, tenantId?: string): Promise<ClientRecurringSchedule | undefined>;
  deleteClientRecurringSchedule(id: string, tenantId?: string): Promise<void>;

  claimTicket(ticketId: string, userId: string, userName: string, tenantId?: string): Promise<ServiceTicket | undefined>;
  releaseTicket(ticketId: string, tenantId?: string): Promise<ServiceTicket | undefined>;

  getClientNotes(clientId: string, tenantId?: string): Promise<ClientNote[]>;
  getClientNote(id: string, tenantId?: string): Promise<ClientNote | undefined>;
  createClientNote(data: InsertClientNote): Promise<ClientNote>;
  updateClientNote(id: string, content: string, tenantId?: string): Promise<ClientNote | undefined>;
  deleteClientNote(id: string, tenantId?: string): Promise<void>;

  getKnowledgeArticles(tenantId?: string): Promise<KnowledgeArticle[]>;
  getKnowledgeArticle(id: string, tenantId?: string): Promise<KnowledgeArticle | undefined>;
  createKnowledgeArticle(data: InsertKnowledgeArticle): Promise<KnowledgeArticle>;
  updateKnowledgeArticle(id: string, data: Partial<InsertKnowledgeArticle>, tenantId?: string): Promise<KnowledgeArticle | undefined>;
  deleteKnowledgeArticle(id: string, tenantId?: string): Promise<void>;
  searchKnowledgeArticles(query: string, tenantId?: string): Promise<KnowledgeArticle[]>;

  getCustomFieldDefinitions(entityType?: string, tenantId?: string): Promise<CustomFieldDefinition[]>;
  getCustomFieldDefinition(id: string, tenantId?: string): Promise<CustomFieldDefinition | undefined>;
  createCustomFieldDefinition(data: InsertCustomFieldDefinition): Promise<CustomFieldDefinition>;
  updateCustomFieldDefinition(id: string, data: Partial<InsertCustomFieldDefinition>, tenantId?: string): Promise<CustomFieldDefinition | undefined>;
  deleteCustomFieldDefinition(id: string, tenantId?: string): Promise<void>;

  getCustomFieldValues(entityType: string, entityId: string, tenantId?: string): Promise<CustomFieldValue[]>;
  setCustomFieldValue(data: InsertCustomFieldValue): Promise<CustomFieldValue>;
  deleteCustomFieldValues(entityType: string, entityId: string, tenantId?: string): Promise<void>;

  getTenant(id: string): Promise<Tenant | undefined>;
  updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined>;
  getTenantBrandingByTenantId(tenantId: string): Promise<TenantBranding | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  updateTenantBranding(tenantId: string, data: Partial<InsertTenantBranding>): Promise<TenantBranding | undefined>;
  getTenantSettings(tenantId: string): Promise<TenantSettings[]>;
  getTenantSetting(tenantId: string, key: string): Promise<TenantSettings | undefined>;
  upsertTenantSetting(tenantId: string, key: string, value: string, type?: string, updatedBy?: string): Promise<TenantSettings>;
  deleteTenantSetting(tenantId: string, key: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getClients(tenantId?: string): Promise<Client[]> {
    if (tenantId) {
      return db.select().from(clients).where(eq(clients.tenantId, tenantId));
    }
    return db.select().from(clients);
  }

  async getClient(id: string, tenantId?: string): Promise<Client | undefined> {
    const conditions = [eq(clients.id, id)];
    if (tenantId) conditions.push(eq(clients.tenantId, tenantId));
    const [client] = await db.select().from(clients).where(and(...conditions));
    return client;
  }

  async createClient(data: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(data).returning();
    return client;
  }

  async updateClient(id: string, data: Partial<InsertClient>, tenantId?: string): Promise<Client | undefined> {
    const conditions = [eq(clients.id, id)];
    if (tenantId) conditions.push(eq(clients.tenantId, tenantId));
    const [client] = await db.update(clients).set(data).where(and(...conditions)).returning();
    return client;
  }

  async deleteClient(id: string, tenantId?: string): Promise<void> {
    const conditions = [eq(clients.id, id)];
    if (tenantId) conditions.push(eq(clients.tenantId, tenantId));
    await db.delete(clients).where(and(...conditions));
  }

  async getTickets(tenantId?: string): Promise<ServiceTicket[]> {
    if (tenantId) {
      return db.select().from(serviceTickets).where(eq(serviceTickets.tenantId, tenantId));
    }
    return db.select().from(serviceTickets);
  }

  async getTicket(id: string, tenantId?: string): Promise<ServiceTicket | undefined> {
    const conditions = [eq(serviceTickets.id, id)];
    if (tenantId) conditions.push(eq(serviceTickets.tenantId, tenantId));
    const [ticket] = await db.select().from(serviceTickets).where(and(...conditions));
    return ticket;
  }

  async getTicketsByClient(clientId: string, tenantId?: string): Promise<ServiceTicket[]> {
    const conditions = [eq(serviceTickets.clientId, clientId)];
    if (tenantId) conditions.push(eq(serviceTickets.tenantId, tenantId));
    return db.select().from(serviceTickets).where(and(...conditions));
  }

  async createTicket(data: InsertServiceTicket): Promise<ServiceTicket> {
    const [ticket] = await db.insert(serviceTickets).values(data).returning();
    return ticket;
  }

  async updateTicket(id: string, data: Partial<InsertServiceTicket>, tenantId?: string): Promise<ServiceTicket | undefined> {
    const conditions = [eq(serviceTickets.id, id)];
    if (tenantId) conditions.push(eq(serviceTickets.tenantId, tenantId));
    const [ticket] = await db.update(serviceTickets).set(data).where(and(...conditions)).returning();
    return ticket;
  }

  async getDocuments(tenantId?: string): Promise<Document[]> {
    if (tenantId) {
      return db.select().from(documents).where(eq(documents.tenantId, tenantId));
    }
    return db.select().from(documents);
  }

  async getDocument(id: string, tenantId?: string): Promise<Document | undefined> {
    const conditions = [eq(documents.id, id)];
    if (tenantId) conditions.push(eq(documents.tenantId, tenantId));
    const [doc] = await db.select().from(documents).where(and(...conditions));
    return doc;
  }

  async getDocumentsByClient(clientId: string, tenantId?: string): Promise<Document[]> {
    const conditions = [eq(documents.clientId, clientId)];
    if (tenantId) conditions.push(eq(documents.tenantId, tenantId));
    return db.select().from(documents).where(and(...conditions));
  }

  async createDocument(data: InsertDocument): Promise<Document> {
    const [doc] = await db.insert(documents).values(data).returning();
    return doc;
  }

  async updateDocument(id: string, data: Partial<InsertDocument>, tenantId?: string): Promise<Document | undefined> {
    const conditions = [eq(documents.id, id)];
    if (tenantId) conditions.push(eq(documents.tenantId, tenantId));
    const [doc] = await db.update(documents).set(data).where(and(...conditions)).returning();
    return doc;
  }

  async getInvoices(tenantId?: string): Promise<Invoice[]> {
    if (tenantId) {
      return db.select().from(invoices).where(eq(invoices.tenantId, tenantId));
    }
    return db.select().from(invoices);
  }

  async getInvoice(id: string, tenantId?: string): Promise<Invoice | undefined> {
    const conditions = [eq(invoices.id, id)];
    if (tenantId) conditions.push(eq(invoices.tenantId, tenantId));
    const [invoice] = await db.select().from(invoices).where(and(...conditions));
    return invoice;
  }

  async getInvoicesByClient(clientId: string, tenantId?: string): Promise<Invoice[]> {
    const conditions = [eq(invoices.clientId, clientId)];
    if (tenantId) conditions.push(eq(invoices.tenantId, tenantId));
    return db.select().from(invoices).where(and(...conditions));
  }

  async createInvoice(data: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db.insert(invoices).values(data).returning();
    return invoice;
  }

  async updateInvoice(id: string, data: Partial<InsertInvoice>, tenantId?: string): Promise<Invoice | undefined> {
    const conditions = [eq(invoices.id, id)];
    if (tenantId) conditions.push(eq(invoices.tenantId, tenantId));
    const [invoice] = await db.update(invoices).set(data).where(and(...conditions)).returning();
    return invoice;
  }

  async getChatMessages(clientId: string, tenantId?: string): Promise<ChatMessage[]> {
    const conditions = [eq(chatMessages.clientId, clientId)];
    if (tenantId) conditions.push(eq(chatMessages.tenantId, tenantId));
    return db.select().from(chatMessages).where(and(...conditions)).orderBy(chatMessages.createdAt);
  }

  async createChatMessage(data: InsertChatMessage): Promise<ChatMessage> {
    const [msg] = await db.insert(chatMessages).values(data).returning();
    return msg;
  }

  async getStaffMessages(userId: string, tenantId?: string): Promise<StaffMessage[]> {
    if (tenantId) {
      return db.select().from(staffMessages)
        .where(and(
          sql`${staffMessages.senderId} = ${userId} OR ${staffMessages.recipientId} = ${userId}`,
          eq(staffMessages.tenantId, tenantId)
        ))
        .orderBy(desc(staffMessages.createdAt));
    }
    return db.select().from(staffMessages)
      .where(sql`${staffMessages.senderId} = ${userId} OR ${staffMessages.recipientId} = ${userId}`)
      .orderBy(desc(staffMessages.createdAt));
  }

  async getStaffConversation(userId1: string, userId2: string, tenantId?: string): Promise<StaffMessage[]> {
    if (tenantId) {
      return db.select().from(staffMessages)
        .where(and(
          sql`(${staffMessages.senderId} = ${userId1} AND ${staffMessages.recipientId} = ${userId2}) OR (${staffMessages.senderId} = ${userId2} AND ${staffMessages.recipientId} = ${userId1})`,
          eq(staffMessages.tenantId, tenantId)
        ))
        .orderBy(staffMessages.createdAt);
    }
    return db.select().from(staffMessages)
      .where(sql`(${staffMessages.senderId} = ${userId1} AND ${staffMessages.recipientId} = ${userId2}) OR (${staffMessages.senderId} = ${userId2} AND ${staffMessages.recipientId} = ${userId1})`)
      .orderBy(staffMessages.createdAt);
  }

  async createStaffMessage(data: InsertStaffMessage): Promise<StaffMessage> {
    const [msg] = await db.insert(staffMessages).values(data).returning();
    return msg;
  }

  async markStaffMessagesRead(recipientId: string, senderId: string, tenantId?: string): Promise<void> {
    const conditions = [eq(staffMessages.recipientId, recipientId), eq(staffMessages.senderId, senderId)];
    if (tenantId) conditions.push(eq(staffMessages.tenantId, tenantId));
    await db.update(staffMessages)
      .set({ read: true })
      .where(and(...conditions));
  }

  async getUnreadStaffMessageCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(staffMessages)
      .where(and(eq(staffMessages.recipientId, userId), eq(staffMessages.read, false)));
    return Number(result?.count || 0);
  }

  async getSignatureRequests(tenantId?: string): Promise<SignatureRequest[]> {
    if (tenantId) {
      return db.select().from(signatureRequests).where(eq(signatureRequests.tenantId, tenantId)).orderBy(desc(signatureRequests.sentAt));
    }
    return db.select().from(signatureRequests).orderBy(desc(signatureRequests.sentAt));
  }

  async getSignatureRequest(id: string, tenantId?: string): Promise<SignatureRequest | undefined> {
    const conditions = [eq(signatureRequests.id, id)];
    if (tenantId) conditions.push(eq(signatureRequests.tenantId, tenantId));
    const [req] = await db.select().from(signatureRequests).where(and(...conditions));
    return req;
  }

  async getSignatureRequestsByClient(clientId: string, tenantId?: string): Promise<SignatureRequest[]> {
    const conditions = [eq(signatureRequests.clientId, clientId)];
    if (tenantId) conditions.push(eq(signatureRequests.tenantId, tenantId));
    return db.select().from(signatureRequests).where(and(...conditions)).orderBy(desc(signatureRequests.sentAt));
  }

  async createSignatureRequest(data: InsertSignatureRequest): Promise<SignatureRequest> {
    const [req] = await db.insert(signatureRequests).values(data).returning();
    return req;
  }

  async updateSignatureRequest(id: string, data: Partial<SignatureRequest>, tenantId?: string): Promise<SignatureRequest | undefined> {
    const conditions = [eq(signatureRequests.id, id)];
    if (tenantId) conditions.push(eq(signatureRequests.tenantId, tenantId));
    const [req] = await db.update(signatureRequests).set(data).where(and(...conditions)).returning();
    return req;
  }

  async getNotificationsByUser(userId: string, tenantId?: string): Promise<Notification[]> {
    const conditions = [eq(notifications.userId, userId)];
    if (tenantId) conditions.push(eq(notifications.tenantId, tenantId));
    return db.select().from(notifications).where(and(...conditions)).orderBy(desc(notifications.createdAt));
  }

  async getUnreadCountByUser(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.read, "false")));
    return result[0]?.count ?? 0;
  }

  async createNotification(data: InsertNotification): Promise<Notification> {
    const [notif] = await db.insert(notifications).values(data).returning();
    return notif;
  }

  async markNotificationRead(id: string, userId: string, tenantId?: string): Promise<Notification | undefined> {
    const selectConditions = [eq(notifications.id, id)];
    if (tenantId) selectConditions.push(eq(notifications.tenantId, tenantId));
    const [notif] = await db.select().from(notifications).where(and(...selectConditions));
    if (!notif || notif.userId !== userId) return undefined;
    const conditions = [eq(notifications.id, id)];
    if (tenantId) conditions.push(eq(notifications.tenantId, tenantId));
    const [updated] = await db.update(notifications).set({ read: "true" }).where(and(...conditions)).returning();
    return updated;
  }

  async markAllNotificationsRead(userId: string, tenantId?: string): Promise<void> {
    const conditions = [eq(notifications.userId, userId)];
    if (tenantId) conditions.push(eq(notifications.tenantId, tenantId));
    await db.update(notifications).set({ read: "true" }).where(and(...conditions));
  }

  async getFormTemplates(tenantId?: string): Promise<FormTemplate[]> {
    if (tenantId) {
      return db.select().from(formTemplates).where(eq(formTemplates.tenantId, tenantId)).orderBy(desc(formTemplates.createdAt));
    }
    return db.select().from(formTemplates).orderBy(desc(formTemplates.createdAt));
  }

  async getFormTemplate(id: string, tenantId?: string): Promise<FormTemplate | undefined> {
    const conditions = [eq(formTemplates.id, id)];
    if (tenantId) conditions.push(eq(formTemplates.tenantId, tenantId));
    const [t] = await db.select().from(formTemplates).where(and(...conditions));
    return t;
  }

  async createFormTemplate(data: InsertFormTemplate): Promise<FormTemplate> {
    const [t] = await db.insert(formTemplates).values(data).returning();
    return t;
  }

  async updateFormTemplate(id: string, data: Partial<InsertFormTemplate>, tenantId?: string): Promise<FormTemplate | undefined> {
    const conditions = [eq(formTemplates.id, id)];
    if (tenantId) conditions.push(eq(formTemplates.tenantId, tenantId));
    const [t] = await db.update(formTemplates).set(data).where(and(...conditions)).returning();
    return t;
  }

  async deleteFormTemplate(id: string, tenantId?: string): Promise<void> {
    const conditions = [eq(formTemplates.id, id)];
    if (tenantId) conditions.push(eq(formTemplates.tenantId, tenantId));
    await db.delete(formTemplates).where(and(...conditions));
  }

  async getFilledForms(tenantId?: string): Promise<FilledForm[]> {
    if (tenantId) {
      return db.select().from(filledForms).where(eq(filledForms.tenantId, tenantId)).orderBy(desc(filledForms.createdAt));
    }
    return db.select().from(filledForms).orderBy(desc(filledForms.createdAt));
  }

  async getFilledForm(id: string, tenantId?: string): Promise<FilledForm | undefined> {
    const conditions = [eq(filledForms.id, id)];
    if (tenantId) conditions.push(eq(filledForms.tenantId, tenantId));
    const [f] = await db.select().from(filledForms).where(and(...conditions));
    return f;
  }

  async getFilledFormsByClient(clientId: string, tenantId?: string): Promise<FilledForm[]> {
    const conditions = [eq(filledForms.clientId, clientId)];
    if (tenantId) conditions.push(eq(filledForms.tenantId, tenantId));
    return db.select().from(filledForms).where(and(...conditions)).orderBy(desc(filledForms.createdAt));
  }

  async createFilledForm(data: InsertFilledForm): Promise<FilledForm> {
    const [f] = await db.insert(filledForms).values(data).returning();
    return f;
  }

  async updateFilledForm(id: string, data: Partial<InsertFilledForm>, tenantId?: string): Promise<FilledForm | undefined> {
    const conditions = [eq(filledForms.id, id)];
    if (tenantId) conditions.push(eq(filledForms.tenantId, tenantId));
    const [f] = await db.update(filledForms).set({ ...data, updatedAt: new Date() }).where(and(...conditions)).returning();
    return f;
  }

  async getNotarizations(tenantId?: string): Promise<Notarization[]> {
    if (tenantId) {
      return db.select().from(notarizations).where(eq(notarizations.tenantId, tenantId)).orderBy(desc(notarizations.createdAt));
    }
    return db.select().from(notarizations).orderBy(desc(notarizations.createdAt));
  }

  async getNotarization(id: string, tenantId?: string): Promise<Notarization | undefined> {
    const conditions = [eq(notarizations.id, id)];
    if (tenantId) conditions.push(eq(notarizations.tenantId, tenantId));
    const [n] = await db.select().from(notarizations).where(and(...conditions));
    return n;
  }

  async getNotarizationsByClient(clientId: string, tenantId?: string): Promise<Notarization[]> {
    const conditions = [eq(notarizations.clientId, clientId)];
    if (tenantId) conditions.push(eq(notarizations.tenantId, tenantId));
    return db.select().from(notarizations).where(and(...conditions)).orderBy(desc(notarizations.createdAt));
  }

  async createNotarization(data: InsertNotarization): Promise<Notarization> {
    const [n] = await db.insert(notarizations).values(data).returning();
    return n;
  }

  async updateNotarization(id: string, data: Partial<InsertNotarization>, tenantId?: string): Promise<Notarization | undefined> {
    const conditions = [eq(notarizations.id, id)];
    if (tenantId) conditions.push(eq(notarizations.tenantId, tenantId));
    const [n] = await db.update(notarizations).set(data).where(and(...conditions)).returning();
    return n;
  }

  async getAuditLogs(limit = 100, offset = 0, tenantId?: string): Promise<AuditLog[]> {
    if (tenantId) {
      return db.select().from(auditLogs).where(eq(auditLogs.tenantId, tenantId)).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset);
    }
    return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset);
  }

  async getAuditLogsByEntity(entityType: string, entityId?: string, tenantId?: string): Promise<AuditLog[]> {
    const conditions: any[] = [eq(auditLogs.entityType, entityType)];
    if (entityId) conditions.push(eq(auditLogs.entityId, entityId));
    if (tenantId) conditions.push(eq(auditLogs.tenantId, tenantId));
    return db.select().from(auditLogs).where(and(...conditions)).orderBy(desc(auditLogs.createdAt));
  }

  async createAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(data).returning();
    return log;
  }

  async getServiceItems(tenantId?: string): Promise<ServiceItem[]> {
    if (tenantId) {
      return db.select().from(serviceItems).where(eq(serviceItems.tenantId, tenantId)).orderBy(serviceItems.name);
    }
    return db.select().from(serviceItems).orderBy(serviceItems.name);
  }

  async getServiceItem(id: string, tenantId?: string): Promise<ServiceItem | undefined> {
    const conditions = [eq(serviceItems.id, id)];
    if (tenantId) conditions.push(eq(serviceItems.tenantId, tenantId));
    const [item] = await db.select().from(serviceItems).where(and(...conditions));
    return item;
  }

  async createServiceItem(data: InsertServiceItem): Promise<ServiceItem> {
    const [item] = await db.insert(serviceItems).values(data).returning();
    return item;
  }

  async updateServiceItem(id: string, data: Partial<InsertServiceItem>, tenantId?: string): Promise<ServiceItem | undefined> {
    const conditions = [eq(serviceItems.id, id)];
    if (tenantId) conditions.push(eq(serviceItems.tenantId, tenantId));
    const [item] = await db.update(serviceItems).set(data).where(and(...conditions)).returning();
    return item;
  }

  async deleteServiceItem(id: string, tenantId?: string): Promise<void> {
    const conditions = [eq(serviceItems.id, id)];
    if (tenantId) conditions.push(eq(serviceItems.tenantId, tenantId));
    await db.delete(serviceItems).where(and(...conditions));
  }

  async getInvoiceLineItems(invoiceId: string, tenantId?: string): Promise<InvoiceLineItem[]> {
    const conditions = [eq(invoiceLineItems.invoiceId, invoiceId)];
    if (tenantId) conditions.push(eq(invoiceLineItems.tenantId, tenantId));
    return db.select().from(invoiceLineItems).where(and(...conditions)).orderBy(invoiceLineItems.createdAt);
  }

  async createInvoiceLineItem(data: InsertInvoiceLineItem): Promise<InvoiceLineItem> {
    const [item] = await db.insert(invoiceLineItems).values(data).returning();
    return item;
  }

  async updateInvoiceLineItem(id: string, data: Partial<InsertInvoiceLineItem>, tenantId?: string): Promise<InvoiceLineItem | undefined> {
    const conditions = [eq(invoiceLineItems.id, id)];
    if (tenantId) conditions.push(eq(invoiceLineItems.tenantId, tenantId));
    const [item] = await db.update(invoiceLineItems).set(data).where(and(...conditions)).returning();
    return item;
  }

  async deleteInvoiceLineItem(id: string, tenantId?: string): Promise<void> {
    const conditions = [eq(invoiceLineItems.id, id)];
    if (tenantId) conditions.push(eq(invoiceLineItems.tenantId, tenantId));
    await db.delete(invoiceLineItems).where(and(...conditions));
  }

  async getTaxDocuments(tenantId?: string): Promise<TaxDocument[]> {
    if (tenantId) {
      return db.select().from(taxDocuments).where(eq(taxDocuments.tenantId, tenantId)).orderBy(desc(taxDocuments.createdAt));
    }
    return db.select().from(taxDocuments).orderBy(desc(taxDocuments.createdAt));
  }

  async getTaxDocumentsByClient(clientId: string, tenantId?: string): Promise<TaxDocument[]> {
    const conditions = [eq(taxDocuments.clientId, clientId)];
    if (tenantId) conditions.push(eq(taxDocuments.tenantId, tenantId));
    return db.select().from(taxDocuments).where(and(...conditions)).orderBy(desc(taxDocuments.createdAt));
  }

  async getTaxDocumentsByYear(taxYear: number, tenantId?: string): Promise<TaxDocument[]> {
    const conditions: any[] = [eq(taxDocuments.taxYear, taxYear)];
    if (tenantId) conditions.push(eq(taxDocuments.tenantId, tenantId));
    return db.select().from(taxDocuments).where(and(...conditions)).orderBy(desc(taxDocuments.createdAt));
  }

  async getTaxDocument(id: string, tenantId?: string): Promise<TaxDocument | undefined> {
    const conditions = [eq(taxDocuments.id, id)];
    if (tenantId) conditions.push(eq(taxDocuments.tenantId, tenantId));
    const [doc] = await db.select().from(taxDocuments).where(and(...conditions));
    return doc;
  }

  async createTaxDocument(data: InsertTaxDocument): Promise<TaxDocument> {
    const [doc] = await db.insert(taxDocuments).values(data).returning();
    return doc;
  }

  async updateTaxDocument(id: string, data: Partial<InsertTaxDocument>, tenantId?: string): Promise<TaxDocument | undefined> {
    const conditions = [eq(taxDocuments.id, id)];
    if (tenantId) conditions.push(eq(taxDocuments.tenantId, tenantId));
    const [doc] = await db.update(taxDocuments).set({ ...data, updatedAt: new Date() }).where(and(...conditions)).returning();
    return doc;
  }

  async deleteTaxDocument(id: string, tenantId?: string): Promise<void> {
    const conditions = [eq(taxDocuments.id, id)];
    if (tenantId) conditions.push(eq(taxDocuments.tenantId, tenantId));
    await db.delete(taxDocuments).where(and(...conditions));
  }

  async getPushSubscriptionsByUser(userId: string): Promise<PushSubscription[]> {
    return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }

  async getAllPushSubscriptions(tenantId?: string): Promise<PushSubscription[]> {
    if (tenantId) {
      return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.tenantId, tenantId));
    }
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

  async getBookkeepingSubscriptions(tenantId?: string): Promise<BookkeepingSubscription[]> {
    if (tenantId) {
      return db.select().from(bookkeepingSubscriptions).where(eq(bookkeepingSubscriptions.tenantId, tenantId)).orderBy(desc(bookkeepingSubscriptions.createdAt));
    }
    return db.select().from(bookkeepingSubscriptions).orderBy(desc(bookkeepingSubscriptions.createdAt));
  }

  async getBookkeepingSubscription(id: string, tenantId?: string): Promise<BookkeepingSubscription | undefined> {
    const conditions = [eq(bookkeepingSubscriptions.id, id)];
    if (tenantId) conditions.push(eq(bookkeepingSubscriptions.tenantId, tenantId));
    const [sub] = await db.select().from(bookkeepingSubscriptions).where(and(...conditions));
    return sub;
  }

  async getBookkeepingSubscriptionByClient(clientId: string, tenantId?: string): Promise<BookkeepingSubscription | undefined> {
    const conditions = [eq(bookkeepingSubscriptions.clientId, clientId)];
    if (tenantId) conditions.push(eq(bookkeepingSubscriptions.tenantId, tenantId));
    const [sub] = await db.select().from(bookkeepingSubscriptions).where(and(...conditions));
    return sub;
  }

  async createBookkeepingSubscription(data: InsertBookkeepingSubscription): Promise<BookkeepingSubscription> {
    const [sub] = await db.insert(bookkeepingSubscriptions).values(data).returning();
    return sub;
  }

  async updateBookkeepingSubscription(id: string, data: Partial<InsertBookkeepingSubscription>, tenantId?: string): Promise<BookkeepingSubscription | undefined> {
    const conditions = [eq(bookkeepingSubscriptions.id, id)];
    if (tenantId) conditions.push(eq(bookkeepingSubscriptions.tenantId, tenantId));
    const [sub] = await db.update(bookkeepingSubscriptions).set(data).where(and(...conditions)).returning();
    return sub;
  }

  async getBankTransactions(clientId: string, month?: number, year?: number, tenantId?: string): Promise<BankTransaction[]> {
    const conditions = [eq(bankTransactions.clientId, clientId)];
    if (month !== undefined) conditions.push(eq(bankTransactions.statementMonth, month));
    if (year !== undefined) conditions.push(eq(bankTransactions.statementYear, year));
    if (tenantId) conditions.push(eq(bankTransactions.tenantId, tenantId));
    return db.select().from(bankTransactions).where(and(...conditions)).orderBy(desc(bankTransactions.transactionDate));
  }

  async getBankTransaction(id: string, tenantId?: string): Promise<BankTransaction | undefined> {
    const conditions = [eq(bankTransactions.id, id)];
    if (tenantId) conditions.push(eq(bankTransactions.tenantId, tenantId));
    const [txn] = await db.select().from(bankTransactions).where(and(...conditions));
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

  async updateBankTransaction(id: string, data: Partial<InsertBankTransaction>, tenantId?: string): Promise<BankTransaction | undefined> {
    const conditions = [eq(bankTransactions.id, id)];
    if (tenantId) conditions.push(eq(bankTransactions.tenantId, tenantId));
    const [txn] = await db.update(bankTransactions).set(data).where(and(...conditions)).returning();
    return txn;
  }

  async deleteBankTransaction(id: string, tenantId?: string): Promise<void> {
    const conditions = [eq(bankTransactions.id, id)];
    if (tenantId) conditions.push(eq(bankTransactions.tenantId, tenantId));
    await db.delete(bankTransactions).where(and(...conditions));
  }

  async getTransactionCategories(tenantId?: string): Promise<TransactionCategory[]> {
    if (tenantId) {
      return db.select().from(transactionCategories).where(eq(transactionCategories.tenantId, tenantId)).orderBy(transactionCategories.name);
    }
    return db.select().from(transactionCategories).orderBy(transactionCategories.name);
  }

  async createTransactionCategory(data: InsertTransactionCategory): Promise<TransactionCategory> {
    const [cat] = await db.insert(transactionCategories).values(data).returning();
    return cat;
  }

  async updateTransactionCategory(id: string, data: Partial<InsertTransactionCategory>, tenantId?: string): Promise<TransactionCategory | undefined> {
    const conditions = [eq(transactionCategories.id, id)];
    if (tenantId) conditions.push(eq(transactionCategories.tenantId, tenantId));
    const [cat] = await db.update(transactionCategories).set(data).where(and(...conditions)).returning();
    return cat;
  }

  async deleteTransactionCategory(id: string, tenantId?: string): Promise<void> {
    const conditions = [eq(transactionCategories.id, id)];
    if (tenantId) conditions.push(eq(transactionCategories.tenantId, tenantId));
    await db.delete(transactionCategories).where(and(...conditions));
  }

  async getMonthlySummaries(clientId: string, tenantId?: string): Promise<MonthlySummary[]> {
    const conditions = [eq(monthlySummaries.clientId, clientId)];
    if (tenantId) conditions.push(eq(monthlySummaries.tenantId, tenantId));
    return db.select().from(monthlySummaries).where(and(...conditions)).orderBy(desc(monthlySummaries.year), desc(monthlySummaries.month));
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

  async updateMonthlySummary(id: string, data: Partial<InsertMonthlySummary>, tenantId?: string): Promise<MonthlySummary | undefined> {
    const conditions = [eq(monthlySummaries.id, id)];
    if (tenantId) conditions.push(eq(monthlySummaries.tenantId, tenantId));
    const [summary] = await db.update(monthlySummaries).set(data).where(and(...conditions)).returning();
    return summary;
  }

  async getPreparerAssignments(preparerId: string, tenantId?: string): Promise<PreparerAssignment[]> {
    const conditions = [eq(preparerAssignments.preparerId, preparerId)];
    if (tenantId) conditions.push(eq(preparerAssignments.tenantId, tenantId));
    return db.select().from(preparerAssignments).where(and(...conditions)).orderBy(desc(preparerAssignments.createdAt));
  }

  async getPreparerAssignmentsByClient(clientId: string, tenantId?: string): Promise<PreparerAssignment[]> {
    const conditions = [eq(preparerAssignments.clientId, clientId)];
    if (tenantId) conditions.push(eq(preparerAssignments.tenantId, tenantId));
    return db.select().from(preparerAssignments).where(and(...conditions)).orderBy(desc(preparerAssignments.createdAt));
  }

  async createPreparerAssignment(data: InsertPreparerAssignment): Promise<PreparerAssignment> {
    const [assignment] = await db.insert(preparerAssignments).values(data).returning();
    return assignment;
  }

  async deletePreparerAssignment(id: string, tenantId?: string): Promise<void> {
    const conditions = [eq(preparerAssignments.id, id)];
    if (tenantId) conditions.push(eq(preparerAssignments.tenantId, tenantId));
    await db.delete(preparerAssignments).where(and(...conditions));
  }

  async getTicketRequiredDocs(ticketId: string, tenantId?: string): Promise<TicketRequiredDocument[]> {
    const conditions = [eq(ticketRequiredDocuments.ticketId, ticketId)];
    if (tenantId) conditions.push(eq(ticketRequiredDocuments.tenantId, tenantId));
    return db.select().from(ticketRequiredDocuments).where(and(...conditions)).orderBy(desc(ticketRequiredDocuments.createdAt));
  }

  async createTicketRequiredDoc(data: InsertTicketRequiredDocument): Promise<TicketRequiredDocument> {
    const [doc] = await db.insert(ticketRequiredDocuments).values(data).returning();
    return doc;
  }

  async updateTicketRequiredDoc(id: string, data: Partial<InsertTicketRequiredDocument>, tenantId?: string): Promise<TicketRequiredDocument | undefined> {
    const conditions = [eq(ticketRequiredDocuments.id, id)];
    if (tenantId) conditions.push(eq(ticketRequiredDocuments.tenantId, tenantId));
    const [doc] = await db.update(ticketRequiredDocuments).set(data).where(and(...conditions)).returning();
    return doc;
  }

  async deleteTicketRequiredDoc(id: string, tenantId?: string): Promise<void> {
    const conditions = [eq(ticketRequiredDocuments.id, id)];
    if (tenantId) conditions.push(eq(ticketRequiredDocuments.tenantId, tenantId));
    await db.delete(ticketRequiredDocuments).where(and(...conditions));
  }

  async getRecurringTemplates(tenantId?: string): Promise<RecurringTemplate[]> {
    if (tenantId) {
      return db.select().from(recurringTemplates).where(eq(recurringTemplates.tenantId, tenantId)).orderBy(desc(recurringTemplates.createdAt));
    }
    return db.select().from(recurringTemplates).orderBy(desc(recurringTemplates.createdAt));
  }

  async getRecurringTemplate(id: string, tenantId?: string): Promise<RecurringTemplate | undefined> {
    const conditions = [eq(recurringTemplates.id, id)];
    if (tenantId) conditions.push(eq(recurringTemplates.tenantId, tenantId));
    const [template] = await db.select().from(recurringTemplates).where(and(...conditions));
    return template;
  }

  async createRecurringTemplate(data: InsertRecurringTemplate): Promise<RecurringTemplate> {
    const [template] = await db.insert(recurringTemplates).values(data).returning();
    return template;
  }

  async updateRecurringTemplate(id: string, data: Partial<InsertRecurringTemplate>, tenantId?: string): Promise<RecurringTemplate | undefined> {
    const conditions = [eq(recurringTemplates.id, id)];
    if (tenantId) conditions.push(eq(recurringTemplates.tenantId, tenantId));
    const [template] = await db.update(recurringTemplates).set(data).where(and(...conditions)).returning();
    return template;
  }

  async deleteRecurringTemplate(id: string, tenantId?: string): Promise<void> {
    const conditions = [eq(recurringTemplates.id, id)];
    if (tenantId) conditions.push(eq(recurringTemplates.tenantId, tenantId));
    await db.delete(recurringTemplates).where(and(...conditions));
  }

  async getClientRecurringSchedules(clientId?: string, tenantId?: string): Promise<ClientRecurringSchedule[]> {
    const conditions: any[] = [];
    if (clientId) conditions.push(eq(clientRecurringSchedules.clientId, clientId));
    if (tenantId) conditions.push(eq(clientRecurringSchedules.tenantId, tenantId));
    if (conditions.length > 0) {
      return db.select().from(clientRecurringSchedules).where(and(...conditions)).orderBy(desc(clientRecurringSchedules.createdAt));
    }
    return db.select().from(clientRecurringSchedules).orderBy(desc(clientRecurringSchedules.createdAt));
  }

  async getActiveSchedules(tenantId?: string): Promise<ClientRecurringSchedule[]> {
    if (tenantId) {
      return db.select().from(clientRecurringSchedules).where(and(eq(clientRecurringSchedules.isActive, true), eq(clientRecurringSchedules.tenantId, tenantId)));
    }
    return db.select().from(clientRecurringSchedules).where(eq(clientRecurringSchedules.isActive, true));
  }

  async createClientRecurringSchedule(data: InsertClientRecurringSchedule): Promise<ClientRecurringSchedule> {
    const [schedule] = await db.insert(clientRecurringSchedules).values(data).returning();
    return schedule;
  }

  async updateClientRecurringSchedule(id: string, data: Partial<InsertClientRecurringSchedule>, tenantId?: string): Promise<ClientRecurringSchedule | undefined> {
    const conditions = [eq(clientRecurringSchedules.id, id)];
    if (tenantId) conditions.push(eq(clientRecurringSchedules.tenantId, tenantId));
    const [schedule] = await db.update(clientRecurringSchedules).set(data).where(and(...conditions)).returning();
    return schedule;
  }

  async deleteClientRecurringSchedule(id: string, tenantId?: string): Promise<void> {
    const conditions = [eq(clientRecurringSchedules.id, id)];
    if (tenantId) conditions.push(eq(clientRecurringSchedules.tenantId, tenantId));
    await db.delete(clientRecurringSchedules).where(and(...conditions));
  }

  async claimTicket(ticketId: string, userId: string, userName: string, tenantId?: string): Promise<ServiceTicket | undefined> {
    const conditions = [eq(serviceTickets.id, ticketId)];
    if (tenantId) conditions.push(eq(serviceTickets.tenantId, tenantId));
    const [ticket] = await db.update(serviceTickets)
      .set({ lockedBy: userId, lockedAt: new Date(), lockedByName: userName })
      .where(and(...conditions))
      .returning();
    return ticket;
  }

  async releaseTicket(ticketId: string, tenantId?: string): Promise<ServiceTicket | undefined> {
    const conditions = [eq(serviceTickets.id, ticketId)];
    if (tenantId) conditions.push(eq(serviceTickets.tenantId, tenantId));
    const [ticket] = await db.update(serviceTickets)
      .set({ lockedBy: null, lockedAt: null, lockedByName: null })
      .where(and(...conditions))
      .returning();
    return ticket;
  }

  async getClientNotes(clientId: string, tenantId?: string): Promise<ClientNote[]> {
    const conditions = [eq(clientNotes.clientId, clientId)];
    if (tenantId) conditions.push(eq(clientNotes.tenantId, tenantId));
    return db.select().from(clientNotes).where(and(...conditions)).orderBy(desc(clientNotes.createdAt));
  }

  async getClientNote(id: string, tenantId?: string): Promise<ClientNote | undefined> {
    const conditions = [eq(clientNotes.id, id)];
    if (tenantId) conditions.push(eq(clientNotes.tenantId, tenantId));
    const [note] = await db.select().from(clientNotes).where(and(...conditions));
    return note;
  }

  async createClientNote(data: InsertClientNote): Promise<ClientNote> {
    const [note] = await db.insert(clientNotes).values(data).returning();
    return note;
  }

  async updateClientNote(id: string, content: string, tenantId?: string): Promise<ClientNote | undefined> {
    const conditions = [eq(clientNotes.id, id)];
    if (tenantId) conditions.push(eq(clientNotes.tenantId, tenantId));
    const [note] = await db.update(clientNotes).set({ content, updatedAt: new Date() }).where(and(...conditions)).returning();
    return note;
  }

  async deleteClientNote(id: string, tenantId?: string): Promise<void> {
    const conditions = [eq(clientNotes.id, id)];
    if (tenantId) conditions.push(eq(clientNotes.tenantId, tenantId));
    await db.delete(clientNotes).where(and(...conditions));
  }

  async getKnowledgeArticles(tenantId?: string): Promise<KnowledgeArticle[]> {
    if (tenantId) {
      return db.select().from(knowledgeArticles).where(eq(knowledgeArticles.tenantId, tenantId)).orderBy(desc(knowledgeArticles.pinned), desc(knowledgeArticles.updatedAt));
    }
    return db.select().from(knowledgeArticles).orderBy(desc(knowledgeArticles.pinned), desc(knowledgeArticles.updatedAt));
  }

  async getKnowledgeArticle(id: string, tenantId?: string): Promise<KnowledgeArticle | undefined> {
    const conditions = [eq(knowledgeArticles.id, id)];
    if (tenantId) conditions.push(eq(knowledgeArticles.tenantId, tenantId));
    const [article] = await db.select().from(knowledgeArticles).where(and(...conditions));
    return article;
  }

  async createKnowledgeArticle(data: InsertKnowledgeArticle): Promise<KnowledgeArticle> {
    const [article] = await db.insert(knowledgeArticles).values(data).returning();
    return article;
  }

  async updateKnowledgeArticle(id: string, data: Partial<InsertKnowledgeArticle>, tenantId?: string): Promise<KnowledgeArticle | undefined> {
    const conditions = [eq(knowledgeArticles.id, id)];
    if (tenantId) conditions.push(eq(knowledgeArticles.tenantId, tenantId));
    const [article] = await db.update(knowledgeArticles).set({ ...data, updatedAt: new Date() }).where(and(...conditions)).returning();
    return article;
  }

  async deleteKnowledgeArticle(id: string, tenantId?: string): Promise<void> {
    const conditions = [eq(knowledgeArticles.id, id)];
    if (tenantId) conditions.push(eq(knowledgeArticles.tenantId, tenantId));
    await db.delete(knowledgeArticles).where(and(...conditions));
  }

  async searchKnowledgeArticles(query: string, tenantId?: string): Promise<KnowledgeArticle[]> {
    const lowerQuery = `%${query.toLowerCase()}%`;
    if (tenantId) {
      return db.select().from(knowledgeArticles).where(
        and(
          sql`LOWER(${knowledgeArticles.title}) LIKE ${lowerQuery} OR LOWER(${knowledgeArticles.content}) LIKE ${lowerQuery} OR LOWER(${knowledgeArticles.category}) LIKE ${lowerQuery}`,
          eq(knowledgeArticles.tenantId, tenantId)
        )
      ).orderBy(desc(knowledgeArticles.pinned), desc(knowledgeArticles.updatedAt));
    }
    return db.select().from(knowledgeArticles).where(
      sql`LOWER(${knowledgeArticles.title}) LIKE ${lowerQuery} OR LOWER(${knowledgeArticles.content}) LIKE ${lowerQuery} OR LOWER(${knowledgeArticles.category}) LIKE ${lowerQuery}`
    ).orderBy(desc(knowledgeArticles.pinned), desc(knowledgeArticles.updatedAt));
  }

  async getCustomFieldDefinitions(entityType?: string, tenantId?: string): Promise<CustomFieldDefinition[]> {
    const conditions: any[] = [];
    if (entityType) conditions.push(eq(customFieldDefinitions.entityType, entityType));
    if (tenantId) conditions.push(eq(customFieldDefinitions.tenantId, tenantId));
    if (conditions.length > 0) {
      return db.select().from(customFieldDefinitions).where(and(...conditions)).orderBy(customFieldDefinitions.sortOrder);
    }
    return db.select().from(customFieldDefinitions).orderBy(customFieldDefinitions.sortOrder);
  }

  async getCustomFieldDefinition(id: string, tenantId?: string): Promise<CustomFieldDefinition | undefined> {
    const conditions = [eq(customFieldDefinitions.id, id)];
    if (tenantId) conditions.push(eq(customFieldDefinitions.tenantId, tenantId));
    const [def] = await db.select().from(customFieldDefinitions).where(and(...conditions));
    return def;
  }

  async createCustomFieldDefinition(data: InsertCustomFieldDefinition): Promise<CustomFieldDefinition> {
    const [def] = await db.insert(customFieldDefinitions).values(data).returning();
    return def;
  }

  async updateCustomFieldDefinition(id: string, data: Partial<InsertCustomFieldDefinition>, tenantId?: string): Promise<CustomFieldDefinition | undefined> {
    const conditions = [eq(customFieldDefinitions.id, id)];
    if (tenantId) conditions.push(eq(customFieldDefinitions.tenantId, tenantId));
    const [def] = await db.update(customFieldDefinitions).set(data).where(and(...conditions)).returning();
    return def;
  }

  async deleteCustomFieldDefinition(id: string, tenantId?: string): Promise<void> {
    const valConditions: any[] = [eq(customFieldValues.fieldDefinitionId, id)];
    if (tenantId) valConditions.push(eq(customFieldValues.tenantId, tenantId));
    await db.delete(customFieldValues).where(and(...valConditions));
    const conditions = [eq(customFieldDefinitions.id, id)];
    if (tenantId) conditions.push(eq(customFieldDefinitions.tenantId, tenantId));
    await db.delete(customFieldDefinitions).where(and(...conditions));
  }

  async getCustomFieldValues(entityType: string, entityId: string, tenantId?: string): Promise<CustomFieldValue[]> {
    const conditions = [eq(customFieldValues.entityType, entityType), eq(customFieldValues.entityId, entityId)];
    if (tenantId) conditions.push(eq(customFieldValues.tenantId, tenantId));
    return db.select().from(customFieldValues).where(and(...conditions));
  }

  async setCustomFieldValue(data: InsertCustomFieldValue): Promise<CustomFieldValue> {
    const entityType = data.entityType ?? "client";
    const existing = await db.select().from(customFieldValues).where(
      and(
        eq(customFieldValues.fieldDefinitionId, data.fieldDefinitionId),
        eq(customFieldValues.entityType, entityType),
        eq(customFieldValues.entityId, data.entityId)
      )
    );
    if (existing.length > 0) {
      const [updated] = await db.update(customFieldValues)
        .set({ value: data.value, updatedAt: new Date() })
        .where(eq(customFieldValues.id, existing[0].id))
        .returning();
      return updated;
    }
    const [val] = await db.insert(customFieldValues).values(data).returning();
    return val;
  }

  async deleteCustomFieldValues(entityType: string, entityId: string, tenantId?: string): Promise<void> {
    const conditions = [eq(customFieldValues.entityType, entityType), eq(customFieldValues.entityId, entityId)];
    if (tenantId) conditions.push(eq(customFieldValues.tenantId, tenantId));
    await db.delete(customFieldValues).where(and(...conditions));
  }

  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async getTenantBrandingByTenantId(tenantId: string): Promise<TenantBranding | undefined> {
    const [branding] = await db.select().from(tenantBranding).where(eq(tenantBranding.tenantId, tenantId));
    return branding;
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug));
    return tenant;
  }

  async updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const [updated] = await db.update(tenants).set({ ...data, updatedAt: new Date() }).where(eq(tenants.id, id)).returning();
    return updated;
  }

  async updateTenantBranding(tenantId: string, data: Partial<InsertTenantBranding>): Promise<TenantBranding | undefined> {
    const [updated] = await db.update(tenantBranding).set(data).where(eq(tenantBranding.tenantId, tenantId)).returning();
    return updated;
  }

  async getTenantSettings(tenantId: string): Promise<TenantSettings[]> {
    return db.select().from(tenantSettings).where(eq(tenantSettings.tenantId, tenantId));
  }

  async getTenantSetting(tenantId: string, key: string): Promise<TenantSettings | undefined> {
    const [setting] = await db.select().from(tenantSettings).where(
      and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, key))
    );
    return setting;
  }

  async upsertTenantSetting(tenantId: string, key: string, value: string, type?: string, updatedBy?: string): Promise<TenantSettings> {
    const existing = await this.getTenantSetting(tenantId, key);
    if (existing) {
      const [updated] = await db.update(tenantSettings)
        .set({ value, type: type || existing.type, updatedAt: new Date(), updatedBy: updatedBy || null })
        .where(eq(tenantSettings.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(tenantSettings).values({
      tenantId, key, value, type: type || "string", updatedBy: updatedBy || null,
    }).returning();
    return created;
  }

  async deleteTenantSetting(tenantId: string, key: string): Promise<void> {
    await db.delete(tenantSettings).where(
      and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, key))
    );
  }
}

export const storage = new DatabaseStorage();
