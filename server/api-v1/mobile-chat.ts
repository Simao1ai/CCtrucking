import { Router } from "express";
import { storage } from "../storage";
import { authenticateMobileToken } from "./mobile-auth";

const router = Router();

router.use(authenticateMobileToken);

// GET / - Get chat messages for the client
router.get("/", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const clientId = (req as any).clientId;

    const messages = await storage.getChatMessages(clientId, tenantId);

    res.json({
      data: messages.map(m => ({
        id: m.id,
        senderId: m.senderId,
        senderName: m.senderName,
        senderRole: m.senderRole,
        message: m.message,
        createdAt: m.createdAt,
      })),
      meta: { total: messages.length },
    });
  } catch (error) {
    console.error("Mobile chat error:", error);
    res.status(500).json({ error: true, message: "Failed to load messages." });
  }
});

// POST / - Send a message
router.post("/", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const clientId = (req as any).clientId;
    const userId = (req as any).userId;
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: true, message: "Message is required." });
    }

    // Get client info for sender name
    const client = await storage.getClient(clientId, tenantId);
    const senderName = client?.contactName || client?.companyName || "Client";

    const chatMessage = await storage.createChatMessage({
      clientId,
      senderId: userId,
      senderName,
      senderRole: "client",
      message: message.trim(),
      tenantId: tenantId,
    });

    res.json({
      data: {
        id: chatMessage.id,
        senderId: chatMessage.senderId,
        senderName: chatMessage.senderName,
        senderRole: chatMessage.senderRole,
        message: chatMessage.message,
        createdAt: chatMessage.createdAt,
      },
    });
  } catch (error) {
    console.error("Mobile chat send error:", error);
    res.status(500).json({ error: true, message: "Failed to send message." });
  }
});

export default router;
