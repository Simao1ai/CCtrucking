import { Router } from "express";
import { storage } from "../storage";
import { insertInvoiceSchema } from "@shared/schema";
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

    let allInvoices = await storage.getInvoices(tenantId);
    if (status) allInvoices = allInvoices.filter(i => i.status === status);
    if (clientId) allInvoices = allInvoices.filter(i => i.clientId === clientId);

    const total = allInvoices.length;
    const start = (page - 1) * limit;
    const data = allInvoices.slice(start, start + limit);

    res.json({
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("API v1 invoices list error:", error);
    res.status(500).json({ error: true, message: "Failed to fetch invoices" });
  }
});

router.get("/:id", requirePermission("read"), async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const invoice = await storage.getInvoice(req.params.id, tenantId);
    if (!invoice) {
      return res.status(404).json({ error: true, message: "Invoice not found" });
    }

    const lineItems = await storage.getInvoiceLineItems(req.params.id, tenantId);
    res.json({ data: { ...invoice, lineItems } });
  } catch (error) {
    console.error("API v1 invoice get error:", error);
    res.status(500).json({ error: true, message: "Failed to fetch invoice" });
  }
});

router.post("/", requirePermission("write"), async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const sanitizedBody = sanitizeObject(req.body, ["description"]);
    const parsed = insertInvoiceSchema.safeParse({ ...sanitizedBody, tenantId });
    if (!parsed.success) {
      return res.status(400).json({ error: true, message: "Validation failed", details: parsed.error.flatten() });
    }

    const client = await storage.getClient(parsed.data.clientId, tenantId);
    if (!client) {
      return res.status(400).json({ error: true, message: "Client not found in your tenant" });
    }

    const invoice = await storage.createInvoice(parsed.data);

    await storage.createAuditLog({
      userId: null,
      userName: "API Key",
      action: "created",
      entityType: "invoice",
      entityId: invoice.id,
      details: `Created via API: Invoice #${invoice.invoiceNumber}`,
      tenantId,
    });

    res.status(201).json({ data: invoice });
  } catch (error) {
    console.error("API v1 invoice create error:", error);
    res.status(500).json({ error: true, message: "Failed to create invoice" });
  }
});

export default router;
