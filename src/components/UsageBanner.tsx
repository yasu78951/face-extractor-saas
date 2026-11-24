'use client';

import { useEffect, useState } from 'react';

type Props = {
  plan: 'free' | 'pro';
  remaining: number | null;
  limit: number | null;
  upgradeHref: string;
  /** カスタマーポータルを開ける（Stripeの顧客IDがある）場合のみ true */
  canManage?: boolean;
  demo?: boolean;
};

/**
 * 利用状況の表示。解析スタート時にエンジンが発火する `fe:usage` イベントで残り回数を更新する。
 */
export default function UsageBanner({ plan, remaining, limit, upgradeHref, canManage, demo }: Props) {
  const [state, setState] = useState<{ plan: 'free' | 'pro'; remaining: number | null }>({
    plan,
    remaining,
  });

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ plan?: string; remaining?: number }>).detail ?? {};
      setState((prev) => ({
        plan: detail.plan === 'pro' ? 'pro' : detail.plan === 'free' ? 'free' : prev.plan,
        remaining: typeof detail.remaining === 'number' ? detail.remaining : prev.remaining,
      }));
    };
    window.addEventListener('fe:usage', handler);
    return () => window.removeEventListener('fe:usage', handler);
  }, []);

  const isPro = state.plan === 'pro';

  return (
    <div className={`usage-banner ${isPro ? 'pro' : ''}`} role="status" aria-live="polite">
      <span className="usage-dot" aria-hidden="true" />
      {isPro ? (
        <span>
          <b>Proプラン（無制限）</b>
          <span className="usage-sub"> ／ 動画の長さ制限なし・AI超解像が使えます</span>
        </span>
      ) : (
        <span>
          本日の残り回数：<b>あと {state.remaining ?? limit ?? 0} 回</b> / 無料プラン
          <span className="usage-sub">
            （1日{limit ?? 3}回まで・動画は5分以内
            {demo ? '・デモ表示' : ''}）
          </span>
        </span>
      )}
      <div className="usage-actions">
        {!isPro ? (
          <a className="btn btn-primary-solid" href={upgradeHref}>
            Proにアップグレード（月額500円）
          </a>
        ) : canManage ? (
          <form action="/api/stripe/portal" method="post">
            <button type="submit">プラン管理・解約</button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
