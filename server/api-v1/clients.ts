import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertClientSchema, clients } from "@shared/schema";
import { authenticateApiKey, apiKeyRateLimit, requirePermission } from "../middleware/api-key";
import { sanitizeObject } from "../utils/sanitize";
import { getTenantPlan } from "../middleware/module-gates";
import { getPlanLimits, isWithinLimit } from "@shared/plan-config";
import { db } from "../db";
import { eq, count } from "drizzle-orm";

const router = Router();

router.use(authenticateApiKey);
router.use(apiKeyRateLimit);

router.get("/", requirePermission("read"), async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const status = req.query.status as string | undefined;

    const allClients = await storage.getClients(tenantId);
    const filtered = status ? allClients.filter(c => c.status === status) : allClients;
    const total = filtered.length;
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);

    res.json({
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("API v1 clients list error:", error);
    res.status(500).json({ error: true, message: "Failed to fetch clients" });
  }
});

router.get("/:id", requirePermission("read"), async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const client = await storage.getClient(req.params.id, tenantId);
    if (!client) {
      return res.status(404).json({ error: true, message: "Client not found" });
    }
    res.json({ data: client });
  } catch (error) {
    console.error("API v1 client get error:", error);
    res.status(500).json({ error: true, message: "Failed to fetch client" });
  }
});

router.post("/", requirePermission("write"), async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;

    if (tenantId) {
      const plan = await getTenantPlan(tenantId);
      const limits = getPlanLimits(plan);
      const [clientCount] = await db.select({ count: count() }).from(clients).where(eq(clients.tenantId, tenantId));
      if (!isWithinLimit(Number(clientCount?.count || 0), limits.maxClients)) {
        return res.status(403).json({ error: true, message: "Client limit reached for your plan.", code: "PLAN_LIMIT_REACHED" });
      }
    }

    const sanitizedBody = sanitizeObject(req.body, ["companyName", "contactName", "notes", "address"]);
    const parsed = insertClientSchema.safeParse({ ...sanitizedBody, tenantId });
    if (!parsed.success) {
      return res.status(400).json({ error: true, message: "Validation failed", details: parsed.error.flatten() });
    }

    const client = await storage.createClient(parsed.data);

    await storage.createAuditLog({
      userId: null,
      userName: "API Key",
      action: "created",
      entityType: "client",
      entityId: client.id,
      details: `Created via API: "${client.companyName}"`,
      tenantId,
    });

    res.status(201).json({ data: client });
  } catch (error) {
    console.error("API v1 client create error:", error);
    res.status(500).json({ error: true, message: "Failed to create client" });
  }
});

router.patch("/:id", requirePermission("write"), async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const existing = await storage.getClient(req.params.id, tenantId);
    if (!existing) {
      return res.status(404).json({ error: true, message: "Client not found" });
    }

    const sanitizedBody = sanitizeObject(req.body, ["companyName", "contactName", "notes", "address"]);
    const { tenantId: _, id: _id, ...updateData } = sanitizedBody;
    const updated = await storage.updateClient(req.params.id, updateData, tenantId);

    await storage.createAuditLog({
      userId: null,
      userName: "API Key",
      action: "updated",
      entityType: "client",
      entityId: req.params.id,
      details: `Updated via API`,
      tenantId,
    });

    res.json({ data: updated });
  } catch (error) {
    console.error("API v1 client update error:", error);
    res.status(500).json({ error: true, message: "Failed to update client" });
  }
});

export default router;
