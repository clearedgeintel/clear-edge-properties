import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { registerRoutes } from "./routes/index";
import { serveStatic, log } from "./static";
import { consoleLogger } from "./lib/console-logger.js";

const app = express();
// Stripe webhooks need the raw request body for signature verification, so the
// JSON parser must NOT consume it. Skip it for the webhook path; the route itself
// applies express.raw() (see server/webhooks/stripe.ts).
const STRIPE_WEBHOOK_PATH = "/webhook/stripe";
app.use((req, res, next) => {
  if (req.originalUrl === STRIPE_WEBHOOK_PATH) return next();
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
    const { setupVite } = await import("./vite");
    await setupVite(app, httpServer);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
    consoleLogger.logInfo('Server started - API console is ready');
  });
})();
