import { NextResponse } from 'next/server';
import { createImplicitAuthClient } from '@/lib/supabase/implicit';
import { isSupabaseConfigured, siteUrlFrom } from '@/lib/env';
import { safeNextPath } from '@/lib/next-path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * メールでログインリンクを送る（Supabase Auth のマジックリンク）。
 *
 * implicit フローで送るため、リンクを踏むと /auth/callback に
 * `#access_token=...&refresh_token=...` が返る。PKCE の code_verifier Cookie に
 * 依存しないので、iPhone の Gmail アプリ内ブラウザ等で開いても失敗しない。
 */
export async function POST(request: Request) {
  const base = siteUrlFrom(request.url);
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL('/signin?error=demo', base), 303);
  }

  const form = await request.formData();
  const email = String(form.get('email') ?? '').trim();
  const next = safeNextPath(String(form.get('next') ?? '/app'));

  if (!EMAIL_RE.test(email)) {
    return NextResponse.redirect(
      new URL(`/signin?error=email&next=${encodeURIComponent(next)}`, base),
      303,
    );
  }

  try {
    const supabase = createImplicitAuthClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${base}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      console.error('[auth] signInWithOtp failed', error.message);
      return NextResponse.redirect(
        new URL(`/signin?error=send&next=${encodeURIComponent(next)}`, base),
        303,
      );
    }
  } catch (error) {
    console.error('[auth] signInWithOtp exception', error);
    return NextResponse.redirect(
      new URL(`/signin?error=send&next=${encodeURIComponent(next)}`, base),
      303,
    );
  }

  return NextResponse.redirect(
    new URL(
      `/signin?sent=1&email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`,
      base,
    ),
    303,
  );
}

export async function GET(request: Request) {
  return NextResponse.redirect(new URL('/signin', siteUrlFrom(request.url)), 303);
}
