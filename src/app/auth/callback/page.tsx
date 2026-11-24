import type { Metadata } from 'next';
import CallbackClient from './CallbackClient';
import { supabaseAnonKey, supabaseUrl } from '@/lib/env';
import { getLang } from '@/lib/i18n-server';
import { pageMetadata } from '@/lib/site';

// 環境変数をリクエスト時に読む（ビルド時に固定化しない）
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return pageMetadata({
    title: lang === 'en' ? 'Confirming sign-in' : 'ログインの確認',
    description: lang === 'en' ? 'Confirming your sign-in link.' : 'ログインリンクの確認を行っています。',
    noindex: true,
    lang,
  });
}

/**
 * メールログイン / OAuth のコールバック。
 * 実際の処理はクライアント側（URL フラグメントを読める場所）で行う。
 */
export default async function AuthCallbackPage() {
  const lang = await getLang();
  return (
    <CallbackClient supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey} lang={lang} />
  );
}
