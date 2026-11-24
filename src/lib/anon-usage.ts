import { createHmac, timingSafeEqual } from 'node:crypto';
import { usageCookieSecret } from '@/lib/env';
import { jstToday } from '@/lib/jst';

/**
 * 未ログイン（匿名）利用の回数管理。
 *
 * 無料プランはログイン不要で試せるようにしたため、ログインしていない人の
 * 「今日あと何本か」をサーバー側で数える必要がある。アカウントが無いので
 * DBではなく **HMAC-SHA256 署名付きのHttpOnly Cookie** に
 * 「日付(JST) と 使用数」を持たせ、改ざんを検出する。
 *
 * - 日付が変わったら（日本時間0時）自動で0に戻る
 * - 署名鍵は SUPABASE_SERVICE_ROLE_KEY（無ければ USAGE_COOKIE_SECRET）
 * - ブラウザの履歴削除・シークレットモードではリセットされ得るが、
 *   離脱を減らすことを優先した割り切り（要件どおり）
 */

export const ANON_USAGE_COOKIE = 'fe_anon';

const VERSION = 'v1';
/** Cookieの保持期間（2日）。日付が変われば中身は使わない。 */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 2;
/** 署名の有効長（base64url 32文字 = 192bit） */
const SIG_LENGTH = 32;

export type AnonUsage = {
  /** 日本時間のYYYY-MM-DD */
  day: string;
  /** その日に解析した本数 */
  count: number;
};

function signature(day: string, count: number): string {
  return createHmac('sha256', usageCookieSecret())
    .update(`${VERSION}.${day}.${count}`)
    .digest('base64url')
    .slice(0, SIG_LENGTH);
}

function signatureMatches(expected: string, actual: string): boolean {
  if (expected.length !== actual.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(actual, 'utf8'));
  } catch {
    return false;
  }
}

/** Cookieに保存する文字列を作る（v1.YYYY-MM-DD.count.signature） */
export function serializeAnonUsage(usage: AnonUsage): string {
  return `${VERSION}.${usage.day}.${usage.count}.${signature(usage.day, usage.count)}`;
}

/**
 * Cookieの値を検証して当日の使用数を返す。
 * 署名が無い・壊れている・改ざんされている・別の日のものは「0本」として扱う。
 */
export function parseAnonUsage(raw: string | undefined | null, today: string = jstToday()): AnonUsage {
  const empty: AnonUsage = { day: today, count: 0 };
  if (!raw) return empty;

  const parts = raw.split('.');
  if (parts.length !== 4) return empty;
  const [version, day, countRaw, sig] = parts;
  if (version !== VERSION) return empty;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return empty;
  if (!/^\d{1,4}$/.test(countRaw)) return empty;

  const count = Number(countRaw);
  if (!Number.isSafeInteger(count) || count < 0) return empty;
  if (!signatureMatches(signature(day, count), sig)) return empty;

  // 日本時間の日付が変わっていたらリセット
  if (day !== today) return empty;
  return { day, count };
}

export type AnonConsumeResult =
  | { allowed: true; usage: AnonUsage }
  | { allowed: false; usage: AnonUsage };

/** 上限内なら1本加算した使用数を返す。上限に達していれば allowed:false。 */
export function consumeAnonUsage(raw: string | undefined | null, limit: number): AnonConsumeResult {
  const current = parseAnonUsage(raw);
  if (current.count >= limit) return { allowed: false, usage: current };
  return { allowed: true, usage: { day: current.day, count: current.count + 1 } };
}

/** 匿名回数Cookieの属性。httpsのときだけ Secure を付ける（ローカル検証を壊さない）。 */
export function anonCookieOptions(requestUrl: string) {
  let secure = process.env.NODE_ENV === 'production';
  try {
    secure = new URL(requestUrl).protocol === 'https:';
  } catch {
    /* URLが取れないときは NODE_ENV の判定のまま */
  }
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  };
}
