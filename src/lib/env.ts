/**
 * 環境変数。NEXT_PUBLIC_* 以外はサーバー側でのみ読む。
 * 未設定の場合は「デモモード」で動く（画面検証・プレビュー用）。
 */

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export const stripeSecretKey = process.env.STRIPE_SECRET_KEY ?? '';
export const stripePriceId = process.env.STRIPE_PRICE_ID ?? '';
export const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

/** Stripeのカスタマーポータル設定ID（任意。未設定ならダッシュボードの既定設定） */
export const stripePortalConfigurationId = process.env.STRIPE_PORTAL_CONFIGURATION_ID ?? '';

/**
 * 公開URL。Vercelでは VERCEL_PROJECT_PRODUCTION_URL から組み立てる。
 * ローカル検証時は未設定でよい（request.url をフォールバックに使う）。
 */
export function siteUrlFrom(requestUrl: string): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
  if (vercel) return vercel.startsWith('http') ? vercel.replace(/\/$/, '') : `https://${vercel}`;
  try {
    const u = new URL(requestUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    return 'http://localhost:3000';
  }
}

export const plans = {
  free: { id: 'free', name: '無料プラン', price: 0, dailyLimit: 3, maxSeconds: 300 },
  pro: { id: 'pro', name: 'Proプラン', price: 500, dailyLimit: null as number | null, maxSeconds: null as number | null },
} as const;

export const FREE_DAILY_LIMIT = plans.free.dailyLimit;
export const FREE_MAX_SECONDS = plans.free.maxSeconds;
export const PRO_PRICE_JPY = plans.pro.price;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

export function isStripeConfigured(): boolean {
  return Boolean(stripeSecretKey && stripePriceId);
}

/** Supabase未接続時のプレビュー動作（ログインなしでツール画面を確認できる） */
export function isDemoMode(): boolean {
  return !isSupabaseConfigured();
}
