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
  /** ログイン済みか（未ログインは「ログイン不要」表示＋ログイン導線を出す） */
  loggedIn?: boolean;
  loginHref?: string;
};

/** 未ログイン利用の補助記録（サーバーの署名Cookieが正で、こちらは表示同期用） */
const STORAGE_KEY = 'fe_usage';

type StoredUsage = { d: string; n: number };

function jstToday(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function readStoredCount(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredUsage>;
    if (!parsed || parsed.d !== jstToday() || typeof parsed.n !== 'number') return null;
    if (!Number.isFinite(parsed.n) || parsed.n < 0) return null;
    return parsed.n;
  } catch {
    return null;
  }
}

/**
 * 利用状況の表示。解析スタート時にエンジンが発火する `fe:usage` イベントで残り回数を更新する。
 * 未ログイン時は localStorage の補助記録と /api/usage/status の値も突き合わせ、
 * リロードやタブ移動をしても残り回数の表示がずれないようにする。
 */
export default function UsageBanner({
  plan,
  remaining,
  limit,
  upgradeHref,
  canManage,
  demo,
  loggedIn = false,
  loginHref = '/signin',
}: Props) {
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

  // 補助記録（localStorage）との表示同期
  useEffect(() => {
    if (state.plan === 'pro' || limit == null) return;
    const stored = readStoredCount();
    if (stored == null) return;
    const localRemaining = Math.max(0, limit - stored);
    setState((prev) => ({
      ...prev,
      remaining: prev.remaining == null ? localRemaining : Math.min(prev.remaining, localRemaining),
    }));
  }, [limit, state.plan]);

  // サーバー（Cookie / DB）の正の値とも同期
  useEffect(() => {
    if (state.plan === 'pro' || limit == null) return;
    let alive = true;
    fetch('/api/usage/status', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { ok?: boolean; remaining?: number | null } | null) => {
        if (!alive || !data || data.ok !== true || typeof data.remaining !== 'number') return;
        const serverRemaining = data.remaining;
        setState((prev) => ({
          ...prev,
          remaining: prev.remaining == null ? serverRemaining : Math.min(prev.remaining, serverRemaining),
        }));
      })
      .catch(() => {
        /* 表示用の同期なので失敗しても無視 */
      });
    return () => {
      alive = false;
    };
  }, [limit, state.plan]);

  const isPro = state.plan === 'pro';
  const left = state.remaining ?? limit ?? 0;

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
          本日の残り回数：<b>あと {left} 回</b>
          <span className="usage-sub">
            （無料プラン{loggedIn ? '' : '・ログイン不要'}・1日{limit ?? 3}回まで・動画は5分以内
            {demo ? '・デモ表示' : ''}）
          </span>
          {left === 0 ? (
            <span className="usage-empty">
              本日の無料回数を使い切りました。Proプランなら本数無制限で使えます。
            </span>
          ) : null}
        </span>
      )}
      <div className="usage-actions">
        {!isPro ? (
          <>
            {!loggedIn ? (
              <a className="btn" href={loginHref}>
                ログイン / 新規登録
              </a>
            ) : null}
            <a className="btn btn-primary-solid" href={upgradeHref}>
              {loggedIn ? 'Proにアップグレード（月額500円）' : 'Proプラン（月額500円）で無制限＆AI超解像'}
            </a>
          </>
        ) : canManage ? (
          <form action="/api/stripe/portal" method="post">
            <button type="submit">プラン管理・解約</button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
