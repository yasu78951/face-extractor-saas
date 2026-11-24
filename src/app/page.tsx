import type { Metadata } from 'next';
import Link from 'next/link';
import { HERO_FACES } from '@/components/HeroFaces';
import { getViewer, type Viewer } from '@/lib/auth';
import { isDemoMode, isStripeConfigured, PRO_PRICE_JPY } from '@/lib/env';
import { ogLocale, withLangPath } from '@/lib/i18n';
import { getLang } from '@/lib/i18n-server';
import { messages } from '@/lib/messages';
import { languageAlternates, SITE_OG_IMAGE, SITE_URL, siteNameFor } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = messages[lang].common;
  const canonical = lang === 'en' ? withLangPath('/', 'en') : '/';

  return {
    // トップは検索意図に合わせた文言をそのまま出したいので、タイトルのテンプレートは使わない
    title: { absolute: t.siteTitle },
    description: t.siteDescription,
    alternates: { canonical, languages: languageAlternates('/') },
    openGraph: {
      type: 'website',
      locale: ogLocale(lang),
      siteName: siteNameFor(lang),
      title: t.siteTitle,
      description: t.siteDescription,
      url: canonical,
      images: [{ ...SITE_OG_IMAGE, alt: t.ogImageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t.siteTitle,
      description: t.siteDescription,
      images: [SITE_OG_IMAGE.url],
    },
  };
}

/** 構造化データ（JSON-LD）を埋め込む。`<` はエスケープして壊れないようにする。 */
function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

function webApplicationJsonLd(lang: 'ja' | 'en'): Record<string, unknown> {
  const en = lang === 'en';
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: siteNameFor(lang),
    url: SITE_URL,
    description: messages[lang].common.siteDescription,
    applicationCategory: 'MultimediaApplication',
    applicationSubCategory: en
      ? 'Frame extraction and face photo picking from video'
      : '動画からの静止画切り出し・顔写真抽出',
    operatingSystem: 'iOS, Windows, macOS, Android',
    browserRequirements: en
      ? 'Latest Safari / Chrome / Edge / Firefox (AI upscaling needs a WebGL-capable device)'
      : 'Safari / Chrome / Edge / Firefox の最新版（AI超解像はWebGLが動作する端末）',
    inLanguage: en ? 'en' : 'ja-JP',
    isAccessibleForFree: true,
    offers: [
      {
        '@type': 'Offer',
        name: en ? 'Free plan' : '無料プラン',
        price: '0',
        priceCurrency: 'JPY',
        description: en
          ? '3 videos a day without signing in (videos up to 5 minutes)'
          : 'ログイン不要で1日3本まで（動画は5分以内）',
        availability: 'https://schema.org/InStock',
      },
      {
        '@type': 'Offer',
        name: en ? 'Pro plan' : 'Proプラン',
        price: String(PRO_PRICE_JPY),
        priceCurrency: 'JPY',
        description: en
          ? 'Unlimited videos and length, with on-device AI upscaling (per month, tax included)'
          : '本数・動画の長さ無制限、端末内AI超解像つき（月額・税込）',
        availability: 'https://schema.org/InStock',
      },
    ],
    featureList: en
      ? [
          'Scores frames for facing the camera, focus and face size, then picks the best shots',
          'Analysis, cropping and enhancement run on your device (the video is never uploaded)',
          'On-device AI upscaling (ESRGAN-slim)',
          'Export at 512 / 768 / 1024 px and save in batch',
        ]
      : [
          '動画から「正面・ピント・顔の大きさ」で自動採点し、ベストショットを抽出',
          '解析・切り出し・高画質化は端末内で完結（動画をアップロードしない）',
          '端末内AI超解像（ESRGAN-slim）による高画質化',
          '512 / 768 / 1024pxでの書き出し・一括保存',
        ],
  };
}

export default async function LandingPage() {
  const lang = await getLang();
  const t = messages[lang];
  const tl = t.landing;

  let viewer: Viewer | null = null;
  try {
    viewer = await getViewer();
  } catch {
    viewer = null;
  }
  const demo = isDemoMode();
  const stripeReady = isStripeConfigured();
  const upscaleHref = viewer?.isPro ? '/app' : viewer ? '/#pricing' : '/signin?next=%2F%23pricing';
  const upscaleLabel = viewer?.isPro ? tl.upscale.ctaPro : tl.upscale.ctaUpgrade;

  const faqJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: lang === 'en' ? 'en' : 'ja-JP',
    mainEntity: t.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  return (
    <>
      <JsonLd data={webApplicationJsonLd(lang)} />
      <JsonLd data={faqJsonLd} />
      <main className="landing">
      <div className="container">
        <section className="hero">
          <div>
            <span className="eyebrow">{tl.eyebrow}</span>
            <h1>
              {tl.titleLine1}
              <br />
              <span className="accent">{tl.titleAccent}</span>
              {tl.titleTail}
            </h1>
            <p className="hero-lead">{tl.lead}</p>
            <div className="hero-actions">
              {viewer ? (
                <>
                  <Link href="/app" className="btn btn-primary">
                    {tl.ctaOpen}
                  </Link>
                  <Link href="/#pricing" className="btn btn-outline">
                    {tl.ctaPricing}
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/app" className="btn btn-primary">
                    {tl.ctaStart}
                  </Link>
                  <Link href="/#pricing" className="btn btn-outline">
                    {tl.ctaPricing}
                  </Link>
                </>
              )}
            </div>
            <p className="hero-note">{demo ? tl.noteDemo : tl.note}</p>
            <div className="hero-badges">
              <span className="hero-badge">{tl.badgePrivate}</span>
              <span className="hero-badge">{tl.badgeIphone}</span>
              <span className="hero-badge">{tl.badgeAi}</span>
            </div>
          </div>

          <div className="hero-card" aria-hidden="true">
            <div className="hero-shot">
              <div className="hero-shot-grid">
                {HERO_FACES.map((face, i) => (
                  <div
                    key={face.rank}
                    className={`hero-thumb${face.tone === 0 ? ' best' : ` tone-${face.tone}`}`}
                  >
                    <img
                      src={face.src}
                      alt={lang === 'en' ? face.altEn : face.alt}
                      width={820}
                      height={820}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      fetchPriority={i === 0 ? 'high' : 'low'}
                      decoding="async"
                    />
                    <span className="thumb-rank">{face.rank}</span>
                    <span className="thumb-score">
                      {face.score}
                      <i>{tl.heroPointsUnit}</i>
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="hero-card-caption">
              <span>
                {tl.heroFramesLabel} <b>612</b> / {tl.heroCandidatesLabel} <b>16</b>{' '}
                {tl.heroPicksUnit}
              </span>
              <span>
                {tl.heroAnalyzedLabel} 12.4{tl.heroSecondsUnit}
              </span>
            </div>
          </div>
        </section>

        <section className="feature-row" id="features">
          {tl.features.map((feature) => (
            <div className="feature" key={feature.title}>
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </div>
          ))}
        </section>

        <section className="section upscale" id="upscale">
          <div className="section-head">
            <span className="eyebrow">{tl.upscale.eyebrow}</span>
            <h2>
              {tl.upscale.titlePre}
              <span className="accent">{tl.upscale.titleAccent}</span>
              {tl.upscale.titleTail}
            </h2>
            <p className="upscale-lead">{tl.upscale.lead}</p>
          </div>

          <div className="ba-wrap">
            <figure className="ba-card before">
              <div className="ba-art">
                <img
                  src="/images/sample-best-before.jpg"
                  alt={tl.upscale.beforeAlt}
                  width={820}
                  height={820}
                  loading="lazy"
                  decoding="async"
                />
                <span className="ba-pixel" />
              </div>
              <figcaption className="ba-caption">
                <span className="ba-tag">Before</span>
                {tl.upscale.beforeCaption}
              </figcaption>
              <p className="ba-comment">{tl.upscale.beforeComment}</p>
            </figure>

            <div className="ba-arrow" aria-hidden="true">
              <span className="ba-arrow-star" />
              <span className="ba-arrow-head">→</span>
            </div>

            <figure className="ba-card after">
              <div className="ba-art">
                <img
                  src="/images/sample-best.jpg"
                  alt={tl.upscale.afterAlt}
                  width={820}
                  height={820}
                  loading="lazy"
                  decoding="async"
                />
                <span className="ba-glow" aria-hidden="true" />
                <span className="ba-shine" aria-hidden="true" />
                <span className="ba-star s1" aria-hidden="true" />
                <span className="ba-star s2" aria-hidden="true" />
                <span className="ba-star s3" aria-hidden="true" />
                <span className="ba-star s4" aria-hidden="true" />
                <span className="ba-badge">{tl.upscale.badge}</span>
              </div>
              <figcaption className="ba-caption">
                <span className="ba-tag pro">After</span>
                {tl.upscale.afterCaption}
              </figcaption>
              <p className="ba-comment strong">{tl.upscale.afterComment}</p>
            </figure>
          </div>

          <p className="ba-note">{tl.upscale.note}</p>

          <div className="ba-highlights">
            {tl.upscale.highlights.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>

          <div className="ba-cta">
            <Link href={upscaleHref} className="btn btn-primary btn-lg">
              {upscaleLabel}
            </Link>
            <span className="ba-cta-note">{tl.upscale.ctaNote}</span>
          </div>
        </section>

        <section className="section" id="how">
          <div className="section-head">
            <h2>{tl.how.title}</h2>
            <p>{tl.how.lead}</p>
          </div>
          <div className="steps">
            {tl.how.steps.map((step, i) => (
              <div className="step" key={step.title}>
                <span className="step-num">{i + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section pricing" id="pricing">
          <div className="section-head">
            <h2>{tl.pricing.title}</h2>
            <p>{tl.pricing.lead}</p>
          </div>

          <div className="price-grid">
            <div className="price-card">
              <div className="price-name">{tl.pricing.freeName}</div>
              <div className="price-value">
                {tl.pricing.freePrice}
                <small>{tl.pricing.perMonth}</small>
              </div>
              <ul className="price-list">
                {tl.pricing.freeFeatures.map((item) => (
                  <li key={item}>
                    <span className="tick">✓</span>
                    {item}
                  </li>
                ))}
                <li className="muted">
                  <span className="lock">🔒</span>
                  {tl.pricing.freeLocked}
                </li>
              </ul>
              <Link href="/app" className="btn btn-outline">
                {viewer ? tl.pricing.freeCtaViewer : tl.pricing.freeCta}
              </Link>
            </div>

            <div className="price-card pro">
              <span className="price-tag">{tl.pricing.proTag}</span>
              <div className="price-name">{tl.pricing.proName}</div>
              <div className="price-value">
                ¥{PRO_PRICE_JPY.toLocaleString(lang === 'ja' ? 'ja-JP' : 'en-US')}
                <small>{tl.pricing.proPriceNote}</small>
              </div>
              {tl.pricing.proApprox ? (
                <p className="price-approx">{tl.pricing.proApprox}</p>
              ) : null}
              <ul className="price-list">
                {tl.pricing.proFeatures.map((item, i) => (
                  <li key={item}>
                    <span className="tick">✓</span>
                    {i < 3 ? <b>{item}</b> : item}
                  </li>
                ))}
              </ul>
              {viewer?.isPro ? (
                <Link href="/app" className="btn btn-outline">
                  {tl.pricing.proActive}
                </Link>
              ) : viewer && isStripeConfigured() ? (
                <form action="/api/stripe/checkout" method="post">
                  <button type="submit" className="btn btn-primary btn-block">
                    {tl.pricing.proStart}
                  </button>
                </form>
              ) : demo ? (
                <Link href="/app?plan=pro" className="btn btn-primary">
                  {tl.pricing.proDemo}
                </Link>
              ) : (
                <Link href="/signin?next=/app%3Fupgrade%3D1" className="btn btn-primary">
                  {tl.pricing.proStartShort}
                </Link>
              )}
            </div>
          </div>
          <p className="price-foot">
            {tl.pricing.foot}
            {!stripeReady && !demo ? tl.pricing.footUnavailable : ''}
          </p>
        </section>

        <section className="section" id="compare">
          <div className="section-head">
            <h2>{tl.compare.title}</h2>
          </div>
          <div className="compare-wrap">
            <table className="compare">
              <thead>
                <tr>
                  <th scope="col">{tl.compare.headFeature}</th>
                  <th scope="col">{tl.compare.headFree}</th>
                  <th scope="col" className="pro">
                    {tl.compare.headPro}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tl.compare.rows.map((row) => (
                  <tr key={row.feature}>
                    <th scope="row">{row.feature}</th>
                    <td className={row.freeTone === 'yes' ? 'yes' : row.freeTone === 'no' ? 'no' : undefined}>
                      {row.free}
                    </td>
                    <td className={row.proTone === 'yes' ? 'yes' : row.proTone === 'no' ? 'no' : undefined}>
                      {row.pro}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="section" id="faq">
          <div className="section-head">
            <h2>{tl.faqTitle}</h2>
          </div>
          <div className="faq">
            {t.faq.map((item) => (
              <details key={item.question}>
                <summary>{item.question}</summary>
                <div className="answer">{item.answer}</div>
              </details>
            ))}
          </div>
        </section>

        <section className="cta-band">
          <div>
            <h2>{tl.ctaBand.title}</h2>
            <p>{tl.ctaBand.body}</p>
          </div>
          <Link href="/app" className="btn">
            {viewer ? tl.ctaOpen : tl.ctaStart}
          </Link>
        </section>
      </div>
      </main>
    </>
  );
}
