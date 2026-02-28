import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";
export * from "./models/chat";

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  dotNumber: text("dot_number"),
  mcNumber: text("mc_number"),
  einNumber: text("ein_number"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
});

export const serviceTickets = pgTable("service_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  title: text("title").notNull(),
  serviceType: text("service_type").notNull(),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("medium"),
  description: text("description"),
  dueDate: timestamp("due_date"),
  assignedTo: text("assigned_to"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  ticketId: varchar("ticket_id").references(() => serviceTickets.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  ticketId: varchar("ticket_id").references(() => serviceTickets.id),
  invoiceNumber: text("invoice_number").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("draft"),
  dueDate: timestamp("due_date"),
  paidDate: timestamp("paid_date"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  senderId: varchar("sender_id").notNull(),
  senderName: text("sender_name").notNull(),
  senderRole: text("sender_role").notNull().default("client"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const signatureRequests = pgTable("signature_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  documentName: text("document_name").notNull(),
  documentDescription: text("document_description"),
  documentContent: text("document_content").notNull(),
  status: text("status").notNull().default("pending"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  signedAt: timestamp("signed_at"),
  signerName: text("signer_name"),
  signatureData: text("signature_data"),
  reminderSentAt: timestamp("reminder_sent_at"),
  reminderMethod: text("reminder_method"),
  createdBy: varchar("created_by"),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"),
  link: text("link"),
  read: text("read").notNull().default("false"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const formTemplates = pgTable("form_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  content: text("content").notNull(),
  category: text("category").notNull().default("General"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const filledForms = pgTable("filled_forms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").references(() => formTemplates.id),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  name: text("name").notNull(),
  filledContent: text("filled_content").notNull(),
  status: text("status").notNull().default("draft"),
  filledBy: varchar("filled_by"),
  signatureRequestId: varchar("signature_request_id").references(() => signatureRequests.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const notarizations = pgTable("notarizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  documentName: text("document_name").notNull(),
  documentDescription: text("document_description"),
  notaryName: text("notary_name").notNull(),
  notaryCommission: text("notary_commission"),
  notarizationDate: timestamp("notarization_date"),
  expirationDate: timestamp("expiration_date"),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  performedBy: varchar("performed_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  userName: text("user_name"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id"),
  details: text("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const serviceItems = pgTable("service_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("General"),
  defaultPrice: decimal("default_price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const invoiceLineItems = pgTable("invoice_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull().references(() => invoices.id),
  serviceItemId: varchar("service_item_id").references(() => serviceItems.id),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertClientSchema = createInsertSchema(clients).omit({ id: true });
export const insertServiceTicketSchema = createInsertSchema(serviceTickets).omit({ id: true, createdAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, uploadedAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });
export const insertSignatureRequestSchema = createInsertSchema(signatureRequests).omit({ id: true, sentAt: true, signedAt: true, reminderSentAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertFormTemplateSchema = createInsertSchema(formTemplates).omit({ id: true, createdAt: true });
export const insertFilledFormSchema = createInsertSchema(filledForms).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNotarizationSchema = createInsertSchema(notarizations).omit({ id: true, createdAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const taxDocuments = pgTable("tax_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  taxYear: integer("tax_year").notNull(),
  documentType: text("document_type").notNull(),
  payerName: text("payer_name"),
  documentContent: text("document_content"),
  fileName: text("file_name"),
  fileType: text("file_type"),
  filePath: text("file_path"),
  fileSize: integer("file_size"),
  extractedData: text("extracted_data"),
  totalIncome: decimal("total_income", { precision: 12, scale: 2 }),
  federalWithholding: decimal("federal_withholding", { precision: 12, scale: 2 }),
  stateWithholding: decimal("state_withholding", { precision: 12, scale: 2 }),
  ssnLastFour: text("ssn_last_four"),
  einNumber: text("ein_number"),
  riskFlags: text("risk_flags"),
  confidenceLevel: text("confidence_level"),
  notes: text("notes"),
  status: text("status").notNull().default("pending"),
  analyzedAt: timestamp("analyzed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertServiceItemSchema = createInsertSchema(serviceItems).omit({ id: true, createdAt: true });
export const insertInvoiceLineItemSchema = createInsertSchema(invoiceLineItems).omit({ id: true, createdAt: true });
export const insertTaxDocumentSchema = createInsertSchema(taxDocuments).omit({ id: true, createdAt: true, updatedAt: true, analyzedAt: true });

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type ServiceTicket = typeof serviceTickets.$inferSelect;
export type InsertServiceTicket = z.infer<typeof insertServiceTicketSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type SignatureRequest = typeof signatureRequests.$inferSelect;
export type InsertSignatureRequest = z.infer<typeof insertSignatureRequestSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type FormTemplate = typeof formTemplates.$inferSelect;
export type InsertFormTemplate = z.infer<typeof insertFormTemplateSchema>;
export type FilledForm = typeof filledForms.$inferSelect;
export type InsertFilledForm = z.infer<typeof insertFilledFormSchema>;
export type Notarization = typeof notarizations.$inferSelect;
export type InsertNotarization = z.infer<typeof insertNotarizationSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type ServiceItem = typeof serviceItems.$inferSelect;
export type InsertServiceItem = z.infer<typeof insertServiceItemSchema>;
export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;
export type InsertInvoiceLineItem = z.infer<typeof insertInvoiceLineItemSchema>;
export type TaxDocument = typeof taxDocuments.$inferSelect;
export type InsertTaxDocument = z.infer<typeof insertTaxDocumentSchema>;
