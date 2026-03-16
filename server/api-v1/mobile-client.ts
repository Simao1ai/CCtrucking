import { Router } from "express";
import { storage } from "../storage";
import { authenticateMobileToken } from "./mobile-auth";

const router = Router();

router.use(authenticateMobileToken);

router.get("/dashboard", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const clientId = (req as any).clientId;

    const [client, tickets, invoices, documents, signatures, notarizations] = await Promise.all([
      storage.getClient(clientId, tenantId),
      storage.getTicketsByClient(clientId, tenantId),
      storage.getInvoicesByClient(clientId, tenantId),
      storage.getDocumentsByClient(clientId, tenantId),
      storage.getSignatureRequestsByClient(clientId, tenantId),
      storage.getNotarizationsByClient(clientId, tenantId),
    ]);

    if (!client) {
      return res.status(404).json({ error: true, message: "Client profile not found." });
    }

    const now = new Date();
    const openTickets = tickets.filter(t => t.status === "open" || t.status === "in_progress");
    const overdueTickets = tickets.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== "completed" && t.status !== "closed");
    const outstandingInvoices = invoices.filter(i => i.status === "sent" || i.status === "overdue");
    const totalOwed = outstandingInvoices.reduce((sum, i) => sum + Number(i.amount || 0), 0);
    const pendingSignatures = signatures.filter(s => s.status === "pending");
    const pendingNotarizations = notarizations.filter(n => n.status === "pending" || n.status === "scheduled");

    res.json({
      data: {
        client: {
          id: client.id,
          companyName: client.companyName,
          contactName: client.contactName,
          email: client.email,
          phone: client.phone,
          address: client.address,
          city: client.city,
          state: client.state,
          zipCode: client.zipCode,
          status: client.status,
          dotNumber: client.dotNumber,
          mcNumber: client.mcNumber,
          einNumber: client.einNumber,
        },
        summary: {
          openTickets: openTickets.length,
          overdueTickets: overdueTickets.length,
          totalDocuments: documents.length,
          totalOwed,
          outstandingInvoices: outstandingInvoices.length,
          pendingSignatures: pendingSignatures.length,
          pendingNotarizations: pendingNotarizations.length,
        },
        recentTickets: tickets.slice(0, 10).map(t => ({
          id: t.id,
          title: t.title,
          serviceType: t.serviceType,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          createdAt: t.createdAt,
        })),
        recentInvoices: invoices.slice(0, 10).map(i => ({
          id: i.id,
          invoiceNumber: i.invoiceNumber,
          amount: i.amount,
          status: i.status,
          dueDate: i.dueDate,
          createdAt: i.createdAt,
        })),
        pendingActions: [
          ...pendingSignatures.map(s => ({
            type: "signature" as const,
            id: s.id,
            title: s.documentName || "Signature Request",
            status: s.status,
            createdAt: s.createdAt,
          })),
          ...pendingNotarizations.map(n => ({
            type: "notarization" as const,
            id: n.id,
            title: n.documentName || "Notarization",
            status: n.status,
            createdAt: n.createdAt,
          })),
        ],
      },
      meta: { generatedAt: new Date().toISOString() },
    });
  } catch (error) {
    console.error("Mobile client dashboard error:", error);
    res.status(500).json({ error: true, message: "Failed to load dashboard." });
  }
});

router.get("/tickets", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const clientId = (req as any).clientId;
    const status = req.query.status as string | undefined;

    let tickets = await storage.getTicketsByClient(clientId, tenantId);
    if (status) tickets = tickets.filter(t => t.status === status);

    res.json({
      data: tickets.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        serviceType: t.serviceType,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      meta: { total: tickets.length },
    });
  } catch (error) {
    console.error("Mobile client tickets error:", error);
    res.status(500).json({ error: true, message: "Failed to load tickets." });
  }
});

router.get("/invoices", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const clientId = (req as any).clientId;
    const status = req.query.status as string | undefined;

    let invoices = await storage.getInvoicesByClient(clientId, tenantId);
    if (status) invoices = invoices.filter(i => i.status === status);

    res.json({
      data: invoices.map(i => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        amount: i.amount,
        status: i.status,
        dueDate: i.dueDate,
        description: i.description,
        createdAt: i.createdAt,
      })),
      meta: { total: invoices.length },
    });
  } catch (error) {
    console.error("Mobile client invoices error:", error);
    res.status(500).json({ error: true, message: "Failed to load invoices." });
  }
});

router.get("/documents", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const clientId = (req as any).clientId;

    const documents = await storage.getDocumentsByClient(clientId, tenantId);

    res.json({
      data: documents.map(d => ({
        id: d.id,
        name: d.name,
        type: d.type,
        fileUrl: d.fileUrl,
        createdAt: d.createdAt,
      })),
      meta: { total: documents.length },
    });
  } catch (error) {
    console.error("Mobile client documents error:", error);
    res.status(500).json({ error: true, message: "Failed to load documents." });
  }
});

router.get("/signatures", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const clientId = (req as any).clientId;

    const signatures = await storage.getSignatureRequestsByClient(clientId, tenantId);

    res.json({
      data: signatures.map(s => ({
        id: s.id,
        documentName: s.documentName,
        status: s.status,
        signedAt: s.signedAt,
        createdAt: s.createdAt,
      })),
      meta: { total: signatures.length },
    });
  } catch (error) {
    console.error("Mobile client signatures error:", error);
    res.status(500).json({ error: true, message: "Failed to load signatures." });
  }
});

router.get("/notarizations", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const clientId = (req as any).clientId;

    const notarizations = await storage.getNotarizationsByClient(clientId, tenantId);

    res.json({
      data: notarizations.map(n => ({
        id: n.id,
        documentName: n.documentName,
        status: n.status,
        notarizationType: n.notarizationType,
        scheduledDate: n.scheduledDate,
        completedDate: n.completedDate,
        createdAt: n.createdAt,
      })),
      meta: { total: notarizations.length },
    });
  } catch (error) {
    console.error("Mobile client notarizations error:", error);
    res.status(500).json({ error: true, message: "Failed to load notarizations." });
  }
});

export default router;
