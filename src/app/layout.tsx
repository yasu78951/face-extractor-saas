import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { getViewer, type Viewer } from '@/lib/auth';
import { SiteFooter, SiteHeader } from '@/components/SiteHeader';
import { isDemoMode } from '@/lib/env';
import { htmlLang, ogLocale, withLangPath } from '@/lib/i18n';
import { getLang } from '@/lib/i18n-server';
import { messages } from '@/lib/messages';
import { SITE_OG_IMAGE, SITE_URL, siteNameFor } from '@/lib/site';

/** Google Search Console の所有権確認トークン（環境変数 NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION で差し替え可能） */
const googleSiteVerification =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || 'n3ASV73EFZW1g2zgjQWNVcRHV0-kmr0ZTCiGlSVm__E';

/** ページごとのタイトルはそのままに、サイト名の区切りだけ言語に合わせる */
export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = messages[lang].common;
  const siteName = siteNameFor(lang);

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t.siteTitle,
      template: lang === 'en' ? `%s | ${siteName}` : `%s｜${siteName}`,
    },
    description: t.siteDescription,
    keywords: t.keywords,
    applicationName: siteName,
    authors: [{ name: siteName, url: SITE_URL }],
    creator: siteName,
    publisher: siteName,
    alternates: {
      languages: { ja: '/', en: withLangPath('/', 'en'), 'x-default': '/' },
    },
    openGraph: {
      type: 'website',
      locale: ogLocale(lang),
      siteName,
      title: t.siteTitle,
      description: t.siteDescription,
      url: lang === 'en' ? withLangPath('/', 'en') : SITE_URL,
      images: [{ ...SITE_OG_IMAGE, alt: t.ogImageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t.siteTitle,
      description: t.siteDescription,
      images: [SITE_OG_IMAGE.url],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    verification: { google: googleSiteVerification },
    other: {
      // 検索エンジンに「同じURLでも言語で内容が変わる」ことを伝える
      'content-language': lang,
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#3b5bdb',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let viewer: Viewer | null = null;
  try {
    viewer = await getViewer();
  } catch {
    viewer = null;
  }

  const lang = await getLang();

  return (
    <html lang={htmlLang(lang)}>
      <body>
        {isDemoMode() ? (
          <div className="demo-bar">{messages[lang].demoBar}</div>
        ) : null}
        <SiteHeader viewer={viewer} lang={lang} />
        {children}
        <SiteFooter lang={lang} />
        <Analytics />
      </body>
    </html>
  );
}
