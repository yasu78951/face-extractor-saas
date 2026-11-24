import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';
import { isSupabaseConfigured, siteUrlFrom } from '@/lib/env';
import { safeNextPath } from '@/lib/next-path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Googleでログイン（Supabase OAuth）。?next=/... でログイン後の戻り先を指定できる */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const base = siteUrlFrom(request.url);
  const next = safeNextPath(url.searchParams.get('next'));

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL('/signin?error=demo', base), 303);
  }
  try {
    const { supabase, applyCookies } = await createSupabaseRouteClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // /auth/callback は client 側で `?code=` を /auth/exchange へ渡す
        redirectTo: `${base}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error || !data.url) {
      console.error('[auth] google oauth failed', error?.message);
      return NextResponse.redirect(new URL('/signin?error=google', base), 303);
    }
    // code_verifier Cookie を確実にレスポンスへ載せてから Google へ送る
    return applyCookies(NextResponse.redirect(data.url, 303));
  } catch (error) {
    console.error('[auth] google oauth exception', error);
    return NextResponse.redirect(new URL('/signin?error=google', base), 303);
  }
}
