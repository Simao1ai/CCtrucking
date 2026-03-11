import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import crypto from "crypto";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.set("trust proxy", 1);

const isDev = process.env.NODE_ENV !== "production";

app.use(
  helmet({
    contentSecurityPolicy: isDev
      ? false
      : {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            connectSrc: ["'self'", "https://api.openai.com"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
          },
        },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "same-site" },
  })
);

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, message: "Too many requests, please try again later.", code: "RATE_LIMIT_EXCEEDED" },
  skip: (req) => !req.path.startsWith("/api"),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, message: "Too many login attempts, please try again later.", code: "AUTH_RATE_LIMIT" },
});

const platformLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, message: "Too many requests, please try again later.", code: "RATE_LIMIT_EXCEEDED" },
});

app.use("/api/", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/platform/", platformLimiter);

app.use((req, _res, next) => {
  (req as any).requestId = crypto.randomUUID();
  next();
});

app.use(
  express.json({
    limit: "25mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const requestId = (req as any).requestId;
      let logLine = `[${requestId?.slice(0, 8)}] ${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        const sensitiveRoutes = ["/api/admin/api-keys", "/api/auth/login"];
        const isSensitive = sensitiveRoutes.some(r => path.startsWith(r));
        if (!isSensitive) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        } else {
          logLine += ` :: [redacted]`;
        }
      }

      log(logLine);
    }
  });

  next();
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

(async () => {
  const { seedDatabase } = await import("./seed");
  await seedDatabase();
  await registerRoutes(httpServer, app);

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const requestId = (req as any).requestId;

    console.error(`[${requestId?.slice(0, 8)}] Error:`, err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({
      error: true,
      message: isDev ? message : (status >= 500 ? "Internal Server Error" : message),
      code: err.code || undefined,
      requestId,
    });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
