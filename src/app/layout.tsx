import type { Metadata, Viewport } from 'next';
import './globals.css';
import { getViewer, type Viewer } from '@/lib/auth';
import { SiteFooter, SiteHeader } from '@/components/SiteHeader';
import { isDemoMode } from '@/lib/env';

export const metadata: Metadata = {
  title: 'ベストショット抽出 | 動画から顔写真を自動抽出',
  description:
    '動画から「正面・ピント・大きさ」でベストショットを自動抽出。処理はすべて端末内で完結し、動画が外部に送信されることはありません。無料プランは1日3本・5分まで、Proプラン（月額500円）は本数無制限・AI超解像つき。',
  applicationName: 'ベストショット抽出',
  robots: { index: true, follow: true },
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
