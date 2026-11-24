import Link from 'next/link';
import type { Viewer } from '@/lib/auth';
import { isDemoMode, isStripeConfigured } from '@/lib/env';
import type { Lang } from '@/lib/i18n';
import { messages } from '@/lib/messages';
import { LanguageSwitcher } from './LanguageSwitcher';

export function SiteHeader({ viewer, lang = 'ja' }: { viewer: Viewer | null; lang?: Lang }) {
  const demo = isDemoMode();
  const pro = viewer?.isPro ?? false;
  const t = messages[lang];

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            🎬
          </span>
          <span>{t.common.siteName}</span>
        </Link>

        <nav className="site-nav" aria-label={t.nav.aria}>
          <Link href="/#how">{t.nav.how}</Link>
          <Link href="/#pricing">{t.nav.pricing}</Link>
          <Link href="/#faq">{t.nav.faq}</Link>
          <Link href="/terms">{t.nav.terms}</Link>
        </nav>

        <div className="header-right">
          <LanguageSwitcher lang={lang} />
          {viewer ? (
            <>
              <span className={`plan-pill ${pro ? 'pro' : ''}`}>
                {pro ? t.nav.planPro : t.nav.planFree}
              </span>
              <Link href="/app" className="btn btn-primary btn-sm">
                {t.nav.openTool}
              </Link>
              <details className="menu">
                <summary aria-label={t.nav.accountMenuAria}>
                  {t.nav.account}
                  <span aria-hidden="true">▾</span>
                </summary>
                <div className="menu-panel">
                  <div className="menu-label">{t.nav.signedInAs}</div>
                  <div className="menu-email">{viewer.profile.email ?? viewer.user.email}</div>
                  <Link href="/app">{t.nav.toolLink}</Link>
                  {!pro && isStripeConfigured() ? (
                    <form action="/api/stripe/checkout" method="post">
                      <input type="hidden" name="lang" value={lang} />
                      <button type="submit">{t.nav.upgrade}</button>
                    </form>
                  ) : null}
                  {viewer.profile.stripe_customer_id && isStripeConfigured() ? (
                    <form action="/api/stripe/portal" method="post">
                      <button type="submit">{t.nav.manage}</button>
                    </form>
                  ) : null}
                  <Link href="/terms">{t.nav.terms}</Link>
                  <form action="/auth/sign-out" method="post">
                    <button type="submit">{t.nav.signOut}</button>
                  </form>
                </div>
              </details>
            </>
          ) : (
            <>
              {demo ? <span className="plan-pill">{t.nav.demoPill}</span> : null}
              <Link href="/app" className="btn btn-outline btn-sm header-try">
                {t.nav.tryFree}
              </Link>
              <Link href="/signin" className="btn btn-primary btn-sm header-signin">
                {t.nav.signIn}
                <span className="signin-suffix">{t.nav.signInSuffix}</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ lang = 'ja' }: { lang?: Lang }) {
  const t = messages[lang];
  return (
    <div className="site-footer">
      <div className="site-footer-inner">
        <div>
          <p>
            {t.footer.note}
            <br />
            {t.footer.tagline}
          </p>
        </div>
        <div className="footer-links">
          <Link href="/terms">{t.footer.terms}</Link>
          <Link href="/privacy">{t.footer.privacy}</Link>
          <Link href="/tokushoho">{t.footer.tokushoho}</Link>
          <Link href="/#pricing">{t.footer.pricing}</Link>
        </div>
      </div>
    </div>
  );
}
