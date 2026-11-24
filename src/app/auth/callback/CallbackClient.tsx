'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { safeNextPath } from '@/lib/next-path';

/**
 * メールログインのコールバック（クライアント側の処理）。
 *
 * implicit フローのリンクは `#access_token=...&refresh_token=...` をフラグメントで返すが、
 * フラグメントはサーバーに届かないため、ここで受け取る。
 * `createBrowserClient` でセッションを Cookie に保存すると、以降のサーバー側
 * `getViewer()` からもログイン状態を読める。
 */
export default function CallbackClient({
  supabaseUrl,
  supabaseAnonKey,
}: {
  supabaseUrl: string;
  supabaseAnonKey: string;
}) {
  const [message, setMessage] = useState('ログインを確認しています…');

  useEffect(() => {
    let cancelled = false;
    const go = (path: string) => {
      if (!cancelled) window.location.replace(path);
    };

    (async () => {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const next = safeNextPath(url.searchParams.get('next'));

      const errorCode = hash.get('error_code') ?? url.searchParams.get('error_code');
      const error = hash.get('error') ?? url.searchParams.get('error');
      const description =
        hash.get('error_description') ?? url.searchParams.get('error_description') ?? '';

      // 1) 期限切れ・使用済みなどのエラー（Supabase はフラグメントで返す）
      if (error || errorCode) {
        const expired = errorCode === 'otp_expired' || /expired/i.test(description);
        go(`/signin?error=${expired ? 'expired' : 'auth'}`);
        return;
      }

      const accessToken = hash.get('access_token');
      const refreshToken = hash.get('refresh_token');

      // 2) implicit フローのセッション（メールリンク）
      if (accessToken && refreshToken) {
        if (!supabaseUrl || !supabaseAnonKey) {
          go('/signin?error=demo');
          return;
        }
        try {
          const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
            auth: { detectSessionInUrl: false },
          });
          const { error: setError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (cancelled) return;
          if (setError) {
            console.error('[auth] setSession failed', setError.message);
            go('/signin?error=auth');
            return;
          }
          go(next);
          return;
        } catch (err) {
          console.error('[auth] setSession exception', err);
          go('/signin?error=auth');
          return;
        }
      }

      // 3) PKCE の `?code=`（Google OAuth など）はサーバー側で交換する
      const code = url.searchParams.get('code');
      if (code) {
        go(`/auth/exchange?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`);
        return;
      }

      // 4) 何も無い（リンクを直接開いた等）
      if (!cancelled) {
        setMessage('ログインの確認ができませんでした。');
        go('/signin?error=auth');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabaseUrl, supabaseAnonKey]);

  return (
    <div className="signin-wrap">
      <div className="signin-card">
        <h1>ログイン</h1>
        <p className="lead" role="status" aria-live="polite">
          {message}
        </p>
        <p className="field-hint">
          自動で切り替わらない場合は <Link href="/signin">ログイン画面へ</Link> お進みください。
        </p>
      </div>
    </div>
  );
}
