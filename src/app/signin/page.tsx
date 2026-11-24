import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getViewer, type Viewer } from '@/lib/auth';
import { isDemoMode, isSupabaseConfigured } from '@/lib/env';
import { getLang } from '@/lib/i18n-server';
import { messages } from '@/lib/messages';
import { safeNextPath } from '@/lib/next-path';
import { pageMetadata } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return pageMetadata({
    title: lang === 'en' ? 'Sign in / Sign up' : 'ログイン / 新規登録',
    description:
      lang === 'en'
        ? 'Sign in or create an account for Best Shot Extractor.'
        : 'ベストショット抽出のログイン・新規登録ページです。',
    noindex: true,
    lang,
  });
}

type Search = {
  sent?: string;
  email?: string;
  error?: string;
  next?: string;
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const lang = await getLang();
  const t = messages[lang].signin;
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
  const errorMessage = sp.error
    ? (t.errors as Record<string, string>)[sp.error] ?? t.genericError
    : null;

  return (
    <div className="signin-wrap">
      <div className="signin-card">
        <h1>{t.title}</h1>
        <p className="lead">{t.lead}</p>

        <div className="signin-skip">
          {t.skip} <Link href="/app">{t.skipLink}</Link>
        </div>

        {demo ? (
          <div className="notice notice-warn">
            {t.demoNotice}
            <Link href="/app">{t.demoLink}</Link>
            {t.demoAfter}
          </div>
        ) : null}

        {sp.sent ? (
          <div className="notice notice-success">
            <b>{sp.email ?? t.sentEmailFallback}</b>
            {t.sentBefore}
            <br />
            {t.sentExpiry}
          </div>
        ) : null}

        {errorMessage ? <div className="notice notice-warn">{errorMessage}</div> : null}

        {configured ? (
          <>
            <a href={`/auth/google?next=${encodeURIComponent(next)}`} className="btn btn-outline btn-block">
              <span aria-hidden="true">G</span> {t.google}
            </a>

            <div className="divider">{t.divider}</div>

            <form action="/auth/sign-in" method="post">
              <input type="hidden" name="next" value={next} />
              <div className="field">
                <label htmlFor="email">{t.emailLabel}</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  defaultValue={sp.email ?? ''}
                  placeholder="you@example.com"
                />
                <span className="field-hint">{t.emailHint}</span>
              </div>
              <button type="submit" className="btn btn-primary btn-block">
                {t.submit}
              </button>
            </form>
          </>
        ) : (
          <Link href="/app" className="btn btn-primary btn-block">
            {t.demoBtn}
          </Link>
        )}

        <p className="legal-links">
          {t.legalBefore}
          <Link href="/terms">{t.legalTerms}</Link>
          {t.legalMiddle}
          <Link href="/privacy">{t.legalPrivacy}</Link>
          {t.legalAfter}
        </p>
      </div>
    </div>
  );
}
