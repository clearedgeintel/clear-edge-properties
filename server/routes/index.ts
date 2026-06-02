import type { Express } from "express";
import { rateLimitMiddleware } from "../lib/rate-limit";
import { setupStripeWebhooks } from "../webhooks/stripe";

import authRoutes from "./auth";
import propertiesRoutes from "./properties";
import watchlistRoutes from "./watchlist";
import searchRoutes from "./search";
import agentsRoutes from "./agents";
import buyersRoutes from "./buyers";
import savedSearchesRoutes from "./saved-searches";
import documentsRoutes from "./documents";
import aiRoutes from "./ai";
import adminRoutes from "./admin";
import apiV1Routes from "./api-v1";
import apiKeysRoutes from "./api-keys";
import subscriptionsRoutes from "./subscriptions";
import brandingRoutes from "./branding";

export function registerRoutes(app: Express): void {
  // Rate limiting for all API routes
  app.use('/api', rateLimitMiddleware(100, 15 * 60 * 1000));

  // Stripe webhooks. The global JSON parser skips this path (see server/index.ts)
  // and the route applies express.raw() so signature verification gets the raw body.
  setupStripeWebhooks(app);

  // Mount route modules
  app.use(authRoutes);
  app.use(propertiesRoutes);
  app.use(watchlistRoutes);
  app.use(searchRoutes);
  app.use(agentsRoutes);
  app.use(buyersRoutes);
  app.use(savedSearchesRoutes);
  app.use(documentsRoutes);
  app.use(aiRoutes);
  app.use(adminRoutes);
  app.use(apiV1Routes);
  app.use(apiKeysRoutes);
  app.use(subscriptionsRoutes);
  app.use(brandingRoutes);
}
