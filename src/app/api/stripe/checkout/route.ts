import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getViewer } from '@/lib/auth';
import {
  isStripeConfigured,
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
  siteUrlFrom,
  stripePriceIdFor,
} from '@/lib/env';
import { LANG_COOKIE, langFromAcceptLanguage, normalizeLang, type Lang } from '@/lib/i18n';
import { getStripe } from '@/lib/stripe';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function back(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, siteUrlFrom(request.url)), 303);
}

/**
 * 決済に使う表示言語を決める。優先順位は画面と同じ:
 * `?lang=` → フォームの hidden `lang` → Cookie `fe_lang` → Accept-Language（`ja` を含まなければ英語）
 */
async function checkoutLang(request: Request): Promise<Lang> {
  const url = new URL(request.url);
  const fromQuery = normalizeLang(url.searchParams.get('lang'));
  if (fromQuery) return fromQuery;

  if (request.method === 'POST') {
    try {
      const form = await request.clone().formData();
      const fromForm = normalizeLang(String(form.get('lang') ?? ''));
      if (fromForm) return fromForm;
    } catch {
      // FormData でないリクエストは無視
    }
  }

  const store = await cookies();
  const fromCookie = normalizeLang(store.get(LANG_COOKIE)?.value);
  if (fromCookie) return fromCookie;

  return langFromAcceptLanguage(request.headers.get('accept-language'));
}

/** 表示言語のサブスクリプションPriceでCheckoutセッションを作成してStripeへ送る */
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
    const lang = await checkoutLang(request);
    const locale = lang;
    // 英語表示はUSD（未設定時はJPYへフォールバック）、日本語表示は従来のJPY
    const priceId = stripePriceIdFor(lang);

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
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      locale,
      subscription_data: {
        metadata: { supabase_user_id: viewer.user.id },
      },
      metadata: { supabase_user_id: viewer.user.id, plan: 'pro', lang, price_id: priceId },
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
