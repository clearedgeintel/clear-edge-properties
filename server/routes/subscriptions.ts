import { Router } from "express";
import { storage } from "../storage";
import { requireAuth } from "./middleware";
import { stripe, PRICE_ID } from "../lib/stripe";
import { getTierLimits } from "../lib/tier-limits";

const router = Router();

// ---------------------------------------------------------------------------
// Billing now lives on the TENANT (multi-tenant Supabase schema). Stripe
// customers/subscriptions are keyed to the tenant; subscription status is read
// from req.ctx.tenant. The legacy single-tenant subscription_packages /
// usage_events subsystem was retired, so those endpoints were dropped.
// ---------------------------------------------------------------------------

// Create (or reuse) a Stripe subscription for the caller's tenant.
router.post('/api/create-subscription', requireAuth, async (req: any, res) => {
  try {
    const { tenant } = req.ctx;

    // Development mode mock response when Stripe isn't properly configured.
    if (!stripe || !process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('dummy')) {
      await storage.updateTenantSubscriptionStatus(tenant.id, 'active');
      return res.json({
        subscriptionId: 'sub_dev_mock',
        clientSecret: 'pi_dev_mock_client_secret',
        status: 'active',
        message: 'Development mode: Subscription activated',
      });
    }

    // If the tenant already has an active subscription, return it as-is.
    if (tenant.stripeSubscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(tenant.stripeSubscriptionId);
      if (subscription.status === 'active' || subscription.status === 'trialing') {
        return res.json({
          subscriptionId: subscription.id,
          status: subscription.status,
        });
      }
    }

    // Create a Stripe customer for the tenant if it doesn't have one yet.
    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.ctx.user.email,
        name: tenant.name,
        metadata: { tenantId: tenant.id },
      });
      customerId = customer.id;
      await storage.updateTenantStripeInfo(tenant.id, customerId, tenant.stripeSubscriptionId ?? '');
    }

    // Create the subscription.
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: PRICE_ID }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    // Persist customer + subscription on the tenant.
    await storage.updateTenantStripeInfo(tenant.id, customerId, subscription.id);

    const invoice = subscription.latest_invoice as any;

    res.json({
      subscriptionId: subscription.id,
      clientSecret: invoice?.payment_intent?.client_secret,
    });
  } catch (error: any) {
    console.error('Subscription creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stripe billing portal - lets a tenant manage their subscription.
router.post('/api/billing-portal', requireAuth, async (req: any, res) => {
  try {
    const { tenant } = req.ctx;
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (isDevelopment || !stripe) {
      return res.json({ url: '/pricing' });
    }

    if (!tenant.stripeCustomerId) {
      return res.status(400).json({ error: 'No billing account found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${req.headers.origin || 'http://localhost:5000'}/profile`,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Billing portal error:', error);
    res.status(500).json({ error: 'Failed to create billing portal session' });
  }
});

// Current tenant's tier limits + subscription status.
router.get('/api/tier-limits', requireAuth, async (req: any, res) => {
  const { tenant } = req.ctx;
  const tier = tenant?.subscriptionTier || 'free';
  const limits = getTierLimits(tier);
  res.json({ tier, status: tenant?.subscriptionStatus ?? 'inactive', limits });
});

export default router;
