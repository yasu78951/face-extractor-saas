import { NextResponse, type NextRequest } from 'next/server';
import {
  LANG_COOKIE,
  LANG_COOKIE_MAX_AGE,
  LANG_HEADER,
  isCrawler,
  langFromAcceptLanguage,
  normalizeLang,
  type Lang,
} from '@/lib/i18n';

/**
 * 表示言語を確定して、サーバー側（Server Component・metadata）へ `x-fe-lang` で渡す。
 *
 * 優先順位:
 *   1. `?lang=en` / `?lang=ja`（指定されたら Cookie にも保存）
 *   2. Cookie `fe_lang`
 *   3. Accept-Language（`ja` を含まなければ en、含む／不明なら ja）
 *   4. クローラー（Googlebot等）は 3 を飛ばして ja（既存の日本語ページの評価を守る）
 */
export default function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const fromQuery = normalizeLang(url.searchParams.get('lang'));
  const fromCookie = normalizeLang(request.cookies.get(LANG_COOKIE)?.value);
  const userAgent = request.headers.get('user-agent');

  let lang: Lang;
  if (fromQuery) lang = fromQuery;
  else if (fromCookie) lang = fromCookie;
  else if (isCrawler(userAgent)) lang = 'ja';
  else lang = langFromAcceptLanguage(request.headers.get('accept-language'));

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LANG_HEADER, lang);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // `?lang=` で来たときは、次回以降もその言語で開けるようCookieに保存する
  if (fromQuery && fromCookie !== lang) {
    response.cookies.set(LANG_COOKIE, lang, {
      path: '/',
      maxAge: LANG_COOKIE_MAX_AGE,
      sameSite: 'lax',
    });
  }

  response.headers.set(LANG_HEADER, lang);
  // 言語によって内容が変わるため、キャッシュ/CDNにその旨を伝える
  response.headers.append('Vary', 'Accept-Language, Cookie');

  return response;
}

export const config = {
  // 静的アセット・API・認証ルートは対象外（表示言語に関係しない）
  matcher: ['/((?!api|auth|_next/static|_next/image|engine|images|favicon.ico).*)'],
};
