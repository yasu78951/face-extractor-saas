import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ExtractorTool from '@/components/ExtractorTool';
import UsageBanner from '@/components/UsageBanner';
import { getUsageStatus, getViewer } from '@/lib/auth';
import { FREE_DAILY_LIMIT, isDemoMode, isStripeConfigured } from '@/lib/env';
import { demoUsed } from '@/lib/demo-store';

export const dynamic = 'force-dynamic';

type Search = {
  plan?: string;
  checkout?: string;
  upgrade?: string;
};

export default async function AppPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const upgradeHref = '/#pricing';
  const demo = isDemoMode();

  let isPro = false;
  let remaining: number | null = FREE_DAILY_LIMIT;
  let canManage = false;

  if (demo) {
    isPro = sp.plan === 'pro';
    if (!isPro) {
      const store = await cookies();
      const demoId = store.get('fe_demo')?.value ?? 'default';
      remaining = Math.max(0, FREE_DAILY_LIMIT - demoUsed(demoId));
    }
  } else {
    const viewer = await getViewer();
    if (!viewer) redirect(`/signin?next=${encodeURIComponent('/app')}`);
    isPro = viewer.isPro;
    canManage = Boolean(viewer.profile.stripe_customer_id) && isStripeConfigured();
    const usage = await getUsageStatus(viewer.user.id, viewer.profile.plan);
    remaining = usage.remaining;
  }

  const checkoutSuccess = sp.checkout === 'success';
  const checkoutCancel = sp.checkout === 'cancel';
  const wantsUpgrade = sp.upgrade === '1' && !isPro;

  return (
    <>
      <div className="tool-top">
        <div className="tool-top-inner">
          <div className="tool-title">
            <h1>🎬 顔写真抽出ツール</h1>
            <p>動画は端末内だけで処理されます（外部送信なし）</p>
          </div>
          {!isPro ? (
            <a className="btn btn-upgrade" href={upgradeHref}>
              Proプランで本数無制限・AI超解像（月額500円）
            </a>
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
        upgradeHref={upgradeHref}
        canManage={canManage}
        demo={demo}
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

      <ExtractorTool isPro={isPro} upgradeHref={upgradeHref} />
    </>
  );
}
