import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import {
  clients, serviceTickets, documents, invoices, chatMessages, signatureRequests,
  type Client, type InsertClient,
  type ServiceTicket, type InsertServiceTicket,
  type Document, type InsertDocument,
  type Invoice, type InsertInvoice,
  type ChatMessage, type InsertChatMessage,
  type SignatureRequest, type InsertSignatureRequest,
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
}

export const storage = new DatabaseStorage();
