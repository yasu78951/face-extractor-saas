import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createSupabaseRouteClient } from '@/lib/supabase/route';
import { isSupabaseConfigured, siteUrlFrom } from '@/lib/env';
import { safeNextPath } from '@/lib/next-path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OTP_TYPES: EmailOtpType[] = [
  'email',
  'magiclink',
  'signup',
  'recovery',
  'invite',
  'email_change',
];

function toOtpType(value: string | null): EmailOtpType | null {
  if (!value) return null;
  return OTP_TYPES.includes(value as EmailOtpType) ? (value as EmailOtpType) : null;
}

/**
 * サーバー側で認証を確定する（Google OAuth の `?code=` / メールテンプレートの `?token_hash=`）。
 *
 * セッション Cookie はレスポンスに直接セットする（`NextResponse.redirect` で
 * `cookies()` の Set-Cookie が落ちる環境でも確実に載せるため）。
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const base = siteUrlFrom(request.url);
  const next = safeNextPath(url.searchParams.get('next'));
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const otpType = toOtpType(url.searchParams.get('type'));

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL('/signin?error=demo', base), 303);
  }

  if (!code && !(tokenHash && otpType)) {
    return NextResponse.redirect(new URL('/signin?error=auth', base), 303);
  }

  const { supabase, applyCookies } = await createSupabaseRouteClient();

  try {
    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ token_hash: tokenHash as string, type: otpType as EmailOtpType });

    if (error) {
      console.error('[auth] exchange failed', error.message);
      return applyCookies(NextResponse.redirect(new URL('/signin?error=auth', base), 303));
    }
  } catch (error) {
    console.error('[auth] exchange exception', error);
    return applyCookies(NextResponse.redirect(new URL('/signin?error=auth', base), 303));
  }

  return applyCookies(NextResponse.redirect(new URL(next, base), 303));
}
