import type { Metadata } from 'next';
import CallbackClient from './CallbackClient';
import { supabaseAnonKey, supabaseUrl } from '@/lib/env';
import { pageMetadata } from '@/lib/site';

// 環境変数をリクエスト時に読む（ビルド時に固定化しない）
export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({
  title: 'ログインの確認',
  description: 'ログインリンクの確認を行っています。',
  noindex: true,
});

/**
 * メールログイン / OAuth のコールバック。
 * 実際の処理はクライアント側（URL フラグメントを読める場所）で行う。
 */
export default function AuthCallbackPage() {
  return <CallbackClient supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey} />;
}
