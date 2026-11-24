/**
 * 環境変数。NEXT_PUBLIC_* 以外はサーバー側でのみ読む。
 * 未設定の場合は「デモモード」で動く（画面検証・プレビュー用）。
 */

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export const stripeSecretKey = process.env.STRIPE_SECRET_KEY ?? '';
/** 日本語表示用のPrice（¥500/月） */
export const stripePriceId = process.env.STRIPE_PRICE_ID ?? '';
/** 英語表示用のPrice（$4.99/月）。未設定なら日本語用Priceへフォールバックする */
export const stripePriceIdUsd = process.env.STRIPE_PRICE_ID_USD ?? '';
export const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

/** Stripeのカスタマーポータル設定ID（任意。未設定ならダッシュボードの既定設定） */
export const stripePortalConfigurationId = process.env.STRIPE_PORTAL_CONFIGURATION_ID ?? '';

/**
 * 未ログイン（匿名）利用の回数Cookieを署名する鍵（任意）。
 * 未設定なら SUPABASE_SERVICE_ROLE_KEY を使い、それも無いデモモードでは開発用の固定鍵にフォールバックする。
 * 値を変えると既存Cookieの署名が無効になり、その日の回数はリセットされる。
 */
export const usageCookieSecretEnv = process.env.USAGE_COOKIE_SECRET ?? '';

const DEV_USAGE_COOKIE_SECRET = 'face-extractor-anon-usage-dev-secret';

export function usageCookieSecret(): string {
  return usageCookieSecretEnv || supabaseServiceRoleKey || DEV_USAGE_COOKIE_SECRET;
}

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
/** 英語表示用の月額（USD）。Stripeの `STRIPE_PRICE_ID_USD` と同じ金額に保つこと */
export const PRO_PRICE_USD = 4.99;

/** 表示言語に対応するStripeのPrice ID（英語でもUSD未設定ならJPYへフォールバック） */
export function stripePriceIdFor(lang: 'ja' | 'en'): string {
  return lang === 'en' && stripePriceIdUsd ? stripePriceIdUsd : stripePriceId;
}

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
