import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { registerRoutes } from "./routes/index";
import { serveStatic, log } from "./static";
import { consoleLogger } from "./lib/console-logger.js";

const app = express();
const isProduction = process.env.NODE_ENV === "production";

// Security headers. The CSP only applies in production: Vite's dev server relies
// on inline scripts and an HMR websocket that a strict policy would block.
const supabaseOrigin = (() => {
  try {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
})();
const supabaseSources = supabaseOrigin
  ? [supabaseOrigin, supabaseOrigin.replace(/^https:/, "wss:")]
  : [];
app.use(
  helmet({
    contentSecurityPolicy: isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "https://js.stripe.com", "https://api.mapbox.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://api.mapbox.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            connectSrc: [
              "'self'",
              "https://api.stripe.com",
              "https://api.mapbox.com",
              "https://events.mapbox.com",
              "https://*.tiles.mapbox.com",
              ...supabaseSources,
            ],
            frameSrc: ["https://js.stripe.com", "https://hooks.stripe.com"],
            workerSrc: ["'self'", "blob:"],
            childSrc: ["blob:"],
            objectSrc: ["'none'"],
          },
        }
      : false,
    // Listing photos come from third-party CDNs that don't send CORP headers.
    crossOriginEmbedderPolicy: false,
  }),
);

// CORS: same-origin by default. Set ALLOWED_ORIGINS (comma-separated) to let other
// origins (e.g. a white-label domain or API consumers in the browser) call /api.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  "/api",
  cors({
    origin: (origin, callback) => {
      // Same-origin and non-browser requests send no Origin header.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  }),
);

// Stripe webhooks need the raw request body for signature verification, so the
// JSON parser must NOT consume it. Skip it for the webhook path; the route itself
// applies express.raw() (see server/webhooks/stripe.ts).
const STRIPE_WEBHOOK_PATH = "/webhook/stripe";
app.use((req, res, next) => {
  if (req.path === STRIPE_WEBHOOK_PATH) return next();
  return express.json()(req, res, next);
});
app.use(express.urlencoded({ extended: false }));

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
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Create HTTP server instead of using Express directly
  const httpServer = createServer(app);
  
  // Setup WebSocket server for console logging
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/api/console'
  });

  wss.on('connection', (ws) => {
    consoleLogger.addClient(ws);
    log('Console client connected');
    
    // Send a test message immediately to verify connection
    setTimeout(() => {
      consoleLogger.logInfo('Console connection established - testing WebSocket');
    }, 1000);
  });

  registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    console.error(err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    // Dynamic import keeps `vite` (devDependency) out of the production bundle's
    // startup path — it's only resolved when actually running in development.
    // If it can't load, we're really in a production image with NODE_ENV
    // mis-set to "development": don't crash-loop — fall back to the prebuilt
    // client so a single bad env var doesn't take the whole service down.
    try {
      const { setupVite } = await import("./vite");
      await setupVite(app, httpServer);
    } catch (err) {
      log(`vite unavailable (${(err as Error).message}); serving prebuilt client instead — set NODE_ENV=production`);
      serveStatic(app);
    }
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
    consoleLogger.logInfo('Server started - API console is ready');
  });

  // Optional in-process scheduler for saved searches. Off by default; set
  // ENABLE_CRON=true to run due searches every SAVED_SEARCH_TICK_MIN minutes
  // (default 15) on a single instance. For multi-instance or external control,
  // leave it off and drive POST /api/saved-searches/run-due from n8n/Railway cron.
  if (process.env.ENABLE_CRON === "true") {
    const tickMin = Math.max(1, parseInt(process.env.SAVED_SEARCH_TICK_MIN || "15", 10));
    const { runDueSavedSearches } = await import("./lib/saved-search-runner");
    log(`saved-search scheduler enabled (every ${tickMin}m)`);
    setInterval(() => {
      runDueSavedSearches()
        .then((r) => r.ran && log(`saved-search tick: ran ${r.ran}`))
        .catch((e) => console.error("saved-search tick failed:", e));
    }, tickMin * 60 * 1000);
  }
})();
