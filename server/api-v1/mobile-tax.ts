import { Router } from "express";
import { storage } from "../storage";
import { authenticateMobileToken } from "./mobile-auth";

const router = Router();

router.use(authenticateMobileToken);

// GET /documents - Get client's tax documents
router.get("/documents", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const clientId = (req as any).clientId;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;

    let documents;
    if (year) {
      documents = (await storage.getTaxDocumentsByYear(year, tenantId))
        .filter(d => d.clientId === clientId);
    } else {
      documents = await storage.getTaxDocumentsByClient(clientId, tenantId);
    }

    res.json({
      data: documents.map(d => ({
        id: d.id,
        taxYear: d.taxYear,
        documentType: d.documentType,
        payerName: d.payerName,
        fileName: d.fileName,
        fileType: d.fileType,
        totalIncome: d.totalIncome ? Number(d.totalIncome) : null,
        federalWithholding: d.federalWithholding ? Number(d.federalWithholding) : null,
        stateWithholding: d.stateWithholding ? Number(d.stateWithholding) : null,
        status: d.status,
        confidenceLevel: d.confidenceLevel,
        notes: d.notes,
        rejectionFeedback: d.rejectionFeedback,
        approvedAt: d.approvedAt,
        analyzedAt: d.analyzedAt,
        createdAt: d.createdAt,
      })),
      meta: { total: documents.length },
    });
  } catch (error) {
    console.error("Mobile tax documents error:", error);
    res.status(500).json({ error: true, message: "Failed to load tax documents." });
  }
});

// POST /documents/:id/approve - Approve a tax document
router.post("/documents/:id/approve", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const clientId = (req as any).clientId;
    const { id } = req.params;

    const doc = await storage.getTaxDocument(id, tenantId);
    if (!doc || doc.clientId !== clientId) {
      return res.status(404).json({ error: true, message: "Document not found." });
    }

    await storage.updateTaxDocument(id, { status: "approved", approvedAt: new Date() }, tenantId);
    res.json({ data: { message: "Document approved." } });
  } catch (error) {
    console.error("Mobile tax approve error:", error);
    res.status(500).json({ error: true, message: "Failed to approve document." });
  }
});

// POST /documents/:id/reject - Reject a tax document
router.post("/documents/:id/reject", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const clientId = (req as any).clientId;
    const { id } = req.params;
    const { feedback } = req.body;

    const doc = await storage.getTaxDocument(id, tenantId);
    if (!doc || doc.clientId !== clientId) {
      return res.status(404).json({ error: true, message: "Document not found." });
    }

    await storage.updateTaxDocument(id, {
      status: "rejected",
      rejectionFeedback: feedback || "Rejected by client",
    }, tenantId);
    res.json({ data: { message: "Document rejected." } });
  } catch (error) {
    console.error("Mobile tax reject error:", error);
    res.status(500).json({ error: true, message: "Failed to reject document." });
  }
});

export default router;
