import { NextResponse } from 'next/server';
import { getViewer } from '@/lib/auth';
import { isStripeConfigured, isSupabaseConfigured, siteUrlFrom, stripePortalConfigurationId } from '@/lib/env';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function back(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, siteUrlFrom(request.url)), 303);
}

/** Stripeカスタマーポータル（プラン確認・カード変更・解約）を開く */
export async function POST(request: Request) {
  if (!isStripeConfigured() || !isSupabaseConfigured()) {
    return back(request, '/app?checkout=unavailable');
  }
  const viewer = await getViewer();
  if (!viewer) return back(request, `/signin?next=${encodeURIComponent('/app')}`);

  if (!viewer.profile.stripe_customer_id) {
    // まだ一度も決済していない場合はCheckoutへ
    return back(request, '/#pricing');
  }

  try {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: viewer.profile.stripe_customer_id,
      return_url: `${siteUrlFrom(request.url)}/app`,
      ...(stripePortalConfigurationId ? { configuration: stripePortalConfigurationId } : {}),
    });
    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    console.error('[stripe] portal failed', error);
    return back(request, '/app?checkout=error');
  }
}

export async function GET(request: Request) {
  return back(request, '/app');
}
