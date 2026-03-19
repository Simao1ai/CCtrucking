import { Router } from "express";
import { storage } from "../storage";
import { authenticateMobileToken } from "./mobile-auth";

const router = Router();

router.use(authenticateMobileToken);

// GET / - Get filled forms for the client
router.get("/", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const clientId = (req as any).clientId;

    const forms = await storage.getFilledFormsByClient(clientId, tenantId);

    res.json({
      data: forms.map(f => ({
        id: f.id,
        templateId: f.templateId,
        name: f.name,
        status: f.status,
        signatureRequestId: f.signatureRequestId,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
      meta: { total: forms.length },
    });
  } catch (error) {
    console.error("Mobile forms error:", error);
    res.status(500).json({ error: true, message: "Failed to load forms." });
  }
});

export default router;
