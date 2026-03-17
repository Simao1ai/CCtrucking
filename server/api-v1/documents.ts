import { Router } from "express";
import { storage } from "../storage";
import { authenticateApiKey, apiKeyRateLimit, requirePermission } from "../middleware/api-key";

const router = Router();

router.use(authenticateApiKey);
router.use(apiKeyRateLimit);

router.get("/", requirePermission("read"), async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const clientId = req.query.clientId as string | undefined;

    let allDocs = await storage.getDocuments(tenantId);
    if (clientId) allDocs = allDocs.filter(d => d.clientId === clientId);

    const total = allDocs.length;
    const start = (page - 1) * limit;
    const data = allDocs.slice(start, start + limit);

    res.json({
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("API v1 documents list error:", error);
    res.status(500).json({ error: true, message: "Failed to fetch documents" });
  }
});

router.get("/:id", requirePermission("read"), async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const doc = await storage.getDocument(req.params.id, tenantId);
    if (!doc) {
      return res.status(404).json({ error: true, message: "Document not found" });
    }
    res.json({ data: doc });
  } catch (error) {
    console.error("API v1 document get error:", error);
    res.status(500).json({ error: true, message: "Failed to fetch document" });
  }
});

export default router;
