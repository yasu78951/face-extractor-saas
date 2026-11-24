import type { Metadata, Viewport } from 'next';
import './globals.css';
import { getViewer, type Viewer } from '@/lib/auth';
import { SiteFooter, SiteHeader } from '@/components/SiteHeader';
import { isDemoMode } from '@/lib/env';
import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_OG_IMAGE,
  SITE_TITLE,
  SITE_URL,
} from '@/lib/site';

/** Google Search Console の所有権確認トークン（環境変数 NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION で差し替え可能） */
const googleSiteVerification =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || 'n3ASV73EFZW1g2zgjQWNVcRHV0-kmr0ZTCiGlSVm__E';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s｜${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [SITE_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
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
};

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

  return (
    <html lang="ja">
      <body>
        {isDemoMode() ? (
          <div className="demo-bar">
            <b>デモモード</b>（Supabase未設定）: ログインなしで画面を確認できます。SETUP.md の手順で接続すると本番のログイン・課金が有効になります。
          </div>
        ) : null}
        <SiteHeader viewer={viewer} />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
