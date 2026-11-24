import { NextResponse } from 'next/server';
import { getViewer } from '@/lib/auth';
import {
  isStripeConfigured,
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
  siteUrlFrom,
  stripePriceId,
} from '@/lib/env';
import { getStripe } from '@/lib/stripe';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function back(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, siteUrlFrom(request.url)), 303);
}

/** 月額500円のサブスクリプションCheckoutセッションを作成してStripeへ送る */
export async function POST(request: Request) {
  if (!isStripeConfigured() || !isSupabaseConfigured()) {
    return back(request, '/app?checkout=unavailable');
  }

  const viewer = await getViewer();
  if (!viewer) return back(request, `/signin?next=${encodeURIComponent('/app')}`);
  if (viewer.isPro) return back(request, '/app');

  try {
    const stripe = getStripe();
    const base = siteUrlFrom(request.url);

    let customerId = viewer.profile.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: viewer.user.email ?? undefined,
        metadata: { supabase_user_id: viewer.user.id },
      });
      customerId = customer.id;
      const db = isSupabaseAdminConfigured() ? createSupabaseAdminClient() : await createSupabaseServerClient();
      const { error } = await db
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', viewer.user.id);
      if (error) console.error('[stripe] failed to save customer id', error.message);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: viewer.user.id,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      locale: 'ja',
      subscription_data: {
        metadata: { supabase_user_id: viewer.user.id },
      },
      metadata: { supabase_user_id: viewer.user.id, plan: 'pro' },
      success_url: `${base}/app?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/app?checkout=cancel`,
    });

    if (!session.url) throw new Error('checkout session url is empty');
    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    console.error('[stripe] checkout failed', error);
    return back(request, '/app?checkout=error');
  }
}

/** GETで来た場合はCheckoutを作らずに案内へ戻す */
export async function GET(request: Request) {
  return back(request, '/#pricing');
}
