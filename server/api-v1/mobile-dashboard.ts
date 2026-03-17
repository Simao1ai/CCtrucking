import { Router } from "express";
import { storage } from "../storage";
import { authenticateApiKey, apiKeyRateLimit, requirePermission } from "../middleware/api-key";

const router = Router();

router.use(authenticateApiKey);
router.use(apiKeyRateLimit);

router.get("/", requirePermission("read"), async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const clientId = req.query.clientId as string | undefined;

    const [allClients, allTickets, allInvoices, allDocuments] = await Promise.all([
      storage.getClients(tenantId),
      storage.getTickets(tenantId),
      storage.getInvoices(tenantId),
      storage.getDocuments(tenantId),
    ]);

    const clients = clientId ? allClients.filter(c => c.id === clientId) : allClients;
    const tickets = clientId ? allTickets.filter(t => t.clientId === clientId) : allTickets;
    const invoices = clientId ? allInvoices.filter(i => i.clientId === clientId) : allInvoices;
    const documents = clientId ? allDocuments.filter(d => d.clientId === clientId) : allDocuments;

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const openTickets = tickets.filter(t => t.status === "open" || t.status === "in_progress");
    const overdueTickets = tickets.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== "completed" && t.status !== "closed");
    const upcomingTickets = tickets.filter(t => t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= thirtyDaysFromNow && t.status !== "completed" && t.status !== "closed");

    const outstandingInvoices = invoices.filter(i => i.status === "sent" || i.status === "overdue");
    const overdueInvoices = invoices.filter(i => i.status === "overdue");
    const totalOutstanding = outstandingInvoices.reduce((sum, i) => sum + Number(i.amount || 0), 0);
    const totalOverdue = overdueInvoices.reduce((sum, i) => sum + Number(i.amount || 0), 0);

    const recentActivity = [
      ...tickets.slice(0, 10).map(t => ({
        type: "ticket" as const,
        id: t.id,
        title: t.title,
        status: t.status,
        clientId: t.clientId,
        date: t.updatedAt || t.createdAt,
      })),
      ...invoices.slice(0, 10).map(i => ({
        type: "invoice" as const,
        id: i.id,
        title: `Invoice #${i.invoiceNumber}`,
        status: i.status,
        clientId: i.clientId,
        date: i.updatedAt || i.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);

    const complianceAlerts = [
      ...overdueTickets.map(t => ({
        level: "overdue" as const,
        type: t.serviceType || "Service",
        title: t.title,
        clientId: t.clientId,
        dueDate: t.dueDate,
      })),
      ...upcomingTickets.map(t => ({
        level: "upcoming" as const,
        type: t.serviceType || "Service",
        title: t.title,
        clientId: t.clientId,
        dueDate: t.dueDate,
      })),
    ].sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

    res.json({
      data: {
        summary: {
          totalClients: clients.length,
          activeClients: clients.filter(c => c.status === "active").length,
          openTickets: openTickets.length,
          overdueTickets: overdueTickets.length,
          totalDocuments: documents.length,
          totalOutstandingAmount: totalOutstanding,
          totalOverdueAmount: totalOverdue,
          outstandingInvoices: outstandingInvoices.length,
          overdueInvoices: overdueInvoices.length,
        },
        complianceAlerts,
        recentActivity,
        ticketsByStatus: {
          open: tickets.filter(t => t.status === "open").length,
          in_progress: tickets.filter(t => t.status === "in_progress").length,
          completed: tickets.filter(t => t.status === "completed").length,
          closed: tickets.filter(t => t.status === "closed").length,
        },
        invoicesByStatus: {
          draft: invoices.filter(i => i.status === "draft").length,
          sent: invoices.filter(i => i.status === "sent").length,
          paid: invoices.filter(i => i.status === "paid").length,
          overdue: invoices.filter(i => i.status === "overdue").length,
        },
      },
      meta: {
        generatedAt: new Date().toISOString(),
        clientFilter: clientId || null,
      },
    });
  } catch (error) {
    console.error("API v1 mobile dashboard error:", error);
    res.status(500).json({ error: true, message: "Failed to fetch dashboard data" });
  }
});

router.get("/client/:clientId", requirePermission("read"), async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { clientId } = req.params;

    const client = await storage.getClient(clientId, tenantId);
    if (!client) {
      return res.status(404).json({ error: true, message: "Client not found" });
    }

    const [tickets, invoices, documents, signatures, notarizations] = await Promise.all([
      storage.getTicketsByClient(clientId, tenantId),
      storage.getInvoicesByClient(clientId, tenantId),
      storage.getDocumentsByClient(clientId, tenantId),
      storage.getSignatureRequestsByClient(clientId, tenantId),
      storage.getNotarizationsByClient(clientId, tenantId),
    ]);

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
        tickets: tickets.slice(0, 20).map(t => ({
          id: t.id,
          title: t.title,
          serviceType: t.serviceType,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          createdAt: t.createdAt,
        })),
        invoices: invoices.slice(0, 20).map(i => ({
          id: i.id,
          invoiceNumber: i.invoiceNumber,
          amount: i.amount,
          status: i.status,
          dueDate: i.dueDate,
          createdAt: i.createdAt,
        })),
        documents: documents.slice(0, 20).map(d => ({
          id: d.id,
          name: d.name,
          type: d.type,
          createdAt: d.createdAt,
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
      meta: {
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("API v1 mobile client detail error:", error);
    res.status(500).json({ error: true, message: "Failed to fetch client details" });
  }
});

export default router;
