'use client';

import { useEffect, useState } from 'react';
import type { Lang } from '@/lib/i18n';
import { messages } from '@/lib/messages';

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
  /** 表示言語 */
  lang?: Lang;
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
  lang = 'ja',
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

  // 補助記録（localStorage）との表示同期。未ログイン（Cookieで数える）ときだけ使う
  useEffect(() => {
    if (!loggedIn || state.plan === 'pro' || limit == null) return;
    const stored = readStoredCount();
    if (stored == null) return;
    const localRemaining = Math.max(0, limit - stored);
    setState((prev) => ({
      ...prev,
      remaining: prev.remaining == null ? localRemaining : Math.min(prev.remaining, localRemaining),
    }));
  }, [limit, state.plan, loggedIn]);

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
  const u = messages[lang].usage;
  const fill = (text: string) => text.replace('{n}', String(left)).replace('{limit}', String(limit ?? 3));
  const sub = fill(loggedIn ? u.subFree : u.subFreeAnon) + (demo ? u.subDemo : '');

  return (
    <div className={`usage-banner ${isPro ? 'pro' : ''}`} role="status" aria-live="polite">
      <span className="usage-dot" aria-hidden="true" />
      {isPro ? (
        <span>
          <b>{u.proTitle}</b>
          <span className="usage-sub">{u.proSub}</span>
        </span>
      ) : (
        <span>
          {u.remainingLabel}
          <b>{fill(u.remainingCount)}</b>
          <span className="usage-sub">{sub}</span>
          {left === 0 ? <span className="usage-empty">{u.empty}</span> : null}
        </span>
      )}
      <div className="usage-actions">
        {!isPro ? (
          <>
            {!loggedIn ? (
              <a className="btn" href={loginHref}>
                {u.login}
              </a>
            ) : null}
            <a className="btn btn-primary-solid" href={upgradeHref}>
              {loggedIn ? u.upgradeLogged : u.upgradeAnon}
            </a>
          </>
        ) : canManage ? (
          <form action="/api/stripe/portal" method="post">
            <button type="submit">{u.manage}</button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
