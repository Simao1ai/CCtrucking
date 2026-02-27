import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertServiceTicketSchema, insertDocumentSchema, insertInvoiceSchema, insertChatMessageSchema, insertSignatureRequestSchema, clients, notifications } from "@shared/schema";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { authStorage } from "./replit_integrations/auth/storage";
import { users } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

function param(req: Request, name: string): string {
  return req.params[name] as string;
}

function isAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  db.select().from(users).where(eq(users.id, userId)).then(([dbUser]) => {
    if (!dbUser || dbUser.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    (req as any).dbUser = dbUser;
    next();
  }).catch(() => res.status(500).json({ message: "Server error" }));
}

function isClient(req: Request, res: Response, next: NextFunction) {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  db.select().from(users).where(eq(users.id, userId)).then(([dbUser]) => {
    if (!dbUser || !dbUser.clientId) {
      return res.status(403).json({ message: "Client access required" });
    }
    (req as any).clientId = dbUser.clientId;
    (req as any).dbUser = dbUser;
    next();
  }).catch(() => res.status(500).json({ message: "Server error" }));
}

async function notifyUser(userId: string, title: string, message: string, type: string, link?: string) {
  try {
    await storage.createNotification({ userId, title, message, type, link: link || null, read: "false" });
  } catch (e) {
    console.error("Failed to create notification:", e);
  }
}

async function notifyAllAdmins(title: string, message: string, type: string, link?: string) {
  try {
    const allUsers = await db.select().from(users);
    const admins = allUsers.filter(u => u.role === "admin");
    for (const admin of admins) {
      await notifyUser(admin.id, title, message, type, link);
    }
  } catch (e) {
    console.error("Failed to notify admins:", e);
  }
}

async function notifyClientUsers(clientId: string, title: string, message: string, type: string, link?: string) {
  try {
    const allUsers = await db.select().from(users);
    const clientUsers = allUsers.filter(u => u.clientId === clientId);
    for (const user of clientUsers) {
      await notifyUser(user.id, title, message, type, link);
    }
  } catch (e) {
    console.error("Failed to notify client users:", e);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  await setupAuth(app);
  registerAuthRoutes(app);

  app.get("/api/auth/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).userId;
      const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!dbUser) return res.status(404).json({ message: "User not found" });
      const { password: _, ...safeUser } = dbUser;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/admin/create-user", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { username, password, firstName, lastName, email, role, clientId } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      if (!["admin", "client"].includes(role)) {
        return res.status(400).json({ message: "Role must be admin or client" });
      }

      const existing = await authStorage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await authStorage.createUser({
        username,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        email: email || null,
        role,
        clientId: clientId || null,
      });

      const { password: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/auth/assign-client", isAuthenticated, isAdmin, async (req, res) => {
    const { userId, clientId } = req.body;
    if (!userId || !clientId) return res.status(400).json({ message: "userId and clientId required" });
    const [updated] = await db.update(users).set({ clientId, role: "client" }).where(eq(users.id, userId)).returning();
    if (!updated) return res.status(404).json({ message: "User not found" });
    const { password: _, ...safeUser } = updated;
    res.json(safeUser);
  });

  app.patch("/api/auth/set-admin", isAuthenticated, isAdmin, async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId required" });
    const [updated] = await db.update(users).set({ role: "admin" }).where(eq(users.id, userId)).returning();
    if (!updated) return res.status(404).json({ message: "User not found" });
    const { password: _, ...safeUser } = updated;
    res.json(safeUser);
  });

  app.delete("/api/admin/users/:id", isAuthenticated, isAdmin, async (req, res) => {
    const targetId = param(req, "id");
    const currentUserId = (req.session as any).userId;
    if (targetId === currentUserId) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }
    await db.delete(users).where(eq(users.id, targetId));
    res.status(204).send();
  });

  app.get("/api/admin/users", isAuthenticated, isAdmin, async (_req, res) => {
    const allUsers = await db.select().from(users);
    const safeUsers = allUsers.map(({ password: _, ...u }) => u);
    res.json(safeUsers);
  });

  app.get("/api/clients", isAuthenticated, isAdmin, async (_req, res) => {
    const clientList = await storage.getClients();
    res.json(clientList);
  });

  app.get("/api/clients/:id", isAuthenticated, isAdmin, async (req, res) => {
    const client = await storage.getClient(param(req, "id"));
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json(client);
  });

  app.get("/api/clients/:id/summary", isAuthenticated, isAdmin, async (req, res) => {
    const clientId = param(req, "id");
    const client = await storage.getClient(clientId);
    if (!client) return res.status(404).json({ message: "Client not found" });
    const [tickets, documents, invoices, messages, signatures] = await Promise.all([
      storage.getTicketsByClient(clientId),
      storage.getDocumentsByClient(clientId),
      storage.getInvoicesByClient(clientId),
      storage.getChatMessages(clientId),
      storage.getSignatureRequestsByClient(clientId),
    ]);
    res.json({ client, tickets, documents, invoices, messages, signatures });
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
    notifyClientUsers(invoice.clientId, "New Invoice", `Invoice #${invoice.invoiceNumber} for $${invoice.amount} has been created.`, "invoice", "/portal/invoices");
    res.status(201).json(invoice);
  });

  app.patch("/api/invoices/:id", isAuthenticated, isAdmin, async (req, res) => {
    const invoice = await storage.updateInvoice(param(req, "id"), req.body);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json(invoice);
  });

  app.get("/api/admin/chats", isAuthenticated, isAdmin, async (_req, res) => {
    const clientList = await storage.getClients();
    res.json(clientList);
  });

  app.get("/api/admin/chats/:clientId", isAuthenticated, isAdmin, async (req, res) => {
    const messages = await storage.getChatMessages(param(req, "clientId"));
    res.json(messages);
  });

  app.post("/api/admin/chats/:clientId", isAuthenticated, isAdmin, async (req: any, res) => {
    const dbUser = (req as any).dbUser;
    const parsed = insertChatMessageSchema.safeParse({
      clientId: param(req, "clientId"),
      senderId: dbUser.id,
      senderName: `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim() || 'Admin',
      senderRole: "admin",
      message: req.body.message,
    });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const msg = await storage.createChatMessage(parsed.data);
    notifyClientUsers(param(req, "clientId"), "New Message", "You have a new message from CC Trucking Services.", "chat", "/portal/chat");
    res.status(201).json(msg);
  });

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
    const client = await storage.getClient(req.clientId);
    notifyAllAdmins("New Service Request", `${client?.companyName || "A client"} submitted a new ${ticket.serviceType} request.`, "ticket", "/admin/tickets");
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
    notifyAllAdmins("Invoice Approved", `Invoice #${invoice.invoiceNumber} has been approved by the client.`, "invoice", "/admin/invoices");
    res.json(updated);
  });

  app.get("/api/portal/chat", isAuthenticated, isClient, async (req: any, res) => {
    const messages = await storage.getChatMessages(req.clientId);
    res.json(messages);
  });

  app.post("/api/portal/chat", isAuthenticated, isClient, async (req: any, res) => {
    const dbUser = (req as any).dbUser;
    const parsed = insertChatMessageSchema.safeParse({
      clientId: req.clientId,
      senderId: dbUser.id,
      senderName: `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim() || 'Client',
      senderRole: "client",
      message: req.body.message,
    });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const msg = await storage.createChatMessage(parsed.data);
    const client = await storage.getClient(req.clientId);
    notifyAllAdmins("New Client Message", `New message from ${client?.companyName || "a client"}.`, "chat", "/admin/chat");
    res.status(201).json(msg);
  });

  // ===== SIGNATURE REQUEST ROUTES (admin) =====
  app.get("/api/admin/signatures", isAuthenticated, isAdmin, async (_req, res) => {
    const requests = await storage.getSignatureRequests();
    res.json(requests);
  });

  app.post("/api/admin/signatures", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const dbUser = (req as any).dbUser;
      const parsed = insertSignatureRequestSchema.safeParse({
        clientId: req.body.clientId,
        documentName: req.body.documentName,
        documentDescription: req.body.documentDescription || null,
        documentContent: req.body.documentContent,
        createdBy: dbUser.id,
        status: "pending",
        signatureData: null,
        signerName: null,
        reminderMethod: null,
      });
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const sigReq = await storage.createSignatureRequest(parsed.data);
      notifyClientUsers(sigReq.clientId, "Document to Sign", `"${sigReq.documentName}" needs your signature.`, "signature", "/portal/signatures");
      res.status(201).json(sigReq);
    } catch (error) {
      console.error("Create signature request error:", error);
      res.status(500).json({ message: "Failed to create signature request" });
    }
  });

  app.get("/api/admin/signatures/:id", isAuthenticated, isAdmin, async (req, res) => {
    const sigReq = await storage.getSignatureRequest(param(req, "id"));
    if (!sigReq) return res.status(404).json({ message: "Not found" });
    res.json(sigReq);
  });

  app.post("/api/admin/signatures/:id/remind", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const sigReq = await storage.getSignatureRequest(param(req, "id"));
      if (!sigReq) return res.status(404).json({ message: "Not found" });
      if (sigReq.status === "signed") return res.status(400).json({ message: "Document already signed" });

      const client = await storage.getClient(sigReq.clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });

      const { method } = req.body;
      const validMethods = ["email", "sms", "both"];
      let reminderMethod = validMethods.includes(method) ? method : "email";
      let reminderSent = false;

      if (reminderMethod === "email" && client.email) {
        console.log(`[REMINDER] Email sent to ${client.email} for document "${sigReq.documentName}"`);
        reminderSent = true;
      } else if (reminderMethod === "sms" && client.phone) {
        console.log(`[REMINDER] SMS sent to ${client.phone} for document "${sigReq.documentName}"`);
        reminderSent = true;
      } else if (reminderMethod === "both") {
        if (client.email) console.log(`[REMINDER] Email sent to ${client.email} for document "${sigReq.documentName}"`);
        if (client.phone) console.log(`[REMINDER] SMS sent to ${client.phone} for document "${sigReq.documentName}"`);
        reminderSent = !!(client.email || client.phone);
      }

      if (reminderSent) {
        await storage.updateSignatureRequest(sigReq.id, {
          reminderSentAt: new Date(),
          reminderMethod,
        });
      }

      res.json({
        sent: reminderSent,
        method: reminderMethod,
        email: client.email,
        phone: client.phone,
        message: reminderSent
          ? `Reminder sent via ${reminderMethod}`
          : "No contact info available for this method",
      });
    } catch (error) {
      console.error("Send reminder error:", error);
      res.status(500).json({ message: "Failed to send reminder" });
    }
  });

  // ===== CLIENT PORTAL SIGNATURE ROUTES =====
  app.get("/api/portal/signatures", isAuthenticated, isClient, async (req: any, res) => {
    const requests = await storage.getSignatureRequestsByClient(req.clientId);
    res.json(requests);
  });

  app.get("/api/portal/signatures/:id", isAuthenticated, isClient, async (req: any, res) => {
    const sigReq = await storage.getSignatureRequest(param(req, "id"));
    if (!sigReq || sigReq.clientId !== req.clientId) return res.status(404).json({ message: "Not found" });
    res.json(sigReq);
  });

  app.post("/api/portal/signatures/:id/sign", isAuthenticated, isClient, async (req: any, res) => {
    try {
      const sigReq = await storage.getSignatureRequest(param(req, "id"));
      if (!sigReq || sigReq.clientId !== req.clientId) return res.status(404).json({ message: "Not found" });
      if (sigReq.status === "signed") return res.status(400).json({ message: "Already signed" });

      const { signerName, signatureData } = req.body;
      const trimmedName = typeof signerName === "string" ? signerName.trim() : "";
      if (!trimmedName || trimmedName.length < 2) {
        return res.status(400).json({ message: "Please enter your full name (at least 2 characters)" });
      }
      if (!signatureData || typeof signatureData !== "string" || !signatureData.startsWith("data:image/")) {
        return res.status(400).json({ message: "A valid signature image is required" });
      }
      const MAX_SIG_SIZE = 500_000;
      if (signatureData.length > MAX_SIG_SIZE) {
        return res.status(400).json({ message: "Signature data is too large" });
      }

      const updated = await storage.updateSignatureRequest(sigReq.id, {
        status: "signed",
        signedAt: new Date(),
        signerName: trimmedName,
        signatureData,
      });
      notifyAllAdmins("Document Signed", `"${sigReq.documentName}" was signed by ${trimmedName}.`, "signature", "/admin/signatures");
      res.json(updated);
    } catch (error) {
      console.error("Sign document error:", error);
      res.status(500).json({ message: "Failed to sign document" });
    }
  });

  // ===== NOTIFICATION ROUTES =====
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    const userId = (req.session as any).userId;
    const notifs = await storage.getNotificationsByUser(userId);
    res.json(notifs);
  });

  app.get("/api/notifications/unread-count", isAuthenticated, async (req: any, res) => {
    const userId = (req.session as any).userId;
    const count = await storage.getUnreadCountByUser(userId);
    res.json({ count });
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    const userId = (req.session as any).userId;
    const notif = await storage.markNotificationRead(param(req, "id"), userId);
    if (!notif) return res.status(404).json({ message: "Not found" });
    res.json(notif);
  });

  app.post("/api/notifications/mark-all-read", isAuthenticated, async (req: any, res) => {
    const userId = (req.session as any).userId;
    await storage.markAllNotificationsRead(userId);
    res.json({ success: true });
  });

  // ===== GOOGLE SHEETS ROUTES (admin only) =====
  app.get("/api/admin/sheets/info", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { spreadsheetId } = req.query;
      if (!spreadsheetId || typeof spreadsheetId !== "string") {
        return res.status(400).json({ message: "spreadsheetId query parameter is required" });
      }
      const { getSpreadsheetInfo } = await import("./googleSheets");
      const info = await getSpreadsheetInfo(spreadsheetId);
      res.json(info);
    } catch (error: any) {
      console.error("Sheets info error:", error.message);
      if (error.message.includes("GOOGLE_SERVICE_ACCOUNT_KEY")) {
        return res.status(400).json({ message: "Google Sheets is not configured. Add the service account key in settings." });
      }
      res.status(500).json({ message: "Failed to fetch spreadsheet info" });
    }
  });

  app.get("/api/admin/sheets/data", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { spreadsheetId, range } = req.query;
      if (!spreadsheetId || typeof spreadsheetId !== "string") {
        return res.status(400).json({ message: "spreadsheetId query parameter is required" });
      }
      const { getSpreadsheetData, listAllSheetData } = await import("./googleSheets");
      if (range && typeof range === "string") {
        const data = await getSpreadsheetData(spreadsheetId, range);
        res.json({ data });
      } else {
        const allData = await listAllSheetData(spreadsheetId);
        res.json(allData);
      }
    } catch (error: any) {
      console.error("Sheets data error:", error.message);
      if (error.message.includes("GOOGLE_SERVICE_ACCOUNT_KEY")) {
        return res.status(400).json({ message: "Google Sheets is not configured. Add the service account key in settings." });
      }
      res.status(500).json({ message: "Failed to fetch spreadsheet data" });
    }
  });

  return httpServer;
}
