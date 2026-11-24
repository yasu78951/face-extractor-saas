import type { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { FREE_DAILY_LIMIT, isSupabaseAdminConfigured, isSupabaseConfigured } from '@/lib/env';

export type PlanId = 'free' | 'pro';

export type Profile = {
  id: string;
  email: string | null;
  plan: PlanId;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
};

export type Viewer = {
  user: User;
  profile: Profile;
  isPro: boolean;
};

export type UsageStatus = {
  plan: PlanId;
  limit: number | null;
  used: number;
  remaining: number | null;
};

const PROFILE_COLUMNS =
  'id, email, plan, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_end';

export function isProPlan(plan: string | null | undefined): boolean {
  return plan === 'pro';
}

/** 日本時間（Asia/Tokyo）のYYYY-MM-DD */
export function jstToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export async function getViewer(): Promise<Viewer | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await loadOrCreateProfile(user);
  return { user, profile, isPro: isProPlan(profile.plan) };
}

async function loadOrCreateProfile(user: User): Promise<Profile> {
  const db = isSupabaseAdminConfigured() ? createSupabaseAdminClient() : await createSupabaseServerClient();
  const { data } = await db.from('profiles').select(PROFILE_COLUMNS).eq('id', user.id).maybeSingle();
  if (data) return data as unknown as Profile;

  const draft = { id: user.id, email: user.email ?? null };
  const { data: inserted } = await db
    .from('profiles')
    .upsert(draft, { onConflict: 'id' })
    .select(PROFILE_COLUMNS)
    .maybeSingle();

  if (inserted) return inserted as unknown as Profile;

  return {
    id: user.id,
    email: user.email ?? null,
    plan: 'free',
    stripe_customer_id: null,
    stripe_subscription_id: null,
    subscription_status: null,
    current_period_end: null,
  };
}

export async function getProfileById(userId: string): Promise<Profile | null> {
  const db = isSupabaseAdminConfigured() ? createSupabaseAdminClient() : await createSupabaseServerClient();
  const { data } = await db.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle();
  return (data as unknown as Profile) ?? null;
}

export async function getUsageStatus(userId: string, plan: PlanId): Promise<UsageStatus> {
  if (plan === 'pro') {
    return { plan: 'pro', limit: null, used: 0, remaining: null };
  }
  const db = isSupabaseAdminConfigured() ? createSupabaseAdminClient() : await createSupabaseServerClient();
  const { data } = await db
    .from('daily_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('usage_date', jstToday())
    .maybeSingle();
  const used = Number((data as { count?: number } | null)?.count ?? 0);
  return {
    plan: 'free',
    limit: FREE_DAILY_LIMIT,
    used,
    remaining: Math.max(0, FREE_DAILY_LIMIT - used),
  };
}
