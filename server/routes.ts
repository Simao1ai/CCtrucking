import express from "express";
import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { sanitizeObject } from "./utils/sanitize";
import {
  insertClientSchema, insertServiceTicketSchema, insertDocumentSchema,
  insertInvoiceSchema, insertChatMessageSchema, insertSignatureRequestSchema,
  insertFormTemplateSchema, insertFilledFormSchema, insertNotarizationSchema,
  insertServiceItemSchema, insertInvoiceLineItemSchema, insertTaxDocumentSchema,
  insertBookkeepingSubscriptionSchema, insertBankTransactionSchema,
  insertTransactionCategorySchema, insertPreparerAssignmentSchema,
  insertTicketRequiredDocumentSchema, insertRecurringTemplateSchema, insertClientRecurringScheduleSchema,
  insertStaffMessageSchema, insertKnowledgeArticleSchema,
  insertCustomFieldDefinitionSchema, insertCustomFieldValueSchema,
  clients, notifications, invoices, invoiceLineItems, serviceItems, taxDocuments,
  bookkeepingSubscriptions, bankTransactions, preparerAssignments,
  ticketRequiredDocuments, recurringTemplates, clientRecurringSchedules, serviceTickets, documents,
  tenantSettings, aiUsageLogs, tenants, tenantBranding, auditLogs, insertTenantSchema
} from "@shared/schema";
import { startInvoiceScheduler } from "./invoice-scheduler";
import { startRecurringScheduler } from "./recurring-scheduler";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { authStorage } from "./replit_integrations/auth/storage";
import { users } from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc, gte, and, like, count, sum, lte } from "drizzle-orm";
import bcrypt from "bcryptjs";
import OpenAI from "openai";
import multer from "multer";
import path from "path";
import fs from "fs";
import { PassThrough } from "stream";
import webpush from "web-push";
import { generateInvoicePDF } from "./invoice-pdf";
import { sendInvoiceEmail } from "./invoice-email";
import { brandingConfig } from "./branding-config";
import { truckingIndustryKnowledge, truckingIndustryGuidance, truckingPortalComplianceTopics } from "./industry-packs/trucking";
import { requireModule, getTenantPlan } from "./middleware/module-gates";
import { isPlatformAdmin } from "./middleware/tenant";
import { getPlanDefinition, getPlanLimits, isWithinLimit, PLAN_DEFINITIONS, type PlanTier } from "@shared/plan-config";
import { checkAiQuota, getAiQuotaStatus } from "./middleware/ai-quota";
async function getTenantCompanyName(tenantId?: string): Promise<string> {
  if (tenantId) {
    const branding = await storage.getTenantBrandingByTenantId(tenantId);
    if (branding?.companyName) return branding.companyName;
  }
  return brandingConfig.companyName;
}

function getIndustryKnowledge(industry?: string | null): { knowledge: string; guidance: string; portalTopics: string } {
  if (industry === "trucking" || !industry) {
    return {
      knowledge: truckingIndustryKnowledge,
      guidance: truckingIndustryGuidance,
      portalTopics: truckingPortalComplianceTopics,
    };
  }
  return { knowledge: "", guidance: "", portalTopics: "" };
}

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

function stripTenantId(body: Record<string, any>): Record<string, any> {
  const { tenantId, ...rest } = body;
  const textFields = ["title", "description", "content", "message", "notes", "name", "documentName", "documentDescription"];
  return sanitizeObject(rest, textFields);
}

const ADMIN_ROLES = ["admin", "owner", "tenant_admin", "tenant_owner", "platform_owner", "platform_admin"];
const OWNER_ROLES = ["owner", "tenant_owner", "platform_owner"];

function isAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  db.select().from(users).where(eq(users.id, userId)).then(([dbUser]) => {
    if (!dbUser || !ADMIN_ROLES.includes(dbUser.role)) {
      return res.status(403).json({ message: "Admin access required" });
    }
    (req as any).dbUser = dbUser;
    (req as any).tenantId = dbUser.tenantId;
    next();
  }).catch(() => res.status(500).json({ message: "Server error" }));
}

function isOwner(req: Request, res: Response, next: NextFunction) {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  db.select().from(users).where(eq(users.id, userId)).then(([dbUser]) => {
    if (!dbUser || !OWNER_ROLES.includes(dbUser.role)) {
      return res.status(403).json({ message: "Owner access required" });
    }
    (req as any).dbUser = dbUser;
    (req as any).tenantId = dbUser.tenantId;
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
    (req as any).tenantId = dbUser.tenantId;
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
    (req as any).tenantId = dbUser.tenantId;
    next();
  }).catch(() => res.status(500).json({ message: "Server error" }));
}

async function audit(req: Request, action: string, entityType: string, entityId?: string, details?: string) {
  try {
    const dbUser = (req as any).dbUser;
    const tenantId = (req as any).tenantId;
    await storage.createAuditLog({
      userId: dbUser?.id || (req.session as any).userId || null,
      userName: dbUser ? (dbUser.firstName && dbUser.lastName ? `${dbUser.firstName} ${dbUser.lastName}` : dbUser.username) : null,
      action,
      entityType,
      entityId: entityId || null,
      details: details || null,
      tenantId,
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

async function notifyUser(userId: string, title: string, message: string, type: string, link?: string, tenantId?: string) {
  try {
    await storage.createNotification({ userId, title, message, type, link: link || null, read: "false", tenantId });
    sendPushToUser(userId, { title, body: message, url: link || "/", tag: type });
  } catch (e) {
    console.error("Failed to create notification:", e);
  }
}

async function notifyAllAdmins(title: string, message: string, type: string, link?: string, tenantId?: string) {
  try {
    const allUsers = await db.select().from(users);
    const admins = allUsers.filter(u => ADMIN_ROLES.includes(u.role) && (!tenantId || u.tenantId === tenantId));
    for (const admin of admins) {
      await notifyUser(admin.id, title, message, type, link, tenantId);
    }
  } catch (e) {
    console.error("Failed to notify admins:", e);
  }
}

async function notifyClientUsers(clientId: string, title: string, message: string, type: string, link?: string, tenantId?: string) {
  try {
    const allUsers = await db.select().from(users);
    const clientUsers = allUsers.filter(u => u.clientId === clientId && (!tenantId || u.tenantId === tenantId));
    for (const user of clientUsers) {
      await notifyUser(user.id, title, message, type, link, tenantId);
    }
  } catch (e) {
    console.error("Failed to notify client users:", e);
  }
}

async function logAiUsage(tenantId: string | undefined, userId: string | undefined, model: string, usage: { prompt_tokens?: number, completion_tokens?: number, total_tokens?: number } | undefined, feature: string) {
  try {
    if (!usage) return;
    await db.insert(aiUsageLogs).values({
      tenantId: tenantId || null,
      userId: userId || null,
      model,
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0,
      feature,
    });
  } catch (err) {
    console.error("[AI Usage] Failed to log usage:", err);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  await setupAuth(app);
  registerAuthRoutes(app);

  const clientsV1Router = (await import("./api-v1/clients")).default;
  const invoicesV1Router = (await import("./api-v1/invoices")).default;
  const ticketsV1Router = (await import("./api-v1/tickets")).default;
  const documentsV1Router = (await import("./api-v1/documents")).default;
  app.use("/api/v1/clients", clientsV1Router);
  app.use("/api/v1/invoices", invoicesV1Router);
  app.use("/api/v1/tickets", ticketsV1Router);
  app.use("/api/v1/documents", documentsV1Router);

  app.get("/api/branding", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (userId) {
        const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
        if (dbUser?.tenantId && dbUser.role !== "platform_owner" && dbUser.role !== "platform_admin") {
          const branding = await storage.getTenantBrandingByTenantId(dbUser.tenantId);
          if (branding) {
            return res.json({
              companyName: branding.companyName || brandingConfig.companyName,
              shortName: branding.companyName || brandingConfig.shortName,
              tagline: branding.tagline || brandingConfig.tagline,
              primaryColor: branding.primaryColor || brandingConfig.primaryColor,
              contactEmail: branding.supportEmail || brandingConfig.contactEmail,
              supportPhone: branding.supportPhone || brandingConfig.supportPhone,
              website: branding.websiteUrl || brandingConfig.website,
              address: branding.address || brandingConfig.address,
              sidebarIconName: branding.sidebarIcon || brandingConfig.sidebarIconName,
              logoUrl: branding.logoUrl || brandingConfig.logoUrl,
            });
          }
        }
      }

      const slug = req.query.slug as string | undefined;
      if (slug) {
        const tenant = await storage.getTenantBySlug(slug);
        if (tenant) {
          const branding = await storage.getTenantBrandingByTenantId(tenant.id);
          if (branding) {
            return res.json({
              companyName: branding.companyName || brandingConfig.companyName,
              shortName: branding.companyName || brandingConfig.shortName,
              tagline: branding.tagline || brandingConfig.tagline,
              primaryColor: branding.primaryColor || brandingConfig.primaryColor,
              contactEmail: branding.supportEmail || brandingConfig.contactEmail,
              supportPhone: branding.supportPhone || brandingConfig.supportPhone,
              website: branding.websiteUrl || brandingConfig.website,
              address: branding.address || brandingConfig.address,
              sidebarIconName: branding.sidebarIcon || brandingConfig.sidebarIconName,
              logoUrl: branding.logoUrl || brandingConfig.logoUrl,
            });
          }
        }
      }

      res.json(brandingConfig);
    } catch (error) {
      console.error("Failed to load branding:", error);
      res.json(brandingConfig);
    }
  });

  app.get("/api/tenant/modules", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any).userId;
      let tenantId = (req as any).tenantId;
      if (!tenantId && userId) {
        const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
        tenantId = dbUser?.tenantId;
      }
      if (!tenantId) {
        return res.json({});
      }
      const settings = await db
        .select()
        .from(tenantSettings)
        .where(and(eq(tenantSettings.tenantId, tenantId), like(tenantSettings.key, 'modules.%')));
      const modules: Record<string, boolean> = {};
      for (const s of settings) {
        const moduleName = s.key.replace('modules.', '');
        modules[moduleName] = s.value === 'true';
      }
      res.json(modules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch module settings" });
    }
  });

  app.get("/api/download/saas-audit", isAuthenticated, isAdmin, async (req: any, res) => {
    const path = require("path");
    const filePath = path.resolve("PHASE_0_SAAS_AUDIT.md");
    res.download(filePath, "PHASE_0_SAAS_AUDIT.md");
  });

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

      const { validatePasswordStrength } = await import("./replit_integrations/auth/routes");
      const pwCheck = validatePasswordStrength(password);
      if (!pwCheck.valid) {
        return res.status(400).json({ message: pwCheck.message, code: "WEAK_PASSWORD" });
      }

      const tenantId = (req as any).tenantId;
      if (tenantId) {
        const plan = await getTenantPlan(tenantId);
        const limits = getPlanLimits(plan);
        const [userCountResult] = await db.select({ count: count() }).from(users).where(eq(users.tenantId, tenantId));
        const userCount = Number(userCountResult?.count || 0);
        if (!isWithinLimit(userCount, limits.maxUsers)) {
          return res.status(403).json({
            message: `User limit reached (${limits.maxUsers} users on ${plan} plan). Upgrade your plan to add more users.`,
            code: "PLAN_LIMIT_REACHED",
            currentPlan: plan,
          });
        }
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
        tenantId: (req as any).tenantId,
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
    const tenantId = (req as any).tenantId;
    const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
    if (!targetUser) return res.status(404).json({ message: "User not found" });
    if (tenantId && targetUser.tenantId !== tenantId) {
      return res.status(403).json({ message: "Cannot modify users outside your tenant" });
    }
    const [updated] = await db.update(users).set({ clientId, role: "client" }).where(eq(users.id, userId)).returning();
    if (!updated) return res.status(404).json({ message: "User not found" });
    const { password: _, ...safeUser } = updated;
    res.json(safeUser);
  });

  app.patch("/api/auth/set-admin", isAuthenticated, isAdmin, async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId required" });
    const tenantId = (req as any).tenantId;
    const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
    if (!targetUser) return res.status(404).json({ message: "User not found" });
    if (tenantId && targetUser.tenantId !== tenantId) {
      return res.status(403).json({ message: "Cannot modify users outside your tenant" });
    }
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
    const tenantId = (req as any).tenantId;
    const [targetUser] = await db.select().from(users).where(eq(users.id, targetId));
    if (!targetUser) return res.status(404).json({ message: "User not found" });
    if (tenantId && targetUser.tenantId !== tenantId) {
      return res.status(403).json({ message: "Cannot modify users outside your tenant" });
    }
    await db.delete(users).where(eq(users.id, targetId));
    res.status(204).send();
  });

  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const allUsers = await db.select().from(users);
    const filtered = tenantId ? allUsers.filter(u => u.tenantId === tenantId) : allUsers;
    const safeUsers = filtered.map(({ password: _, ...u }) => u);
    res.json(safeUsers);
  });

  app.get("/api/admin/api-keys", isAuthenticated, isOwner, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const { apiKeys: apiKeysTable } = await import("@shared/schema");
      const keys = await db.select({
        id: apiKeysTable.id,
        name: apiKeysTable.name,
        keyPrefix: apiKeysTable.keyPrefix,
        permissions: apiKeysTable.permissions,
        lastUsedAt: apiKeysTable.lastUsedAt,
        expiresAt: apiKeysTable.expiresAt,
        revoked: apiKeysTable.revoked,
        createdAt: apiKeysTable.createdAt,
      }).from(apiKeysTable).where(eq(apiKeysTable.tenantId, tenantId));
      res.json(keys);
    } catch (error) {
      console.error("API keys list error:", error);
      res.status(500).json({ message: "Failed to fetch API keys" });
    }
  });

  app.post("/api/admin/api-keys", isAuthenticated, isOwner, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      if (!tenantId) {
        return res.status(400).json({ message: "API keys can only be created within a tenant context" });
      }
      const { name, permissions, expiresAt } = req.body;
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ message: "API key name is required" });
      }

      const { generateApiKey } = await import("./middleware/api-key");
      const { raw, hash, prefix } = generateApiKey();
      const { apiKeys: apiKeysTable } = await import("@shared/schema");

      const [key] = await db.insert(apiKeysTable).values({
        tenantId,
        name: name.trim(),
        keyHash: hash,
        keyPrefix: prefix,
        permissions: permissions || ["read", "write"],
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        revoked: false,
      }).returning();

      await audit(req, "created", "api_key", key.id, `Created API key "${name}"`);

      res.status(201).json({
        id: key.id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        rawKey: raw,
        permissions: key.permissions,
        expiresAt: key.expiresAt,
        createdAt: key.createdAt,
      });
    } catch (error) {
      console.error("API key create error:", error);
      res.status(500).json({ message: "Failed to create API key" });
    }
  });

  app.patch("/api/admin/api-keys/:id/revoke", isAuthenticated, isOwner, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const { apiKeys: apiKeysTable } = await import("@shared/schema");
      const [key] = await db.select().from(apiKeysTable).where(and(eq(apiKeysTable.id, param(req, "id")), eq(apiKeysTable.tenantId, tenantId)));
      if (!key) return res.status(404).json({ message: "API key not found" });

      const [updated] = await db.update(apiKeysTable).set({ revoked: true }).where(eq(apiKeysTable.id, key.id)).returning();
      await audit(req, "revoked", "api_key", key.id, `Revoked API key "${key.name}"`);
      res.json({ message: "API key revoked", id: updated.id });
    } catch (error) {
      console.error("API key revoke error:", error);
      res.status(500).json({ message: "Failed to revoke API key" });
    }
  });

  app.get("/api/clients", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const clientList = await storage.getClients(tenantId);
    res.json(clientList);
  });

  app.get("/api/clients/:id", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const client = await storage.getClient(param(req, "id"), tenantId);
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json(client);
  });

  app.get("/api/clients/:id/summary", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const clientId = param(req, "id");
    const client = await storage.getClient(clientId, tenantId);
    if (!client) return res.status(404).json({ message: "Client not found" });
    const [tickets, documents, invoices, messages, signatures, forms, notarizationRecords] = await Promise.all([
      storage.getTicketsByClient(clientId, tenantId),
      storage.getDocumentsByClient(clientId, tenantId),
      storage.getInvoicesByClient(clientId, tenantId),
      storage.getChatMessages(clientId, tenantId),
      storage.getSignatureRequestsByClient(clientId, tenantId),
      storage.getFilledFormsByClient(clientId, tenantId),
      storage.getNotarizationsByClient(clientId, tenantId),
    ]);
    res.json({ client, tickets, documents, invoices, messages, signatures, forms, notarizations: notarizationRecords });
  });

  app.post("/api/clients", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;

    if (tenantId) {
      const plan = await getTenantPlan(tenantId);
      const limits = getPlanLimits(plan);
      const existingClients = await storage.getClients(tenantId);
      if (!isWithinLimit(existingClients.length, limits.maxClients)) {
        return res.status(403).json({
          message: `Client limit reached (${limits.maxClients} clients on ${plan} plan). Upgrade your plan to add more clients.`,
          code: "PLAN_LIMIT_REACHED",
          currentPlan: plan,
        });
      }
    }

    const parsed = insertClientSchema.safeParse({ ...req.body, tenantId });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const client = await storage.createClient(parsed.data);
    await audit(req, "created", "client", client.id, `Created client "${client.companyName}"`);
    res.status(201).json(client);
  });

  app.patch("/api/clients/:id", isAuthenticated, isAdmin, async (req, res) => {
    const client = await storage.updateClient(param(req, "id"), stripTenantId(req.body));
    if (!client) return res.status(404).json({ message: "Client not found" });
    await audit(req, "updated", "client", client.id, `Updated client "${client.companyName}"`);
    res.json(client);
  });

  app.delete("/api/clients/:id", isAuthenticated, isAdmin, async (req, res) => {
    await audit(req, "deleted", "client", param(req, "id"), `Deleted client`);
    await storage.deleteClient(param(req, "id"));
    res.status(204).send();
  });

  app.get("/api/tickets", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const tickets = await storage.getTickets(tenantId);
    res.json(tickets);
  });

  app.get("/api/tickets/:id", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const ticket = await storage.getTicket(param(req, "id"), tenantId);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    res.json(ticket);
  });

  app.post("/api/tickets", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const sanitizedBody = sanitizeObject(req.body, ["title", "description"]);
    const parsed = insertServiceTicketSchema.safeParse({ ...sanitizedBody, tenantId });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const ticket = await storage.createTicket(parsed.data);
    await audit(req, "created", "ticket", ticket.id, `Created ticket "${ticket.title}" (${ticket.serviceType})`);
    res.status(201).json(ticket);
  });

  const LOCK_EXPIRY_MS = 30 * 60 * 1000;

  function isLockExpired(lockedAt: Date | null): boolean {
    if (!lockedAt) return true;
    return Date.now() - new Date(lockedAt).getTime() > LOCK_EXPIRY_MS;
  }

  app.get("/api/tickets/:id/lock", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const ticket = await storage.getTicket(param(req, "id"), tenantId);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    const locked = ticket.lockedBy && !isLockExpired(ticket.lockedAt);
    res.json({
      locked: !!locked,
      lockedBy: locked ? ticket.lockedBy : null,
      lockedByName: locked ? ticket.lockedByName : null,
      lockedAt: locked ? ticket.lockedAt : null,
    });
  });

  app.post("/api/tickets/:id/claim", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const ticketId = param(req, "id");
    const dbUser = (req as any).dbUser;
    const ticket = await storage.getTicket(ticketId, tenantId);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const currentlyLocked = ticket.lockedBy && !isLockExpired(ticket.lockedAt);
    if (currentlyLocked && ticket.lockedBy !== dbUser.id) {
      return res.status(409).json({
        message: `Ticket is currently being worked on by ${ticket.lockedByName}`,
        lockedBy: ticket.lockedBy,
        lockedByName: ticket.lockedByName,
        lockedAt: ticket.lockedAt,
      });
    }

    const userName = dbUser.firstName && dbUser.lastName ? `${dbUser.firstName} ${dbUser.lastName}` : dbUser.username;
    const updated = await storage.claimTicket(ticketId, dbUser.id, userName);
    await audit(req, "claimed", "ticket", ticketId, `${userName} started working on ticket "${ticket.title}"`);
    res.json(updated);
  });

  app.post("/api/tickets/:id/release", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const ticketId = param(req, "id");
    const dbUser = (req as any).dbUser;
    const ticket = await storage.getTicket(ticketId, tenantId);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const isOwnerOrAdmin = ADMIN_ROLES.includes(dbUser.role);
    if (ticket.lockedBy !== dbUser.id && !isOwnerOrAdmin) {
      return res.status(403).json({ message: "Only the lock holder or an admin can release this ticket" });
    }

    const updated = await storage.releaseTicket(ticketId);
    const userName = dbUser.firstName && dbUser.lastName ? `${dbUser.firstName} ${dbUser.lastName}` : dbUser.username;
    await audit(req, "released", "ticket", ticketId, `${userName} released lock on ticket "${ticket.title}"`);
    res.json(updated);
  });

  app.patch("/api/tickets/:id", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const ticketId = param(req, "id");
    const dbUser = (req as any).dbUser;
    const ticket = await storage.getTicket(ticketId, tenantId);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const currentlyLocked = ticket.lockedBy && !isLockExpired(ticket.lockedAt);
    if (currentlyLocked && ticket.lockedBy !== dbUser.id) {
      return res.status(409).json({
        message: `Ticket is locked by ${ticket.lockedByName}. Release the lock first.`,
      });
    }

    const updated = await storage.updateTicket(ticketId, stripTenantId(req.body));
    if (!updated) return res.status(404).json({ message: "Ticket not found" });
    await audit(req, "updated", "ticket", updated.id, `Updated ticket "${updated.title}" — status: ${updated.status}`);
    res.json(updated);
  });

  app.get("/api/clients/:id/notes", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const notes = await storage.getClientNotes(param(req, "id"), tenantId);
    res.json(notes);
  });

  app.post("/api/clients/:id/notes", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const dbUser = (req as any).dbUser;
    const { content } = req.body;
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ message: "Note content is required" });
    }
    const authorName = dbUser.firstName && dbUser.lastName ? `${dbUser.firstName} ${dbUser.lastName}` : dbUser.username;
    const note = await storage.createClientNote({
      clientId: param(req, "id"),
      authorId: dbUser.id,
      authorName,
      content: content.trim(),
      tenantId,
    });
    await audit(req, "created", "client_note", note.id, `Added note to client ${param(req, "id")}`);
    res.status(201).json(note);
  });

  app.patch("/api/clients/:id/notes/:noteId", isAuthenticated, isAdmin, async (req, res) => {
    const dbUser = (req as any).dbUser;
    const noteId = req.params.noteId;
    const existing = await storage.getClientNote(noteId);
    if (!existing) return res.status(404).json({ message: "Note not found" });
    if (existing.clientId !== param(req, "id")) return res.status(404).json({ message: "Note not found" });
    if (existing.authorId !== dbUser.id && dbUser.role !== "owner") {
      return res.status(403).json({ message: "You can only edit your own notes" });
    }
    const { content } = req.body;
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ message: "Note content is required" });
    }
    const updated = await storage.updateClientNote(noteId, content.trim());
    await audit(req, "updated", "client_note", noteId, `Updated note on client ${param(req, "id")}`);
    res.json(updated);
  });

  app.delete("/api/clients/:id/notes/:noteId", isAuthenticated, isAdmin, async (req, res) => {
    const dbUser = (req as any).dbUser;
    const noteId = req.params.noteId;
    const existing = await storage.getClientNote(noteId);
    if (!existing) return res.status(404).json({ message: "Note not found" });
    if (existing.clientId !== param(req, "id")) return res.status(404).json({ message: "Note not found" });
    if (existing.authorId !== dbUser.id && dbUser.role !== "owner") {
      return res.status(403).json({ message: "You can only delete your own notes" });
    }
    await storage.deleteClientNote(noteId);
    await audit(req, "deleted", "client_note", noteId, `Deleted note from client ${param(req, "id")}`);
    res.json({ success: true });
  });

  app.post("/api/clients/:id/notes/dictate", express.json({ limit: "25mb" }), isAuthenticated, isAdmin, checkAiQuota("note_dictation"), async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const dbUser = (req as any).dbUser;
      const clientId = param(req, "id");
      const client = await storage.getClient(clientId, tenantId);
      if (!client) return res.status(404).json({ message: "Client not found" });

      const { audio } = req.body;
      if (!audio || typeof audio !== "string") {
        return res.status(400).json({ message: "Audio data is required" });
      }

      const audioBuffer = Buffer.from(audio, "base64");

      const { default: OpenAI, toFile } = await import("openai");
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const audioFile = await toFile(audioBuffer, "recording.webm");
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "gpt-4o-mini-transcribe",
      });
      const transcript = transcription.text;

      if (!transcript || !transcript.trim()) {
        return res.status(400).json({ message: "Could not transcribe audio. Please try again." });
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a note-taking assistant for ${await getTenantCompanyName(tenantId)}. An employee just dictated a verbal summary after a phone call or meeting with a client. Your job is to structure their dictation into a clean, professional internal note.

Format the note as:
**Call Summary** — [today's date in Month Day, Year format]
- Key discussion points as bullet points

**Action Items:** (only if mentioned)
- List any follow-up tasks, deadlines, or commitments

Keep it concise and professional. Do not add information that wasn't mentioned. If no action items were mentioned, omit that section.
The client's company name is: ${client.companyName}
Contact name: ${client.contactName}`
          },
          {
            role: "user",
            content: `Here is the employee's verbal dictation to summarize:\n\n"${transcript}"`
          }
        ],
        temperature: 0.3,
      });

      await logAiUsage(tenantId, dbUser?.id, "gpt-4o-mini", completion.usage, "note_dictation");

      const summary = completion.choices[0]?.message?.content || transcript;
      const authorName = dbUser.firstName && dbUser.lastName ? `${dbUser.firstName} ${dbUser.lastName}` : dbUser.username;
      const note = await storage.createClientNote({
        clientId,
        authorId: dbUser.id,
        authorName,
        content: summary,
        tenantId,
      });

      await audit(req, "created", "client_note", note.id, `Dictated note for client ${clientId} (voice-to-text)`);
      res.status(201).json({ note });
    } catch (error: any) {
      console.error("[Dictate] Error:", error.message);
      res.status(500).json({ message: "Failed to process dictation. Please try again." });
    }
  });

  // ===== KNOWLEDGE BASE ROUTES (admin) =====
  app.get("/api/admin/knowledge-base", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const articles = await storage.getKnowledgeArticles(tenantId);
      res.json(articles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch knowledge articles" });
    }
  });

  app.get("/api/admin/knowledge-base/search", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const q = req.query.q as string;
      if (!q || !q.trim()) return res.status(400).json({ message: "Search query is required" });
      const articles = await storage.searchKnowledgeArticles(q.trim(), tenantId);
      res.json(articles);
    } catch (error) {
      res.status(500).json({ message: "Failed to search knowledge articles" });
    }
  });

  app.get("/api/admin/knowledge-base/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const article = await storage.getKnowledgeArticle(param(req, "id"), tenantId);
      if (!article) return res.status(404).json({ message: "Article not found" });
      res.json(article);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch article" });
    }
  });

  app.post("/api/admin/knowledge-base", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const dbUser = (req as any).dbUser;
      if (dbUser.role !== "admin" && dbUser.role !== "owner") {
        return res.status(403).json({ message: "Only admins or owners can create articles" });
      }
      const parsed = insertKnowledgeArticleSchema.safeParse({
        ...req.body,
        createdBy: dbUser.id,
        createdByName: dbUser.firstName && dbUser.lastName ? `${dbUser.firstName} ${dbUser.lastName}` : dbUser.username,
        tenantId,
      });
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const article = await storage.createKnowledgeArticle(parsed.data);
      await audit(req, "created", "knowledge_article", article.id, `Created knowledge article "${article.title}" [${article.category}]`);
      res.status(201).json(article);
    } catch (error) {
      res.status(500).json({ message: "Failed to create article" });
    }
  });

  app.patch("/api/admin/knowledge-base/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const dbUser = (req as any).dbUser;
      if (dbUser.role !== "admin" && dbUser.role !== "owner") {
        return res.status(403).json({ message: "Only admins or owners can update articles" });
      }
      const existing = await storage.getKnowledgeArticle(param(req, "id"), tenantId);
      if (!existing) return res.status(404).json({ message: "Article not found" });
      const { title, content, category, pinned } = req.body;
      const updateData: Record<string, any> = {};
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (category !== undefined) updateData.category = category;
      if (pinned !== undefined) updateData.pinned = pinned;
      const updated = await storage.updateKnowledgeArticle(param(req, "id"), updateData);
      await audit(req, "updated", "knowledge_article", updated!.id, `Updated knowledge article "${updated!.title}"`);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update article" });
    }
  });

  app.delete("/api/admin/knowledge-base/:id", isAuthenticated, isOwner, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const existing = await storage.getKnowledgeArticle(param(req, "id"), tenantId);
      if (!existing) return res.status(404).json({ message: "Article not found" });
      await storage.deleteKnowledgeArticle(param(req, "id"));
      await audit(req, "deleted", "knowledge_article", param(req, "id"), `Deleted knowledge article "${existing.title}"`);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete article" });
    }
  });

  app.get("/api/admin/tenant", isAuthenticated, isOwner, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      if (!tenantId) return res.status(400).json({ message: "No tenant context" });
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });
      res.json(tenant);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tenant" });
    }
  });

  app.patch("/api/admin/tenant", isAuthenticated, isOwner, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      if (!tenantId) return res.status(400).json({ message: "No tenant context" });
      const { name, contactEmail, contactPhone, industry, plan } = req.body;
      const updated = await storage.updateTenant(tenantId, { name, contactEmail, contactPhone, industry, plan });
      if (!updated) return res.status(404).json({ message: "Tenant not found" });
      await audit(req, "updated", "tenant", tenantId, `Updated tenant settings`);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update tenant" });
    }
  });

  app.get("/api/admin/tenant/branding", isAuthenticated, isOwner, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      if (!tenantId) return res.status(400).json({ message: "No tenant context" });
      const branding = await storage.getTenantBrandingByTenantId(tenantId);
      if (!branding) return res.status(404).json({ message: "Branding not found" });
      res.json(branding);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch branding" });
    }
  });

  app.patch("/api/admin/tenant/branding", isAuthenticated, isOwner, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      if (!tenantId) return res.status(400).json({ message: "No tenant context" });
      const updated = await storage.updateTenantBranding(tenantId, stripTenantId(req.body));
      if (!updated) return res.status(404).json({ message: "Branding not found" });
      await audit(req, "updated", "tenant_branding", tenantId, `Updated tenant branding`);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update branding" });
    }
  });

  app.get("/api/admin/tenant/settings", isAuthenticated, isOwner, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      if (!tenantId) return res.status(400).json({ message: "No tenant context" });
      const settings = await storage.getTenantSettings(tenantId);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.patch("/api/admin/tenant/settings", isAuthenticated, isOwner, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      if (!tenantId) return res.status(400).json({ message: "No tenant context" });
      const dbUser = (req as any).dbUser;
      const { key, value, type } = req.body;
      if (!key || value === undefined) return res.status(400).json({ message: "key and value required" });
      const setting = await storage.upsertTenantSetting(tenantId, key, value, type, dbUser?.id);
      await audit(req, "updated", "tenant_setting", tenantId, `Updated setting "${key}"`);
      res.json(setting);
    } catch (error) {
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  app.get("/api/documents", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const docs = await storage.getDocuments(tenantId);
    res.json(docs);
  });

  app.get("/api/documents/:id", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const doc = await storage.getDocument(param(req, "id"), tenantId);
    if (!doc) return res.status(404).json({ message: "Document not found" });
    res.json(doc);
  });

  app.post("/api/documents", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const parsed = insertDocumentSchema.safeParse({ ...req.body, tenantId });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const doc = await storage.createDocument(parsed.data);
    await audit(req, "created", "document", doc.id, `Created document "${doc.name}" (${doc.type})`);
    res.status(201).json(doc);
  });

  app.patch("/api/documents/:id", isAuthenticated, isAdmin, async (req, res) => {
    const doc = await storage.updateDocument(param(req, "id"), stripTenantId(req.body));
    if (!doc) return res.status(404).json({ message: "Document not found" });
    await audit(req, "updated", "document", doc.id, `Updated document "${doc.name}" — status: ${doc.status}`);
    res.json(doc);
  });

  app.get("/api/invoices/next-number", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const allInvoices = await storage.getInvoices(tenantId);
    const year = new Date().getFullYear();
    let maxSeq = 0;
    for (const inv of allInvoices) {
      const matchYear = inv.invoiceNumber.match(/^INV-\d{4}-(\d+)$/i);
      const matchSimple = inv.invoiceNumber.match(/^INV-(\d+)$/i);
      if (matchYear) {
        const seq = parseInt(matchYear[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      } else if (matchSimple) {
        const seq = parseInt(matchSimple[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
    const nextNumber = `INV-${year}-${String(maxSeq + 1).padStart(3, "0")}`;
    res.json({ nextNumber, currentCount: allInvoices.length });
  });

  app.get("/api/invoices", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const invoiceList = await storage.getInvoices(tenantId);
    res.json(invoiceList);
  });

  app.get("/api/invoices/:id", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const invoice = await storage.getInvoice(param(req, "id"), tenantId);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json(invoice);
  });

  app.post("/api/invoices", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    let body = { ...req.body, tenantId };
    if (!body.invoiceNumber || body.invoiceNumber.trim() === "") {
      const allInvoices = await storage.getInvoices(tenantId);
      const year = new Date().getFullYear();
      let maxSeq = 0;
      for (const inv of allInvoices) {
        const matchYear = inv.invoiceNumber.match(/^INV-\d{4}-(\d+)$/i);
        const matchSimple = inv.invoiceNumber.match(/^INV-(\d+)$/i);
        if (matchYear) {
          const seq = parseInt(matchYear[1], 10);
          if (seq > maxSeq) maxSeq = seq;
        } else if (matchSimple) {
          const seq = parseInt(matchSimple[1], 10);
          if (seq > maxSeq) maxSeq = seq;
        }
      }
      body.invoiceNumber = `INV-${year}-${String(maxSeq + 1).padStart(3, "0")}`;
    }
    if (!body.ticketId || body.ticketId === "") body.ticketId = null;
    if (!body.description) body.description = null;
    if (body.dueDate === "") body.dueDate = null;
    if (body.paidDate === "") body.paidDate = null;
    const parsed = insertInvoiceSchema.safeParse(body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const invoice = await storage.createInvoice(parsed.data);
    await audit(req, "created", "invoice", invoice.id, `Created invoice #${invoice.invoiceNumber} — $${invoice.amount}`);
    notifyClientUsers(invoice.clientId, "New Invoice", `Invoice #${invoice.invoiceNumber} for $${invoice.amount} has been created.`, "invoice", "/portal/invoices", tenantId);
    res.status(201).json(invoice);
  });

  app.patch("/api/invoices/:id", isAuthenticated, isAdmin, async (req, res) => {
    const invoice = await storage.updateInvoice(param(req, "id"), stripTenantId(req.body));
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    await audit(req, "updated", "invoice", invoice.id, `Updated invoice #${invoice.invoiceNumber} — status: ${invoice.status}`);
    res.json(invoice);
  });

  app.get("/api/invoices/:id/pdf", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const invoice = await storage.getInvoice(param(req, "id"), tenantId);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      const client = await storage.getClient(invoice.clientId, tenantId);
      if (!client) return res.status(404).json({ message: "Client not found" });
      const lineItems = await storage.getInvoiceLineItems(invoice.id, tenantId);

      const pdfDoc = generateInvoicePDF({
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        createdAt: invoice.createdAt,
        dueDate: invoice.dueDate,
        paidDate: invoice.paidDate,
        description: invoice.description,
        amount: String(invoice.amount),
        client: {
          companyName: client.companyName,
          contactName: client.contactName,
          email: client.email,
          phone: client.phone,
          address: client.address,
          city: client.city,
          state: client.state,
          zipCode: client.zipCode,
        },
        lineItems: lineItems.map(li => ({
          description: li.description,
          quantity: li.quantity,
          unitPrice: String(li.unitPrice),
          amount: String(li.amount),
        })),
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${invoice.invoiceNumber}.pdf"`);
      pdfDoc.pipe(res);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/invoices/:id/send", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const invoice = await storage.getInvoice(param(req, "id"), tenantId);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      const client = await storage.getClient(invoice.clientId, tenantId);
      if (!client) return res.status(404).json({ message: "Client not found" });
      const lineItems = await storage.getInvoiceLineItems(invoice.id, tenantId);

      const pdfDoc = generateInvoicePDF({
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        createdAt: invoice.createdAt,
        dueDate: invoice.dueDate,
        paidDate: invoice.paidDate,
        description: invoice.description,
        amount: String(invoice.amount),
        client: {
          companyName: client.companyName,
          contactName: client.contactName,
          email: client.email,
          phone: client.phone,
          address: client.address,
          city: client.city,
          state: client.state,
          zipCode: client.zipCode,
        },
        lineItems: lineItems.map(li => ({
          description: li.description,
          quantity: li.quantity,
          unitPrice: String(li.unitPrice),
          amount: String(li.amount),
        })),
      });

      const passThrough = new PassThrough();
      pdfDoc.pipe(passThrough);
      const chunks: Buffer[] = [];
      passThrough.on("data", (chunk: Buffer) => chunks.push(chunk));
      await new Promise<void>((resolve, reject) => {
        passThrough.on("end", resolve);
        passThrough.on("error", reject);
        pdfDoc.on("error", reject);
      });
      const pdfBuffer = Buffer.concat(chunks);

      const emailTo = req.body?.email || client?.email;
      if (!emailTo) {
        return res.status(400).json({ message: "No email address found for this client. Please add an email to the client record first." });
      }

      await sendInvoiceEmail({
        to: emailTo,
        clientName: client?.contactName || "Valued Client",
        invoiceNumber: invoice.invoiceNumber,
        amount: String(invoice.amount),
        dueDate: invoice.dueDate ? String(invoice.dueDate) : null,
        pdfBuffer,
      });

      if (invoice.status === "draft") {
        await storage.updateInvoice(invoice.id, { status: "sent" });
      }

      await audit(req, "sent", "invoice", invoice.id, `Emailed invoice #${invoice.invoiceNumber} to ${emailTo}`);
      notifyClientUsers(invoice.clientId, "Invoice Sent", `Invoice #${invoice.invoiceNumber} for $${invoice.amount} has been sent to your email.`, "invoice", "/portal/invoices", tenantId);

      res.json({ message: `Invoice sent to ${emailTo}`, invoiceNumber: invoice.invoiceNumber });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/portal/invoices/:id/pdf", isAuthenticated, isClient, async (req: any, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const invoice = await storage.getInvoice(param(req, "id"), tenantId);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      if (invoice.clientId !== req.clientId) return res.status(403).json({ message: "Access denied" });
      const client = await storage.getClient(invoice.clientId, tenantId);
      if (!client) return res.status(404).json({ message: "Client not found" });
      const lineItems = await storage.getInvoiceLineItems(invoice.id, tenantId);

      const pdfDoc = generateInvoicePDF({
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        createdAt: invoice.createdAt,
        dueDate: invoice.dueDate,
        paidDate: invoice.paidDate,
        description: invoice.description,
        amount: String(invoice.amount),
        client: {
          companyName: client.companyName,
          contactName: client.contactName,
          email: client.email,
          phone: client.phone,
          address: client.address,
          city: client.city,
          state: client.state,
          zipCode: client.zipCode,
        },
        lineItems: lineItems.map(li => ({
          description: li.description,
          quantity: li.quantity,
          unitPrice: String(li.unitPrice),
          amount: String(li.amount),
        })),
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${invoice.invoiceNumber}.pdf"`);
      pdfDoc.pipe(res);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/chats", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const clientList = await storage.getClients(tenantId);
    res.json(clientList);
  });

  app.get("/api/admin/chats/:clientId", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const messages = await storage.getChatMessages(param(req, "clientId"), tenantId);
    res.json(messages);
  });

  app.post("/api/admin/chats/:clientId", isAuthenticated, isAdmin, async (req: any, res) => {
    const tenantId = (req as any).tenantId;
    const dbUser = (req as any).dbUser;
    const parsed = insertChatMessageSchema.safeParse({
      clientId: param(req, "clientId"),
      senderId: dbUser.id,
      senderName: `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim() || 'Admin',
      senderRole: "admin",
      message: req.body.message,
      tenantId,
    });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const msg = await storage.createChatMessage(parsed.data);
    notifyClientUsers(param(req, "clientId"), "New Message", `You have a new message from ${brandingConfig.companyName}.`, "chat", "/portal/chat", tenantId);
    res.status(201).json(msg);
  });

  // ===== STAFF MESSAGING =====
  app.get("/api/admin/staff", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const allUsers = await db.select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        tenantId: users.tenantId,
      }).from(users).where(sql`${users.role} IN ('owner', 'admin')`);
      const filtered = tenantId ? allUsers.filter(u => u.tenantId === tenantId) : allUsers;
      res.json(filtered);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/staff-messages/unread", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const dbUser = req.dbUser;
      const count = await storage.getUnreadStaffMessageCount(dbUser.id, tenantId);
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/staff-messages/:userId", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const dbUser = req.dbUser;
      const otherUserId = req.params.userId;
      await storage.markStaffMessagesRead(dbUser.id, otherUserId);
      const msgs = await storage.getStaffConversation(dbUser.id, otherUserId, tenantId);
      res.json(msgs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/staff-messages/:userId", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const dbUser = req.dbUser;
      const recipientId = req.params.userId;
      const recipientUsers = await db.select().from(users).where(eq(users.id, recipientId));
      const recipient = recipientUsers[0];
      if (!recipient) return res.status(404).json({ message: "Recipient not found" });

      const parsed = insertStaffMessageSchema.safeParse({
        senderId: dbUser.id,
        senderName: `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim() || dbUser.username,
        recipientId,
        recipientName: `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim() || recipient.username,
        message: req.body.message,
        tenantId,
      });
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

      const msg = await storage.createStaffMessage(parsed.data);

      await storage.createNotification({
        userId: recipientId,
        title: "New Staff Message",
        message: `${parsed.data.senderName} sent you a message.`,
        type: "chat",
        link: "/admin/staff-chat",
      });

      res.status(201).json(msg);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/portal/account", isAuthenticated, isClient, async (req: any, res) => {
    const tenantId = (req as any).tenantId;
    const client = await storage.getClient(req.clientId, tenantId);
    if (!client) return res.status(404).json({ message: "Client account not found" });
    res.json(client);
  });

  app.get("/api/portal/tickets", isAuthenticated, isClient, async (req: any, res) => {
    const tenantId = (req as any).tenantId;
    const tickets = await storage.getTicketsByClient(req.clientId, tenantId);
    res.json(tickets);
  });

  app.post("/api/portal/tickets", isAuthenticated, isClient, async (req: any, res) => {
    const tenantId = (req as any).tenantId;
    const parsed = insertServiceTicketSchema.safeParse({
      ...req.body,
      clientId: req.clientId,
      status: "open",
      priority: "medium",
      tenantId,
    });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const ticket = await storage.createTicket(parsed.data);
    const client = await storage.getClient(req.clientId, tenantId);
    notifyAllAdmins("New Service Request", `${client?.companyName || "A client"} submitted a new ${ticket.serviceType} request.`, "ticket", "/admin/tickets", tenantId);
    res.status(201).json(ticket);
  });

  app.get("/api/portal/documents", isAuthenticated, isClient, async (req: any, res) => {
    const tenantId = (req as any).tenantId;
    const docs = await storage.getDocumentsByClient(req.clientId, tenantId);
    res.json(docs);
  });

  app.get("/api/portal/invoices", isAuthenticated, isClient, async (req: any, res) => {
    const tenantId = (req as any).tenantId;
    const invoiceList = await storage.getInvoicesByClient(req.clientId, tenantId);
    res.json(invoiceList);
  });

  app.patch("/api/portal/invoices/:id/approve", isAuthenticated, isClient, async (req: any, res) => {
    const tenantId = (req as any).tenantId;
    const invoiceId = param(req, "id");
    const invoice = await storage.getInvoice(invoiceId, tenantId);
    if (!invoice || invoice.clientId !== req.clientId) return res.status(404).json({ message: "Invoice not found" });
    const updated = await storage.updateInvoice(invoiceId, { status: "approved" });
    notifyAllAdmins("Invoice Approved", `Invoice #${invoice.invoiceNumber} has been approved by the client.`, "invoice", "/admin/invoices", tenantId);
    res.json(updated);
  });

  app.get("/api/portal/chat", isAuthenticated, isClient, async (req: any, res) => {
    const tenantId = (req as any).tenantId;
    const messages = await storage.getChatMessages(req.clientId, tenantId);
    res.json(messages);
  });

  app.post("/api/portal/chat", isAuthenticated, isClient, async (req: any, res) => {
    const dbUser = (req as any).dbUser;
    const tenantId = (req as any).tenantId;
    const parsed = insertChatMessageSchema.safeParse({
      clientId: req.clientId,
      senderId: dbUser.id,
      senderName: `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim() || 'Client',
      senderRole: "client",
      message: req.body.message,
      tenantId,
    });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const msg = await storage.createChatMessage(parsed.data);
    const client = await storage.getClient(req.clientId, tenantId);
    notifyAllAdmins("New Client Message", `New message from ${client?.companyName || "a client"}.`, "chat", "/admin/chat", tenantId);
    const preparerAssignments = await storage.getPreparerAssignmentsByClient(req.clientId, tenantId);
    for (const assignment of preparerAssignments) {
      await storage.createNotification({
        userId: assignment.preparerId,
        title: "New Client Message",
        message: `New message from ${client?.companyName || "your client"}.`,
        type: "message",
        link: `/preparer/client/${req.clientId}`,
        read: "false",
        tenantId,
      });
    }
    res.status(201).json(msg);
  });

  // ===== SIGNATURE REQUEST ROUTES (admin) =====
  app.get("/api/admin/signatures", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const requests = await storage.getSignatureRequests(tenantId);
    res.json(requests);
  });

  app.post("/api/admin/signatures", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const tenantId = (req as any).tenantId;
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
        tenantId,
      });
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const sigReq = await storage.createSignatureRequest(parsed.data);
      notifyClientUsers(sigReq.clientId, "Document to Sign", `"${sigReq.documentName}" needs your signature.`, "signature", "/portal/signatures", tenantId);
      res.status(201).json(sigReq);
    } catch (error) {
      console.error("Create signature request error:", error);
      res.status(500).json({ message: "Failed to create signature request" });
    }
  });

  app.get("/api/admin/signatures/:id", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const sigReq = await storage.getSignatureRequest(param(req, "id"), tenantId);
    if (!sigReq) return res.status(404).json({ message: "Not found" });
    res.json(sigReq);
  });

  app.post("/api/admin/signatures/:id/remind", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const sigReq = await storage.getSignatureRequest(param(req, "id"), tenantId);
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
    const tenantId = (req as any).tenantId;
    const requests = await storage.getSignatureRequestsByClient(req.clientId, tenantId);
    res.json(requests);
  });

  app.get("/api/portal/signatures/:id", isAuthenticated, isClient, async (req: any, res) => {
    const tenantId = (req as any).tenantId;
    const sigReq = await storage.getSignatureRequest(param(req, "id"), tenantId);
    if (!sigReq || sigReq.clientId !== req.clientId) return res.status(404).json({ message: "Not found" });
    res.json(sigReq);
  });

  app.post("/api/portal/signatures/:id/sign", isAuthenticated, isClient, async (req: any, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const sigReq = await storage.getSignatureRequest(param(req, "id"), tenantId);
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
      notifyAllAdmins("Document Signed", `"${sigReq.documentName}" was signed by ${trimmedName}.`, "signature", "/admin/signatures", tenantId);
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
    const tenantId = (req as any).tenantId;
    const count = await storage.getUnreadCountByUser(userId, tenantId);
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

  app.get("/api/admin/form-templates", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const templates = await storage.getFormTemplates(tenantId);
    res.json(templates);
  });

  app.get("/api/admin/form-templates/:id", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const template = await storage.getFormTemplate(param(req, "id"), tenantId);
    if (!template) return res.status(404).json({ message: "Template not found" });
    res.json(template);
  });

  app.post("/api/admin/form-templates", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const parsed = insertFormTemplateSchema.safeParse({ ...req.body, tenantId });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const template = await storage.createFormTemplate(parsed.data);
    await audit(req, "created", "form_template", template.id, `Created form template "${template.name}"`);
    res.status(201).json(template);
  });

  app.patch("/api/admin/form-templates/:id", isAuthenticated, isAdmin, async (req, res) => {
    const template = await storage.updateFormTemplate(param(req, "id"), stripTenantId(req.body));
    if (!template) return res.status(404).json({ message: "Template not found" });
    await audit(req, "updated", "form_template", template.id, `Updated form template "${template.name}"`);
    res.json(template);
  });

  app.delete("/api/admin/form-templates/:id", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const id = param(req, "id");
    const template = await storage.getFormTemplate(id, tenantId);
    await storage.deleteFormTemplate(id);
    await audit(req, "deleted", "form_template", id, `Deleted form template "${template?.name || id}"`);
    res.status(204).send();
  });

  app.get("/api/admin/filled-forms", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const forms = await storage.getFilledForms(tenantId);
    res.json(forms);
  });

  app.get("/api/admin/filled-forms/:id", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const form = await storage.getFilledForm(param(req, "id"), tenantId);
    if (!form) return res.status(404).json({ message: "Form not found" });
    res.json(form);
  });

  app.post("/api/admin/filled-forms", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const parsed = insertFilledFormSchema.safeParse({ ...req.body, tenantId });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const form = await storage.createFilledForm(parsed.data);
    await audit(req, "created", "filled_form", form.id, `Created filled form "${form.name}" for client ${form.clientId}`);
    res.status(201).json(form);
  });

  app.patch("/api/admin/filled-forms/:id", isAuthenticated, isAdmin, async (req, res) => {
    const form = await storage.updateFilledForm(param(req, "id"), stripTenantId(req.body));
    if (!form) return res.status(404).json({ message: "Form not found" });
    await audit(req, "updated", "filled_form", form.id, `Updated filled form "${form.name}" — status: ${form.status}`);
    res.json(form);
  });

  app.post("/api/admin/filled-forms/:id/send-for-signature", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const form = await storage.getFilledForm(param(req, "id"), tenantId);
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
      tenantId,
    });
    await storage.updateFilledForm(form.id, { status: "sent_for_signature", signatureRequestId: sigReq.id });
    await notifyClientUsers(form.clientId, "Document Ready for Signature", `"${form.name}" is ready for your signature.`, "signature", "/portal/signatures", tenantId);
    await audit(req, "sent_for_signature", "filled_form", form.id, `Sent "${form.name}" for signature (sig request ${sigReq.id})`);
    res.json({ signatureRequest: sigReq });
  });

  app.get("/api/admin/notarizations", isAuthenticated, isAdmin, requireModule('notarizations'), async (req, res) => {
    const tenantId = (req as any).tenantId;
    const notarizations = await storage.getNotarizations(tenantId);
    res.json(notarizations);
  });

  app.get("/api/admin/notarizations/:id", isAuthenticated, isAdmin, requireModule('notarizations'), async (req, res) => {
    const tenantId = (req as any).tenantId;
    const n = await storage.getNotarization(param(req, "id"), tenantId);
    if (!n) return res.status(404).json({ message: "Notarization not found" });
    res.json(n);
  });

  app.post("/api/admin/notarizations", isAuthenticated, isAdmin, requireModule('notarizations'), async (req, res) => {
    const tenantId = (req as any).tenantId;
    const parsed = insertNotarizationSchema.safeParse({ ...req.body, tenantId });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const n = await storage.createNotarization(parsed.data);
    await audit(req, "created", "notarization", n.id, `Created notarization "${n.documentName}" for client ${n.clientId}, notary: ${n.notaryName}`);
    res.status(201).json(n);
  });

  app.patch("/api/admin/notarizations/:id", isAuthenticated, isAdmin, requireModule('notarizations'), async (req, res) => {
    const n = await storage.updateNotarization(param(req, "id"), stripTenantId(req.body));
    if (!n) return res.status(404).json({ message: "Notarization not found" });
    await audit(req, "updated", "notarization", n.id, `Updated notarization "${n.documentName}" — status: ${n.status}`);
    res.json(n);
  });

  app.get("/api/admin/audit-logs", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const entityType = req.query.entityType as string;
    if (entityType) {
      const logs = await storage.getAuditLogsByEntity(entityType, undefined, tenantId);
      res.json(logs);
    } else {
      const logs = await storage.getAuditLogs(limit, offset, tenantId);
      res.json(logs);
    }
  });

  // ===== SERVICE ITEMS ROUTES =====
  app.get("/api/admin/service-items", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const items = await storage.getServiceItems(tenantId);
    res.json(items);
  });

  app.get("/api/admin/service-items/:id", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const item = await storage.getServiceItem(param(req, "id"), tenantId);
    if (!item) return res.status(404).json({ message: "Service item not found" });
    res.json(item);
  });

  app.post("/api/admin/service-items", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const parsed = insertServiceItemSchema.safeParse({ ...req.body, tenantId });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const item = await storage.createServiceItem(parsed.data);
    await audit(req, "created", "service_item", item.id, `Created service item "${item.name}" — $${item.defaultPrice}`);
    res.status(201).json(item);
  });

  app.patch("/api/admin/service-items/:id", isAuthenticated, isAdmin, async (req, res) => {
    const item = await storage.updateServiceItem(param(req, "id"), stripTenantId(req.body));
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
    const tenantId = (req as any).tenantId;
    const items = await storage.getInvoiceLineItems(param(req, "id"), tenantId);
    res.json(items);
  });

  app.post("/api/invoices/:id/line-items", isAuthenticated, isAdmin, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const invoiceId = param(req, "id");
    const parsed = insertInvoiceLineItemSchema.safeParse({ ...req.body, invoiceId, tenantId });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const item = await storage.createInvoiceLineItem(parsed.data);
    const allItems = await storage.getInvoiceLineItems(invoiceId, tenantId);
    const total = allItems.reduce((sum, li) => sum + parseFloat(li.amount), 0);
    await storage.updateInvoice(invoiceId, { amount: total.toFixed(2) });
    res.status(201).json(item);
  });

  app.patch("/api/invoice-line-items/:id", isAuthenticated, isAdmin, async (req, res) => {
    const item = await storage.updateInvoiceLineItem(param(req, "id"), stripTenantId(req.body));
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
  app.get("/api/admin/analytics", isAuthenticated, isOwner, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const [allClients, allTickets, allInvoices, allLineItems] = await Promise.all([
        storage.getClients(tenantId),
        storage.getTickets(tenantId),
        storage.getInvoices(tenantId),
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
  app.get("/api/admin/employee-performance", isAuthenticated, isOwner, requireModule('employee_performance'), async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const allUsers = await db.select().from(users);
      const staffUsers = allUsers.filter(u => ADMIN_ROLES.includes(u.role) && (!tenantId || u.tenantId === tenantId));
      const allLogs = await storage.getAuditLogs(50000, 0, tenantId);

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
  app.post("/api/admin/ai-chat", isAuthenticated, isAdmin, checkAiQuota("admin_chat"), async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const { message, history = [] } = req.body;
      if (!message) return res.status(400).json({ message: "Message is required" });

      const [allClients, allTickets, allInvoices, allDocs, allServiceItemsList, knowledgeArticlesList, tenant] = await Promise.all([
        storage.getClients(tenantId),
        storage.getTickets(tenantId),
        storage.getInvoices(tenantId),
        storage.getDocuments(tenantId),
        storage.getServiceItems(tenantId),
        storage.getKnowledgeArticles(tenantId),
        tenantId ? storage.getTenant(tenantId) : Promise.resolve(undefined),
      ]);

      const companyName = await getTenantCompanyName(tenantId);
      const industry = getIndustryKnowledge(tenant?.industry);

      const totalRevenue = allInvoices.filter(i => i.status === "paid").reduce((s, i) => s + parseFloat(i.amount), 0);
      const outstanding = allInvoices.filter(i => ["sent", "overdue"].includes(i.status)).reduce((s, i) => s + parseFloat(i.amount), 0);

      const industrySection = industry.knowledge ? `=== INDUSTRY KNOWLEDGE ===

You are an expert in the following areas and should provide detailed, accurate guidance:

${industry.knowledge}

${industry.guidance}
- Suggest related services from the ${companyName} service catalog when appropriate` : '';

      const systemPrompt = `You are an AI assistant for ${companyName}, a CRM and operations management platform. You serve two key roles:

1. INTERNAL OPERATIONS ASSISTANT — You have access to live business data and can answer questions about clients, invoices, tickets, documents, and revenue.
2. INDUSTRY EXPERT & RESEARCH ASSISTANT — You have deep knowledge of relevant industry regulations, compliance requirements, and business operations. You can help staff research complex regulatory questions.

=== LIVE BUSINESS DATA ===

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

=== INTERNAL KNOWLEDGE BASE ===
Before general industry knowledge, check if we have internal articles that address the question.
${knowledgeArticlesList.map(a => `### ${a.title} [Category: ${a.category}]\n${a.content}`).join('\n\n')}

When answering questions about company processes, ALWAYS check the INTERNAL KNOWLEDGE BASE section first. If a relevant article exists, cite it by title and suggest the employee read it at the Knowledge Base page.

${industrySection}

=== RESEARCH CAPABILITIES ===
When staff ask you to research regulations, find forms, or look up requirements:
- Provide the most detailed answer you can from your knowledge
- Include direct links to official government sources (FMCSA, IRS, state DOT websites)
- When you mention a form or document that could be useful, suggest they can save the information or download the form from the official source and upload it to the Documents section

=== FORMATTING RULES ===
- Use **bold** for important values, names, and statuses
- Format currency amounts as **$X,XXX.XX**
- Use bullet points (- ) for lists
- Use ### headings for sections when answering complex queries
- Include relevant admin portal links using markdown: [Link Text](/admin/path)
  Available links: [View Clients](/admin/clients), [View Tickets](/admin/tickets), [View Invoices](/admin/invoices), [View Documents](/admin/documents), [Service Catalog](/admin/service-items), [Bookkeeping](/admin/bookkeeping), [Analytics](/admin/analytics)
  For specific clients: [Client Name](/admin/clients/CLIENT_ID)
- Include relevant external links to government websites when discussing regulations
- Keep responses concise and well-structured
- Use tables for comparisons when appropriate (plain text aligned)
- If asked to perform an action, describe what should be done and provide a direct link to the relevant page`;

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
        stream_options: { include_usage: true },
        max_completion_tokens: 8192,
      });

      let fullResponse = "";
      let streamUsage: any = undefined;
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
        if ((chunk as any).usage) {
          streamUsage = (chunk as any).usage;
        }
      }

      const dbUser = (req as any).dbUser;
      await logAiUsage(tenantId, dbUser?.id, "gpt-5.2", streamUsage, "admin_chat");

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

  // ===== CLIENT PORTAL AI CHAT =====
  app.post("/api/portal/ai-chat", isAuthenticated, isClient, checkAiQuota("portal_chat"), async (req: any, res) => {
    try {
      const { message, history = [] } = req.body;
      if (!message) return res.status(400).json({ message: "Message is required" });

      const clientId = req.clientId;
      const tenantId = (req as any).tenantId;
      const [client, clientTickets, clientInvoices, clientDocs, knowledgeArticlesList, allServiceItemsList, tenant] = await Promise.all([
        storage.getClient(clientId, tenantId),
        storage.getTicketsByClient(clientId, tenantId),
        storage.getInvoicesByClient(clientId, tenantId),
        storage.getDocumentsByClient(clientId, tenantId),
        storage.getKnowledgeArticles(tenantId),
        storage.getServiceItems(tenantId),
        tenantId ? storage.getTenant(tenantId) : Promise.resolve(undefined),
      ]);

      const companyName = await getTenantCompanyName(tenantId);
      const industry = getIndustryKnowledge(tenant?.industry);

      const totalPaid = clientInvoices.filter(i => i.status === "paid").reduce((s, i) => s + parseFloat(i.amount), 0);
      const totalDue = clientInvoices.filter(i => ["sent", "overdue"].includes(i.status)).reduce((s, i) => s + parseFloat(i.amount), 0);

      const complianceSection = industry.portalTopics ? `3. **Compliance Guidance**: Explain ${industry.portalTopics} in simple terms.` : '';

      const systemPrompt = `You are a helpful AI assistant for ${companyName}. You are speaking directly with a client — ${client?.companyName || 'a valued client'}.

Your role is to help this client understand their services, compliance requirements, and how ${companyName} works. Be friendly, professional, and clear. Avoid technical jargon when possible.

=== CLIENT INFORMATION ===
Company: ${client?.companyName || 'N/A'}
DOT Number: ${client?.dotNumber || 'Not on file'}
MC Number: ${client?.mcNumber || 'Not on file'}
EIN: ${client?.ein || 'Not on file'}

=== YOUR ACTIVE SERVICES ===
${clientTickets.length > 0 ? clientTickets.map(t => `- **${t.title}** (${t.serviceType}) — Status: ${t.status}${t.dueDate ? `, Due: ${new Date(t.dueDate).toLocaleDateString()}` : ''}`).join('\n') : 'No active services at this time.'}

=== YOUR INVOICES ===
- Total Paid: $${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Amount Due: $${totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
${clientInvoices.slice(0, 10).map(i => `- Invoice ${i.invoiceNumber} — $${i.amount} (${i.status})`).join('\n')}

=== YOUR DOCUMENTS ===
${clientDocs.length > 0 ? clientDocs.slice(0, 15).map(d => `- ${d.name} (${d.type}) — ${d.status}`).join('\n') : 'No documents on file.'}

=== AVAILABLE SERVICES ===
${companyName} offers the following:
${allServiceItemsList.map(s => `- **${s.name}** — ${s.description || s.category} ($${s.defaultPrice})`).join('\n')}

=== COMPANY KNOWLEDGE BASE ===
Use these articles to explain our processes and procedures to the client:
${knowledgeArticlesList.filter(a => !["HR & Training"].includes(a.category)).map(a => `### ${a.title} [Category: ${a.category}]\n${a.content}`).join('\n\n')}

=== HOW TO HELP THE CLIENT ===
1. **Service Questions**: Explain what each service type means, what's involved, and the typical timeline. Reference knowledge base articles when available.
2. **Status Updates**: Help them understand what their ticket/invoice/document statuses mean:
   - Tickets: open (just created), in_progress (being worked on), completed (done), blocked (waiting for documents from you)
   - Invoices: draft (not yet sent), sent (payment due), paid (all set), overdue (past due — please pay)
   - Documents: pending (waiting for upload), received (we have it), approved (verified)
${complianceSection}
4. **Portal Navigation**: Help them find things in their portal:
   - [My Services](/portal/services) — view active services
   - [My Invoices](/portal/invoices) — view and pay invoices
   - [My Documents](/portal/documents) — upload and view documents
   - [Messages](/portal/chat) — contact our team directly
   - [Tax Documents](/portal/tax-documents) — upload tax docs and review returns
   - [Bookkeeping](/portal/bookkeeping) — view financial summaries
5. **Escalation**: If the client needs immediate help or has a complex issue, suggest they use the Messages page to contact the ${companyName} team directly.

=== FORMATTING RULES ===
- Use **bold** for important values
- Format currency as **$X,XXX.XX**
- Use bullet points for lists
- Include portal links using markdown: [Link Text](/portal/path)
- Keep responses friendly, concise, and easy to understand
- Never share other clients' data or internal business metrics`;

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
        stream_options: { include_usage: true },
        max_completion_tokens: 4096,
      });

      let portalStreamUsage: any = undefined;
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
        if ((chunk as any).usage) {
          portalStreamUsage = (chunk as any).usage;
        }
      }

      const dbUser = (req as any).dbUser;
      await logAiUsage(tenantId, dbUser?.id, "gpt-5.2", portalStreamUsage, "portal_chat");

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Portal AI chat error:", error);
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
    const tenantId = (req as any).tenantId;
    const invoice = await storage.getInvoice(param(req, "id"), tenantId);
    if (!invoice || invoice.clientId !== req.clientId) return res.status(404).json({ message: "Invoice not found" });
    const items = await storage.getInvoiceLineItems(param(req, "id"), tenantId);
    res.json(items);
  });

  // ===== TAX PREP ROUTES (admin only) =====
  app.get("/api/admin/tax-documents", isAuthenticated, isAdmin, requireModule('tax_preparation'), async (req, res) => {
    const tenantId = (req as any).tenantId;
    const { clientId, taxYear } = req.query;
    let docs;
    if (clientId) {
      docs = await storage.getTaxDocumentsByClient(clientId as string, tenantId);
    } else if (taxYear) {
      docs = await storage.getTaxDocumentsByYear(parseInt(taxYear as string), tenantId);
    } else {
      docs = await storage.getTaxDocuments(tenantId);
    }
    await audit(req, "viewed", "tax_document", "", "Accessed tax documents list");
    res.json(docs);
  });

  app.get("/api/admin/tax-documents/export/csv", isAuthenticated, isAdmin, requireModule('tax_preparation'), async (req, res) => {
    const tenantId = (req as any).tenantId;
    const { clientId: csvClientId, taxYear: csvTaxYear } = req.query;
    let csvDocs;
    if (csvClientId) {
      csvDocs = await storage.getTaxDocumentsByClient(csvClientId as string, tenantId);
    } else if (csvTaxYear) {
      csvDocs = await storage.getTaxDocumentsByYear(parseInt(csvTaxYear as string), tenantId);
    } else {
      csvDocs = await storage.getTaxDocuments(tenantId);
    }

    const allClients = await storage.getClients(tenantId);
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

  app.get("/api/admin/tax-documents/:id", isAuthenticated, isAdmin, requireModule('tax_preparation'), async (req, res) => {
    const tenantId = (req as any).tenantId;
    const doc = await storage.getTaxDocument(param(req, "id"), tenantId);
    if (!doc) return res.status(404).json({ message: "Tax document not found" });
    await audit(req, "viewed", "tax_document", doc.id, `Viewed tax document — ${doc.documentType}`);
    res.json(doc);
  });

  app.post("/api/admin/tax-documents", isAuthenticated, isAdmin, requireModule('tax_preparation'), async (req, res) => {
    const tenantId = (req as any).tenantId;
    const parsed = insertTaxDocumentSchema.safeParse({ ...req.body, tenantId });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const data = { ...parsed.data };
    if (data.ssnLastFour && data.ssnLastFour.length > 4) {
      data.ssnLastFour = data.ssnLastFour.replace(/\D/g, "").slice(-4);
    }
    const doc = await storage.createTaxDocument(data);
    await audit(req, "created", "tax_document", doc.id, `Created tax document — ${doc.documentType} for tax year ${doc.taxYear}`);
    res.status(201).json(doc);
  });

  app.post("/api/admin/tax-documents/upload", isAuthenticated, isAdmin, requireModule('tax_preparation'), (req, res, next) => {
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

      const dbUser = (req as any).dbUser;
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
        uploadedBy: dbUser.id,
        uploadedByRole: dbUser.role,
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

  app.get("/api/admin/tax-documents/:id/download", isAuthenticated, isAdmin, requireModule('tax_preparation'), async (req, res) => {
    const tenantId = (req as any).tenantId;
    const doc = await storage.getTaxDocument(param(req, "id"), tenantId);
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

  app.patch("/api/admin/tax-documents/:id", isAuthenticated, isAdmin, requireModule('tax_preparation'), async (req, res) => {
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
    if (updateData.status && !["pending", "analyzed", "review", "exported", "ready_for_review", "approved", "rejected"].includes(updateData.status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }
    const doc = await storage.updateTaxDocument(param(req, "id"), updateData);
    if (!doc) return res.status(404).json({ message: "Tax document not found" });
    await audit(req, "updated", "tax_document", doc.id, `Updated tax document — ${doc.documentType}`);
    res.json(doc);
  });

  app.delete("/api/admin/tax-documents/:id", isAuthenticated, isAdmin, requireModule('tax_preparation'), async (req, res) => {
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

  app.post("/api/admin/tax-documents/:id/analyze", isAuthenticated, isAdmin, requireModule('tax_preparation'), checkAiQuota("tax_analysis"), async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const doc = await storage.getTaxDocument(param(req, "id"), tenantId);
      if (!doc) return res.status(404).json({ message: "Tax document not found" });

      const client = await storage.getClient(doc.clientId, tenantId);

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const tenantCompanyName = await getTenantCompanyName(tenantId);
      const systemPrompt = `You are a professional tax intake analyst for ${tenantCompanyName}, a U.S.-based tax preparation firm. Your job is to analyze tax document information and extract structured data.

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

      const dbUser = (req as any).dbUser;
      await logAiUsage(tenantId, dbUser?.id, "gpt-5.2", completion.usage, "tax_analysis");

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

  app.get("/api/admin/tax-summary/:clientId", isAuthenticated, isAdmin, requireModule('tax_preparation'), async (req, res) => {
    const tenantId = (req as any).tenantId;
    const clientId = param(req, "clientId");
    const taxYear = req.query.taxYear ? parseInt(req.query.taxYear as string) : new Date().getFullYear();
    const docs = await storage.getTaxDocumentsByClient(clientId, tenantId);
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

  app.get("/api/admin/tax-prep/bookkeeping-summary/:clientId", isAuthenticated, isAdmin, requireModule('bookkeeping'), async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const clientId = param(req, "clientId");
      const taxYear = req.query.taxYear ? parseInt(req.query.taxYear as string) : new Date().getFullYear();

      const sub = await storage.getBookkeepingSubscriptionByClient(clientId, tenantId);
      if (!sub) {
        return res.json({ hasBookkeeping: false });
      }

      const summaries = await storage.getMonthlySummaries(clientId);
      const yearSummaries = summaries.filter(s => s.year === taxYear);

      const transactions = await storage.getBankTransactions(clientId);
      const yearTransactions = transactions.filter(tx => {
        if (tx.statementYear === taxYear) return true;
        if (tx.transactionDate) {
          const d = new Date(tx.transactionDate);
          return d.getFullYear() === taxYear;
        }
        return false;
      });

      const totalIncome = yearSummaries.reduce((s, m) => s + parseFloat(String(m.totalIncome || "0")), 0);
      const totalExpenses = yearSummaries.reduce((s, m) => s + parseFloat(String(m.totalExpenses || "0")), 0);
      const netIncome = yearSummaries.reduce((s, m) => s + parseFloat(String(m.netIncome || "0")), 0);

      const categoryTotals: Record<string, number> = {};
      for (const tx of yearTransactions) {
        const cat = tx.manualCategory || tx.aiCategory || tx.originalCategory || "Uncategorized";
        const amt = Math.abs(parseFloat(String(tx.amount || "0")));
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
      }

      const topCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([name, amount]) => ({ name, amount }));

      const monthlyBreakdown = yearSummaries.map(s => ({
        month: s.month,
        year: s.year,
        income: parseFloat(String(s.totalIncome || "0")),
        expenses: parseFloat(String(s.totalExpenses || "0")),
        net: parseFloat(String(s.netIncome || "0")),
      })).sort((a, b) => a.month - b.month);

      res.json({
        hasBookkeeping: true,
        subscriptionStatus: sub.status,
        taxYear,
        totalIncome,
        totalExpenses,
        netIncome,
        transactionCount: yearTransactions.length,
        monthsCovered: yearSummaries.length,
        topCategories,
        monthlyBreakdown,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
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
  app.get("/api/admin/bookkeeping/subscriptions", isAuthenticated, isAdmin, requireModule('bookkeeping'), async (req, res) => {
    const tenantId = (req as any).tenantId;
    const subs = await storage.getBookkeepingSubscriptions(tenantId);
    res.json(subs);
  });

  app.post("/api/admin/bookkeeping/subscriptions", isAuthenticated, isAdmin, requireModule('bookkeeping'), async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const { clientId } = req.body;
      if (!clientId) return res.status(400).json({ message: "clientId is required" });
      const existing = await storage.getBookkeepingSubscriptionByClient(clientId, tenantId);
      if (existing) return res.status(400).json({ message: "Client already has a bookkeeping subscription" });
      const sub = await storage.createBookkeepingSubscription({
        clientId,
        plan: "standard",
        price: "50.00",
        status: "active",
        startDate: new Date(),
        tenantId,
      });
      await audit(req, "created", "bookkeeping_subscription", sub.id, `Activated bookkeeping for client ${clientId}`);
      res.json(sub);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/bookkeeping/subscriptions/:id", isAuthenticated, isAdmin, requireModule('bookkeeping'), async (req, res) => {
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

  app.get("/api/admin/bookkeeping/transactions", isAuthenticated, isAdmin, requireModule('bookkeeping'), async (req, res) => {
    const tenantId = (req as any).tenantId;
    const { clientId, month, year } = req.query;
    if (!clientId || typeof clientId !== "string") return res.status(400).json({ message: "clientId required" });
    const m = month ? parseInt(month as string) : undefined;
    const y = year ? parseInt(year as string) : undefined;
    const txns = await storage.getBankTransactions(clientId, m, y, tenantId);
    res.json(txns);
  });

  const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
  const receiptUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  }});

  app.post("/api/admin/bookkeeping/upload-statement/:clientId", isAuthenticated, isAdmin, requireModule('bookkeeping'), csvUpload.single("file"), async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
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

  app.patch("/api/admin/bookkeeping/transactions/:id", isAuthenticated, isAdmin, requireModule('bookkeeping'), async (req, res) => {
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

  app.delete("/api/admin/bookkeeping/transactions/:id", isAuthenticated, isAdmin, requireModule('bookkeeping'), async (req, res) => {
    await storage.deleteBankTransaction(param(req, "id"));
    res.json({ success: true });
  });

  app.post("/api/admin/bookkeeping/ai-categorize/:clientId", isAuthenticated, isAdmin, requireModule('bookkeeping'), checkAiQuota("categorization"), async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const clientId = param(req, "clientId");
      const { month, year } = req.body;
      const m = month ? parseInt(month) : undefined;
      const y = year ? parseInt(year) : undefined;
      const txns = await storage.getBankTransactions(clientId, m, y, tenantId);
      const uncategorized = txns.filter(t => !t.aiCategory && !t.manualCategory);
      if (uncategorized.length === 0) return res.json({ message: "All transactions already categorized", count: 0 });

      const categories = await storage.getTransactionCategories(tenantId);
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
              content: `You are a bookkeeper for ${await getTenantCompanyName(tenantId)}. Categorize each transaction into one of these categories: ${categoryNames.join(", ")}. Return a JSON array of objects with "index" (1-based), "category" (exact category name), and "confidence" (0-100). Only return the JSON array, no other text.`
            },
            { role: "user", content: `Categorize these transactions:\n${txnList}` }
          ],
          temperature: 0.1,
        });

        const dbUser = (req as any).dbUser;
        await logAiUsage(tenantId, dbUser?.id, "gpt-4o-mini", completion.usage, "categorization");

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

  app.get("/api/admin/bookkeeping/summaries", isAuthenticated, isAdmin, requireModule('bookkeeping'), async (req, res) => {
    const tenantId = (req as any).tenantId;
    const { clientId } = req.query;
    if (!clientId || typeof clientId !== "string") return res.status(400).json({ message: "clientId required" });
    const summaries = await storage.getMonthlySummaries(clientId, tenantId);
    res.json(summaries);
  });

  app.post("/api/admin/bookkeeping/generate-summary/:clientId", isAuthenticated, isAdmin, requireModule('bookkeeping'), async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const clientId = param(req, "clientId");
      const { month, year } = req.body;
      if (!month || !year) return res.status(400).json({ message: "month and year required" });

      const txns = await storage.getBankTransactions(clientId, parseInt(month), parseInt(year), tenantId);
      const categories = await storage.getTransactionCategories(tenantId);
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

      const existing = await storage.getMonthlySummary(clientId, parseInt(month), parseInt(year), tenantId);
      const summaryData = {
        clientId,
        month: parseInt(month),
        year: parseInt(year),
        totalIncome: totalIncome.toFixed(2),
        totalExpenses: totalExpenses.toFixed(2),
        netIncome: (totalIncome - totalExpenses).toFixed(2),
        categoryBreakdown: JSON.stringify(breakdown),
        tenantId,
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

  app.get("/api/admin/bookkeeping/categories", isAuthenticated, isAdmin, requireModule('bookkeeping'), async (req, res) => {
    const tenantId = (req as any).tenantId;
    const cats = await storage.getTransactionCategories(tenantId);
    res.json(cats);
  });

  app.post("/api/admin/bookkeeping/categories", isAuthenticated, isAdmin, requireModule('bookkeeping'), async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const parsed = insertTransactionCategorySchema.parse({ ...req.body, tenantId });
      const cat = await storage.createTransactionCategory(parsed);
      res.json(cat);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/admin/bookkeeping/categories/:id", isAuthenticated, isAdmin, requireModule('bookkeeping'), async (req, res) => {
    const allowed = z.object({ name: z.string().optional(), description: z.string().nullable().optional(), parentCategory: z.string().nullable().optional() }).parse(req.body);
    const cat = await storage.updateTransactionCategory(param(req, "id"), allowed);
    if (!cat) return res.status(404).json({ message: "Category not found" });
    res.json(cat);
  });

  app.delete("/api/admin/bookkeeping/categories/:id", isAuthenticated, isAdmin, requireModule('bookkeeping'), async (req, res) => {
    await storage.deleteTransactionCategory(param(req, "id"));
    res.json({ success: true });
  });

  app.get("/api/admin/bookkeeping/preparer-assignments", isAuthenticated, isAdmin, requireModule('bookkeeping'), async (req, res) => {
    const tenantId = (req as any).tenantId;
    const { clientId } = req.query;
    if (clientId && typeof clientId === "string") {
      const assignments = await storage.getPreparerAssignmentsByClient(clientId, tenantId);
      res.json(assignments);
    } else {
      const allPreparers = await db.select().from(users).where(eq(users.role, "preparer"));
      const assignments = [];
      for (const p of allPreparers) {
        const a = await storage.getPreparerAssignments(p.id, tenantId);
        assignments.push(...a);
      }
      res.json(assignments);
    }
  });

  app.post("/api/admin/bookkeeping/preparer-assignments", isAuthenticated, isAdmin, requireModule('bookkeeping'), async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const { preparerId, clientId } = req.body;
      if (!preparerId || !clientId) return res.status(400).json({ message: "preparerId and clientId required" });
      const [prepUser] = await db.select().from(users).where(eq(users.id, preparerId));
      if (!prepUser || prepUser.role !== "preparer") return res.status(400).json({ message: "Invalid preparer user" });
      const client = await storage.getClient(clientId, tenantId);
      if (!client) return res.status(400).json({ message: "Client not found" });
      const dbUser = (req as any).dbUser;
      const assignment = await storage.createPreparerAssignment({
        preparerId,
        clientId,
        assignedBy: dbUser.id,
        tenantId,
      });
      const sub = await storage.getBookkeepingSubscriptionByClient(clientId, tenantId);
      if (sub) {
        await storage.updateBookkeepingSubscription(sub.id, { preparerId });
      }
      await audit(req, "assigned", "preparer_assignment", assignment.id, `Assigned preparer ${preparerId} to client ${clientId}`);
      res.json(assignment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/bookkeeping/preparer-assignments/:id", isAuthenticated, isAdmin, requireModule('bookkeeping'), async (req, res) => {
    const tenantId = (req as any).tenantId;
    const assignment = await db.select().from(preparerAssignments).where(eq(preparerAssignments.id, param(req, "id")));
    if (assignment.length > 0) {
      const sub = await storage.getBookkeepingSubscriptionByClient(assignment[0].clientId, tenantId);
      if (sub && sub.preparerId === assignment[0].preparerId) {
        await storage.updateBookkeepingSubscription(sub.id, { preparerId: null });
      }
    }
    await storage.deletePreparerAssignment(param(req, "id"));
    await audit(req, "removed", "preparer_assignment", param(req, "id"));
    res.json({ success: true });
  });

  app.get("/api/admin/bookkeeping/preparers", isAuthenticated, isAdmin, requireModule('bookkeeping'), async (req, res) => {
    const tenantId = (req as any).tenantId;
    const preparers = await db.select().from(users).where(eq(users.role, "preparer"));
    const filtered = tenantId ? preparers.filter(p => p.tenantId === tenantId) : preparers;
    res.json(filtered.map(p => ({ id: p.id, username: p.username, firstName: p.firstName, lastName: p.lastName, email: p.email })));
  });

  // ===== CLIENT PORTAL BOOKKEEPING ROUTES =====
  app.get("/api/portal/bookkeeping/subscription", isAuthenticated, isClient, requireModule('bookkeeping'), async (req, res) => {
    const clientId = (req as any).clientId;
    const tenantId = (req as any).tenantId;
    const sub = await storage.getBookkeepingSubscriptionByClient(clientId, tenantId);
    res.json(sub || null);
  });

  app.post("/api/portal/bookkeeping/subscribe", isAuthenticated, isClient, requireModule('bookkeeping'), async (req, res) => {
    try {
      const clientId = (req as any).clientId;
      const tenantId = (req as any).tenantId;
      const existing = await storage.getBookkeepingSubscriptionByClient(clientId, tenantId);
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
        tenantId,
      });
      await audit(req, "created", "bookkeeping_subscription", sub.id, `Client self-activated bookkeeping — $50.00/mo`);
      res.json(sub);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/portal/bookkeeping/transactions", isAuthenticated, isClient, requireModule('bookkeeping'), async (req, res) => {
    const clientId = (req as any).clientId;
    const tenantId = (req as any).tenantId;
    const { month, year } = req.query;
    const m = month ? parseInt(month as string) : undefined;
    const y = year ? parseInt(year as string) : undefined;
    const txns = await storage.getBankTransactions(clientId, m, y, tenantId);
    res.json(txns);
  });

  app.post("/api/portal/bookkeeping/upload-statement", isAuthenticated, isClient, requireModule('bookkeeping'), csvUpload.single("file"), async (req, res) => {
    try {
      const clientId = (req as any).clientId;
      const tenantId = (req as any).tenantId;
      const sub = await storage.getBookkeepingSubscriptionByClient(clientId, tenantId);
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

  async function analyzeReceiptWithAI(imageBase64: string, mimeType: string, tenantId?: string): Promise<{
    vendor: string; amount: number; date: string; category: string; description: string; confidence: number;
  }> {
    const openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });

    const categories = await storage.getTransactionCategories(tenantId);
    const categoryNames = categories.map(c => c.name).join(", ");
    const companyName = await getTenantCompanyName(tenantId);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a receipt analysis assistant for ${companyName}'s bookkeeping system. Analyze the receipt image and extract the following information. Return ONLY valid JSON with these fields:
- "vendor": string (business/store name)
- "amount": number (total amount paid, positive number)
- "date": string (transaction date in YYYY-MM-DD format)
- "category": string (must be one of: ${categoryNames})
- "description": string (brief description of the purchase, e.g. "Fuel purchase at Pilot Travel Center")
- "confidence": number (0-100, your confidence in the extraction accuracy)

If you cannot read a field clearly, make your best estimate and lower the confidence score. For the category, pick the most appropriate one from the list.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Please analyze this receipt and extract the transaction details." },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        },
      ],
      max_tokens: 500,
    });

    await logAiUsage(tenantId, undefined, "gpt-4o-mini", response.usage, "receipt_analysis");

    const text = response.choices[0]?.message?.content || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse AI response");
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      vendor: String(parsed.vendor || "Unknown"),
      amount: Number(parsed.amount) || 0,
      date: String(parsed.date || new Date().toISOString().split("T")[0]),
      category: String(parsed.category || "Uncategorized"),
      description: String(parsed.description || `${parsed.vendor || "Unknown"} purchase`),
      confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 50)),
    };
  }

  app.post("/api/portal/bookkeeping/upload-receipt", isAuthenticated, isClient, requireModule('bookkeeping'), receiptUpload.single("receipt"), async (req, res) => {
    try {
      const clientId = (req as any).clientId;
      const tenantId = (req as any).tenantId;
      const sub = await storage.getBookkeepingSubscriptionByClient(clientId, tenantId);
      if (!sub || sub.status !== "active") return res.status(403).json({ message: "Active bookkeeping subscription required" });

      const file = req.file;
      if (!file) return res.status(400).json({ message: "Receipt image required" });

      const imageBase64 = file.buffer.toString("base64");

      const quotaStatus = tenantId ? await getAiQuotaStatus(tenantId) : null;
      if (quotaStatus && quotaStatus.quota > 0 && quotaStatus.remaining <= 0) {
        return res.status(429).json({ message: "AI usage limit reached for this billing period" });
      }

      const extracted = await analyzeReceiptWithAI(imageBase64, file.mimetype, tenantId);

      const txDate = new Date(extracted.date);
      if (isNaN(txDate.getTime())) throw new Error("Could not parse date from receipt");

      const transaction = await storage.createBankTransaction({
        clientId,
        transactionDate: txDate,
        description: extracted.description || `${extracted.vendor} purchase`,
        amount: String(-Math.abs(extracted.amount)),
        aiCategory: extracted.category,
        aiConfidence: String(extracted.confidence),
        originalCategory: extracted.category,
        statementMonth: txDate.getMonth() + 1,
        statementYear: txDate.getFullYear(),
        source: "receipt",
        receiptData: JSON.stringify({ vendor: extracted.vendor, rawAmount: extracted.amount, extractedDate: extracted.date, confidence: extracted.confidence }),
      });

      await audit(req, "uploaded", "receipt", clientId, `Receipt scanned: ${extracted.vendor} $${extracted.amount}`);
      res.json({ transaction, extracted });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/bookkeeping/upload-receipt/:clientId", isAuthenticated, isAdmin, requireModule('bookkeeping'), receiptUpload.single("receipt"), async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const clientId = param(req, "clientId");
      const file = req.file;
      if (!file) return res.status(400).json({ message: "Receipt image required" });

      const imageBase64 = file.buffer.toString("base64");

      const quotaStatus2 = tenantId ? await getAiQuotaStatus(tenantId) : null;
      if (quotaStatus2 && quotaStatus2.quota > 0 && quotaStatus2.remaining <= 0) {
        return res.status(429).json({ message: "AI usage limit reached for this billing period" });
      }

      const extracted = await analyzeReceiptWithAI(imageBase64, file.mimetype, tenantId);

      const txDate = new Date(extracted.date);
      if (isNaN(txDate.getTime())) throw new Error("Could not parse date from receipt");

      const transaction = await storage.createBankTransaction({
        clientId,
        tenantId,
        transactionDate: txDate,
        description: extracted.description || `${extracted.vendor} purchase`,
        amount: String(-Math.abs(extracted.amount)),
        aiCategory: extracted.category,
        aiConfidence: String(extracted.confidence),
        originalCategory: extracted.category,
        statementMonth: txDate.getMonth() + 1,
        statementYear: txDate.getFullYear(),
        source: "receipt",
        receiptData: JSON.stringify({ vendor: extracted.vendor, rawAmount: extracted.amount, extractedDate: extracted.date, confidence: extracted.confidence }),
      });

      await audit(req, "uploaded", "receipt", clientId, `Admin receipt scan: ${extracted.vendor} $${extracted.amount}`);
      res.json({ transaction, extracted });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/portal/bookkeeping/summaries", isAuthenticated, isClient, requireModule('bookkeeping'), async (req, res) => {
    const clientId = (req as any).clientId;
    const tenantId = (req as any).tenantId;
    const summaries = await storage.getMonthlySummaries(clientId, tenantId);
    res.json(summaries);
  });

  // ===== CLIENT PORTAL: TAX DOCUMENTS =====
  app.get("/api/portal/tax-documents", isAuthenticated, isClient, requireModule('tax_preparation'), async (req, res) => {
    try {
      const clientId = (req as any).clientId;
      const tenantId = (req as any).tenantId;
      const docs = await storage.getTaxDocumentsByClient(clientId, tenantId);
      res.json(docs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/portal/tax-documents/upload", isAuthenticated, isClient, requireModule('tax_preparation'), (req, res, next) => {
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
      const clientId = (req as any).clientId;
      const dbUser = (req as any).dbUser;
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      const { taxYear, documentType, payerName } = req.body;
      if (!documentType) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "documentType is required" });
      }
      const parsedYear = parseInt(taxYear);
      if (isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 2099) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "taxYear must be a valid year between 2000 and 2099" });
      }

      const doc = await storage.createTaxDocument({
        clientId,
        taxYear: parsedYear,
        documentType,
        payerName: payerName || null,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        filePath: `uploads/tax-documents/${req.file.filename}`,
        fileSize: req.file.size,
        status: "pending",
        uploadedBy: dbUser.id,
        uploadedByRole: "client",
      });

      await audit(req, "created", "tax_document", doc.id, `Client uploaded tax document — ${req.file.originalname}`);
      res.status(201).json(doc);
    } catch (error: any) {
      if (req.file) try { fs.unlinkSync(req.file.path); } catch {}
      res.status(500).json({ message: error.message || "Upload failed" });
    }
  });

  app.get("/api/portal/tax-documents/:id/download", isAuthenticated, isClient, requireModule('tax_preparation'), async (req, res) => {
    try {
      const clientId = (req as any).clientId;
      const tenantId = (req as any).tenantId;
      const doc = await storage.getTaxDocument(param(req, "id"), tenantId);
      if (!doc || doc.clientId !== clientId || !doc.filePath) {
        return res.status(404).json({ message: "File not found" });
      }
      const sanitizedPath = doc.filePath.replace(/^\/+/, "");
      const fullPath = path.resolve(process.cwd(), sanitizedPath);
      if (!fullPath.startsWith(uploadDir) || !fs.existsSync(fullPath)) {
        return res.status(404).json({ message: "File not found on disk" });
      }
      res.download(fullPath, doc.fileName || "document");
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/portal/tax-documents/:id/approve", isAuthenticated, isClient, requireModule('tax_preparation'), async (req, res) => {
    try {
      const clientId = (req as any).clientId;
      const tenantId = (req as any).tenantId;
      const doc = await storage.getTaxDocument(param(req, "id"), tenantId);
      if (!doc || doc.clientId !== clientId) {
        return res.status(404).json({ message: "Document not found" });
      }
      if (doc.status !== "ready_for_review") {
        return res.status(400).json({ message: "Document is not pending review" });
      }
      const updated = await storage.updateTaxDocument(doc.id, {
        status: "approved",
        approvedAt: new Date(),
      });
      await notifyAllAdmins("Tax Return Approved", `Client approved tax document: ${doc.fileName || doc.documentType}`, "document", undefined, tenantId);
      await audit(req, "approved", "tax_document", doc.id, `Client approved tax return: ${doc.fileName}`);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/portal/tax-documents/:id/reject", isAuthenticated, isClient, requireModule('tax_preparation'), async (req, res) => {
    try {
      const clientId = (req as any).clientId;
      const tenantId = (req as any).tenantId;
      const doc = await storage.getTaxDocument(param(req, "id"), tenantId);
      if (!doc || doc.clientId !== clientId) {
        return res.status(404).json({ message: "Document not found" });
      }
      if (doc.status !== "ready_for_review") {
        return res.status(400).json({ message: "Document is not pending review" });
      }
      const { feedback } = req.body;
      if (!feedback || !feedback.trim()) {
        return res.status(400).json({ message: "Feedback is required when rejecting a document" });
      }
      const updated = await storage.updateTaxDocument(doc.id, {
        status: "rejected",
        rejectionFeedback: feedback.trim(),
      });
      await notifyAllAdmins("Tax Return Rejected", `Client rejected tax document: ${doc.fileName || doc.documentType}. Feedback: ${feedback || "No feedback provided"}`, "document", undefined, tenantId);
      await audit(req, "rejected", "tax_document", doc.id, `Client rejected tax return: ${doc.fileName}`);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== PREPARER PORTAL ROUTES =====
  app.get("/api/preparer/clients", isAuthenticated, isPreparer, async (req, res) => {
    const dbUser = (req as any).dbUser;
    const tenantId = (req as any).tenantId;
    const assignments = await storage.getPreparerAssignments(dbUser.id, tenantId);
    const clientIds = assignments.map(a => a.clientId);
    if (clientIds.length === 0) return res.json([]);

    const clientList = [];
    for (const cid of clientIds) {
      const client = await storage.getClient(cid, tenantId);
      if (client) {
        const sub = await storage.getBookkeepingSubscriptionByClient(cid, tenantId);
        clientList.push({ ...client, bookkeepingSubscription: sub });
      }
    }
    res.json(clientList);
  });

  app.get("/api/preparer/clients/:id/transactions", isAuthenticated, isPreparer, async (req, res) => {
    const dbUser = (req as any).dbUser;
    const tenantId = (req as any).tenantId;
    const clientId = param(req, "id");
    const assignments = await storage.getPreparerAssignments(dbUser.id, tenantId);
    if (!assignments.some(a => a.clientId === clientId)) {
      return res.status(403).json({ message: "Not assigned to this client" });
    }
    const { month, year } = req.query;
    const m = month ? parseInt(month as string) : undefined;
    const y = year ? parseInt(year as string) : undefined;
    const txns = await storage.getBankTransactions(clientId, m, y, tenantId);
    res.json(txns);
  });

  app.get("/api/preparer/clients/:id/summaries", isAuthenticated, isPreparer, async (req, res) => {
    const dbUser = (req as any).dbUser;
    const tenantId = (req as any).tenantId;
    const clientId = param(req, "id");
    const assignments = await storage.getPreparerAssignments(dbUser.id, tenantId);
    if (!assignments.some(a => a.clientId === clientId)) {
      return res.status(403).json({ message: "Not assigned to this client" });
    }
    const summaries = await storage.getMonthlySummaries(clientId, tenantId);
    res.json(summaries);
  });

  app.patch("/api/preparer/transactions/:id", isAuthenticated, isPreparer, async (req, res) => {
    try {
      const dbUser = (req as any).dbUser;
      const tenantId = (req as any).tenantId;
      const txn = await storage.getBankTransaction(param(req, "id"), tenantId);
      if (!txn) return res.status(404).json({ message: "Transaction not found" });
      const assignments = await storage.getPreparerAssignments(dbUser.id, tenantId);
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

  // ===== PREPARER: TAX DOCUMENTS =====
  app.get("/api/preparer/clients/:id/tax-documents", isAuthenticated, isPreparer, requireModule('tax_preparation'), async (req, res) => {
    try {
      const dbUser = (req as any).dbUser;
      const tenantId = (req as any).tenantId;
      const clientId = param(req, "id");
      const assignments = await storage.getPreparerAssignments(dbUser.id, tenantId);
      if (!assignments.some(a => a.clientId === clientId)) {
        return res.status(403).json({ message: "Not assigned to this client" });
      }
      const taxYear = req.query.taxYear ? parseInt(req.query.taxYear as string) : undefined;
      let docs = await storage.getTaxDocumentsByClient(clientId, tenantId);
      if (taxYear) docs = docs.filter(d => d.taxYear === taxYear);
      res.json(docs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/preparer/clients/:id/tax-documents/upload", isAuthenticated, isPreparer, requireModule('tax_preparation'), (req, res, next) => {
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
      const dbUser = (req as any).dbUser;
      const tenantId = (req as any).tenantId;
      const clientId = param(req, "id");
      const assignments = await storage.getPreparerAssignments(dbUser.id, tenantId);
      if (!assignments.some(a => a.clientId === clientId)) {
        if (req.file) try { fs.unlinkSync(req.file.path); } catch {}
        return res.status(403).json({ message: "Not assigned to this client" });
      }
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      const { taxYear, documentType, payerName, notes } = req.body;
      if (!documentType) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "documentType is required" });
      }
      const parsedYear = parseInt(taxYear);
      if (isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 2099) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "taxYear must be a valid year between 2000 and 2099" });
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
        uploadedBy: dbUser.id,
        uploadedByRole: "preparer",
        tenantId,
      });

      await audit(req, "created", "tax_document", doc.id, `Preparer uploaded tax document — ${req.file.originalname} (${doc.documentType}) for tax year ${taxYear}`);
      res.status(201).json(doc);
    } catch (error: any) {
      if (req.file) try { fs.unlinkSync(req.file.path); } catch {}
      res.status(500).json({ message: error.message || "Upload failed" });
    }
  });

  app.patch("/api/preparer/clients/:id/tax-documents/:docId/send-for-review", isAuthenticated, isPreparer, requireModule('tax_preparation'), async (req, res) => {
    try {
      const dbUser = (req as any).dbUser;
      const tenantId = (req as any).tenantId;
      const clientId = param(req, "id");
      const docId = req.params.docId;
      const assignments = await storage.getPreparerAssignments(dbUser.id, tenantId);
      if (!assignments.some(a => a.clientId === clientId)) {
        return res.status(403).json({ message: "Not assigned to this client" });
      }
      const doc = await storage.getTaxDocument(docId, tenantId);
      if (!doc || doc.clientId !== clientId) {
        return res.status(404).json({ message: "Document not found" });
      }
      if (!["pending", "analyzed", "rejected"].includes(doc.status)) {
        return res.status(400).json({ message: `Cannot send for review — document is currently "${doc.status}"` });
      }
      const updated = await storage.updateTaxDocument(docId, { status: "ready_for_review" });
      await notifyClientUsers(clientId, "Tax Return Ready", "Your tax return is ready for review", "document", "/portal/tax-documents", tenantId);
      await audit(req, "updated", "tax_document", docId, `Sent tax document for client review`);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== PREPARER: CHAT WITH CLIENT =====
  app.get("/api/preparer/clients/:id/chat", isAuthenticated, isPreparer, async (req, res) => {
    try {
      const dbUser = (req as any).dbUser;
      const tenantId = (req as any).tenantId;
      const clientId = param(req, "id");
      const assignments = await storage.getPreparerAssignments(dbUser.id, tenantId);
      if (!assignments.some(a => a.clientId === clientId)) {
        return res.status(403).json({ message: "Not assigned to this client" });
      }
      const messages = await storage.getChatMessages(clientId, tenantId);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/preparer/clients/:id/chat", isAuthenticated, isPreparer, async (req, res) => {
    try {
      const dbUser = (req as any).dbUser;
      const tenantId = (req as any).tenantId;
      const clientId = param(req, "id");
      const assignments = await storage.getPreparerAssignments(dbUser.id, tenantId);
      if (!assignments.some(a => a.clientId === clientId)) {
        return res.status(403).json({ message: "Not assigned to this client" });
      }
      const { message } = req.body;
      if (!message || !message.trim()) return res.status(400).json({ message: "Message is required" });
      const preparerName = dbUser.firstName && dbUser.lastName
        ? `${dbUser.firstName} ${dbUser.lastName}`
        : dbUser.username;
      const msg = await storage.createChatMessage({
        clientId,
        senderId: dbUser.id,
        senderName: `${preparerName} (Preparer)`,
        senderRole: "admin",
        message: message.trim(),
        tenantId,
      });
      await notifyClientUsers(clientId, "New Message", `New message from your tax preparer`, "message", `/portal/chat`, tenantId);
      const client = await storage.getClient(clientId, tenantId);
      const clientName = client?.companyName || "a client";
      await notifyAllAdmins("Preparer Message", `${preparerName} (Preparer) sent a message to ${clientName}`, "message", `/admin/chat`, tenantId);
      res.status(201).json(msg);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== PREPARER: BOOKKEEPING SUMMARY =====
  app.get("/api/preparer/clients/:id/bookkeeping-summary", isAuthenticated, isPreparer, requireModule('bookkeeping'), async (req, res) => {
    try {
      const dbUser = (req as any).dbUser;
      const tenantId = (req as any).tenantId;
      const clientId = param(req, "id");
      const assignments = await storage.getPreparerAssignments(dbUser.id, tenantId);
      if (!assignments.some(a => a.clientId === clientId)) {
        return res.status(403).json({ message: "Not assigned to this client" });
      }
      const taxYear = req.query.taxYear ? parseInt(req.query.taxYear as string) : new Date().getFullYear();
      const sub = await storage.getBookkeepingSubscriptionByClient(clientId, tenantId);
      if (!sub) return res.json({ hasBookkeeping: false });

      const summaries = await storage.getMonthlySummaries(clientId, tenantId);
      const yearSummaries = summaries.filter(s => s.year === taxYear);

      const transactions = await storage.getBankTransactions(clientId, undefined, undefined, tenantId);
      const yearTransactions = transactions.filter(tx => {
        if (tx.statementYear === taxYear) return true;
        if (tx.transactionDate) {
          const d = new Date(tx.transactionDate);
          return d.getFullYear() === taxYear;
        }
        return false;
      });

      const totalIncome = yearSummaries.reduce((s, m) => s + parseFloat(String(m.totalIncome || "0")), 0);
      const totalExpenses = yearSummaries.reduce((s, m) => s + parseFloat(String(m.totalExpenses || "0")), 0);
      const netIncome = yearSummaries.reduce((s, m) => s + parseFloat(String(m.netIncome || "0")), 0);

      const categoryTotals: Record<string, number> = {};
      for (const tx of yearTransactions) {
        const cat = tx.manualCategory || tx.aiCategory || tx.originalCategory || "Uncategorized";
        const amt = Math.abs(parseFloat(String(tx.amount || "0")));
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
      }

      const topCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([name, amount]) => ({ name, amount }));

      const monthlyBreakdown = yearSummaries.map(s => ({
        month: s.month,
        year: s.year,
        income: parseFloat(String(s.totalIncome || "0")),
        expenses: parseFloat(String(s.totalExpenses || "0")),
        net: parseFloat(String(s.netIncome || "0")),
      })).sort((a, b) => a.month - b.month);

      res.json({
        hasBookkeeping: true,
        subscriptionStatus: sub.status,
        taxYear,
        totalIncome,
        totalExpenses,
        netIncome,
        transactionCount: yearTransactions.length,
        monthsCovered: yearSummaries.length,
        topCategories,
        monthlyBreakdown,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== BOOKKEEPING CATEGORIES (public for authenticated) =====
  app.get("/api/bookkeeping/categories", isAuthenticated, async (req, res) => {
    const tenantId = (req as any).tenantId;
    const cats = await storage.getTransactionCategories(tenantId);
    res.json(cats);
  });

  // ===== TICKET REQUIRED DOCUMENTS =====
  async function recomputeTicketBlockedStatus(ticketId: string) {
    const requiredDocs = await storage.getTicketRequiredDocs(ticketId);
    const ticket = await storage.getTicket(ticketId);
    if (!ticket) return;

    const hasPendingDocs = requiredDocs.some(d => d.status === "pending");

    if (hasPendingDocs && ticket.status !== "blocked" && ticket.status !== "completed") {
      await storage.updateTicket(ticketId, { status: "blocked" });
    } else if (!hasPendingDocs && ticket.status === "blocked") {
      await storage.updateTicket(ticketId, { status: "open" });
    }
  }

  app.get("/api/tickets/:ticketId/required-docs", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const docs = await storage.getTicketRequiredDocs(req.params.ticketId, tenantId);
      res.json(docs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/tickets/:ticketId/required-docs", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const doc = await storage.createTicketRequiredDoc({
        ticketId: req.params.ticketId,
        documentName: req.body.documentName,
        documentType: req.body.documentType,
        status: "pending",
        tenantId,
      });
      await recomputeTicketBlockedStatus(req.params.ticketId);
      await audit(req, "created", "ticket_required_doc", doc.id, `Added required doc "${req.body.documentName}" to ticket`);
      res.json(doc);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/tickets/required-docs/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const doc = await storage.updateTicketRequiredDoc(req.params.id, stripTenantId(req.body));
      if (doc) {
        await recomputeTicketBlockedStatus(doc.ticketId);
      }
      res.json(doc);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/tickets/required-docs/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const allDocs = await db.select().from(ticketRequiredDocuments).where(eq(ticketRequiredDocuments.id, req.params.id));
      const ticketId = allDocs[0]?.ticketId;
      await storage.deleteTicketRequiredDoc(req.params.id);
      if (ticketId) {
        await recomputeTicketBlockedStatus(ticketId);
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== RECURRING TEMPLATES =====
  app.get("/api/admin/recurring-templates", isAuthenticated, isAdmin, requireModule('compliance_scheduling'), async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const templates = await storage.getRecurringTemplates(tenantId);
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/recurring-templates", isAuthenticated, isAdmin, requireModule('compliance_scheduling'), async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const template = await storage.createRecurringTemplate({ ...req.body, tenantId });
      await audit(req, "created", "recurring_template", template.id, `Created recurring template "${template.name}"`);
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/recurring-templates/:id", isAuthenticated, isAdmin, requireModule('compliance_scheduling'), async (req, res) => {
    try {
      const template = await storage.updateRecurringTemplate(req.params.id, stripTenantId(req.body));
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/recurring-templates/:id", isAuthenticated, isAdmin, requireModule('compliance_scheduling'), async (req, res) => {
    try {
      await storage.deleteRecurringTemplate(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== CLIENT RECURRING SCHEDULES =====
  app.get("/api/admin/recurring-schedules", isAuthenticated, isAdmin, requireModule('compliance_scheduling'), async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const clientId = req.query.clientId as string | undefined;
      const schedules = await storage.getClientRecurringSchedules(clientId, tenantId);
      res.json(schedules);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/recurring-schedules", isAuthenticated, isAdmin, requireModule('compliance_scheduling'), async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const schedule = await storage.createClientRecurringSchedule({ ...req.body, tenantId });
      await audit(req, "created", "recurring_schedule", schedule.id, `Assigned recurring schedule to client`);
      res.json(schedule);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/recurring-schedules/:id", isAuthenticated, isAdmin, requireModule('compliance_scheduling'), async (req, res) => {
    try {
      const schedule = await storage.updateClientRecurringSchedule(req.params.id, stripTenantId(req.body));
      res.json(schedule);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/recurring-schedules/:id", isAuthenticated, isAdmin, requireModule('compliance_scheduling'), async (req, res) => {
    try {
      await storage.deleteClientRecurringSchedule(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== ENHANCED ANALYTICS =====
  app.get("/api/admin/analytics/enhanced", isAuthenticated, isOwner, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const now = new Date();

      const allTickets = await storage.getTickets(tenantId);
      const openTickets = allTickets.filter(t => t.status === "open" || t.status === "in_progress" || t.status === "blocked");
      const ticketsDue7 = openTickets.filter(t => t.dueDate && new Date(t.dueDate) <= new Date(now.getTime() + 7 * 86400000) && new Date(t.dueDate) > now);
      const ticketsDue14 = openTickets.filter(t => t.dueDate && new Date(t.dueDate) <= new Date(now.getTime() + 14 * 86400000) && new Date(t.dueDate) > now);
      const ticketsDue30 = openTickets.filter(t => t.dueDate && new Date(t.dueDate) <= new Date(now.getTime() + 30 * 86400000) && new Date(t.dueDate) > now);
      const overdueTickets = openTickets.filter(t => t.dueDate && new Date(t.dueDate) < now);

      const allDocs = await storage.getDocuments(tenantId);
      const pendingDocs = allDocs.filter(d => d.status === "pending");
      const docsByClient: Record<string, number> = {};
      for (const doc of pendingDocs) {
        docsByClient[doc.clientId] = (docsByClient[doc.clientId] || 0) + 1;
      }
      const allClients = await storage.getClients(tenantId);
      const clientMap = Object.fromEntries(allClients.map(c => [c.id, c.companyName]));
      const topDocBlockers = Object.entries(docsByClient)
        .map(([clientId, count]) => ({ clientId, companyName: clientMap[clientId] || "Unknown", pendingCount: count }))
        .sort((a, b) => b.pendingCount - a.pendingCount)
        .slice(0, 10);

      const allInvoices = await storage.getInvoices(tenantId);
      const unpaidInvoices = allInvoices.filter(i => i.status === "sent" || i.status === "overdue" || i.status === "approved");
      let current = 0, days30 = 0, days60 = 0, days90 = 0;
      for (const inv of unpaidInvoices) {
        const age = inv.dueDate ? Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / 86400000) : 0;
        const amt = parseFloat(String(inv.amount));
        if (age <= 0) current += amt;
        else if (age <= 30) days30 += amt;
        else if (age <= 60) days60 += amt;
        else days90 += amt;
      }

      res.json({
        ticketSLA: {
          due7Days: ticketsDue7.length,
          due14Days: ticketsDue14.length,
          due30Days: ticketsDue30.length,
          overdue: overdueTickets.length,
          overdueTickets: overdueTickets.map(t => ({
            id: t.id,
            title: t.title,
            dueDate: t.dueDate,
            clientId: t.clientId,
            companyName: clientMap[t.clientId] || "Unknown",
          })),
        },
        docBlockers: topDocBlockers,
        arAging: {
          current: current.toFixed(2),
          days30: days30.toFixed(2),
          days60: days60.toFixed(2),
          days90Plus: days90.toFixed(2),
          total: (current + days30 + days60 + days90).toFixed(2),
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/custom-field-definitions", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const entityType = req.query.entityType as string | undefined;
      const definitions = await storage.getCustomFieldDefinitions(entityType, tenantId);
      res.json(definitions.filter(d => d.isActive));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/custom-fields", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const entityType = req.query.entityType as string | undefined;
      const definitions = await storage.getCustomFieldDefinitions(entityType, tenantId);
      res.json(definitions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/custom-fields", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const parsed = insertCustomFieldDefinitionSchema.safeParse({ ...req.body, tenantId });
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const definition = await storage.createCustomFieldDefinition(parsed.data);
      await audit(req, "created", "custom_field_definition", definition.id, `Created custom field "${definition.label}"`);
      res.status(201).json(definition);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/custom-fields/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const id = param(req, "id");
      const existing = await storage.getCustomFieldDefinition(id, tenantId);
      if (!existing) return res.status(404).json({ message: "Custom field definition not found" });
      const updated = await storage.updateCustomFieldDefinition(id, stripTenantId(req.body));
      await audit(req, "updated", "custom_field_definition", id, `Updated custom field "${updated?.label}"`);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/custom-fields/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const id = param(req, "id");
      const existing = await storage.getCustomFieldDefinition(id, tenantId);
      if (!existing) return res.status(404).json({ message: "Custom field definition not found" });
      await storage.deleteCustomFieldDefinition(id);
      await audit(req, "deleted", "custom_field_definition", id, `Deleted custom field "${existing.label}"`);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/custom-fields/:entityType/:entityId", isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const entityType = param(req, "entityType");
      const entityId = param(req, "entityId");
      const dbUser = req.dbUser;
      if (dbUser.role === "client") {
        if (entityType !== "client" || String(entityId) !== String(dbUser.clientId)) {
          return res.status(403).json({ message: "Access denied" });
        }
      } else if (dbUser.role === "preparer") {
        if (entityType !== "client") {
          return res.status(403).json({ message: "Access denied" });
        }
        const assignments = await storage.getPreparerAssignments(dbUser.id, tenantId);
        const assignedClientIds = assignments.map((a: any) => String(a.clientId));
        if (!assignedClientIds.includes(String(entityId))) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      const values = await storage.getCustomFieldValues(entityType, entityId, tenantId);
      res.json(values);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/custom-fields/:entityType/:entityId", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const entityType = param(req, "entityType");
      const entityId = param(req, "entityId");
      const { fields } = req.body;
      if (!fields || !Array.isArray(fields)) {
        return res.status(400).json({ message: "fields array is required" });
      }
      const results = [];
      for (const field of fields) {
        const parsed = insertCustomFieldValueSchema.safeParse({
          fieldDefinitionId: field.fieldDefinitionId,
          entityType,
          entityId,
          value: field.value,
          tenantId,
        });
        if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
        const saved = await storage.setCustomFieldValue(parsed.data, tenantId);
        results.push(saved);
      }
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===================== PLATFORM ADMIN ROUTES =====================

  app.get("/api/platform/tenants", isAuthenticated, isPlatformAdmin, async (req, res) => {
    try {
      const allTenants = await storage.getAllTenants();
      const results = await Promise.all(allTenants.map(async (tenant) => {
        const [userResult] = await db.select({ count: count() }).from(users).where(eq(users.tenantId, tenant.id));
        const [clientResult] = await db.select({ count: count() }).from(clients).where(eq(clients.tenantId, tenant.id));
        const [brandingResult] = await db.select().from(tenantBranding).where(eq(tenantBranding.tenantId, tenant.id));
        return {
          ...tenant,
          userCount: Number(userResult?.count || 0),
          clientCount: Number(clientResult?.count || 0),
          branding: brandingResult || null,
        };
      }));
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/platform/tenants/:id", isAuthenticated, isPlatformAdmin, async (req, res) => {
    try {
      const id = param(req, "id");
      const tenant = await storage.getTenant(id);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });
      const branding = await storage.getTenantBrandingByTenantId(id);
      const settings = await storage.getTenantSettings(id);
      const tenantUsers = await db.select().from(users).where(eq(users.tenantId, id));
      const safeUsers = tenantUsers.map(({ password: _, ...u }) => u);
      const [clientResult] = await db.select({ count: count() }).from(clients).where(eq(clients.tenantId, id));
      res.json({
        tenant,
        branding: branding || null,
        settings,
        users: safeUsers,
        clientCount: Number(clientResult?.count || 0),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/platform/tenants/:id", isAuthenticated, isPlatformAdmin, async (req, res) => {
    try {
      const id = param(req, "id");
      const { name, status, plan, contactEmail, contactPhone, industry } = req.body;
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (status !== undefined) updateData.status = status;
      if (plan !== undefined) updateData.plan = plan;
      if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
      if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
      if (industry !== undefined) updateData.industry = industry;
      const updated = await storage.updateTenant(id, updateData);
      if (!updated) return res.status(404).json({ message: "Tenant not found" });
      await audit(req, "updated", "tenant", id, `Updated tenant "${updated.name}"`);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/platform/tenants", isAuthenticated, isPlatformAdmin, async (req, res) => {
    try {
      const { ownerUsername, ownerPassword, ownerEmail, ownerFirstName, ownerLastName, ...tenantData } = req.body;
      const parsed = insertTenantSchema.safeParse(tenantData);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const tenant = await storage.createTenant(parsed.data);
      await db.insert(tenantBranding).values({ tenantId: tenant.id, companyName: tenant.name });
      const plan = tenant.plan || "basic";
      const { getPlanDefinition } = await import("@shared/plan-config");
      const planDef = getPlanDefinition(plan as any);
      const planModules = planDef.features.modules;
      const allModules = [
        "tickets", "invoices", "documents", "chat", "signatures",
        "forms", "notarizations", "tax_prep", "bookkeeping", "knowledge_base",
        "staff_chat", "recurring", "analytics", "ai_chat",
        "compliance_scheduling", "employee_performance",
      ];
      for (const mod of allModules) {
        const enabled = planModules.includes(mod) || ["staff_chat", "recurring", "analytics", "ai_chat"].includes(mod);
        await storage.upsertTenantSetting(tenant.id, `modules.${mod}`, enabled ? "true" : "false", "boolean");
      }

      let ownerUser = null;
      if (ownerUsername && ownerPassword) {
        const existing = await authStorage.getUserByUsername(ownerUsername);
        if (existing) {
          return res.status(400).json({ message: `Username "${ownerUsername}" already exists` });
        }
        const hashedPassword = await bcrypt.hash(ownerPassword, 10);
        ownerUser = await authStorage.createUser({
          username: ownerUsername,
          password: hashedPassword,
          firstName: ownerFirstName || null,
          lastName: ownerLastName || null,
          email: ownerEmail || null,
          role: "tenant_owner",
          clientId: null,
          tenantId: tenant.id,
        });
        await db.update(tenants).set({ ownerUserId: ownerUser.id }).where(eq(tenants.id, tenant.id));
      }

      await audit(req, "created", "tenant", tenant.id, `Created tenant "${tenant.name}"${ownerUser ? ` with owner @${ownerUsername}` : ""}`);
      const { password: _, ...safeOwner } = ownerUser || { password: null };
      res.status(201).json({ ...tenant, ownerUser: ownerUser ? safeOwner : null });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/platform/analytics", isAuthenticated, isPlatformAdmin, async (req, res) => {
    try {
      const tenantStatusBreakdown = await db.select({
        status: tenants.status,
        count: count(),
      }).from(tenants).groupBy(tenants.status);

      const [totalUsersResult] = await db.select({ count: count() }).from(users);
      const [totalClientsResult] = await db.select({ count: count() }).from(clients);
      const [totalRevenueResult] = await db.select({
        total: sum(invoices.amount),
      }).from(invoices).where(eq(invoices.status, "paid"));

      const now = new Date();
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const monthlyRevenue = await db.select({
        month: sql<string>`to_char(${invoices.paidDate}, 'YYYY-MM')`,
        total: sum(invoices.amount),
      }).from(invoices).where(
        and(
          eq(invoices.status, "paid"),
          gte(invoices.paidDate, twelveMonthsAgo)
        )
      ).groupBy(sql`to_char(${invoices.paidDate}, 'YYYY-MM')`).orderBy(sql`to_char(${invoices.paidDate}, 'YYYY-MM')`);

      const perTenantRevenue = await db.select({
        tenantId: invoices.tenantId,
        total: sum(invoices.amount),
      }).from(invoices).where(eq(invoices.status, "paid")).groupBy(invoices.tenantId).orderBy(desc(sum(invoices.amount))).limit(10);

      const perTenantRevenueWithNames = await Promise.all(
        perTenantRevenue.map(async (r) => {
          if (!r.tenantId) return { ...r, tenantName: "Unknown" };
          const t = await storage.getTenant(r.tenantId);
          return { ...r, tenantName: t?.name || "Unknown" };
        })
      );

      res.json({
        tenantStatusBreakdown,
        totalUsers: Number(totalUsersResult?.count || 0),
        totalClients: Number(totalClientsResult?.count || 0),
        totalRevenue: totalRevenueResult?.total || "0",
        monthlyRevenue,
        perTenantRevenue: perTenantRevenueWithNames,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/platform/health", isAuthenticated, isPlatformAdmin, async (req, res) => {
    try {
      const tenantsByStatus = await db.select({
        status: tenants.status,
        count: count(),
      }).from(tenants).groupBy(tenants.status);

      const [clientCount] = await db.select({ count: count() }).from(clients);
      const [ticketCount] = await db.select({ count: count() }).from(serviceTickets);
      const [invoiceCount] = await db.select({ count: count() }).from(invoices);
      const [documentCount] = await db.select({ count: count() }).from(documents);

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [recentAuditCount] = await db.select({ count: count() }).from(auditLogs).where(gte(auditLogs.createdAt, twentyFourHoursAgo));

      res.json({
        tenantsByStatus,
        tableCounts: {
          clients: Number(clientCount?.count || 0),
          tickets: Number(ticketCount?.count || 0),
          invoices: Number(invoiceCount?.count || 0),
          documents: Number(documentCount?.count || 0),
        },
        recentAuditLogCount: Number(recentAuditCount?.count || 0),
        systemUptime: process.uptime(),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/platform/ai-usage", isAuthenticated, isPlatformAdmin, async (req, res) => {
    try {
      const filterTenantId = req.query.tenantId as string | undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const conditions: any[] = [];
      if (filterTenantId) conditions.push(eq(aiUsageLogs.tenantId, filterTenantId));
      if (startDate) conditions.push(gte(aiUsageLogs.createdAt, startDate));
      if (endDate) conditions.push(lte(aiUsageLogs.createdAt, endDate));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db.select({
        totalTokens: sum(aiUsageLogs.totalTokens),
        promptTokens: sum(aiUsageLogs.promptTokens),
        completionTokens: sum(aiUsageLogs.completionTokens),
        count: count(),
      }).from(aiUsageLogs).where(whereClause);

      const perFeature = await db.select({
        feature: aiUsageLogs.feature,
        totalTokens: sum(aiUsageLogs.totalTokens),
        count: count(),
      }).from(aiUsageLogs).where(whereClause).groupBy(aiUsageLogs.feature);

      const perTenant = await db.select({
        tenantId: aiUsageLogs.tenantId,
        totalTokens: sum(aiUsageLogs.totalTokens),
        count: count(),
      }).from(aiUsageLogs).where(whereClause).groupBy(aiUsageLogs.tenantId);

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const dailyConditions: any[] = [gte(aiUsageLogs.createdAt, thirtyDaysAgo)];
      if (filterTenantId) dailyConditions.push(eq(aiUsageLogs.tenantId, filterTenantId));

      const dailyTrend = await db.select({
        date: sql<string>`to_char(${aiUsageLogs.createdAt}, 'YYYY-MM-DD')`,
        totalTokens: sum(aiUsageLogs.totalTokens),
        count: count(),
      }).from(aiUsageLogs).where(and(...dailyConditions))
        .groupBy(sql`to_char(${aiUsageLogs.createdAt}, 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(${aiUsageLogs.createdAt}, 'YYYY-MM-DD')`);

      res.json({
        totals: {
          totalTokens: totalResult?.totalTokens || "0",
          promptTokens: totalResult?.promptTokens || "0",
          completionTokens: totalResult?.completionTokens || "0",
          requestCount: Number(totalResult?.count || 0),
        },
        perFeature,
        perTenant,
        dailyTrend,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/tenant/ai-quota-status", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      let tenantId = (req as any).tenantId;
      if (!tenantId && userId) {
        const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
        tenantId = dbUser?.tenantId;
      }
      if (!tenantId) {
        return res.json({ usage: 0, quota: 0, remaining: 0, percentUsed: 0 });
      }
      const status = await getAiQuotaStatus(tenantId);
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch AI quota status" });
    }
  });

  app.get("/api/tenant/plan-features", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      let tenantId = (req as any).tenantId;
      if (!tenantId && userId) {
        const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
        tenantId = dbUser?.tenantId;
      }
      if (!tenantId) {
        return res.json({ plan: "basic", features: getPlanDefinition("basic").features, limits: getPlanLimits("basic") });
      }
      const plan = await getTenantPlan(tenantId);
      const definition = getPlanDefinition(plan);
      res.json({
        plan,
        name: definition.name,
        features: definition.features,
        limits: definition.limits,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch plan features" });
    }
  });

  app.get("/api/tenant/usage", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      let tenantId = (req as any).tenantId;
      if (!tenantId && userId) {
        const [dbUser] = await db.select().from(users).where(eq(users.id, userId));
        tenantId = dbUser?.tenantId;
      }
      if (!tenantId) {
        return res.json({ plan: "basic", clientCount: 0, clientLimit: 50, userCount: 0, userLimit: 5, aiTokensUsed: 0, aiTokenLimit: 100000 });
      }

      const plan = await getTenantPlan(tenantId);
      const limits = getPlanLimits(plan);

      const existingClients = await storage.getClients(tenantId);
      const [userCountResult] = await db.select({ count: count() }).from(users).where(eq(users.tenantId, tenantId));
      const aiQuota = await getAiQuotaStatus(tenantId);

      res.json({
        plan,
        planName: getPlanDefinition(plan).name,
        clientCount: existingClients.length,
        clientLimit: limits.maxClients,
        userCount: Number(userCountResult?.count || 0),
        userLimit: limits.maxUsers,
        aiTokensUsed: aiQuota.usage,
        aiTokenLimit: aiQuota.quota,
        aiPercentUsed: aiQuota.percentUsed,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch usage data" });
    }
  });

  app.get("/api/tenant/plans", isAuthenticated, async (req, res) => {
    res.json(PLAN_DEFINITIONS);
  });

  app.get("/api/tenant/onboarding", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      if (!tenantId) return res.json({ steps: [], completed: false });

      const existingClients = await storage.getClients(tenantId);
      const [userCountResult] = await db.select({ count: count() }).from(users).where(eq(users.tenantId, tenantId));
      const tenantTickets = await storage.getTickets(tenantId);
      const tenantInvoices = await storage.getInvoices(tenantId);
      const branding = await storage.getTenantBrandingByTenantId(tenantId);

      const brandingConfigured = !!(branding && branding.companyName && branding.primaryColor);
      const firstClientAdded = existingClients.length > 0;
      const userInvited = Number(userCountResult?.count || 0) > 1;
      const firstTicketCreated = tenantTickets.length > 0;
      const firstInvoiceSent = tenantInvoices.some(inv => inv.status !== "draft");

      const steps = [
        { id: "branding", label: "Configure your company branding", completed: brandingConfigured, link: "/admin/tenant-settings" },
        { id: "client", label: "Add your first client", completed: firstClientAdded, link: "/admin/clients" },
        { id: "user", label: "Invite a team member", completed: userInvited, link: "/admin/users" },
        { id: "ticket", label: "Create a service ticket", completed: firstTicketCreated, link: "/admin/tickets" },
        { id: "invoice", label: "Send your first invoice", completed: firstInvoiceSent, link: "/admin/invoices" },
      ];

      const allCompleted = steps.every(s => s.completed);
      if (allCompleted) {
        await db.update(tenants).set({ onboardingCompleted: true }).where(eq(tenants.id, tenantId));
      }

      res.json({ steps, completed: allCompleted, completedCount: steps.filter(s => s.completed).length, totalSteps: steps.length });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch onboarding status" });
    }
  });

  app.post("/api/admin/clients/import", isAuthenticated, isAdmin, express.json({ limit: "10mb" }), async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const { rows } = req.body;
      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ message: "No rows provided" });
      }

      if (tenantId) {
        const plan = await getTenantPlan(tenantId);
        const limits = getPlanLimits(plan);
        const existingClients = await storage.getClients(tenantId);
        const remainingCapacity = limits.maxClients === -1 ? Infinity : limits.maxClients - existingClients.length;
        if (rows.length > remainingCapacity) {
          return res.status(403).json({
            message: `Cannot import ${rows.length} clients. Only ${remainingCapacity} slots remaining on your ${plan} plan (${existingClients.length}/${limits.maxClients} used).`,
            code: "PLAN_LIMIT_REACHED",
          });
        }
      }

      const results: { row: number; status: string; error?: string; clientId?: string }[] = [];
      let successCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          if (!row.companyName || !row.contactName || !row.email || !row.phone) {
            results.push({ row: i + 1, status: "error", error: "Missing required fields (companyName, contactName, email, phone)" });
            continue;
          }
          const clientData = {
            companyName: row.companyName,
            contactName: row.contactName,
            email: row.email,
            phone: row.phone,
            address: row.address || null,
            city: row.city || null,
            state: row.state || null,
            zipCode: row.zipCode || null,
            dotNumber: row.dotNumber || null,
            mcNumber: row.mcNumber || null,
            einNumber: row.einNumber || null,
            status: row.status || "active",
            notes: row.notes || null,
            tenantId,
          };
          const parsed = insertClientSchema.safeParse(clientData);
          if (!parsed.success) {
            results.push({ row: i + 1, status: "error", error: parsed.error.errors.map(e => e.message).join(", ") });
            continue;
          }
          const client = await storage.createClient(parsed.data);
          results.push({ row: i + 1, status: "success", clientId: client.id });
          successCount++;
        } catch (err: any) {
          results.push({ row: i + 1, status: "error", error: err.message });
        }
      }

      await audit(req, "imported", "client", "", `Imported ${successCount}/${rows.length} clients via CSV`);
      res.json({ totalRows: rows.length, successCount, errorCount: rows.length - successCount, results });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/clients/export/csv", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const allClients = await storage.getClients(tenantId);
      const headers = ["companyName", "contactName", "email", "phone", "address", "city", "state", "zipCode", "dotNumber", "mcNumber", "einNumber", "status", "notes"];
      const csvRows = [headers.join(",")];
      for (const client of allClients) {
        const row = headers.map(h => {
          const val = (client as any)[h] || "";
          return `"${String(val).replace(/"/g, '""')}"`;
        });
        csvRows.push(row.join(","));
      }
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=clients-export-${new Date().toISOString().split("T")[0]}.csv`);
      res.send(csvRows.join("\n"));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/platform/impersonate/:tenantId", isAuthenticated, async (req, res) => {
    try {
      const currentUserId = (req.session as any).userId;
      const [dbUser] = await db.select().from(users).where(eq(users.id, currentUserId));
      if (!dbUser) return res.status(401).json({ message: "User not found" });

      const PLATFORM_ROLES = ["platform_owner", "platform_admin"];
      if (!PLATFORM_ROLES.includes(dbUser.role)) {
        return res.status(403).json({ message: "Platform admin access required" });
      }

      const targetTenantId = param(req, "tenantId");
      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, targetTenantId));
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });

      let targetUser = null;

      if (tenant.ownerUserId) {
        const [ownerUser] = await db.select().from(users).where(eq(users.id, tenant.ownerUserId));
        if (ownerUser) targetUser = ownerUser;
      }

      if (!targetUser) {
        const tenantUsers = await db.select().from(users).where(eq(users.tenantId, targetTenantId));
        targetUser = tenantUsers.find(u => u.role === "owner") ||
                     tenantUsers.find(u => u.role === "tenant_owner") ||
                     tenantUsers.find(u => u.role === "admin") ||
                     tenantUsers.find(u => u.role === "tenant_admin") ||
                     null;
      }

      if (!targetUser) {
        return res.status(404).json({ message: "No owner or admin user found in target tenant" });
      }

      (req.session as any).impersonation = {
        originalUserId: currentUserId,
        originalRole: dbUser.role,
        targetTenantId,
        startedAt: new Date(),
      };
      (req.session as any).userId = targetUser.id;

      (req as any).dbUser = dbUser;
      (req as any).tenantId = dbUser.tenantId;
      await audit(req, "impersonate", "tenant", targetTenantId, `Platform admin started impersonation of tenant "${tenant.name}" via impersonation`);

      res.json({ success: true, tenantId: targetTenantId, userId: targetUser.id });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/platform/stop-impersonation", isAuthenticated, async (req, res) => {
    try {
      const impersonation = (req.session as any).impersonation;
      if (!impersonation) {
        return res.status(400).json({ message: "Not currently impersonating" });
      }

      const originalUserId = impersonation.originalUserId;
      (req.session as any).userId = originalUserId;
      delete (req.session as any).impersonation;

      const [dbUser] = await db.select().from(users).where(eq(users.id, originalUserId));
      (req as any).dbUser = dbUser;
      (req as any).tenantId = dbUser?.tenantId;
      await audit(req, "stop_impersonate", "tenant", impersonation.targetTenantId, "Platform admin stopped impersonation via impersonation");

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/platform/impersonation-status", isAuthenticated, async (req, res) => {
    try {
      const impersonation = (req.session as any).impersonation;
      if (!impersonation) {
        return res.json({ impersonating: false });
      }

      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, impersonation.targetTenantId));
      res.json({
        impersonating: true,
        tenantId: impersonation.targetTenantId,
        tenantName: tenant?.name || "Unknown",
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Start background schedulers
  startInvoiceScheduler();
  startRecurringScheduler();

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
