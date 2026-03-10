import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { tenantSettings, tenants } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { isModuleInPlan, type PlanTier } from "@shared/plan-config";

const moduleCache = new Map<string, { value: boolean; expiresAt: number }>();
const planCache = new Map<string, { value: PlanTier; expiresAt: number }>();
const CACHE_TTL = 60 * 1000;

async function getTenantPlan(tenantId: string): Promise<PlanTier> {
  const cached = planCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const [tenant] = await db.select({ plan: tenants.plan }).from(tenants).where(eq(tenants.id, tenantId));
  const plan = (tenant?.plan as PlanTier) || "basic";
  planCache.set(tenantId, { value: plan, expiresAt: Date.now() + CACHE_TTL });
  return plan;
}

async function isModuleEnabled(tenantId: string, moduleName: string): Promise<boolean> {
  const cacheKey = `${tenantId}:${moduleName}`;
  const cached = moduleCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const settingKey = `modules.${moduleName}`;
  const [setting] = await db
    .select()
    .from(tenantSettings)
    .where(and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, settingKey)));

  const enabled = setting ? setting.value === "true" : true;

  moduleCache.set(cacheKey, { value: enabled, expiresAt: Date.now() + CACHE_TTL });
  return enabled;
}

export function requireModule(moduleName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = (req as any).tenantId;
    if (!tenantId) {
      return next();
    }

    try {
      const plan = await getTenantPlan(tenantId);
      if (!isModuleInPlan(moduleName, plan)) {
        return res.status(403).json({
          message: `This feature requires a ${moduleName === "bookkeeping" || moduleName === "tax_prep" || moduleName === "compliance_scheduling" || moduleName === "employee_performance" ? "Pro" : "Enterprise"} plan or higher`,
          code: "PLAN_UPGRADE_REQUIRED",
          requiredPlan: isModuleInPlan(moduleName, "pro") ? "pro" : "enterprise",
          currentPlan: plan,
        });
      }

      const enabled = await isModuleEnabled(tenantId, moduleName);
      if (!enabled) {
        return res.status(403).json({ message: "This feature is not enabled for your account" });
      }
      next();
    } catch (err) {
      return res.status(500).json({ message: "Error checking module access" });
    }
  };
}

export function clearModuleCache(tenantId?: string) {
  if (tenantId) {
    const keys = Array.from(moduleCache.keys());
    for (const key of keys) {
      if (key.startsWith(`${tenantId}:`)) {
        moduleCache.delete(key);
      }
    }
    planCache.delete(tenantId);
  } else {
    moduleCache.clear();
    planCache.clear();
  }
}

export { getTenantPlan };
