import Link from 'next/link';
import type { Viewer } from '@/lib/auth';
import { isDemoMode, isStripeConfigured } from '@/lib/env';

export function SiteHeader({ viewer }: { viewer: Viewer | null }) {
  const demo = isDemoMode();
  const pro = viewer?.isPro ?? false;

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            🎬
          </span>
          <span>ベストショット抽出</span>
        </Link>

        <nav className="site-nav" aria-label="メインメニュー">
          <Link href="/#how">使い方</Link>
          <Link href="/#pricing">料金</Link>
          <Link href="/#faq">よくある質問</Link>
          <Link href="/terms">利用規約</Link>
        </nav>

        <div className="header-right">
          {viewer ? (
            <>
              <span className={`plan-pill ${pro ? 'pro' : ''}`}>{pro ? 'Proプラン' : '無料プラン'}</span>
              <Link href="/app" className="btn btn-primary btn-sm">
                ツールを開く
              </Link>
              <details className="menu">
                <summary aria-label="アカウントメニュー">
                  アカウント
                  <span aria-hidden="true">▾</span>
                </summary>
                <div className="menu-panel">
                  <div className="menu-label">ログイン中のアカウント</div>
                  <div className="menu-email">{viewer.profile.email ?? viewer.user.email}</div>
                  <Link href="/app">顔抽出ツール</Link>
                  {!pro && isStripeConfigured() ? (
                    <form action="/api/stripe/checkout" method="post">
                      <button type="submit">Proプランにアップグレード（月額500円）</button>
                    </form>
                  ) : null}
                  {viewer.profile.stripe_customer_id && isStripeConfigured() ? (
                    <form action="/api/stripe/portal" method="post">
                      <button type="submit">プラン管理・カード変更・解約</button>
                    </form>
                  ) : null}
                  <Link href="/terms">利用規約</Link>
                  <form action="/auth/sign-out" method="post">
                    <button type="submit">ログアウト</button>
                  </form>
                </div>
              </details>
            </>
          ) : (
            <>
              {demo ? <span className="plan-pill">デモモード</span> : null}
              <Link href="/app" className="btn btn-outline btn-sm">
                無料で試す
              </Link>
              <Link href="/signin" className="btn btn-primary btn-sm">
                ログイン / 新規登録
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <div className="site-footer">
      <div className="site-footer-inner">
        <div>
          <p>
            動画はブラウザ内のメモリだけで処理され、サーバーには送信されません。
            <br />
            ベストショット抽出ツール — 動画から顔写真を自動抽出
          </p>
        </div>
        <div className="footer-links">
          <Link href="/terms">利用規約</Link>
          <Link href="/privacy">プライバシーポリシー</Link>
          <Link href="/tokushoho">特定商取引法に基づく表記</Link>
          <Link href="/#pricing">料金</Link>
        </div>
      </div>
    </div>
  );
}
