import express, { type Express } from "express";
import Stripe from "stripe";
import { stripe } from "../lib/stripe";
import { storage } from "../storage";

// Maps a Stripe subscription status onto our internal subscriptionStatus value.
function mapSubscriptionStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    default:
      return "inactive";
  }
}

export function setupStripeWebhooks(app: Express) {
  // express.raw() preserves the unparsed body Buffer that Stripe needs to verify
  // the signature. The global JSON parser is configured to skip this path
  // (see server/index.ts), so the stream is still intact here.
  app.post(
    "/webhook/stripe",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const sig = req.headers["stripe-signature"] as string;

      if (!stripe) {
        console.error("Stripe is not configured; cannot process webhook");
        return res.status(503).send("Stripe not configured");
      }

      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.error("Missing STRIPE_WEBHOOK_SECRET");
        return res.status(400).send("Missing webhook secret");
      }

      let event: Stripe.Event;

      try {
        // req.body is a Buffer here thanks to express.raw()
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
      } catch (err: any) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // Idempotency: Stripe may deliver the same event more than once. Ack and skip
      // if we've already handled it so we never double-process a billing change.
      try {
        if (await storage.isWebhookEventProcessed(event.id)) {
          console.log(`Skipping already-processed webhook event ${event.id}`);
          return res.json({ received: true, duplicate: true });
        }
      } catch (error) {
        console.error("Failed to check webhook idempotency:", error);
        // Fall through and process; a duplicate is safer than dropping the event.
      }

      try {
        switch (event.type) {
          case "customer.subscription.created":
          case "customer.subscription.updated": {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;
            const tenant = await storage.getTenantByStripeCustomerId(customerId);

            if (tenant) {
              const status = mapSubscriptionStatus(subscription.status);
              await storage.updateTenantSubscriptionStatus(tenant.id, status);
              console.log(`Updated tenant ${tenant.id} subscription status to ${status}`);
            } else {
              console.warn(`No tenant found for Stripe customer ${customerId}`);
            }
            break;
          }

          case "customer.subscription.deleted": {
            const subscription = event.data.object as Stripe.Subscription;
            const customerId = subscription.customer as string;
            const tenant = await storage.getTenantByStripeCustomerId(customerId);

            if (tenant) {
              await storage.updateTenantSubscriptionStatus(tenant.id, "canceled");
              console.log(`Canceled subscription for tenant ${tenant.id}`);
            } else {
              console.warn(`No tenant found for Stripe customer ${customerId}`);
            }
            break;
          }

          case "invoice.payment_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            const customerId = invoice.customer as string;
            const tenant = await storage.getTenantByStripeCustomerId(customerId);

            if (tenant) {
              await storage.updateTenantSubscriptionStatus(tenant.id, "past_due");
              console.log(`Payment failed for tenant ${tenant.id}`);
            } else {
              console.warn(`No tenant found for Stripe customer ${customerId}`);
            }
            break;
          }

          default:
            console.log(`Unhandled event type ${event.type}`);
        }

        // Record only after successful processing so a transient failure can be retried.
        await storage.markWebhookEventProcessed(event.id, event.type);

        res.json({ received: true });
      } catch (error) {
        console.error("Error processing webhook:", error);
        res.status(500).json({ error: "Webhook processing failed" });
      }
    }
  );
}
