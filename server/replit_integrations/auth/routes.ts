import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import bcrypt from "bcryptjs";
import { db } from "../../db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export function validatePasswordStrength(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long" };
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) {
    return { valid: false, message: "Password must contain both letters and numbers" };
  }
  return { valid: true, message: "" };
}

export function registerAuthRoutes(app: Express): void {
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: true, message: "Username and password are required" });
      }

      const user = await authStorage.getUserByUsername(username);
      if (!user || !user.password) {
        return res.status(401).json({ error: true, message: "Invalid username or password" });
      }

      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        const remainingMs = new Date(user.lockedUntil).getTime() - Date.now();
        const remainingMin = Math.ceil(remainingMs / 60000);
        return res.status(423).json({
          error: true,
          message: `Account is locked. Try again in ${remainingMin} minute${remainingMin !== 1 ? "s" : ""}.`,
          code: "ACCOUNT_LOCKED",
        });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        const attempts = (user.failedLoginAttempts || 0) + 1;
        const updateData: any = { failedLoginAttempts: attempts };
        if (attempts >= MAX_FAILED_ATTEMPTS) {
          updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        }
        await db.update(users).set(updateData).where(eq(users.id, user.id));

        if (attempts >= MAX_FAILED_ATTEMPTS) {
          return res.status(423).json({
            error: true,
            message: "Account locked due to too many failed attempts. Try again in 15 minutes.",
            code: "ACCOUNT_LOCKED",
          });
        }

        return res.status(401).json({ error: true, message: "Invalid username or password" });
      }

      if (user.failedLoginAttempts && user.failedLoginAttempts > 0) {
        await db.update(users).set({ failedLoginAttempts: 0, lockedUntil: null }).where(eq(users.id, user.id));
      }

      (req.session as any).userId = user.id;
      const { password: _, failedLoginAttempts: _f, lockedUntil: _l, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: true, message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    let tenantSlug: string | null = null;
    try {
      const userId = (req.session as any)?.userId;
      if (userId) {
        const user = await authStorage.getUser(userId);
        if (user?.tenantId && user.role !== "platform_owner" && user.role !== "platform_admin") {
          const { tenants } = await import("@shared/schema");
          const [tenant] = await db.select({ slug: tenants.slug }).from(tenants).where(eq(tenants.id, user.tenantId));
          if (tenant?.slug) tenantSlug = tenant.slug;
        }
      }
    } catch {}
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: true, message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out", tenantSlug });
    });
  });

  app.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: true, message: "User not found" });
      }
      const { password: _, failedLoginAttempts: _f, lockedUntil: _l, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: true, message: "Failed to fetch user" });
    }
  });
}
