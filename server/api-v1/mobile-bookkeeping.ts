import { Router } from "express";
import { storage } from "../storage";
import { authenticateMobileToken } from "./mobile-auth";

const router = Router();

router.use(authenticateMobileToken);

// GET /subscription - Get client's bookkeeping subscription
router.get("/subscription", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const clientId = (req as any).clientId;

    const subscription = await storage.getBookkeepingSubscriptionByClient(clientId, tenantId);

    res.json({
      data: subscription ? {
        id: subscription.id,
        plan: subscription.plan,
        price: Number(subscription.price),
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
      } : null,
    });
  } catch (error) {
    console.error("Mobile bookkeeping subscription error:", error);
    res.status(500).json({ error: true, message: "Failed to load subscription." });
  }
});

// GET /transactions - Get client's bank transactions
router.get("/transactions", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const clientId = (req as any).clientId;
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;

    const transactions = await storage.getBankTransactions(clientId, month, year, tenantId);

    res.json({
      data: transactions.map(t => ({
        id: t.id,
        transactionDate: t.transactionDate,
        description: t.description,
        amount: Number(t.amount),
        category: t.manualCategory || t.aiCategory || t.originalCategory || "Uncategorized",
        reviewed: t.reviewed,
        bankName: t.bankName,
        accountLast4: t.accountLast4,
        statementMonth: t.statementMonth,
        statementYear: t.statementYear,
        createdAt: t.createdAt,
      })),
      meta: { total: transactions.length },
    });
  } catch (error) {
    console.error("Mobile bookkeeping transactions error:", error);
    res.status(500).json({ error: true, message: "Failed to load transactions." });
  }
});

// GET /summaries - Get client's monthly summaries
router.get("/summaries", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const clientId = (req as any).clientId;

    const summaries = await storage.getMonthlySummaries(clientId, tenantId);

    res.json({
      data: summaries.map(s => ({
        id: s.id,
        month: s.month,
        year: s.year,
        totalIncome: Number(s.totalIncome),
        totalExpenses: Number(s.totalExpenses),
        netIncome: Number(s.netIncome),
        categoryBreakdown: s.categoryBreakdown ? JSON.parse(s.categoryBreakdown) : null,
        generatedAt: s.generatedAt,
      })),
      meta: { total: summaries.length },
    });
  } catch (error) {
    console.error("Mobile bookkeeping summaries error:", error);
    res.status(500).json({ error: true, message: "Failed to load summaries." });
  }
});

export default router;
