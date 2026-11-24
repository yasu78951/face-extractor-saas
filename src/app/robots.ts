import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/**
 * /robots.txt
 * 公開ページは全許可、API・認証・ログイン画面のみクロール対象外にする。
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth/', '/signin'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
