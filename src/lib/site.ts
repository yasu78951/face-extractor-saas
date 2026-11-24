/**
 * サイト共通の定数（SEO・サイトマップ・構造化データ用）。
 * 本番URLは固定。canonical / OGP / sitemap が常に本番ドメインを指すようにする。
 */

import type { Metadata } from 'next';

export const SITE_URL = 'https://face-extractor-saas.vercel.app';

export const SITE_NAME = 'ベストショット抽出';

export const SITE_TITLE = '動画からベストな顔写真を自動抽出｜AI高画質化・iPhone対応';

export const SITE_DESCRIPTION =
  '動画から「正面・ピント・大きさ」でベストショットを自動抽出し、高画質な顔写真として保存できるWebツール。処理はすべて端末内で完結し、動画が外部に送信されることはありません。iPhoneのSafariでも使え、無料プランは1日3本まで、Proプラン（月額500円）は本数無制限・AI超解像つき。';

export const SITE_KEYWORDS = [
  '動画 顔 抽出',
  'ベストショット 自動選択',
  '動画 切り出し 高画質化',
  '動画から顔写真',
  '顔写真 抽出 無料',
  'AI 超解像 顔写真',
  'iPhone 動画 写真 保存',
];

/** OGP/Twitterカード用の代表画像（820×820） */
export const SITE_OG_IMAGE = {
  url: '/images/sample-best.jpg',
  width: 820,
  height: 820,
  alt: 'AI超解像で仕上げた顔写真のサンプル',
} as const;

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
 * canonical・OGP・Twitterカードをページごとに正しく揃えるため、各ページでこれを使う。
 */
export function pageMetadata(options: {
  title: string;
  description: string;
  /** canonical にするパス（例 '/terms'）。noindex のページでは省略する */
  path?: string;
  /** タイトルに「｜ベストショット抽出」を付けない（トップなど） */
  absoluteTitle?: boolean;
  noindex?: boolean;
}): Metadata {
  const { title, description, path, absoluteTitle = false, noindex = false } = options;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    ...(path && !noindex ? { alternates: { canonical: path } } : {}),
    openGraph: {
      type: 'website',
      locale: 'ja_JP',
      siteName: SITE_NAME,
      title,
      description,
      ...(path ? { url: path } : {}),
      images: [SITE_OG_IMAGE],
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
