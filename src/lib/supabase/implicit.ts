import { createClient } from '@supabase/supabase-js';
import { supabaseAnonKey, supabaseUrl } from '@/lib/env';

/**
 * メールログインリンク送信用の Supabase クライアント。
 *
 * 既定の `createSupabaseServerClient()`（@supabase/ssr）は PKCE で動くため、
 * リンクを開いたブラウザに `code_verifier` Cookie が残っていないと認証できず、
 * iPhone の Gmail アプリ内ブラウザ等で開くと必ず失敗する。
 *
 * そこでリンク送信だけは implicit フローで行い、メールのリンクを踏むと
 * `#access_token=...&refresh_token=...` が /auth/callback に返るようにする
 * （Cookie を引き継げない環境でも、その場でセッションを作れる）。
 * セッションはサーバー側では保持しないため永続化は無効にする。
 */
export function createImplicitAuthClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'implicit',
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
