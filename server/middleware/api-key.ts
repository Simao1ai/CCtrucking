import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { db } from "../db";
import { apiKeys } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import rateLimit from "express-rate-limit";

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = `cdhq_${crypto.randomBytes(32).toString("hex")}`;
  const hash = hashApiKey(raw);
  const prefix = raw.slice(0, 12);
  return { raw, hash, prefix };
}

export const apiKeyRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as any).apiKeyId || "unknown",
  message: { error: true, message: "API rate limit exceeded.", code: "API_RATE_LIMIT" },
  validate: { xForwardedForHeader: false, trustProxy: false },
});

export async function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: true, message: "Missing or invalid Authorization header. Use: Bearer <api_key>", code: "UNAUTHORIZED" });
  }

  const rawKey = authHeader.slice(7);
  if (!rawKey || rawKey.length < 20) {
    return res.status(401).json({ error: true, message: "Invalid API key format.", code: "UNAUTHORIZED" });
  }

  try {
    const keyHash = hashApiKey(rawKey);
    const [key] = await db.select().from(apiKeys).where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.revoked, false)));

    if (!key) {
      return res.status(401).json({ error: true, message: "Invalid or revoked API key.", code: "UNAUTHORIZED" });
    }

    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      return res.status(401).json({ error: true, message: "API key has expired.", code: "API_KEY_EXPIRED" });
    }

    if (!key.tenantId) {
      return res.status(403).json({ error: true, message: "API key is not bound to a tenant.", code: "NO_TENANT" });
    }

    (req as any).tenantId = key.tenantId;
    (req as any).apiKeyId = key.id;
    (req as any).apiKeyPermissions = key.permissions || ["read", "write"];

    db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, key.id)).catch(() => {});

    next();
  } catch (error) {
    console.error("API key auth error:", error);
    return res.status(500).json({ error: true, message: "Authentication error.", code: "AUTH_ERROR" });
  }
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const permissions = (req as any).apiKeyPermissions || [];
    if (!permissions.includes(permission)) {
      return res.status(403).json({ error: true, message: `API key lacks '${permission}' permission.`, code: "INSUFFICIENT_PERMISSIONS" });
    }
    next();
  };
}
