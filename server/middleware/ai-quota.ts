import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { tenantSettings, aiUsageLogs, tenants } from "@shared/schema";
import { eq, and, sql, gte } from "drizzle-orm";

const DEFAULT_QUOTAS: Record<string, number> = {
  basic: 100000,
  pro: 500000,
  enterprise: -1,
};

function getFirstDayOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

async function getQuotaForTenant(tenantId: string): Promise<number> {
  const [setting] = await db
    .select()
    .from(tenantSettings)
    .where(and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, "ai.monthly_quota")));

  if (setting) {
    return parseInt(setting.value, 10);
  }

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
  const plan = tenant?.plan || "basic";
  return DEFAULT_QUOTAS[plan] ?? DEFAULT_QUOTAS.basic;
}

async function getCurrentMonthUsage(tenantId: string): Promise<number> {
  const firstDay = getFirstDayOfMonth();
  const [result] = await db
    .select({ total: sql<number>`COALESCE(SUM(${aiUsageLogs.totalTokens}), 0)` })
    .from(aiUsageLogs)
    .where(and(eq(aiUsageLogs.tenantId, tenantId), gte(aiUsageLogs.createdAt, firstDay)));

  return Number(result?.total ?? 0);
}

export function checkAiQuota(feature: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = (req as any).tenantId;
      if (!tenantId) {
        return next();
      }

      const quota = await getQuotaForTenant(tenantId);
      if (quota === -1) {
        return next();
      }

      const currentUsage = await getCurrentMonthUsage(tenantId);
      if (currentUsage >= quota) {
        return res.status(429).json({
          message: "AI usage limit reached for this billing period",
          usage: currentUsage,
          quota,
        });
      }

      next();
    } catch (err) {
      next();
    }
  };
}

export async function getAiQuotaStatus(tenantId: string): Promise<{
  usage: number;
  quota: number;
  remaining: number;
  percentUsed: number;
}> {
  const quota = await getQuotaForTenant(tenantId);
  const usage = await getCurrentMonthUsage(tenantId);
  const remaining = quota === -1 ? -1 : Math.max(0, quota - usage);
  const percentUsed = quota === -1 ? 0 : quota > 0 ? Math.round((usage / quota) * 100) : 100;

  return { usage, quota, remaining, percentUsed };
}
