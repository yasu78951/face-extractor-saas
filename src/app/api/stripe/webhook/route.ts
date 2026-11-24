import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import {
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
  stripeWebhookSecret,
} from '@/lib/env';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function periodEndIso(subscription: Stripe.Subscription): string | null {
  // Stripe API 2025-xx 以降は items 側に current_period_end が移っている
  const item = subscription.items?.data?.[0] as unknown as { current_period_end?: number } | undefined;
  const legacy = (subscription as unknown as { current_period_end?: number }).current_period_end;
  const seconds = item?.current_period_end ?? legacy;
  return typeof seconds === 'number' ? new Date(seconds * 1000).toISOString() : null;
}

function planForStatus(status: Stripe.Subscription.Status): 'pro' | 'free' {
  return status === 'active' || status === 'trialing' ? 'pro' : 'free';
}

async function updateByUserId(
  userId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const db = createSupabaseAdminClient();
  const { error } = await db.from('profiles').update(patch).eq('id', userId);
  if (error) throw new Error(`profiles update failed (user ${userId}): ${error.message}`);
}

async function updateByCustomerId(
  customerId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('profiles')
    .update(patch)
    .eq('stripe_customer_id', customerId)
    .select('id');
  if (error) throw new Error(`profiles update failed (customer ${customerId}): ${error.message}`);
  if (!data || data.length === 0) {
    console.warn('[stripe webhook] no profile matched customer', customerId);
  }
}

/**
 * Stripe Webhook。プラン状態をSupabase（profiles.plan）へ反映する。
 * 署名検証には raw body が必要なので request.text() を使う。
 */
export async function POST(request: Request) {
  if (!stripeWebhookSecret) {
    console.error('[stripe webhook] STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'webhook secret not configured' }, { status: 500 });
  }
  if (!isSupabaseConfigured() || !isSupabaseAdminConfigured()) {
    console.error('[stripe webhook] Supabase admin env is not configured');
    return NextResponse.json({ error: 'supabase not configured' }, { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'missing stripe-signature header' }, { status: 400 });
  }

  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, stripeWebhookSecret);
  } catch (error) {
    console.error('[stripe webhook] signature verification failed', error);
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id ?? session.metadata?.supabase_user_id ?? null;
        const customerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id ?? null;

        let status: Stripe.Subscription.Status = 'active';
        let periodEnd: string | null = null;
        if (subscriptionId) {
          const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
          status = subscription.status;
          periodEnd = periodEndIso(subscription);
        }

        const patch = {
          plan: planForStatus(status),
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_status: status,
          current_period_end: periodEnd,
        };

        if (userId) {
          await updateByUserId(userId, patch);
        } else if (customerId) {
          await updateByCustomerId(customerId, patch);
        } else {
          console.warn('[stripe webhook] checkout.session.completed without user/customer');
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id ?? null;
        const customerId =
          typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
        const patch = {
          plan: planForStatus(subscription.status),
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.status,
          current_period_end: periodEndIso(subscription),
          stripe_customer_id: customerId,
        };
        if (userId) await updateByUserId(userId, patch);
        else await updateByCustomerId(customerId, patch);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id ?? null;
        const customerId =
          typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
        const patch = {
          plan: 'free' as const,
          subscription_status: subscription.status,
          current_period_end: periodEndIso(subscription),
        };
        if (userId) await updateByUserId(userId, patch);
        else await updateByCustomerId(customerId, patch);
        break;
      }

      default:
        // 他のイベントは無視（200を返してStripeの再送を止める）
        break;
    }
  } catch (error) {
    console.error('[stripe webhook] handler failed', event.type, error);
    return NextResponse.json({ error: 'handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
