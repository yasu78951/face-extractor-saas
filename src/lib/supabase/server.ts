import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAnonKey, supabaseUrl } from '@/lib/env';

/**
 * リクエストのcookieを使うSupabaseクライアント（Server Components / Route Handlers用）。
 * Server Componentsではcookieの書き込みに失敗するが、セッション更新はmiddlewareやRoute Handlerで行うため問題ない。
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Componentから呼ばれた場合は書き込めない（無視してよい）
        }
      },
    },
  });
}
