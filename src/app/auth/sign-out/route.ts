import { NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/route';
import { isSupabaseConfigured, siteUrlFrom } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const base = siteUrlFrom(request.url);
  if (isSupabaseConfigured()) {
    try {
      const { supabase, applyCookies } = await createSupabaseRouteClient();
      await supabase.auth.signOut();
      // セッション Cookie の失効を確実にレスポンスへ載せる
      return applyCookies(NextResponse.redirect(new URL('/', base), 303));
    } catch (error) {
      console.error('[auth] signOut failed', error);
    }
  }
  return NextResponse.redirect(new URL('/', base), 303);
}

export async function GET(request: Request) {
  return NextResponse.redirect(new URL('/', siteUrlFrom(request.url)), 303);
}
