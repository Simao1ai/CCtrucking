import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertServiceTicketSchema, insertDocumentSchema, insertInvoiceSchema, insertChatMessageSchema } from "@shared/schema";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { users } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

function param(req: Request, name: string): string {
  return req.params[name] as string;
}

function isAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  if (!user?.claims?.sub) return res.status(401).json({ message: "Unauthorized" });

  db.select().from(users).where(eq(users.id, user.claims.sub)).then(([dbUser]) => {
    if (!dbUser || dbUser.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  }).catch(() => res.status(500).json({ message: "Server error" }));
}

function isClient(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  if (!user?.claims?.sub) return res.status(401).json({ message: "Unauthorized" });

  db.select().from(users).where(eq(users.id, user.claims.sub)).then(([dbUser]) => {
    if (!dbUser || !dbUser.clientId) {
      return res.status(403).json({ message: "Client access required" });
    }
    (req as any).clientId = dbUser.clientId;
    (req as any).dbUser = dbUser;
    next();
  }).catch(() => res.status(500).json({ message: "Server error" }));
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  await setupAuth(app);
  registerAuthRoutes(app);

  app.get("/api/auth/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
      res.json(dbUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch("/api/auth/assign-client", isAuthenticated, isAdmin, async (req, res) => {
    const { userId, clientId } = req.body;
    if (!userId || !clientId) return res.status(400).json({ message: "userId and clientId required" });
    const [updated] = await db.update(users).set({ clientId, role: "client" }).where(eq(users.id, userId)).returning();
    if (!updated) return res.status(404).json({ message: "User not found" });
    res.json(updated);
  });

  app.patch("/api/auth/set-admin", isAuthenticated, isAdmin, async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId required" });
    const [updated] = await db.update(users).set({ role: "admin" }).where(eq(users.id, userId)).returning();
    if (!updated) return res.status(404).json({ message: "User not found" });
    res.json(updated);
  });

  app.get("/api/admin/users", isAuthenticated, isAdmin, async (_req, res) => {
    const allUsers = await db.select().from(users);
    res.json(allUsers);
  });

  // ===== ADMIN ROUTES (existing CRUD - now protected) =====
  app.get("/api/clients", isAuthenticated, isAdmin, async (_req, res) => {
    const clientList = await storage.getClients();
    res.json(clientList);
  });

  app.get("/api/clients/:id", isAuthenticated, isAdmin, async (req, res) => {
    const client = await storage.getClient(param(req, "id"));
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json(client);
  });

  app.post("/api/clients", isAuthenticated, isAdmin, async (req, res) => {
    const parsed = insertClientSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const client = await storage.createClient(parsed.data);
    res.status(201).json(client);
  });

  app.patch("/api/clients/:id", isAuthenticated, isAdmin, async (req, res) => {
    const client = await storage.updateClient(param(req, "id"), req.body);
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json(client);
  });

  app.delete("/api/clients/:id", isAuthenticated, isAdmin, async (req, res) => {
    await storage.deleteClient(param(req, "id"));
    res.status(204).send();
  });

  app.get("/api/tickets", isAuthenticated, isAdmin, async (_req, res) => {
    const tickets = await storage.getTickets();
    res.json(tickets);
  });

  app.get("/api/tickets/:id", isAuthenticated, isAdmin, async (req, res) => {
    const ticket = await storage.getTicket(param(req, "id"));
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    res.json(ticket);
  });

  app.post("/api/tickets", isAuthenticated, isAdmin, async (req, res) => {
    const parsed = insertServiceTicketSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const ticket = await storage.createTicket(parsed.data);
    res.status(201).json(ticket);
  });

  app.patch("/api/tickets/:id", isAuthenticated, isAdmin, async (req, res) => {
    const ticket = await storage.updateTicket(param(req, "id"), req.body);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    res.json(ticket);
  });

  app.get("/api/documents", isAuthenticated, isAdmin, async (_req, res) => {
    const docs = await storage.getDocuments();
    res.json(docs);
  });

  app.get("/api/documents/:id", isAuthenticated, isAdmin, async (req, res) => {
    const doc = await storage.getDocument(param(req, "id"));
    if (!doc) return res.status(404).json({ message: "Document not found" });
    res.json(doc);
  });

  app.post("/api/documents", isAuthenticated, isAdmin, async (req, res) => {
    const parsed = insertDocumentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const doc = await storage.createDocument(parsed.data);
    res.status(201).json(doc);
  });

  app.patch("/api/documents/:id", isAuthenticated, isAdmin, async (req, res) => {
    const doc = await storage.updateDocument(param(req, "id"), req.body);
    if (!doc) return res.status(404).json({ message: "Document not found" });
    res.json(doc);
  });

  app.get("/api/invoices", isAuthenticated, isAdmin, async (_req, res) => {
    const invoiceList = await storage.getInvoices();
    res.json(invoiceList);
  });

  app.get("/api/invoices/:id", isAuthenticated, isAdmin, async (req, res) => {
    const invoice = await storage.getInvoice(param(req, "id"));
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json(invoice);
  });

  app.post("/api/invoices", isAuthenticated, isAdmin, async (req, res) => {
    const parsed = insertInvoiceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const invoice = await storage.createInvoice(parsed.data);
    res.status(201).json(invoice);
  });

  app.patch("/api/invoices/:id", isAuthenticated, isAdmin, async (req, res) => {
    const invoice = await storage.updateInvoice(param(req, "id"), req.body);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json(invoice);
  });

  // ===== ADMIN CHAT (view all client chats) =====
  app.get("/api/admin/chats", isAuthenticated, isAdmin, async (_req, res) => {
    const clientList = await storage.getClients();
    res.json(clientList);
  });

  app.get("/api/admin/chats/:clientId", isAuthenticated, isAdmin, async (req, res) => {
    const messages = await storage.getChatMessages(param(req, "clientId"));
    res.json(messages);
  });

  app.post("/api/admin/chats/:clientId", isAuthenticated, isAdmin, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
    const parsed = insertChatMessageSchema.safeParse({
      clientId: param(req, "clientId"),
      senderId: userId,
      senderName: dbUser ? `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim() || 'Admin' : 'Admin',
      senderRole: "admin",
      message: req.body.message,
    });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const msg = await storage.createChatMessage(parsed.data);
    res.status(201).json(msg);
  });

  // ===== CLIENT PORTAL ROUTES =====
  app.get("/api/portal/account", isAuthenticated, isClient, async (req: any, res) => {
    const client = await storage.getClient(req.clientId);
    if (!client) return res.status(404).json({ message: "Client account not found" });
    res.json(client);
  });

  app.get("/api/portal/tickets", isAuthenticated, isClient, async (req: any, res) => {
    const tickets = await storage.getTicketsByClient(req.clientId);
    res.json(tickets);
  });

  app.post("/api/portal/tickets", isAuthenticated, isClient, async (req: any, res) => {
    const parsed = insertServiceTicketSchema.safeParse({
      ...req.body,
      clientId: req.clientId,
      status: "open",
      priority: "medium",
    });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const ticket = await storage.createTicket(parsed.data);
    res.status(201).json(ticket);
  });

  app.get("/api/portal/documents", isAuthenticated, isClient, async (req: any, res) => {
    const docs = await storage.getDocumentsByClient(req.clientId);
    res.json(docs);
  });

  app.get("/api/portal/invoices", isAuthenticated, isClient, async (req: any, res) => {
    const invoiceList = await storage.getInvoicesByClient(req.clientId);
    res.json(invoiceList);
  });

  app.patch("/api/portal/invoices/:id/approve", isAuthenticated, isClient, async (req: any, res) => {
    const invoiceId = param(req, "id");
    const invoice = await storage.getInvoice(invoiceId);
    if (!invoice || invoice.clientId !== req.clientId) return res.status(404).json({ message: "Invoice not found" });
    const updated = await storage.updateInvoice(invoiceId, { status: "approved" });
    res.json(updated);
  });

  app.get("/api/portal/chat", isAuthenticated, isClient, async (req: any, res) => {
    const messages = await storage.getChatMessages(req.clientId);
    res.json(messages);
  });

  app.post("/api/portal/chat", isAuthenticated, isClient, async (req: any, res) => {
    const parsed = insertChatMessageSchema.safeParse({
      clientId: req.clientId,
      senderId: req.dbUser.id,
      senderName: `${req.dbUser.firstName || ''} ${req.dbUser.lastName || ''}`.trim() || 'Client',
      senderRole: "client",
      message: req.body.message,
    });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const msg = await storage.createChatMessage(parsed.data);
    res.status(201).json(msg);
  });

  return httpServer;
}
