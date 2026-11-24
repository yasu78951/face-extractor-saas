/**
 * サイト共通の定数（SEO・サイトマップ・構造化データ用）。
 * 本番URLは固定。canonical / OGP / sitemap が常に本番ドメインを指すようにする。
 */

import type { Metadata } from 'next';
import { ogLocale, withLangPath, type Lang } from './i18n';
import { messages } from './messages';

export const SITE_URL = 'https://face-extractor-saas.vercel.app';

/** 日本語のサイト名 */
export const SITE_NAME = messages.ja.common.siteName;
/** 英語のサイト名 */
export const SITE_NAME_EN = messages.en.common.siteName;

export const SITE_TITLE = messages.ja.common.siteTitle;
export const SITE_DESCRIPTION = messages.ja.common.siteDescription;
export const SITE_KEYWORDS = messages.ja.common.keywords;

/** OGP/Twitterカード用の代表画像（820×820） */
export const SITE_OG_IMAGE = {
  url: '/images/sample-best.jpg',
  width: 820,
  height: 820,
  alt: messages.ja.common.ogImageAlt,
} as const;

/** 英語用のサイト名・説明 */
export function siteNameFor(lang: Lang): string {
  return lang === 'en' ? SITE_NAME_EN : SITE_NAME;
}

/** 言語ごとの hreflang 対応（canonical と相互リンク） */
export function languageAlternates(path: string): Record<string, string> {
  return {
    ja: path,
    en: withLangPath(path, 'en'),
    'x-default': path,
  };
}

/** 検索エンジンに載せる公開ページ */
export const PUBLIC_PAGES: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' }[] = [
  { path: '/', priority: 1.0, changeFrequency: 'weekly' },
  { path: '/tokushoho', priority: 0.3, changeFrequency: 'monthly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'monthly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'monthly' },
  { path: '/app', priority: 0.8, changeFrequency: 'weekly' },
];

/**
 * 下層ページのメタデータをまとめて作る。
 * canonical・OGP・Twitterカード・hreflang をページごとに正しく揃えるため、各ページでこれを使う。
 */
export function pageMetadata(options: {
  title: string;
  description: string;
  /** canonical にするパス（例 '/terms'）。noindex のページでは省略する */
  path?: string;
  /** タイトルに「｜ベストショット抽出」を付けない（トップなど） */
  absoluteTitle?: boolean;
  noindex?: boolean;
  /** 表示言語（既定は日本語） */
  lang?: Lang;
}): Metadata {
  const { title, description, path, absoluteTitle = false, noindex = false, lang = 'ja' } = options;
  const canonical = path && !noindex ? (lang === 'en' ? withLangPath(path, 'en') : path) : undefined;
  const ogUrl = path ? (lang === 'en' ? withLangPath(path, 'en') : path) : undefined;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    ...(canonical
      ? {
          alternates: {
            canonical,
            languages: languageAlternates(path as string),
          },
        }
      : {}),
    openGraph: {
      type: 'website',
      locale: ogLocale(lang),
      siteName: siteNameFor(lang),
      title,
      description,
      ...(ogUrl ? { url: ogUrl } : {}),
      images: [{ ...SITE_OG_IMAGE, alt: messages[lang].common.ogImageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [SITE_OG_IMAGE.url],
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
