/**
 * 表示言語（日本語 / 英語）の共通定義。
 * サーバー（Server Component・proxy・API）とクライアント（言語切替ボタン）の両方から使う。
 *
 * 判定の優先順位（仕様）:
 *   1. URLクエリ `?lang=en` / `?lang=ja`（指定時はCookieにも保存）
 *   2. Cookie `fe_lang`
 *   3. `Accept-Language` ヘッダー（`ja` を含まなければ英語、含む／不明なら日本語）
 */

export type Lang = 'ja' | 'en';

export const LANGS: Lang[] = ['ja', 'en'];

/** 言語を保存するCookie名（1年間保持） */
export const LANG_COOKIE = 'fe_lang';

/** proxy がリクエストごとに確定した言語をサーバー側へ渡すヘッダー名 */
export const LANG_HEADER = 'x-fe-lang';

export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** `en` / `en-US` / `ja-JP` などを `Lang` に正規化する。対象外は null */
export function normalizeLang(value: string | null | undefined): Lang | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (!v) return null;
  if (v === 'ja' || v.startsWith('ja-') || v.startsWith('ja_')) return 'ja';
  if (v === 'en' || v.startsWith('en-') || v.startsWith('en_')) return 'en';
  return null;
}

/**
 * Accept-Language からの判定。
 * 例: `ja,en-US;q=0.9` → ja / `en-US,en;q=0.9` → en / 空 → ja（不明は日本語）
 */
export function langFromAcceptLanguage(header: string | null | undefined): Lang {
  const h = (header ?? '').toLowerCase();
  if (!h.trim()) return 'ja';
  // `ja` が言語タグとして現れるか（japanese などの語には反応しない）
  return /(^|[,\s;])ja\b/.test(h) ? 'ja' : 'en';
}

/**
 * 検索エンジン・SNSのクローラーかどうか。
 * 既存の日本語ページの評価（Google Search Console 登録済み）を守るため、
 * クローラーには Accept-Language ではなく日本語を返す（`?lang=en` とCookieは尊重する）。
 */
const CRAWLER_PATTERN =
  /(googlebot|google-inspectiontool|storebot-google|bingbot|bingpreview|slurp|duckduckbot|baiduspider|yandex(bot)?|applebot|petalbot|semrushbot|ahrefsbot|mj12bot|sogou|exabot|facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|whatsapp|embedly|pinterestbot|redditbot|ia_archiver)/i;

export function isCrawler(userAgent: string | null | undefined): boolean {
  return CRAWLER_PATTERN.test(userAgent ?? '');
}

/** `<html lang>` 用の値 */
export function htmlLang(lang: Lang): string {
  return lang === 'en' ? 'en' : 'ja';
}

/** OGP の locale */
export function ogLocale(lang: Lang): string {
  return lang === 'en' ? 'en_US' : 'ja_JP';
}

/** 言語切替ボタンの表示名（今の言語とは反対側を出す） */
export function langSwitchLabel(lang: Lang): string {
  return lang === 'en' ? 'JP' : 'EN';
}

/** 言語切替ボタンの読み上げ用ラベル */
export function langSwitchAria(lang: Lang): string {
  return lang === 'en' ? '日本語に切り替える' : 'Switch to English';
}

/**
 * パスに `lang` クエリを付ける（既存のクエリは保持する）。
 * サーバー・クライアントどちらでも使えるよう文字列だけで組み立てる。
 */
export function withLangPath(path: string, lang: Lang): string {
  const hashIndex = path.indexOf('#');
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const qIndex = withoutHash.indexOf('?');
  const pathname = qIndex >= 0 ? withoutHash.slice(0, qIndex) : withoutHash;
  const search = qIndex >= 0 ? withoutHash.slice(qIndex + 1) : '';
  const params = new URLSearchParams(search);
  params.set('lang', lang);
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ''}${hash}`;
}

/** 表示中の言語のもう一方 */
export function otherLang(lang: Lang): Lang {
  return lang === 'en' ? 'ja' : 'en';
}
