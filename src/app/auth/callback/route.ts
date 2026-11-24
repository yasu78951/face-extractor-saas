import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, siteUrlFrom } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Supabase Auth のコールバック（メールリンク / OAuth） */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const base = siteUrlFrom(request.url);
  const code = url.searchParams.get('code');
  const nextParam = url.searchParams.get('next') ?? '/app';
  const next = nextParam.startsWith('/') ? nextParam : '/app';

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL('/signin?error=demo', base), 303);
  }
  if (!code) {
    return NextResponse.redirect(new URL('/signin?error=auth', base), 303);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[auth] exchangeCodeForSession failed', error.message);
      return NextResponse.redirect(new URL('/signin?error=auth', base), 303);
    }
  } catch (error) {
    console.error('[auth] callback exception', error);
    return NextResponse.redirect(new URL('/signin?error=auth', base), 303);
  }

  return NextResponse.redirect(new URL(next, base), 303);
}
