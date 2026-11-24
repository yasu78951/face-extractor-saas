import type { MetadataRoute } from 'next';
import { PUBLIC_PAGES, SITE_URL } from '@/lib/site';
import { withLangPath } from '@/lib/i18n';

/**
 * /sitemap.xml
 * 検索エンジンに登録する公開ページの一覧（ログイン画面・APIは載せない）。
 * 日本語ページと英語ページ（`?lang=en`）を hreflang で相互に示す。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_PAGES.flatMap((page) => [
    {
      url: `${SITE_URL}${page.path}`,
      lastModified,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: {
        languages: {
          ja: `${SITE_URL}${page.path}`,
          en: `${SITE_URL}${withLangPath(page.path, 'en')}`,
        },
      },
    },
  ]);
}
