import { cookies, headers } from 'next/headers';
import {
  LANG_COOKIE,
  LANG_HEADER,
  isCrawler,
  langFromAcceptLanguage,
  normalizeLang,
  type Lang,
} from './i18n';

/**
 * このリクエストの表示言語を返す（サーバー専用）。
 *
 * proxy（src/proxy.ts）が `?lang=` → Cookie → Accept-Language の順で解決し、
 * `x-fe-lang` ヘッダーに入れて渡す。proxy を通らない経路（直接のAPI呼び出し等）でも
 * 同じ優先順位で判定できるよう、Cookie と Accept-Language もここで読む。
 */
export async function getLang(queryLang?: string | string[] | null): Promise<Lang> {
  const fromQuery = normalizeLang(Array.isArray(queryLang) ? queryLang[0] : queryLang);
  if (fromQuery) return fromQuery;

  const headerStore = await headers();

  const fromHeader = normalizeLang(headerStore.get(LANG_HEADER));
  if (fromHeader) return fromHeader;

  const cookieStore = await cookies();
  const fromCookie = normalizeLang(cookieStore.get(LANG_COOKIE)?.value);
  if (fromCookie) return fromCookie;

  // クローラーは既存の日本語ページを維持する
  if (isCrawler(headerStore.get('user-agent'))) return 'ja';

  return langFromAcceptLanguage(headerStore.get('accept-language'));
}

/** クエリ `lang` の値（第一値）を Language として読む */
export function queryLang(value: string | string[] | null | undefined): Lang | null {
  return normalizeLang(Array.isArray(value) ? value[0] : value);
}
