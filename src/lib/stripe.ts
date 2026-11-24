import Stripe from 'stripe';
import { stripeSecretKey } from '@/lib/env';

let cached: Stripe | null = null;

/** Stripeクライアント（サーバー専用） */
export function getStripe(): Stripe {
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  if (!cached) {
    cached = new Stripe(stripeSecretKey, {
      appInfo: { name: 'face-extractor-saas', version: '1.0.0' },
      typescript: true,
    });
  }
  return cached;
}
