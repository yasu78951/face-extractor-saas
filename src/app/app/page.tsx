import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import ExtractorTool from '@/components/ExtractorTool';
import UsageBanner from '@/components/UsageBanner';
import { getUsageStatus, getViewer, type Viewer } from '@/lib/auth';
import { ANON_USAGE_COOKIE } from '@/lib/anon-usage';
import { anonUsageSnapshot } from '@/lib/usage';
import { FREE_DAILY_LIMIT, isDemoMode, isStripeConfigured } from '@/lib/env';
import { getLang } from '@/lib/i18n-server';
import { messages } from '@/lib/messages';
import { pageMetadata } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = messages[lang];

  return pageMetadata(
    lang === 'en'
      ? {
          title: 'Face photo extractor from video (free, no sign-up) | Best Shot Extractor',
          description:
            'Pick a video and the best shots are extracted automatically by facing direction, focus and face size. The free plan needs no sign-up (3 videos a day, up to 5 minutes); Pro is unlimited with AI upscaling. Your video is processed on your device and never uploaded.',
          path: '/app',
          absoluteTitle: true,
          lang,
        }
      : {
          title: '動画から顔写真を抽出するツール（無料・ログイン不要）｜ベストショット抽出',
          description:
            '動画を選ぶだけで、正面・ピント・顔の大きさでベストショットを自動抽出。無料プランはログイン不要で1日3本・5分以内、Proプランは本数無制限＋AI超解像。動画はアップロードされず端末内で処理します。',
          path: '/app',
          absoluteTitle: true,
          lang,
        },
  );
}

type Search = {
  plan?: string;
  checkout?: string;
  upgrade?: string;
};

export default async function AppPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const lang = await getLang();
  const t = messages[lang];
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
            <h1>{t.tool.title}</h1>
            <p>
              {t.tool.lead}
              {!loggedIn ? t.tool.leadAnon : ''}
            </p>
          </div>
          {!isPro ? (
            <div className="tool-top-actions">
              {!loggedIn ? (
                <a className="btn btn-top-login" href={loginHref}>
                  {t.tool.login}
                </a>
              ) : null}
              <a className="btn btn-upgrade" href={effectiveUpgradeHref}>
                {t.tool.upgrade}
              </a>
            </div>
          ) : (
            <Link className="btn btn-upgrade" href="/">
              {t.tool.back}
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
        lang={lang}
      />

      <div className="tool-notice">
        {checkoutSuccess ? <div className="notice notice-success">{t.tool.noticeSuccess}</div> : null}
        {checkoutCancel ? <div className="notice notice-info">{t.tool.noticeCancel}</div> : null}
        {wantsUpgrade ? (
          isStripeConfigured() ? (
            <div className="notice notice-info">
              {t.tool.noticeUpgradeTitle}
              <form action="/api/stripe/checkout" method="post" style={{ display: 'inline', marginLeft: 10 }}>
                <button type="submit" className="btn btn-primary btn-sm">
                  {t.tool.noticeUpgradeBtn}
                </button>
              </form>
            </div>
          ) : (
            <div className="notice notice-warn">{t.tool.noticeUnavailable}</div>
          )
        ) : null}
        {demo ? (
          <div className="notice notice-warn">
            {t.tool.noticeDemo} <Link href="/#pricing">{t.tool.noticeDemoLink}</Link>
          </div>
        ) : null}
      </div>

      <ExtractorTool
        isPro={isPro}
        upgradeHref={effectiveUpgradeHref}
        remaining={remaining}
        anonymous={!loggedIn}
        lang={lang}
      />
    </>
  );
}
