import { Router } from "express";
import { storage } from "../storage";
import { authenticateMobileToken } from "./mobile-auth";

const router = Router();

router.use(authenticateMobileToken);

// GET / - Get notifications for the mobile user
router.get("/", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const tenantId = (req as any).tenantId;

    const notifications = await storage.getNotificationsByUser(userId, tenantId);

    res.json({
      data: notifications.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        link: n.link,
        read: n.read === "true",
        createdAt: n.createdAt,
      })),
      meta: { total: notifications.length },
    });
  } catch (error) {
    console.error("Mobile notifications error:", error);
    res.status(500).json({ error: true, message: "Failed to load notifications." });
  }
});

// GET /unread-count - Get unread notification count
router.get("/unread-count", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const tenantId = (req as any).tenantId;

    const count = await storage.getUnreadCountByUser(userId, tenantId);

    res.json({ data: { count } });
  } catch (error) {
    console.error("Mobile notifications unread count error:", error);
    res.status(500).json({ error: true, message: "Failed to get unread count." });
  }
});

// PATCH /:id/read - Mark a notification as read
router.patch("/:id/read", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const tenantId = (req as any).tenantId;
    const { id } = req.params;

    const notif = await storage.markNotificationRead(id, userId, tenantId);
    if (!notif) {
      return res.status(404).json({ error: true, message: "Notification not found." });
    }

    res.json({
      data: {
        id: notif.id,
        title: notif.title,
        message: notif.message,
        type: notif.type,
        link: notif.link,
        read: notif.read === "true",
        createdAt: notif.createdAt,
      },
    });
  } catch (error) {
    console.error("Mobile mark notification read error:", error);
    res.status(500).json({ error: true, message: "Failed to mark notification as read." });
  }
});

// POST /mark-all-read - Mark all notifications as read
router.post("/mark-all-read", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const tenantId = (req as any).tenantId;

    await storage.markAllNotificationsRead(userId, tenantId);

    res.json({ data: { success: true } });
  } catch (error) {
    console.error("Mobile mark all notifications read error:", error);
    res.status(500).json({ error: true, message: "Failed to mark notifications as read." });
  }
});

export default router;
