import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getViewer, type Viewer } from '@/lib/auth';
import { isDemoMode, isSupabaseConfigured } from '@/lib/env';
import { safeNextPath } from '@/lib/next-path';
import { pageMetadata } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({
  title: 'ログイン / 新規登録',
  description: 'ベストショット抽出のログイン・新規登録ページです。',
  noindex: true,
});

type Search = {
  sent?: string;
  email?: string;
  error?: string;
  next?: string;
};

const ERROR_MESSAGES: Record<string, string> = {
  email: 'メールアドレスの形式を確認してください。',
  send: 'ログインメールを送信できませんでした。時間をおいてもう一度お試しください。',
  auth: 'ログインの確認に失敗しました。もう一度お試しください。',
  google: 'Googleログインを開始できませんでした。メールでのログインをお試しください。',
  demo: 'Supabaseが未設定のため、ログインは利用できません（デモモード）。',
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next);

  let viewer: Viewer | null = null;
  try {
    viewer = await getViewer();
  } catch {
    viewer = null;
  }
  if (viewer) redirect(next);

  const configured = isSupabaseConfigured();
  const demo = isDemoMode();

  return (
    <div className="signin-wrap">
      <div className="signin-card">
        <h1>ログイン / 新規登録</h1>
        <p className="lead">
          アカウントを作ると、1日の利用回数がアカウントに紐づきます（同じアカウントなら端末を変えても回数は共有）。
          Proプランもここからお申し込みいただけます。
        </p>

        <div className="signin-skip">
          ログインはProプランにする時だけで大丈夫です。{' '}
          <Link href="/app">ログインなしで無料で試す（1日3本まで）</Link>
        </div>

        {demo ? (
          <div className="notice notice-warn">
            現在はデモモードです（Supabase未設定）。<Link href="/app">ログインなしでツール画面を開く</Link> か、
            SETUP.md の手順でSupabaseを接続してください。
          </div>
        ) : null}

        {sp.sent ? (
          <div className="notice notice-success">
            <b>{sp.email ?? 'ご入力のメールアドレス'}</b> にログインリンクを送りました。メールを開いてリンクを押すと
            ログインできます（迷惑メールフォルダもご確認ください）。
          </div>
        ) : null}

        {sp.error ? (
          <div className="notice notice-warn">{ERROR_MESSAGES[sp.error] ?? 'エラーが発生しました。'}</div>
        ) : null}

        {configured ? (
          <>
            <a href={`/auth/google?next=${encodeURIComponent(next)}`} className="btn btn-outline btn-block">
              <span aria-hidden="true">G</span> Googleでログイン
            </a>

            <div className="divider">または メールアドレスで</div>

            <form action="/auth/sign-in" method="post">
              <input type="hidden" name="next" value={next} />
              <div className="field">
                <label htmlFor="email">メールアドレス</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                />
                <span className="field-hint">パスワードは不要です。ログイン用のリンクをお送りします。</span>
              </div>
              <button type="submit" className="btn btn-primary btn-block">
                ログインリンクを送る
              </button>
            </form>
          </>
        ) : (
          <Link href="/app" className="btn btn-primary btn-block">
            デモモードでツールを開く
          </Link>
        )}

        <p className="legal-links">
          続行すると <Link href="/terms">利用規約</Link> と <Link href="/privacy">プライバシーポリシー</Link>{' '}
          に同意したものとみなされます。
        </p>
      </div>
    </div>
  );
}
