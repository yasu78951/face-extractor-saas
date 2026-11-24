import { createClient } from '@supabase/supabase-js';
import { supabaseServiceRoleKey, supabaseUrl } from '@/lib/env';

/**
 * RLSをバイパスする管理者クライアント。サーバー（Route Handler / Webhook）専用。
 * ブラウザには絶対に渡さない。
 */
export function createSupabaseAdminClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
