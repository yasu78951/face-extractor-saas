'use client';

import { usePathname } from 'next/navigation';
import {
  LANG_COOKIE,
  LANG_COOKIE_MAX_AGE,
  langSwitchAria,
  otherLang,
  withLangPath,
  type Lang,
} from '@/lib/i18n';

/**
 * ヘッダー右上の言語切替（JP / EN）。
 *
 * - ふつうのリンクなので JavaScript が無くても動く（`?lang=` を見た proxy が Cookie `fe_lang` を保存する）
 * - JavaScript があるときは、いまのクエリ（例 `/app?plan=pro`）を保ったまま Cookie を更新して移動する
 */
export function LanguageSwitcher({ lang, compact = false }: { lang: Lang; compact?: boolean }) {
  const pathname = usePathname() || '/';
  const target = otherLang(lang);

  const go = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof window === 'undefined') return;
    event.preventDefault();
    const url = new URL(window.location.href);
    url.searchParams.set('lang', target);
    document.cookie = `${LANG_COOKIE}=${target}; path=/; max-age=${LANG_COOKIE_MAX_AGE}; SameSite=Lax`;
    window.location.assign(url.toString());
  };

  return (
    <div
      className={`lang-switch${compact ? ' compact' : ''}`}
      role="group"
      aria-label={langSwitchAria(lang)}
    >
      <a
        href={withLangPath(pathname, 'ja')}
        hrefLang="ja"
        className={lang === 'ja' ? 'active' : ''}
        aria-current={lang === 'ja' ? 'true' : undefined}
        onClick={(event) => {
          if (lang === 'ja') {
            event.preventDefault();
            return;
          }
          go(event);
        }}
        title="日本語"
      >
        JP
      </a>
      <span className="lang-sep" aria-hidden="true" />
      <a
        href={withLangPath(pathname, 'en')}
        hrefLang="en"
        className={lang === 'en' ? 'active' : ''}
        aria-current={lang === 'en' ? 'true' : undefined}
        onClick={(event) => {
          if (lang === 'en') {
            event.preventDefault();
            return;
          }
          go(event);
        }}
        title="English"
      >
        EN
      </a>
    </div>
  );
}
