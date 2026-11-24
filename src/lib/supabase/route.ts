import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { supabaseAnonKey, supabaseUrl } from '@/lib/env';

/**
 * Route Handler 用の Supabase クライアント。
 *
 * `cookies()` に書いた値が `NextResponse.redirect()` のレスポンスに乗るかは
 * 環境依存なため、書き込まれた Cookie を保持しておき、最後に
 * `applyCookies(response)` でレスポンスへ直接セットする（Set-Cookie の取りこぼし防止）。
 */
export async function createSupabaseRouteClient() {
  const cookieStore = await cookies();
  const pendingCookies = new Map<string, { value: string; options: CookieOptions }>();
  const pendingHeaders = new Map<string, string>();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value, options } of cookiesToSet) {
          pendingCookies.set(name, { value, options });
          try {
            cookieStore.set(name, value, options);
          } catch {
            // `cookies()` に書き込めない文脈でも、レスポンス側でセットするため無視してよい
          }
        }
        // 認証 Cookie を含むレスポンスが CDN にキャッシュされないよう付与する
        for (const [key, value] of Object.entries(headers ?? {})) {
          pendingHeaders.set(key, value);
        }
      },
    },
  });

  return {
    supabase,
    /** 認証 Cookie（とキャッシュ禁止ヘッダー）をレスポンスに反映する */
    applyCookies<T extends NextResponse>(response: T): T {
      for (const [name, { value, options }] of pendingCookies) {
        response.cookies.set(name, value, options);
      }
      for (const [key, value] of pendingHeaders) {
        response.headers.set(key, value);
      }
      response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0');
      return response;
    },
  };
}
