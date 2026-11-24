import { cookies } from 'next/headers';
import { getViewer, jstToday } from '@/lib/auth';
import { FREE_DAILY_LIMIT, isSupabaseAdminConfigured } from '@/lib/env';
import { ANON_USAGE_COOKIE, parseAnonUsage } from '@/lib/anon-usage';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type UsageSnapshot = {
  plan: 'free' | 'pro';
  /** 未ログイン（Cookie）で数えているか */
  anonymous: boolean;
  limit: number | null;
  used: number | null;
  remaining: number | null;
};

/** 未ログイン利用者の残り回数（署名Cookieから） */
export function anonUsageSnapshot(raw: string | undefined | null): UsageSnapshot {
  const usage = parseAnonUsage(raw);
  return {
    plan: 'free',
    anonymous: true,
    limit: FREE_DAILY_LIMIT,
    used: usage.count,
    remaining: Math.max(0, FREE_DAILY_LIMIT - usage.count),
  };
}

/**
 * 現在の利用状況（ログイン済みはアカウント単位、未ログインはブラウザCookie単位）。
 * Supabaseの認証確認に失敗した場合は例外を投げる（呼び出し側で503にする）。
 */
export async function getUsageSnapshot(): Promise<UsageSnapshot> {
  const viewer = await getViewer();

  if (viewer?.isPro) {
    return { plan: 'pro', anonymous: false, limit: null, used: null, remaining: null };
  }

  if (viewer) {
    const db = isSupabaseAdminConfigured() ? createSupabaseAdminClient() : await createSupabaseServerClient();
    const { data } = await db
      .from('daily_usage')
      .select('count')
      .eq('user_id', viewer.user.id)
      .eq('usage_date', jstToday())
      .maybeSingle();
    const used = Number((data as { count?: number } | null)?.count ?? 0);
    return {
      plan: 'free',
      anonymous: false,
      limit: FREE_DAILY_LIMIT,
      used,
      remaining: Math.max(0, FREE_DAILY_LIMIT - used),
    };
  }

  const store = await cookies();
  return anonUsageSnapshot(store.get(ANON_USAGE_COOKIE)?.value);
}
