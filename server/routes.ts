import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import {
  insertClientSchema, insertServiceTicketSchema, insertDocumentSchema,
  insertInvoiceSchema, insertChatMessageSchema, insertSignatureRequestSchema,
  insertFormTemplateSchema, insertFilledFormSchema, insertNotarizationSchema,
  insertServiceItemSchema, insertInvoiceLineItemSchema, insertTaxDocumentSchema,
  insertBookkeepingSubscriptionSchema, insertBankTransactionSchema,
  insertTransactionCategorySchema, insertPreparerAssignmentSchema,
  clients, notifications, invoices, invoiceLineItems, serviceItems, taxDocuments,
  bookkeepingSubscriptions, bankTransactions, preparerAssignments
} from "@shared/schema";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { authStorage } from "./replit_integrations/auth/storage";
import { users } from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc, gte, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import OpenAI from "openai";
import multer from "multer";
import path from "path";
import fs from "fs";
import webpush from "web-push";

const uploadDir = path.join(process.cwd(), "uploads", "tax-documents");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const taxDocUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname);
      cb(null, `${uniqueSuffix}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv", "text/plain",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
});

function param(req: Request, name: string): string {
  return req.params[name] as string;
}

function isAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  db.select().from(users).where(eq(users.id, userId)).then(([dbUser]) => {
    if (!dbUser || (dbUser.role !== "admin" && dbUser.role !== "owner")) {
      return res.status(403).json({ message: "Admin access required" });
    }
    (req as any).dbUser = dbUser;
    next();
  }).catch(() => res.status(500).json({ message: "Server error" }));
}

function isOwner(req: Request, res: Response, next: NextFunction) {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  db.select().from(users).where(eq(users.id, userId)).then(([dbUser]) => {
    if (!dbUser || dbUser.role !== "owner") {
      return res.status(403).json({ message: "Owner access required" });
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

function isPreparer(req: Request, res: Response, next: NextFunction) {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  db.select().from(users).where(eq(users.id, userId)).then(([dbUser]) => {
    if (!dbUser || dbUser.role !== "preparer") {
      return res.status(403).json({ message: "Preparer access required" });
    }
    (req as any).dbUser = dbUser;
    next();
  }).catch(() => res.status(500).json({ message: "Server error" }));
}

async function audit(req: Request, action: string, entityType: string, entityId?: string, details?: string) {
  try {
    const dbUser = (req as any).dbUser;
    await storage.createAuditLog({
      userId: dbUser?.id || (req.session as any).userId || null,
      userName: dbUser ? (dbUser.firstName && dbUser.lastName ? `${dbUser.firstName} ${dbUser.lastName}` : dbUser.username) : null,
      action,
      entityType,
      entityId: entityId || null,
      details: details || null,
    });
  } catch (e) {
    console.error("Failed to create audit log:", e);
  }
}

let vapidConfigured = false;
try {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      "mailto:admin@cctrucking.com",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    vapidConfigured = true;
  }
} catch (e) {
  console.warn("VAPID keys invalid or mismatched — push notifications disabled:", (e as Error).message);
}

async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string; tag?: string }) {
  if (!vapidConfigured) return;
  try {
    const subs = await storage.getPushSubscriptionsByUser(userId);
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await storage.deletePushSubscription(sub.endpoint);
        }
      }
    }
  } catch (e) {
    console.error("Failed to send push notification:", e);
  }
}

async function notifyUser(userId: string, title: string, message: string, type: string, link?: string) {
  try {
    await storage.createNotification({ userId, title, message, type, link: link || null, read: "false" });
    sendPushToUser(userId, { title, body: message, url: link || "/", tag: type });
  } catch (e) {
    console.error("Failed to create notification:", e);
  }
}

async function notifyAllAdmins(title: string, message: string, type: string, link?: string) {
  try {
    const allUsers = await db.select().from(users);
    const admins = allUsers.filter(u => u.role === "admin" || u.role === "owner");
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
      if (!["admin", "client", "owner", "preparer"].includes(role)) {
        return res.status(400).json({ message: "Role must be admin, owner, client, or preparer" });
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
    const [tickets, documents, invoices, messages, signatures, forms, notarizationRecords] = await Promise.all([
      storage.getTicketsByClient(clientId),
      storage.getDocumentsByClient(clientId),
      storage.getInvoicesByClient(clientId),
      storage.getChatMessages(clientId),
      storage.getSignatureRequestsByClient(clientId),
      storage.getFilledFormsByClient(clientId),
      storage.getNotarizationsByClient(clientId),
    ]);
    res.json({ client, tickets, documents, invoices, messages, signatures, forms, notarizations: notarizationRecords });
  });

  app.post("/api/clients", isAuthenticated, isAdmin, async (req, res) => {
    const parsed = insertClientSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const client = await storage.createClient(parsed.data);
    await audit(req, "created", "client", client.id, `Created client "${client.companyName}"`);
    res.status(201).json(client);
  });

  app.patch("/api/clients/:id", isAuthenticated, isAdmin, async (req, res) => {
    const client = await storage.updateClient(param(req, "id"), req.body);
    if (!client) return res.status(404).json({ message: "Client not found" });
    await audit(req, "updated", "client", client.id, `Updated client "${client.companyName}"`);
    res.json(client);
  });

  app.delete("/api/clients/:id", isAuthenticated, isAdmin, async (req, res) => {
    await audit(req, "deleted", "client", param(req, "id"), `Deleted client`);
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
    await audit(req, "created", "ticket", ticket.id, `Created ticket "${ticket.title}" (${ticket.serviceType})`);
    res.status(201).json(ticket);
  });

  app.patch("/api/tickets/:id", isAuthenticated, isAdmin, async (req, res) => {
    const ticket = await storage.updateTicket(param(req, "id"), req.body);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    await audit(req, "updated", "ticket", ticket.id, `Updated ticket "${ticket.title}" — status: ${ticket.status}`);
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
    await audit(req, "created", "document", doc.id, `Created document "${doc.name}" (${doc.type})`);
    res.status(201).json(doc);
  });

  app.patch("/api/documents/:id", isAuthenticated, isAdmin, async (req, res) => {
    const doc = await storage.updateDocument(param(req, "id"), req.body);
    if (!doc) return res.status(404).json({ message: "Document not found" });
    await audit(req, "updated", "document", doc.id, `Updated document "${doc.name}" — status: ${doc.status}`);
    res.json(doc);
  });

  app.get("/api/invoices/next-number", isAuthenticated, isAdmin, async (_req, res) => {
    const allInvoices = await storage.getInvoices();
    let maxNum = 0;
    for (const inv of allInvoices) {
      const match = inv.invoiceNumber.match(/^INV-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    const nextNumber = `INV-${String(maxNum + 1).padStart(4, "0")}`;
    res.json({ nextNumber, currentCount: allInvoices.length });
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
    let body = { ...req.body };
    if (!body.invoiceNumber || body.invoiceNumber.trim() === "") {
      const allInvoices = await storage.getInvoices();
      let maxNum = 0;
      for (const inv of allInvoices) {
        const match = inv.invoiceNumber.match(/^INV-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      body.invoiceNumber = `INV-${String(maxNum + 1).padStart(4, "0")}`;
    }
    if (!body.ticketId || body.ticketId === "") body.ticketId = null;
    if (!body.description) body.description = null;
    if (body.dueDate === "") body.dueDate = null;
    if (body.paidDate === "") body.paidDate = null;
    const parsed = insertInvoiceSchema.safeParse(body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const invoice = await storage.createInvoice(parsed.data);
    await audit(req, "created", "invoice", invoice.id, `Created invoice #${invoice.invoiceNumber} — $${invoice.amount}`);
    notifyClientUsers(invoice.clientId, "New Invoice", `Invoice #${invoice.invoiceNumber} for $${invoice.amount} has been created.`, "invoice", "/portal/invoices");
    res.status(201).json(invoice);
  });

  app.patch("/api/invoices/:id", isAuthenticated, isAdmin, async (req, res) => {
    const invoice = await storage.updateInvoice(param(req, "id"), req.body);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    await audit(req, "updated", "invoice", invoice.id, `Updated invoice #${invoice.invoiceNumber} — status: ${invoice.status}`);
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

  const pushSubscribeSchema = z.object({
    endpoint: z.string().url(),
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  });

  app.post("/api/push/subscribe", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).userId;
      const parsed = pushSubscribeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid subscription data" });
      }
      await storage.createPushSubscription({ userId, ...parsed.data });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: "Failed to save subscription" });
    }
  });

  app.delete("/api/push/unsubscribe", isAuthenticated, async (req: any, res) => {
    try {
      const parsed = z.object({ endpoint: z.string().url() }).safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid endpoint" });
      await storage.deletePushSubscription(parsed.data.endpoint);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: "Failed to remove subscription" });
    }
  });

  app.get("/api/admin/form-templates", isAuthenticated, isAdmin, async (_req, res) => {
    const templates = await storage.getFormTemplates();
    res.json(templates);
  });

  app.get("/api/admin/form-templates/:id", isAuthenticated, isAdmin, async (req, res) => {
    const template = await storage.getFormTemplate(param(req, "id"));
    if (!template) return res.status(404).json({ message: "Template not found" });
    res.json(template);
  });

  app.post("/api/admin/form-templates", isAuthenticated, isAdmin, async (req, res) => {
    const parsed = insertFormTemplateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const template = await storage.createFormTemplate(parsed.data);
    await audit(req, "created", "form_template", template.id, `Created form template "${template.name}"`);
    res.status(201).json(template);
  });

  app.patch("/api/admin/form-templates/:id", isAuthenticated, isAdmin, async (req, res) => {
    const template = await storage.updateFormTemplate(param(req, "id"), req.body);
    if (!template) return res.status(404).json({ message: "Template not found" });
    await audit(req, "updated", "form_template", template.id, `Updated form template "${template.name}"`);
    res.json(template);
  });

  app.delete("/api/admin/form-templates/:id", isAuthenticated, isAdmin, async (req, res) => {
    const id = param(req, "id");
    const template = await storage.getFormTemplate(id);
    await storage.deleteFormTemplate(id);
    await audit(req, "deleted", "form_template", id, `Deleted form template "${template?.name || id}"`);
    res.status(204).send();
  });

  app.get("/api/admin/filled-forms", isAuthenticated, isAdmin, async (_req, res) => {
    const forms = await storage.getFilledForms();
    res.json(forms);
  });

  app.get("/api/admin/filled-forms/:id", isAuthenticated, isAdmin, async (req, res) => {
    const form = await storage.getFilledForm(param(req, "id"));
    if (!form) return res.status(404).json({ message: "Form not found" });
    res.json(form);
  });

  app.post("/api/admin/filled-forms", isAuthenticated, isAdmin, async (req, res) => {
    const parsed = insertFilledFormSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const form = await storage.createFilledForm(parsed.data);
    await audit(req, "created", "filled_form", form.id, `Created filled form "${form.name}" for client ${form.clientId}`);
    res.status(201).json(form);
  });

  app.patch("/api/admin/filled-forms/:id", isAuthenticated, isAdmin, async (req, res) => {
    const form = await storage.updateFilledForm(param(req, "id"), req.body);
    if (!form) return res.status(404).json({ message: "Form not found" });
    await audit(req, "updated", "filled_form", form.id, `Updated filled form "${form.name}" — status: ${form.status}`);
    res.json(form);
  });

  app.post("/api/admin/filled-forms/:id/send-for-signature", isAuthenticated, isAdmin, async (req, res) => {
    const form = await storage.getFilledForm(param(req, "id"));
    if (!form) return res.status(404).json({ message: "Form not found" });
    const sigReq = await storage.createSignatureRequest({
      clientId: form.clientId,
      documentName: form.name,
      documentDescription: `Filled form requiring signature`,
      documentContent: form.filledContent,
      createdBy: (req as any).dbUser?.id || null,
      status: "pending",
      signerName: null,
      signatureData: null,
      reminderMethod: null,
    });
    await storage.updateFilledForm(form.id, { status: "sent_for_signature", signatureRequestId: sigReq.id });
    await notifyClientUsers(form.clientId, "Document Ready for Signature", `"${form.name}" is ready for your signature.`, "signature", "/portal/signatures");
    await audit(req, "sent_for_signature", "filled_form", form.id, `Sent "${form.name}" for signature (sig request ${sigReq.id})`);
    res.json({ signatureRequest: sigReq });
  });

  app.get("/api/admin/notarizations", isAuthenticated, isAdmin, async (_req, res) => {
    const notarizations = await storage.getNotarizations();
    res.json(notarizations);
  });

  app.get("/api/admin/notarizations/:id", isAuthenticated, isAdmin, async (req, res) => {
    const n = await storage.getNotarization(param(req, "id"));
    if (!n) return res.status(404).json({ message: "Notarization not found" });
    res.json(n);
  });

  app.post("/api/admin/notarizations", isAuthenticated, isAdmin, async (req, res) => {
    const parsed = insertNotarizationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const n = await storage.createNotarization(parsed.data);
    await audit(req, "created", "notarization", n.id, `Created notarization "${n.documentName}" for client ${n.clientId}, notary: ${n.notaryName}`);
    res.status(201).json(n);
  });

  app.patch("/api/admin/notarizations/:id", isAuthenticated, isAdmin, async (req, res) => {
    const n = await storage.updateNotarization(param(req, "id"), req.body);
    if (!n) return res.status(404).json({ message: "Notarization not found" });
    await audit(req, "updated", "notarization", n.id, `Updated notarization "${n.documentName}" — status: ${n.status}`);
    res.json(n);
  });

  app.get("/api/admin/audit-logs", isAuthenticated, isAdmin, async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const entityType = req.query.entityType as string;
    if (entityType) {
      const logs = await storage.getAuditLogsByEntity(entityType);
      res.json(logs);
    } else {
      const logs = await storage.getAuditLogs(limit, offset);
      res.json(logs);
    }
  });

  // ===== SERVICE ITEMS ROUTES =====
  app.get("/api/admin/service-items", isAuthenticated, isAdmin, async (_req, res) => {
    const items = await storage.getServiceItems();
    res.json(items);
  });

  app.get("/api/admin/service-items/:id", isAuthenticated, isAdmin, async (req, res) => {
    const item = await storage.getServiceItem(param(req, "id"));
    if (!item) return res.status(404).json({ message: "Service item not found" });
    res.json(item);
  });

  app.post("/api/admin/service-items", isAuthenticated, isAdmin, async (req, res) => {
    const parsed = insertServiceItemSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const item = await storage.createServiceItem(parsed.data);
    await audit(req, "created", "service_item", item.id, `Created service item "${item.name}" — $${item.defaultPrice}`);
    res.status(201).json(item);
  });

  app.patch("/api/admin/service-items/:id", isAuthenticated, isAdmin, async (req, res) => {
    const item = await storage.updateServiceItem(param(req, "id"), req.body);
    if (!item) return res.status(404).json({ message: "Service item not found" });
    await audit(req, "updated", "service_item", item.id, `Updated service item "${item.name}"`);
    res.json(item);
  });

  app.delete("/api/admin/service-items/:id", isAuthenticated, isAdmin, async (req, res) => {
    const id = param(req, "id");
    await storage.deleteServiceItem(id);
    await audit(req, "deleted", "service_item", id, "Deleted service item");
    res.status(204).send();
  });

  // ===== INVOICE LINE ITEMS ROUTES =====
  app.get("/api/invoices/:id/line-items", isAuthenticated, isAdmin, async (req, res) => {
    const items = await storage.getInvoiceLineItems(param(req, "id"));
    res.json(items);
  });

  app.post("/api/invoices/:id/line-items", isAuthenticated, isAdmin, async (req, res) => {
    const invoiceId = param(req, "id");
    const parsed = insertInvoiceLineItemSchema.safeParse({ ...req.body, invoiceId });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const item = await storage.createInvoiceLineItem(parsed.data);
    const allItems = await storage.getInvoiceLineItems(invoiceId);
    const total = allItems.reduce((sum, li) => sum + parseFloat(li.amount), 0);
    await storage.updateInvoice(invoiceId, { amount: total.toFixed(2) });
    res.status(201).json(item);
  });

  app.patch("/api/invoice-line-items/:id", isAuthenticated, isAdmin, async (req, res) => {
    const item = await storage.updateInvoiceLineItem(param(req, "id"), req.body);
    if (!item) return res.status(404).json({ message: "Line item not found" });
    const allItems = await storage.getInvoiceLineItems(item.invoiceId);
    const total = allItems.reduce((sum, li) => sum + parseFloat(li.amount), 0);
    await storage.updateInvoice(item.invoiceId, { amount: total.toFixed(2) });
    res.json(item);
  });

  app.delete("/api/invoice-line-items/:id", isAuthenticated, isAdmin, async (req, res) => {
    const id = param(req, "id");
    const allLineItems = await db.select().from(invoiceLineItems).where(eq(invoiceLineItems.id, id));
    const lineItem = allLineItems[0];
    await storage.deleteInvoiceLineItem(id);
    if (lineItem) {
      const remainingItems = await storage.getInvoiceLineItems(lineItem.invoiceId);
      const total = remainingItems.reduce((sum, li) => sum + parseFloat(li.amount), 0);
      await storage.updateInvoice(lineItem.invoiceId, { amount: total.toFixed(2) });
    }
    res.status(204).send();
  });

  // ===== ANALYTICS ROUTES (owner only) =====
  app.get("/api/admin/analytics", isAuthenticated, isOwner, async (_req, res) => {
    try {
      const [allClients, allTickets, allInvoices, allLineItems] = await Promise.all([
        storage.getClients(),
        storage.getTickets(),
        storage.getInvoices(),
        db.select().from(invoiceLineItems),
      ]);

      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), 1);

      const totalRevenue = allInvoices.filter(i => i.status === "paid").reduce((sum, i) => sum + parseFloat(i.amount), 0);
      const monthlyRevenue = allInvoices.filter(i => i.status === "paid" && i.paidDate && new Date(i.paidDate) >= thisMonth).reduce((sum, i) => sum + parseFloat(i.amount), 0);
      const outstanding = allInvoices.filter(i => ["sent", "overdue", "approved"].includes(i.status)).reduce((sum, i) => sum + parseFloat(i.amount), 0);
      const paidInvoices = allInvoices.filter(i => i.status === "paid");
      const avgInvoice = paidInvoices.length > 0 ? totalRevenue / paidInvoices.length : 0;

      const activeClients = allClients.filter(c => c.status === "active").length;
      const newClientsThisMonth = allClients.length;

      const openTickets = allTickets.filter(t => t.status === "open" || t.status === "in_progress").length;
      const completedTickets = allTickets.filter(t => t.status === "completed").length;
      const ticketCompletionRate = allTickets.length > 0 ? (completedTickets / allTickets.length) * 100 : 0;

      const monthlyData: { month: string; revenue: number; invoiceCount: number; paidCount: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const monthLabel = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        const monthInvoices = allInvoices.filter(inv => {
          const created = new Date(inv.createdAt);
          return created >= d && created <= monthEnd;
        });
        const monthPaid = monthInvoices.filter(i => i.status === "paid");
        monthlyData.push({
          month: monthLabel,
          revenue: monthPaid.reduce((sum, i) => sum + parseFloat(i.amount), 0),
          invoiceCount: monthInvoices.length,
          paidCount: monthPaid.length,
        });
      }

      const serviceBreakdown: Record<string, { count: number; revenue: number }> = {};
      for (const li of allLineItems) {
        const key = li.description || "Other";
        if (!serviceBreakdown[key]) serviceBreakdown[key] = { count: 0, revenue: 0 };
        serviceBreakdown[key].count += li.quantity;
        serviceBreakdown[key].revenue += parseFloat(li.amount);
      }

      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);

      const unpaid = allInvoices.filter(i => ["sent", "overdue"].includes(i.status));
      const aging = {
        current: unpaid.filter(i => !i.dueDate || new Date(i.dueDate) >= now).reduce((s, i) => s + parseFloat(i.amount), 0),
        thirtyDays: unpaid.filter(i => i.dueDate && new Date(i.dueDate) < now && new Date(i.dueDate) >= thirtyDaysAgo).reduce((s, i) => s + parseFloat(i.amount), 0),
        sixtyDays: unpaid.filter(i => i.dueDate && new Date(i.dueDate) < thirtyDaysAgo && new Date(i.dueDate) >= sixtyDaysAgo).reduce((s, i) => s + parseFloat(i.amount), 0),
        ninetyPlus: unpaid.filter(i => i.dueDate && new Date(i.dueDate) < sixtyDaysAgo).reduce((s, i) => s + parseFloat(i.amount), 0),
      };

      const clientRevenue = allClients.map(c => {
        const clientInvoices = allInvoices.filter(i => i.clientId === c.id && i.status === "paid");
        return { name: c.companyName, revenue: clientInvoices.reduce((s, i) => s + parseFloat(i.amount), 0) };
      }).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

      res.json({
        revenue: { total: totalRevenue, monthly: monthlyRevenue, outstanding, avgInvoice },
        clients: { total: allClients.length, active: activeClients, newThisMonth: newClientsThisMonth },
        tickets: { total: allTickets.length, open: openTickets, completed: completedTickets, completionRate: ticketCompletionRate },
        monthlyData,
        serviceBreakdown: Object.entries(serviceBreakdown).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.revenue - a.revenue),
        aging,
        clientRevenue,
        invoiceSummary: {
          total: allInvoices.length,
          paid: allInvoices.filter(i => i.status === "paid").length,
          pending: allInvoices.filter(i => ["sent", "draft", "approved"].includes(i.status)).length,
          overdue: allInvoices.filter(i => i.status === "overdue").length,
        },
      });
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ message: "Failed to load analytics" });
    }
  });

  // ===== EMPLOYEE PERFORMANCE ROUTES (owner only) =====
  app.get("/api/admin/employee-performance", isAuthenticated, isOwner, async (_req, res) => {
    try {
      const allUsers = await db.select().from(users);
      const staffUsers = allUsers.filter(u => u.role === "admin" || u.role === "owner");
      const allLogs = await storage.getAuditLogs(50000, 0);

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      const actionWeights: Record<string, number> = {
        created: 10,
        uploaded: 8,
        updated: 5,
        sent_for_signature: 7,
        analyzed: 6,
        exported: 4,
        viewed: 1,
        deleted: 3,
        downloaded: 2,
      };

      const entityWeights: Record<string, number> = {
        client: 2.0,
        invoice: 1.8,
        ticket: 1.5,
        document: 1.3,
        tax_document: 1.4,
        form_template: 1.2,
        filled_form: 1.3,
        notarization: 1.5,
        service_item: 1.0,
        signature_request: 1.2,
      };

      const employees = staffUsers.map(user => {
        const userLogs = allLogs.filter(l => l.userId === user.id);
        const last30Logs = userLogs.filter(l => new Date(l.createdAt) >= thirtyDaysAgo);
        const last90Logs = userLogs.filter(l => new Date(l.createdAt) >= ninetyDaysAgo);

        const actionBreakdown: Record<string, Record<string, number>> = {};
        const entityBreakdown: Record<string, number> = {};

        userLogs.forEach(log => {
          const entity = log.entityType || "other";
          const action = log.action || "other";
          if (!actionBreakdown[entity]) actionBreakdown[entity] = {};
          actionBreakdown[entity][action] = (actionBreakdown[entity][action] || 0) + 1;
          entityBreakdown[entity] = (entityBreakdown[entity] || 0) + 1;
        });

        let totalScore = 0;
        userLogs.forEach(log => {
          const actionW = actionWeights[log.action || ""] || 3;
          const entityW = entityWeights[log.entityType || ""] || 1.0;
          totalScore += actionW * entityW;
        });

        let last30Score = 0;
        last30Logs.forEach(log => {
          const actionW = actionWeights[log.action || ""] || 3;
          const entityW = entityWeights[log.entityType || ""] || 1.0;
          last30Score += actionW * entityW;
        });

        const weeklyActivity: { week: string; actions: number; score: number }[] = [];
        for (let i = 11; i >= 0; i--) {
          const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
          const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
          const weekLogs = userLogs.filter(l => {
            const d = new Date(l.createdAt);
            return d >= weekStart && d < weekEnd;
          });
          let weekScore = 0;
          weekLogs.forEach(log => {
            const actionW = actionWeights[log.action || ""] || 3;
            const entityW = entityWeights[log.entityType || ""] || 1.0;
            weekScore += actionW * entityW;
          });
          weeklyActivity.push({
            week: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
            actions: weekLogs.length,
            score: Math.round(weekScore),
          });
        }

        let grade: string;
        if (last30Score >= 500) grade = "A+";
        else if (last30Score >= 350) grade = "A";
        else if (last30Score >= 250) grade = "B+";
        else if (last30Score >= 150) grade = "B";
        else if (last30Score >= 80) grade = "C+";
        else if (last30Score >= 40) grade = "C";
        else if (last30Score >= 15) grade = "D";
        else grade = "F";

        return {
          id: user.id,
          name: user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`.trim()
            : user.username || "Unknown",
          username: user.username,
          role: user.role,
          totalActions: userLogs.length,
          last30Actions: last30Logs.length,
          last90Actions: last90Logs.length,
          totalScore: Math.round(totalScore),
          last30Score: Math.round(last30Score),
          grade,
          actionBreakdown,
          entityBreakdown,
          weeklyActivity,
          topEntities: Object.entries(entityBreakdown)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([entity, count]) => ({ entity, count })),
          recentActivity: userLogs.slice(0, 10).map(l => ({
            action: l.action,
            entityType: l.entityType,
            details: l.details,
            createdAt: l.createdAt,
          })),
        };
      });

      employees.sort((a, b) => b.last30Score - a.last30Score);

      res.json({ employees });
    } catch (error) {
      console.error("Employee performance error:", error);
      res.status(500).json({ message: "Failed to load employee performance data" });
    }
  });

  // ===== AI CHAT ROUTES (admin) =====
  app.post("/api/admin/ai-chat", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { message, history = [] } = req.body;
      if (!message) return res.status(400).json({ message: "Message is required" });

      const [allClients, allTickets, allInvoices, allDocs, allServiceItemsList] = await Promise.all([
        storage.getClients(),
        storage.getTickets(),
        storage.getInvoices(),
        storage.getDocuments(),
        storage.getServiceItems(),
      ]);

      const totalRevenue = allInvoices.filter(i => i.status === "paid").reduce((s, i) => s + parseFloat(i.amount), 0);
      const outstanding = allInvoices.filter(i => ["sent", "overdue"].includes(i.status)).reduce((s, i) => s + parseFloat(i.amount), 0);

      const systemPrompt = `You are an AI assistant for CC Trucking Services, a trucking-focused CRM and operations management platform. You have access to the following live data:

CLIENTS (${allClients.length} total):
${allClients.map(c => `- ${c.companyName} (${c.status}) — DOT: ${c.dotNumber || 'N/A'}, MC: ${c.mcNumber || 'N/A'}, Contact: ${c.contactName}, Email: ${c.email}, Phone: ${c.phone}`).join('\n')}

SERVICE TICKETS (${allTickets.length} total, ${allTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length} open):
${allTickets.slice(0, 50).map(t => `- [${t.status}] ${t.title} (${t.serviceType}) — Client: ${allClients.find(c => c.id === t.clientId)?.companyName || t.clientId}${t.dueDate ? `, Due: ${new Date(t.dueDate).toLocaleDateString()}` : ''}`).join('\n')}

INVOICES (${allInvoices.length} total):
- Total Revenue (Paid): $${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Outstanding: $${outstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- By Status: ${allInvoices.filter(i => i.status === 'paid').length} paid, ${allInvoices.filter(i => i.status === 'sent').length} sent, ${allInvoices.filter(i => i.status === 'draft').length} draft, ${allInvoices.filter(i => i.status === 'overdue').length} overdue
${allInvoices.slice(0, 30).map(i => `- ${i.invoiceNumber} — $${i.amount} (${i.status}) — Client: ${allClients.find(c => c.id === i.clientId)?.companyName || i.clientId}`).join('\n')}

DOCUMENTS (${allDocs.length} total):
${allDocs.slice(0, 30).map(d => `- ${d.name} (${d.type}, ${d.status}) — Client: ${allClients.find(c => c.id === d.clientId)?.companyName || d.clientId}`).join('\n')}

SERVICE CATALOG (${allServiceItemsList.length} items):
${allServiceItemsList.map(s => `- ${s.name} — $${s.defaultPrice} (${s.category})`).join('\n')}

You can answer questions about clients, invoices, tickets, documents, revenue, and services. Be concise, accurate, and helpful. Format numbers as currency when relevant. If asked to perform an action (create ticket, send invoice, etc.), describe what should be done and suggest the user confirm in the admin portal.`;

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const messages: any[] = [
        { role: "system", content: systemPrompt },
        ...history.map((h: any) => ({ role: h.role, content: h.content })),
        { role: "user", content: message },
      ];

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages,
        stream: true,
        max_completion_tokens: 8192,
      });

      let fullResponse = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("AI chat error:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to process request" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ message: "AI chat failed" });
      }
    }
  });

  // ===== PORTAL LINE ITEMS ROUTES =====
  app.get("/api/portal/invoices/:id/line-items", isAuthenticated, isClient, async (req: any, res) => {
    const invoice = await storage.getInvoice(param(req, "id"));
    if (!invoice || invoice.clientId !== req.clientId) return res.status(404).json({ message: "Invoice not found" });
    const items = await storage.getInvoiceLineItems(param(req, "id"));
    res.json(items);
  });

  // ===== TAX PREP ROUTES (admin only) =====
  app.get("/api/admin/tax-documents", isAuthenticated, isAdmin, async (req, res) => {
    const { clientId, taxYear } = req.query;
    let docs;
    if (clientId) {
      docs = await storage.getTaxDocumentsByClient(clientId as string);
    } else if (taxYear) {
      docs = await storage.getTaxDocumentsByYear(parseInt(taxYear as string));
    } else {
      docs = await storage.getTaxDocuments();
    }
    await audit(req, "viewed", "tax_document", "", "Accessed tax documents list");
    res.json(docs);
  });

  app.get("/api/admin/tax-documents/export/csv", isAuthenticated, isAdmin, async (req, res) => {
    const { clientId: csvClientId, taxYear: csvTaxYear } = req.query;
    let csvDocs;
    if (csvClientId) {
      csvDocs = await storage.getTaxDocumentsByClient(csvClientId as string);
    } else if (csvTaxYear) {
      csvDocs = await storage.getTaxDocumentsByYear(parseInt(csvTaxYear as string));
    } else {
      csvDocs = await storage.getTaxDocuments();
    }

    const allClients = await storage.getClients();
    const csvClientMap = new Map(allClients.map(c => [c.id, c]));

    const headers = ["Tax Year", "Client Name", "EIN", "Document Type", "Payer/Employer", "Total Income", "Federal Withholding", "State Withholding", "SSN Last 4", "Confidence", "Status", "Risk Flags", "Notes"];
    const rows = csvDocs.map(d => {
      const client = csvClientMap.get(d.clientId);
      return [
        d.taxYear,
        client?.companyName || "",
        d.einNumber || client?.einNumber || "",
        d.documentType,
        d.payerName || "",
        d.totalIncome || "0.00",
        d.federalWithholding || "0.00",
        d.stateWithholding || "0.00",
        d.ssnLastFour || "",
        d.confidenceLevel || "",
        d.status,
        d.riskFlags || "",
        d.notes || "",
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    await audit(req, "exported", "tax_document", "", `Exported ${csvDocs.length} tax documents to CSV`);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="tax-documents-${csvTaxYear || 'all'}.csv"`);
    res.send(csv);
  });

  app.get("/api/admin/tax-documents/:id", isAuthenticated, isAdmin, async (req, res) => {
    const doc = await storage.getTaxDocument(param(req, "id"));
    if (!doc) return res.status(404).json({ message: "Tax document not found" });
    await audit(req, "viewed", "tax_document", doc.id, `Viewed tax document — ${doc.documentType}`);
    res.json(doc);
  });

  app.post("/api/admin/tax-documents", isAuthenticated, isAdmin, async (req, res) => {
    const parsed = insertTaxDocumentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = { ...parsed.data };
    if (data.ssnLastFour && data.ssnLastFour.length > 4) {
      data.ssnLastFour = data.ssnLastFour.replace(/\D/g, "").slice(-4);
    }
    const doc = await storage.createTaxDocument(data);
    await audit(req, "created", "tax_document", doc.id, `Created tax document — ${doc.documentType} for tax year ${doc.taxYear}`);
    res.status(201).json(doc);
  });

  app.post("/api/admin/tax-documents/upload", isAuthenticated, isAdmin, (req, res, next) => {
    taxDocUpload.single("file")(req, res, (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ message: "File too large. Maximum size is 10 MB." });
          }
          return res.status(400).json({ message: `Upload error: ${err.message}` });
        }
        return res.status(400).json({ message: err.message || "Invalid file" });
      }
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { clientId, taxYear, documentType, payerName, notes } = req.body;
      if (!clientId || !documentType) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "clientId and documentType are required" });
      }

      const parsedYear = parseInt(taxYear);
      if (isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 2099) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "taxYear must be a valid year between 2000 and 2099" });
      }

      const allowedExts = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt"];
      const ext = path.extname(req.file.originalname).toLowerCase();
      if (!allowedExts.includes(ext)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: `File extension ${ext} is not allowed` });
      }

      const doc = await storage.createTaxDocument({
        clientId,
        taxYear: parsedYear,
        documentType,
        payerName: payerName || null,
        notes: notes || null,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        filePath: `uploads/tax-documents/${req.file.filename}`,
        fileSize: req.file.size,
        status: "pending",
      });

      await audit(req, "created", "tax_document", doc.id, `Uploaded tax document — ${req.file.originalname} (${doc.documentType}) for tax year ${taxYear}`);
      res.status(201).json(doc);
    } catch (error: any) {
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      console.error("Tax document upload error:", error);
      res.status(500).json({ message: error.message || "Upload failed" });
    }
  });

  app.get("/api/admin/tax-documents/:id/download", isAuthenticated, isAdmin, async (req, res) => {
    const doc = await storage.getTaxDocument(param(req, "id"));
    if (!doc || !doc.filePath) {
      return res.status(404).json({ message: "File not found" });
    }
    const sanitizedPath = doc.filePath.replace(/^\/+/, "");
    const fullPath = path.join(process.cwd(), sanitizedPath);
    if (!fullPath.startsWith(uploadDir) || !fs.existsSync(fullPath)) {
      return res.status(404).json({ message: "File not found on disk" });
    }
    await audit(req, "downloaded", "tax_document", doc.id, `Downloaded tax document file — ${doc.fileName}`);
    res.download(fullPath, doc.fileName || "document");
  });

  app.patch("/api/admin/tax-documents/:id", isAuthenticated, isAdmin, async (req, res) => {
    const allowedFields = ["clientId", "taxYear", "documentType", "payerName", "documentContent", "notes", "status", "ssnLastFour"];
    const updateData: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in req.body) {
        updateData[key] = req.body[key];
      }
    }
    if (updateData.ssnLastFour && updateData.ssnLastFour.length > 4) {
      updateData.ssnLastFour = updateData.ssnLastFour.replace(/\D/g, "").slice(-4);
    }
    if (updateData.status && !["pending", "analyzed", "review", "exported"].includes(updateData.status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }
    const doc = await storage.updateTaxDocument(param(req, "id"), updateData);
    if (!doc) return res.status(404).json({ message: "Tax document not found" });
    await audit(req, "updated", "tax_document", doc.id, `Updated tax document — ${doc.documentType}`);
    res.json(doc);
  });

  app.delete("/api/admin/tax-documents/:id", isAuthenticated, isAdmin, async (req, res) => {
    const id = param(req, "id");
    const doc = await storage.getTaxDocument(id);
    if (doc?.filePath) {
      const sanitizedPath = doc.filePath.replace(/^\/+/, "");
      const fullPath = path.join(process.cwd(), sanitizedPath);
      if (fullPath.startsWith(uploadDir) && fs.existsSync(fullPath)) {
        try { fs.unlinkSync(fullPath); } catch {}
      }
    }
    await storage.deleteTaxDocument(id);
    await audit(req, "deleted", "tax_document", id, "Deleted tax document");
    res.status(204).send();
  });

  app.post("/api/admin/tax-documents/:id/analyze", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const doc = await storage.getTaxDocument(param(req, "id"));
      if (!doc) return res.status(404).json({ message: "Tax document not found" });

      const client = await storage.getClient(doc.clientId);

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const systemPrompt = `You are a professional tax intake analyst for a U.S.-based tax preparation firm specializing in trucking companies. Your job is to analyze tax document information and extract structured data.

IMPORTANT: This is an intake analysis, not tax advice.

For the document provided, you must:
1. Identify the document type and validate it
2. Extract all key tax fields
3. Note any missing or unreadable data
4. Flag potential issues or inconsistencies

Risk detection rules:
- Flag SSN/EIN mismatches between documents
- Flag unusually high deductions relative to income
- Flag missing common forms for the filing type
- Flag self-employment indicators
- Flag income inconsistencies across documents

Respond in this exact JSON format:
{
  "documentType": "W-2 | 1099-NEC | 1099-INT | 1099-MISC | 1099-K | 1099-DIV | Schedule C | Schedule SE | Other",
  "payerName": "employer or payer name",
  "totalIncome": 0.00,
  "federalWithholding": 0.00,
  "stateWithholding": 0.00,
  "ssnLastFour": "last 4 digits only or null",
  "einNumber": "EIN if found or null",
  "extractedFields": {
    "field_name": "value"
  },
  "missingFields": ["list of expected but missing fields"],
  "riskFlags": ["list of any risk flags or concerns"],
  "confidenceLevel": "high | medium | low",
  "notes": "any additional observations"
}

Only return valid JSON. No markdown formatting.`;

      const userContent = `Analyze this tax document for client: ${client?.companyName || 'Unknown'}
Document Type: ${doc.documentType}
Tax Year: ${doc.taxYear}
Payer/Employer: ${doc.payerName || 'Not specified'}

Document Content/Details:
${doc.documentContent || doc.notes || 'No content provided'}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_completion_tokens: 2048,
      });

      const responseText = completion.choices[0]?.message?.content || "";
      let parsed2: any = {};
      try {
        const jsonStr = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        parsed2 = JSON.parse(jsonStr);
      } catch {
        parsed2 = { notes: responseText, confidenceLevel: "low", riskFlags: ["Failed to parse AI response"] };
      }

      let ssnLast4 = parsed2.ssnLastFour || doc.ssnLastFour;
      if (ssnLast4 && ssnLast4.length > 4) {
        ssnLast4 = ssnLast4.replace(/\D/g, "").slice(-4);
      }

      const updated = await storage.updateTaxDocument(doc.id, {
        extractedData: JSON.stringify(parsed2),
        totalIncome: parsed2.totalIncome?.toString() || doc.totalIncome,
        federalWithholding: parsed2.federalWithholding?.toString() || doc.federalWithholding,
        stateWithholding: parsed2.stateWithholding?.toString() || doc.stateWithholding,
        ssnLastFour: ssnLast4,
        einNumber: parsed2.einNumber || doc.einNumber,
        payerName: parsed2.payerName || doc.payerName,
        riskFlags: parsed2.riskFlags ? JSON.stringify(parsed2.riskFlags) : null,
        confidenceLevel: parsed2.confidenceLevel || "medium",
        status: "analyzed",
        analyzedAt: new Date(),
      } as any);

      await audit(req, "analyzed", "tax_document", doc.id, `AI analyzed tax document — ${doc.documentType}, confidence: ${parsed2.confidenceLevel || 'unknown'}`);
      res.json(updated);
    } catch (error) {
      console.error("Tax document analysis error:", error);
      res.status(500).json({ message: "Failed to analyze document" });
    }
  });

  app.get("/api/admin/tax-summary/:clientId", isAuthenticated, isAdmin, async (req, res) => {
    const clientId = param(req, "clientId");
    const taxYear = req.query.taxYear ? parseInt(req.query.taxYear as string) : new Date().getFullYear();
    const docs = await storage.getTaxDocumentsByClient(clientId);
    const yearDocs = docs.filter(d => d.taxYear === taxYear);

    const totalIncome = yearDocs.reduce((s, d) => s + parseFloat(d.totalIncome || "0"), 0);
    const totalFederal = yearDocs.reduce((s, d) => s + parseFloat(d.federalWithholding || "0"), 0);
    const totalState = yearDocs.reduce((s, d) => s + parseFloat(d.stateWithholding || "0"), 0);

    const allRisks: string[] = [];
    for (const d of yearDocs) {
      if (d.riskFlags) {
        try {
          const flags = JSON.parse(d.riskFlags);
          if (Array.isArray(flags)) allRisks.push(...flags);
        } catch {
          allRisks.push(d.riskFlags);
        }
      }
    }

    const docTypes: Record<string, number> = {};
    for (const d of yearDocs) {
      docTypes[d.documentType] = (docTypes[d.documentType] || 0) + 1;
    }

    const analyzed = yearDocs.filter(d => d.status === "analyzed").length;
    const pending = yearDocs.filter(d => d.status === "pending").length;

    res.json({
      taxYear,
      totalDocuments: yearDocs.length,
      analyzedCount: analyzed,
      pendingCount: pending,
      totalIncome,
      totalFederalWithholding: totalFederal,
      totalStateWithholding: totalState,
      documentTypes: docTypes,
      riskFlags: [...new Set(allRisks)],
    });
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

  // ===== BOOKKEEPING ROUTES (admin) =====
  app.get("/api/admin/bookkeeping/subscriptions", isAuthenticated, isAdmin, async (_req, res) => {
    const subs = await storage.getBookkeepingSubscriptions();
    res.json(subs);
  });

  app.post("/api/admin/bookkeeping/subscriptions", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { clientId } = req.body;
      if (!clientId) return res.status(400).json({ message: "clientId is required" });
      const existing = await storage.getBookkeepingSubscriptionByClient(clientId);
      if (existing) return res.status(400).json({ message: "Client already has a bookkeeping subscription" });
      const sub = await storage.createBookkeepingSubscription({
        clientId,
        plan: "standard",
        price: "50.00",
        status: "active",
        startDate: new Date(),
      });
      await audit(req, "created", "bookkeeping_subscription", sub.id, `Activated bookkeeping for client ${clientId}`);
      res.json(sub);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/bookkeeping/subscriptions/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const allowed = z.object({
        status: z.enum(["active", "inactive", "cancelled", "past_due", "pending"]).optional(),
        price: z.string().optional(),
        preparerId: z.string().nullable().optional(),
        endDate: z.string().nullable().optional(),
      }).parse(req.body);
      const updateData: any = { ...allowed };
      if (allowed.endDate) updateData.endDate = new Date(allowed.endDate);
      const sub = await storage.updateBookkeepingSubscription(param(req, "id"), updateData);
      if (!sub) return res.status(404).json({ message: "Subscription not found" });
      await audit(req, "updated", "bookkeeping_subscription", sub.id, JSON.stringify(req.body));
      res.json(sub);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin/bookkeeping/transactions", isAuthenticated, isAdmin, async (req, res) => {
    const { clientId, month, year } = req.query;
    if (!clientId || typeof clientId !== "string") return res.status(400).json({ message: "clientId required" });
    const m = month ? parseInt(month as string) : undefined;
    const y = year ? parseInt(year as string) : undefined;
    const txns = await storage.getBankTransactions(clientId, m, y);
    res.json(txns);
  });

  const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

  app.post("/api/admin/bookkeeping/upload-statement/:clientId", isAuthenticated, isAdmin, csvUpload.single("file"), async (req, res) => {
    try {
      const clientId = param(req, "clientId");
      const file = req.file;
      if (!file) return res.status(400).json({ message: "CSV file required" });
      const { month, year, bankName, accountLast4 } = req.body;
      if (!month || !year) return res.status(400).json({ message: "month and year required" });

      const csvText = file.buffer.toString("utf-8");
      const transactions = parseCSV(csvText, clientId, parseInt(month), parseInt(year), bankName, accountLast4);
      if (transactions.length === 0) return res.status(400).json({ message: "No valid transactions found in CSV" });

      const created = await storage.createBankTransactions(transactions);
      await audit(req, "uploaded", "bank_statement", clientId, `Uploaded ${created.length} transactions for month ${month}/${year}`);
      res.json({ count: created.length, transactions: created });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/bookkeeping/transactions/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const allowed = z.object({
        manualCategory: z.string().nullable().optional(),
        reviewed: z.boolean().optional(),
        aiCategory: z.string().nullable().optional(),
        aiConfidence: z.string().nullable().optional(),
      }).parse(req.body);
      const txn = await storage.updateBankTransaction(param(req, "id"), allowed);
      if (!txn) return res.status(404).json({ message: "Transaction not found" });
      res.json(txn);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/bookkeeping/transactions/:id", isAuthenticated, isAdmin, async (req, res) => {
    await storage.deleteBankTransaction(param(req, "id"));
    res.json({ success: true });
  });

  app.post("/api/admin/bookkeeping/ai-categorize/:clientId", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const clientId = param(req, "clientId");
      const { month, year } = req.body;
      const m = month ? parseInt(month) : undefined;
      const y = year ? parseInt(year) : undefined;
      const txns = await storage.getBankTransactions(clientId, m, y);
      const uncategorized = txns.filter(t => !t.aiCategory && !t.manualCategory);
      if (uncategorized.length === 0) return res.json({ message: "All transactions already categorized", count: 0 });

      const categories = await storage.getTransactionCategories();
      const categoryNames = categories.map(c => c.name);

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const batchSize = 30;
      let categorizedCount = 0;
      for (let i = 0; i < uncategorized.length; i += batchSize) {
        const batch = uncategorized.slice(i, i + batchSize);
        const txnList = batch.map((t, idx) => `${idx + 1}. "${t.description}" - $${t.amount}`).join("\n");

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a trucking company bookkeeper. Categorize each transaction into one of these categories: ${categoryNames.join(", ")}. Return a JSON array of objects with "index" (1-based), "category" (exact category name), and "confidence" (0-100). Only return the JSON array, no other text.`
            },
            { role: "user", content: `Categorize these trucking company transactions:\n${txnList}` }
          ],
          temperature: 0.1,
        });

        const responseText = completion.choices[0]?.message?.content || "[]";
        try {
          const cleaned = responseText.replace(/```json\n?|\n?```/g, "").trim();
          const results = JSON.parse(cleaned);
          for (const result of results) {
            const idx = result.index - 1;
            if (idx >= 0 && idx < batch.length && categoryNames.includes(result.category)) {
              await storage.updateBankTransaction(batch[idx].id, {
                aiCategory: result.category,
                aiConfidence: String(result.confidence),
              });
              categorizedCount++;
            }
          }
        } catch (parseErr) {
          console.error("AI categorization parse error:", parseErr);
        }
      }

      await audit(req, "ai_categorized", "bank_transactions", clientId, `AI categorized ${categorizedCount} transactions`);
      res.json({ message: `Categorized ${categorizedCount} transactions`, count: categorizedCount });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/bookkeeping/summaries", isAuthenticated, isAdmin, async (req, res) => {
    const { clientId } = req.query;
    if (!clientId || typeof clientId !== "string") return res.status(400).json({ message: "clientId required" });
    const summaries = await storage.getMonthlySummaries(clientId);
    res.json(summaries);
  });

  app.post("/api/admin/bookkeeping/generate-summary/:clientId", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const clientId = param(req, "clientId");
      const { month, year } = req.body;
      if (!month || !year) return res.status(400).json({ message: "month and year required" });

      const txns = await storage.getBankTransactions(clientId, parseInt(month), parseInt(year));
      const categories = await storage.getTransactionCategories();
      const incomeCategories = categories.filter(c => c.parentCategory === "Income").map(c => c.name);

      let totalIncome = 0;
      let totalExpenses = 0;
      const breakdown: Record<string, number> = {};

      for (const txn of txns) {
        const cat = txn.manualCategory || txn.aiCategory || "Uncategorized";
        const amount = parseFloat(txn.amount);
        if (!breakdown[cat]) breakdown[cat] = 0;
        breakdown[cat] += Math.abs(amount);
        if (incomeCategories.includes(cat) || amount > 0) {
          totalIncome += Math.abs(amount);
        } else {
          totalExpenses += Math.abs(amount);
        }
      }

      const existing = await storage.getMonthlySummary(clientId, parseInt(month), parseInt(year));
      const summaryData = {
        clientId,
        month: parseInt(month),
        year: parseInt(year),
        totalIncome: totalIncome.toFixed(2),
        totalExpenses: totalExpenses.toFixed(2),
        netIncome: (totalIncome - totalExpenses).toFixed(2),
        categoryBreakdown: JSON.stringify(breakdown),
      };

      let summary;
      if (existing) {
        summary = await storage.updateMonthlySummary(existing.id, summaryData);
      } else {
        summary = await storage.createMonthlySummary(summaryData);
      }
      await audit(req, "generated", "monthly_summary", summary?.id, `Generated summary for ${month}/${year}`);
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/bookkeeping/categories", isAuthenticated, isAdmin, async (_req, res) => {
    const cats = await storage.getTransactionCategories();
    res.json(cats);
  });

  app.post("/api/admin/bookkeeping/categories", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const parsed = insertTransactionCategorySchema.parse(req.body);
      const cat = await storage.createTransactionCategory(parsed);
      res.json(cat);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/admin/bookkeeping/categories/:id", isAuthenticated, isAdmin, async (req, res) => {
    const allowed = z.object({ name: z.string().optional(), description: z.string().nullable().optional(), parentCategory: z.string().nullable().optional() }).parse(req.body);
    const cat = await storage.updateTransactionCategory(param(req, "id"), allowed);
    if (!cat) return res.status(404).json({ message: "Category not found" });
    res.json(cat);
  });

  app.delete("/api/admin/bookkeeping/categories/:id", isAuthenticated, isAdmin, async (req, res) => {
    await storage.deleteTransactionCategory(param(req, "id"));
    res.json({ success: true });
  });

  app.get("/api/admin/bookkeeping/preparer-assignments", isAuthenticated, isAdmin, async (req, res) => {
    const { clientId } = req.query;
    if (clientId && typeof clientId === "string") {
      const assignments = await storage.getPreparerAssignmentsByClient(clientId);
      res.json(assignments);
    } else {
      const allPreparers = await db.select().from(users).where(eq(users.role, "preparer"));
      const assignments = [];
      for (const p of allPreparers) {
        const a = await storage.getPreparerAssignments(p.id);
        assignments.push(...a);
      }
      res.json(assignments);
    }
  });

  app.post("/api/admin/bookkeeping/preparer-assignments", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { preparerId, clientId } = req.body;
      if (!preparerId || !clientId) return res.status(400).json({ message: "preparerId and clientId required" });
      const dbUser = (req as any).dbUser;
      const assignment = await storage.createPreparerAssignment({
        preparerId,
        clientId,
        assignedBy: dbUser.id,
      });
      const sub = await storage.getBookkeepingSubscriptionByClient(clientId);
      if (sub) {
        await storage.updateBookkeepingSubscription(sub.id, { preparerId });
      }
      await audit(req, "assigned", "preparer_assignment", assignment.id, `Assigned preparer ${preparerId} to client ${clientId}`);
      res.json(assignment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/bookkeeping/preparer-assignments/:id", isAuthenticated, isAdmin, async (req, res) => {
    const assignment = await db.select().from(preparerAssignments).where(eq(preparerAssignments.id, param(req, "id")));
    if (assignment.length > 0) {
      const sub = await storage.getBookkeepingSubscriptionByClient(assignment[0].clientId);
      if (sub && sub.preparerId === assignment[0].preparerId) {
        await storage.updateBookkeepingSubscription(sub.id, { preparerId: null });
      }
    }
    await storage.deletePreparerAssignment(param(req, "id"));
    await audit(req, "removed", "preparer_assignment", param(req, "id"));
    res.json({ success: true });
  });

  app.get("/api/admin/bookkeeping/preparers", isAuthenticated, isAdmin, async (_req, res) => {
    const preparers = await db.select().from(users).where(eq(users.role, "preparer"));
    res.json(preparers.map(p => ({ id: p.id, username: p.username, firstName: p.firstName, lastName: p.lastName, email: p.email })));
  });

  // ===== CLIENT PORTAL BOOKKEEPING ROUTES =====
  app.get("/api/portal/bookkeeping/subscription", isAuthenticated, isClient, async (req, res) => {
    const clientId = (req as any).clientId;
    const sub = await storage.getBookkeepingSubscriptionByClient(clientId);
    res.json(sub || null);
  });

  app.post("/api/portal/bookkeeping/subscribe", isAuthenticated, isClient, async (req, res) => {
    try {
      const clientId = (req as any).clientId;
      const existing = await storage.getBookkeepingSubscriptionByClient(clientId);
      if (existing && existing.status === "active") {
        return res.status(400).json({ message: "You already have an active bookkeeping subscription" });
      }
      if (existing) {
        const reactivated = await storage.updateBookkeepingSubscription(existing.id, {
          status: "active",
          startDate: new Date(),
          endDate: null,
        });
        await audit(req, "reactivated", "bookkeeping_subscription", existing.id, `Client self-activated bookkeeping subscription`);
        return res.json(reactivated);
      }
      const sub = await storage.createBookkeepingSubscription({
        clientId,
        plan: "standard",
        price: "50.00",
        status: "active",
        startDate: new Date(),
      });
      await audit(req, "created", "bookkeeping_subscription", sub.id, `Client self-activated bookkeeping — $50.00/mo`);
      res.json(sub);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/portal/bookkeeping/transactions", isAuthenticated, isClient, async (req, res) => {
    const clientId = (req as any).clientId;
    const { month, year } = req.query;
    const m = month ? parseInt(month as string) : undefined;
    const y = year ? parseInt(year as string) : undefined;
    const txns = await storage.getBankTransactions(clientId, m, y);
    res.json(txns);
  });

  app.post("/api/portal/bookkeeping/upload-statement", isAuthenticated, isClient, csvUpload.single("file"), async (req, res) => {
    try {
      const clientId = (req as any).clientId;
      const sub = await storage.getBookkeepingSubscriptionByClient(clientId);
      if (!sub || sub.status !== "active") return res.status(403).json({ message: "Active bookkeeping subscription required" });

      const file = req.file;
      if (!file) return res.status(400).json({ message: "CSV file required" });
      const { month, year, bankName, accountLast4 } = req.body;
      if (!month || !year) return res.status(400).json({ message: "month and year required" });

      const csvText = file.buffer.toString("utf-8");
      const transactions = parseCSV(csvText, clientId, parseInt(month), parseInt(year), bankName, accountLast4);
      if (transactions.length === 0) return res.status(400).json({ message: "No valid transactions found" });

      const created = await storage.createBankTransactions(transactions);
      await audit(req, "uploaded", "bank_statement", clientId, `Client uploaded ${created.length} transactions`);
      res.json({ count: created.length, transactions: created });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/portal/bookkeeping/summaries", isAuthenticated, isClient, async (req, res) => {
    const clientId = (req as any).clientId;
    const summaries = await storage.getMonthlySummaries(clientId);
    res.json(summaries);
  });

  // ===== PREPARER PORTAL ROUTES =====
  app.get("/api/preparer/clients", isAuthenticated, isPreparer, async (req, res) => {
    const dbUser = (req as any).dbUser;
    const assignments = await storage.getPreparerAssignments(dbUser.id);
    const clientIds = assignments.map(a => a.clientId);
    if (clientIds.length === 0) return res.json([]);

    const clientList = [];
    for (const cid of clientIds) {
      const client = await storage.getClient(cid);
      if (client) {
        const sub = await storage.getBookkeepingSubscriptionByClient(cid);
        clientList.push({ ...client, bookkeepingSubscription: sub });
      }
    }
    res.json(clientList);
  });

  app.get("/api/preparer/clients/:id/transactions", isAuthenticated, isPreparer, async (req, res) => {
    const dbUser = (req as any).dbUser;
    const clientId = param(req, "id");
    const assignments = await storage.getPreparerAssignments(dbUser.id);
    if (!assignments.some(a => a.clientId === clientId)) {
      return res.status(403).json({ message: "Not assigned to this client" });
    }
    const { month, year } = req.query;
    const m = month ? parseInt(month as string) : undefined;
    const y = year ? parseInt(year as string) : undefined;
    const txns = await storage.getBankTransactions(clientId, m, y);
    res.json(txns);
  });

  app.get("/api/preparer/clients/:id/summaries", isAuthenticated, isPreparer, async (req, res) => {
    const dbUser = (req as any).dbUser;
    const clientId = param(req, "id");
    const assignments = await storage.getPreparerAssignments(dbUser.id);
    if (!assignments.some(a => a.clientId === clientId)) {
      return res.status(403).json({ message: "Not assigned to this client" });
    }
    const summaries = await storage.getMonthlySummaries(clientId);
    res.json(summaries);
  });

  app.patch("/api/preparer/transactions/:id", isAuthenticated, isPreparer, async (req, res) => {
    try {
      const dbUser = (req as any).dbUser;
      const txn = await storage.getBankTransaction(param(req, "id"));
      if (!txn) return res.status(404).json({ message: "Transaction not found" });
      const assignments = await storage.getPreparerAssignments(dbUser.id);
      if (!assignments.some(a => a.clientId === txn.clientId)) {
        return res.status(403).json({ message: "Not assigned to this client" });
      }
      const updated = await storage.updateBankTransaction(txn.id, {
        manualCategory: req.body.manualCategory,
        reviewed: req.body.reviewed,
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== BOOKKEEPING CATEGORIES (public for authenticated) =====
  app.get("/api/bookkeeping/categories", isAuthenticated, async (_req, res) => {
    const cats = await storage.getTransactionCategories();
    res.json(cats);
  });

  return httpServer;
}

function parseCSV(csvText: string, clientId: string, month: number, year: number, bankName?: string, accountLast4?: string) {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  const headers = parseCSVLine(header);

  const dateIdx = headers.findIndex(h => /date|posted|trans/.test(h));
  const descIdx = headers.findIndex(h => /desc|memo|narr|detail|payee|name/.test(h));
  const amountIdx = headers.findIndex(h => /amount|total/.test(h));
  const debitIdx = headers.findIndex(h => /debit|withdrawal|charge/.test(h));
  const creditIdx = headers.findIndex(h => /credit|deposit/.test(h));

  if (dateIdx === -1 || descIdx === -1) return [];

  const transactions: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseCSVLine(line);

    const dateStr = cols[dateIdx]?.trim();
    const desc = cols[descIdx]?.trim();
    if (!dateStr || !desc) continue;

    let amount: number;
    if (amountIdx !== -1 && cols[amountIdx]) {
      amount = parseFloat(cols[amountIdx].replace(/[,$"]/g, ""));
    } else if (debitIdx !== -1 || creditIdx !== -1) {
      const debit = debitIdx !== -1 && cols[debitIdx] ? parseFloat(cols[debitIdx].replace(/[,$"]/g, "")) : 0;
      const credit = creditIdx !== -1 && cols[creditIdx] ? parseFloat(cols[creditIdx].replace(/[,$"]/g, "")) : 0;
      amount = credit > 0 ? credit : -Math.abs(debit);
    } else {
      continue;
    }

    if (isNaN(amount)) continue;

    let transactionDate: Date;
    try {
      transactionDate = new Date(dateStr);
      if (isNaN(transactionDate.getTime())) continue;
    } catch {
      continue;
    }

    transactions.push({
      clientId,
      transactionDate,
      description: desc,
      amount: amount.toFixed(2),
      statementMonth: month,
      statementYear: year,
      bankName: bankName || null,
      accountLast4: accountLast4 || null,
    });
  }

  return transactions;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
