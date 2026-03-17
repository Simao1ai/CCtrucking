import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";

const PLATFORM_ROLES = ["platform_owner", "platform_admin"];
const TENANT_ADMIN_ROLES = ["owner", "admin", "tenant_owner", "tenant_admin"];
const TENANT_OWNER_ROLES = ["owner", "tenant_owner", "platform_owner"];

export function resolveTenant(req: Request, res: Response, next: NextFunction) {
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  db.select()
    .from(users)
    .where(eq(users.id, userId))
    .then(([dbUser]) => {
      if (!dbUser) return res.status(401).json({ message: "User not found" });

      (req as any).dbUser = dbUser;

      if (PLATFORM_ROLES.includes(dbUser.role)) {
        const overrideTenantId = req.query.tenantId as string | undefined;
        (req as any).tenantId = overrideTenantId || dbUser.tenantId;
      } else {
        (req as any).tenantId = dbUser.tenantId;
      }

      next();
    })
    .catch(() => res.status(500).json({ message: "Server error" }));
}

export function requireTenant(req: Request, _res: Response, next: NextFunction) {
  const tenantId = (req as any).tenantId;
  if (!tenantId) {
    return _res.status(403).json({ message: "Tenant context required" });
  }
  next();
}

export function isPlatformOwner(req: Request, res: Response, next: NextFunction) {
  const existing = (req as any).dbUser;
  if (existing) {
    if (existing.role !== "platform_owner") {
      return res.status(403).json({ message: "Platform owner access required" });
    }
    return next();
  }
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  db.select().from(users).where(eq(users.id, userId)).then(([dbUser]) => {
    if (!dbUser || dbUser.role !== "platform_owner") {
      return res.status(403).json({ message: "Platform owner access required" });
    }
    (req as any).dbUser = dbUser;
    (req as any).tenantId = dbUser.tenantId;
    next();
  }).catch(() => res.status(500).json({ message: "Server error" }));
}

export function isPlatformAdmin(req: Request, res: Response, next: NextFunction) {
  const existing = (req as any).dbUser;
  if (existing) {
    if (!PLATFORM_ROLES.includes(existing.role)) {
      return res.status(403).json({ message: "Platform admin access required" });
    }
    return next();
  }
  const userId = (req.session as any).userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  db.select().from(users).where(eq(users.id, userId)).then(([dbUser]) => {
    if (!dbUser || !PLATFORM_ROLES.includes(dbUser.role)) {
      return res.status(403).json({ message: "Platform admin access required" });
    }
    (req as any).dbUser = dbUser;
    (req as any).tenantId = dbUser.tenantId;
    next();
  }).catch(() => res.status(500).json({ message: "Server error" }));
}

export function isTenantOwner(req: Request, res: Response, next: NextFunction) {
  const dbUser = (req as any).dbUser;
  if (!dbUser || !TENANT_OWNER_ROLES.includes(dbUser.role)) {
    return res.status(403).json({ message: "Tenant owner access required" });
  }
  next();
}

export function isTenantAdmin(req: Request, res: Response, next: NextFunction) {
  const dbUser = (req as any).dbUser;
  if (!dbUser || !TENANT_ADMIN_ROLES.includes(dbUser.role)) {
    return res.status(403).json({ message: "Tenant admin access required" });
  }
  next();
}
