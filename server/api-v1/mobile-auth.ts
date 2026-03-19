import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { storage } from "../storage";
import { db } from "../db";
import { users } from "@shared/models/auth";
import { mobileSessions } from "@shared/schema";
import { eq, and, lt } from "drizzle-orm";
import rateLimit from "express-rate-limit";

const router = Router();

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

async function cleanExpiredSessions() {
  try {
    await db.delete(mobileSessions).where(lt(mobileSessions.expiresAt, new Date()));
  } catch (e) {}
}

setInterval(cleanExpiredSessions, 60 * 60 * 1000);

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, message: "Too many login attempts. Please try again in 15 minutes.", code: "RATE_LIMITED" },
  validate: { xForwardedForHeader: false, trustProxy: false },
});

router.post("/lookup", async (req, res) => {
  try {
    const { slug } = req.body;
    if (!slug || typeof slug !== "string") {
      return res.status(400).json({ error: true, message: "Company code is required." });
    }

    const tenant = await storage.getTenantBySlug(slug.toLowerCase().trim());
    if (!tenant || tenant.status !== "active") {
      return res.status(404).json({ error: true, message: "Company not found. Please check your company code." });
    }

    const branding = await storage.getTenantBrandingByTenantId(tenant.id);

    res.json({
      data: {
        tenantId: tenant.id,
        companyName: branding?.companyName || tenant.name,
        slug: tenant.slug,
        logoUrl: branding?.logoUrl || null,
        primaryColor: branding?.primaryColor || "#1e3a5f",
        tagline: branding?.tagline || null,
        supportEmail: branding?.supportEmail || tenant.contactEmail,
        supportPhone: branding?.supportPhone || tenant.contactPhone || null,
      },
    });
  } catch (error) {
    console.error("Mobile tenant lookup error:", error);
    res.status(500).json({ error: true, message: "Something went wrong. Please try again." });
  }
});

router.post("/login", loginRateLimit, async (req, res) => {
  try {
    const { slug, username, password } = req.body;

    if (!slug || !username || !password) {
      return res.status(400).json({ error: true, message: "Company code, username, and password are required." });
    }

    const tenant = await storage.getTenantBySlug(slug.toLowerCase().trim());
    if (!tenant || tenant.status !== "active") {
      return res.status(404).json({ error: true, message: "Company not found." });
    }

    const [user] = await db.select().from(users).where(
      and(
        eq(users.username, username.trim().toLowerCase()),
        eq(users.tenantId, tenant.id)
      )
    );

    if (!user) {
      return res.status(401).json({ error: true, message: "Invalid username or password." });
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remainingMin = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
      return res.status(423).json({
        error: true,
        message: `Account is temporarily locked. Try again in ${remainingMin} minute${remainingMin !== 1 ? "s" : ""}.`,
        code: "ACCOUNT_LOCKED",
      });
    }

    if (user.lockedUntil && new Date(user.lockedUntil) <= new Date()) {
      await db.update(users).set({ failedLoginAttempts: 0, lockedUntil: null }).where(eq(users.id, user.id));
    }

    if (!user.password) {
      return res.status(401).json({ error: true, message: "Invalid username or password." });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      const currentAttempts = (user.lockedUntil && new Date(user.lockedUntil) <= new Date()) ? 0 : (user.failedLoginAttempts || 0);
      const attempts = currentAttempts + 1;
      const updateData: any = { failedLoginAttempts: attempts };
      if (attempts >= 5) {
        updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await db.update(users).set(updateData).where(eq(users.id, user.id));
      return res.status(401).json({ error: true, message: "Invalid username or password." });
    }

    if (!user.clientId) {
      return res.status(403).json({ error: true, message: "This account does not have client portal access." });
    }

    await db.update(users).set({ failedLoginAttempts: 0, lockedUntil: null }).where(eq(users.id, user.id));

    const client = await storage.getClient(user.clientId, tenant.id);
    if (!client) {
      return res.status(403).json({ error: true, message: "Client profile not found." });
    }

    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.insert(mobileSessions).values({
      tokenHash,
      userId: user.id,
      clientId: user.clientId,
      tenantId: tenant.id,
      expiresAt,
    });

    const branding = await storage.getTenantBrandingByTenantId(tenant.id);

    res.json({
      data: {
        token: rawToken,
        expiresAt: expiresAt.toISOString(),
        client: {
          id: client.id,
          companyName: client.companyName,
          contactName: client.contactName,
          email: client.email,
          phone: client.phone,
          status: client.status,
        },
        tenant: {
          companyName: branding?.companyName || tenant.name,
          slug: tenant.slug,
          logoUrl: branding?.logoUrl || null,
          primaryColor: branding?.primaryColor || "#1e3a5f",
        },
      },
    });
  } catch (error) {
    console.error("Mobile login error:", error);
    res.status(500).json({ error: true, message: "Something went wrong. Please try again." });
  }
});

router.post("/logout", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const rawToken = authHeader.slice(7);
    const tokenHash = hashToken(rawToken);
    await db.delete(mobileSessions).where(eq(mobileSessions.tokenHash, tokenHash)).catch(() => {});
  }
  res.json({ data: { message: "Logged out successfully." } });
});

router.get("/me", (req, res, next) => {
  authenticateMobileToken(req, res, next);
}, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const clientId = (req as any).clientId;

    const client = await storage.getClient(clientId, tenantId);
    if (!client) {
      return res.status(404).json({ error: true, message: "Client profile not found." });
    }

    res.json({
      data: {
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
    });
  } catch (error) {
    console.error("Mobile /me error:", error);
    res.status(500).json({ error: true, message: "Failed to fetch profile." });
  }
});

export async function authenticateMobileToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: true, message: "Please log in to continue.", code: "UNAUTHORIZED" });
  }

  const rawToken = authHeader.slice(7);
  const tokenHash = hashToken(rawToken);

  try {
    const [session] = await db.select().from(mobileSessions).where(eq(mobileSessions.tokenHash, tokenHash));

    if (!session) {
      return res.status(401).json({ error: true, message: "Session expired. Please log in again.", code: "TOKEN_EXPIRED" });
    }

    if (session.expiresAt < new Date()) {
      await db.delete(mobileSessions).where(eq(mobileSessions.id, session.id)).catch(() => {});
      return res.status(401).json({ error: true, message: "Session expired. Please log in again.", code: "TOKEN_EXPIRED" });
    }

    (req as any).tenantId = session.tenantId;
    (req as any).clientId = session.clientId;
    (req as any).userId = session.userId;
    next();
  } catch (error) {
    console.error("Mobile token auth error:", error);
    return res.status(500).json({ error: true, message: "Authentication error.", code: "AUTH_ERROR" });
  }
}

export default router;
