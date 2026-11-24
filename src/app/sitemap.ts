import type { MetadataRoute } from 'next';
import { PUBLIC_PAGES, SITE_URL } from '@/lib/site';

/**
 * /sitemap.xml
 * 検索エンジンに登録する公開ページの一覧（ログイン画面・APIは載せない）。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_PAGES.map((page) => ({
    url: `${SITE_URL}${page.path === '/' ? '/' : page.path}`,
    lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
