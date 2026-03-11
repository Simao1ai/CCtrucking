import { Router } from "express";
import { storage } from "../storage";
import { insertServiceTicketSchema } from "@shared/schema";
import { authenticateApiKey, apiKeyRateLimit, requirePermission } from "../middleware/api-key";
import { sanitizeObject } from "../utils/sanitize";

const router = Router();

router.use(authenticateApiKey);
router.use(apiKeyRateLimit);

router.get("/", requirePermission("read"), async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const status = req.query.status as string | undefined;
    const clientId = req.query.clientId as string | undefined;

    let allTickets = await storage.getTickets(tenantId);
    if (status) allTickets = allTickets.filter(t => t.status === status);
    if (clientId) allTickets = allTickets.filter(t => t.clientId === clientId);

    const total = allTickets.length;
    const start = (page - 1) * limit;
    const data = allTickets.slice(start, start + limit);

    res.json({
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("API v1 tickets list error:", error);
    res.status(500).json({ error: true, message: "Failed to fetch tickets" });
  }
});

router.get("/:id", requirePermission("read"), async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const ticket = await storage.getTicket(req.params.id, tenantId);
    if (!ticket) {
      return res.status(404).json({ error: true, message: "Ticket not found" });
    }
    res.json({ data: ticket });
  } catch (error) {
    console.error("API v1 ticket get error:", error);
    res.status(500).json({ error: true, message: "Failed to fetch ticket" });
  }
});

router.post("/", requirePermission("write"), async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const sanitizedBody = sanitizeObject(req.body, ["title", "description"]);
    const parsed = insertServiceTicketSchema.safeParse({ ...sanitizedBody, tenantId });
    if (!parsed.success) {
      return res.status(400).json({ error: true, message: "Validation failed", details: parsed.error.flatten() });
    }

    const client = await storage.getClient(parsed.data.clientId, tenantId);
    if (!client) {
      return res.status(400).json({ error: true, message: "Client not found in your tenant" });
    }

    const ticket = await storage.createTicket(parsed.data);

    await storage.createAuditLog({
      userId: null,
      userName: "API Key",
      action: "created",
      entityType: "ticket",
      entityId: ticket.id,
      details: `Created via API: "${ticket.title}"`,
      tenantId,
    });

    res.status(201).json({ data: ticket });
  } catch (error) {
    console.error("API v1 ticket create error:", error);
    res.status(500).json({ error: true, message: "Failed to create ticket" });
  }
});

router.patch("/:id", requirePermission("write"), async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const existing = await storage.getTicket(req.params.id, tenantId);
    if (!existing) {
      return res.status(404).json({ error: true, message: "Ticket not found" });
    }

    const sanitizedBody = sanitizeObject(req.body, ["title", "description"]);
    const { tenantId: _, id: _id, ...updateData } = sanitizedBody;
    const updated = await storage.updateTicket(req.params.id, updateData, tenantId);

    await storage.createAuditLog({
      userId: null,
      userName: "API Key",
      action: "updated",
      entityType: "ticket",
      entityId: req.params.id,
      details: `Updated via API: status=${updateData.status || "unchanged"}`,
      tenantId,
    });

    res.json({ data: updated });
  } catch (error) {
    console.error("API v1 ticket update error:", error);
    res.status(500).json({ error: true, message: "Failed to update ticket" });
  }
});

export default router;
