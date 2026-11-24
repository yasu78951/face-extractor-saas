'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import type { Lang } from '@/lib/i18n';
import { messages } from '@/lib/messages';
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
  lang = 'ja',
}: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  lang?: Lang;
}) {
  const t = messages[lang].callback;
  const [message, setMessage] = useState(t.checking);

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
        setMessage(t.failed);
        go('/signin?error=auth');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabaseUrl, supabaseAnonKey, t]);

  return (
    <div className="signin-wrap">
      <div className="signin-card">
        <h1>{t.title}</h1>
        <p className="lead" role="status" aria-live="polite">
          {message}
        </p>
        <p className="field-hint">
          {t.hintBefore}
          <Link href="/signin">{t.hintLink}</Link>
          {t.hintAfter}
        </p>
      </div>
    </div>
  );
}
