import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

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

export const insertClientSchema = createInsertSchema(clients).omit({ id: true });
export const insertServiceTicketSchema = createInsertSchema(serviceTickets).omit({ id: true, createdAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, uploadedAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });
export const insertSignatureRequestSchema = createInsertSchema(signatureRequests).omit({ id: true, sentAt: true, signedAt: true, reminderSentAt: true });

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
