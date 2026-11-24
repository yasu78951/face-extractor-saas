import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import ExtractorTool from '@/components/ExtractorTool';
import UsageBanner from '@/components/UsageBanner';
import { getUsageStatus, getViewer, type Viewer } from '@/lib/auth';
import { ANON_USAGE_COOKIE } from '@/lib/anon-usage';
import { anonUsageSnapshot } from '@/lib/usage';
import { FREE_DAILY_LIMIT, isDemoMode, isStripeConfigured } from '@/lib/env';
import { pageMetadata } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({
  title: '動画から顔写真を抽出するツール（無料・ログイン不要）｜ベストショット抽出',
  description:
    '動画を選ぶだけで、正面・ピント・顔の大きさでベストショットを自動抽出。無料プランはログイン不要で1日3本・5分以内、Proプランは本数無制限＋AI超解像。動画はアップロードされず端末内で処理します。',
  path: '/app',
  absoluteTitle: true,
});

type Search = {
  plan?: string;
  checkout?: string;
  upgrade?: string;
};

export default async function AppPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const demo = isDemoMode();
  const pricingHref = `/#pricing`;
  /** 未ログインなら、ログイン（＝アカウント作成）してから料金プランへ進む */
  const upgradeHref = `/signin?next=${encodeURIComponent(pricingHref)}`;
  const loginHref = `/signin?next=${encodeURIComponent('/app')}`;

  let loggedIn = false;
  let isPro = false;
  let remaining: number | null = FREE_DAILY_LIMIT;
  let canManage = false;

  let viewer: Viewer | null = null;
  if (!demo) {
    try {
      viewer = await getViewer();
    } catch {
      viewer = null;
    }
  }

  if (viewer) {
    loggedIn = true;
    isPro = viewer.isPro;
    canManage = Boolean(viewer.profile.stripe_customer_id) && isStripeConfigured();
    if (!isPro) {
      const usage = await getUsageStatus(viewer.user.id, viewer.profile.plan);
      remaining = usage.remaining;
    }
  } else if (demo && sp.plan === 'pro') {
    // デモモードのPro画面プレビュー
    isPro = true;
  } else {
    // 未ログイン: 署名Cookieの使用数から残り回数（ログイン不要・ブラウザ単位）
    const store = await cookies();
    remaining = anonUsageSnapshot(store.get(ANON_USAGE_COOKIE)?.value).remaining;
  }

  const effectiveUpgradeHref = loggedIn ? pricingHref : upgradeHref;

  const checkoutSuccess = sp.checkout === 'success';
  const checkoutCancel = sp.checkout === 'cancel';
  const wantsUpgrade = sp.upgrade === '1' && !isPro;

  return (
    <>
      <div className="tool-top">
        <div className="tool-top-inner">
          <div className="tool-title">
            <h1>🎬 顔写真抽出ツール</h1>
            <p>
              動画は端末内だけで処理されます（外部送信なし）
              {!loggedIn ? '／ログインなしでお試しいただけます' : ''}
            </p>
          </div>
          {!isPro ? (
            <div className="tool-top-actions">
              {!loggedIn ? (
                <a className="btn btn-top-login" href={loginHref}>
                  ログイン
                </a>
              ) : null}
              <a className="btn btn-upgrade" href={effectiveUpgradeHref}>
                Proプランで本数無制限・AI超解像（月額500円）
              </a>
            </div>
          ) : (
            <Link className="btn btn-upgrade" href="/">
              サービス紹介へ
            </Link>
          )}
        </div>
      </div>

      <UsageBanner
        plan={isPro ? 'pro' : 'free'}
        remaining={remaining}
        limit={FREE_DAILY_LIMIT}
        upgradeHref={effectiveUpgradeHref}
        canManage={canManage}
        demo={demo}
        loggedIn={loggedIn}
        loginHref={loginHref}
      />

      <div className="tool-notice">
        {checkoutSuccess ? (
          <div className="notice notice-success">
            Proプランへのお申し込みを受け付けました。反映まで数秒かかることがあります。表示が変わらない場合はページを再読み込みしてください。
          </div>
        ) : null}
        {checkoutCancel ? (
          <div className="notice notice-info">お申し込みをキャンセルしました。無料プランのままご利用いただけます。</div>
        ) : null}
        {wantsUpgrade ? (
          isStripeConfigured() ? (
            <div className="notice notice-info">
              Proプラン（月額500円）にアップグレードすると、本数無制限・時間制限なし・AI超解像が使えます。
              <form action="/api/stripe/checkout" method="post" style={{ display: 'inline', marginLeft: 10 }}>
                <button type="submit" className="btn btn-primary btn-sm">
                  アップグレードへ進む
                </button>
              </form>
            </div>
          ) : (
            <div className="notice notice-warn">
              現在Stripeが未設定のため、決済を受け付けられません（SETUP.md参照）。
            </div>
          )
        ) : null}
        {demo ? (
          <div className="notice notice-warn">
            デモモード: 回数制限とプラン表示のみ再現しています（Supabase未接続）。{' '}
            <Link href="/#pricing">料金プラン</Link>
          </div>
        ) : null}
      </div>

      <ExtractorTool isPro={isPro} upgradeHref={effectiveUpgradeHref} remaining={remaining} anonymous={!loggedIn} />
    </>
  );
}
