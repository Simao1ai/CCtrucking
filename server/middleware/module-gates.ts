import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { tenantSettings } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const moduleCache = new Map<string, { value: boolean; expiresAt: number }>();
const CACHE_TTL = 60 * 1000;

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
  } else {
    moduleCache.clear();
  }
}
