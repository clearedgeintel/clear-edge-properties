import Stripe from 'stripe';

// Development mode fallbacks
const isDevelopment = process.env.NODE_ENV === 'development';

if (!process.env.STRIPE_SECRET_KEY && !isDevelopment) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

if (!process.env.STRIPE_PRICE_ID && !isDevelopment) {
  throw new Error('Missing required Stripe price ID: STRIPE_PRICE_ID');
}

// Use dummy key in development if not provided
const stripeKey = process.env.STRIPE_SECRET_KEY || (isDevelopment ? 'sk_test_dummy_key_for_development' : '');

export const stripe = stripeKey.startsWith('sk_') ? new Stripe(stripeKey, {
  apiVersion: '2025-05-28.basil',
}) : null;

export const PRICE_ID = process.env.STRIPE_PRICE_ID || (isDevelopment ? 'price_dummy_development' : '');
