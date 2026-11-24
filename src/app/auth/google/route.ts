import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, siteUrlFrom } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Googleでログイン（Supabase OAuth） */
export async function GET(request: Request) {
  const base = siteUrlFrom(request.url);
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL('/signin?error=demo', base), 303);
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${base}/auth/callback?next=${encodeURIComponent('/app')}`,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error || !data.url) {
      console.error('[auth] google oauth failed', error?.message);
      return NextResponse.redirect(new URL('/signin?error=google', base), 303);
    }
    return NextResponse.redirect(data.url, 303);
  } catch (error) {
    console.error('[auth] google oauth exception', error);
    return NextResponse.redirect(new URL('/signin?error=google', base), 303);
  }
}
