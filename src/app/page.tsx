import type { Metadata } from 'next';
import Link from 'next/link';
import { HERO_FACES } from '@/components/HeroFaces';
import { getViewer, type Viewer } from '@/lib/auth';
import { isDemoMode, isStripeConfigured, PRO_PRICE_JPY } from '@/lib/env';
import { FAQ_ITEMS } from '@/lib/faq';
import { SITE_DESCRIPTION, SITE_NAME, SITE_OG_IMAGE, SITE_TITLE, SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  // トップは検索意図に合わせた文言をそのまま出したいので、タイトルのテンプレートは使わない
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: '/',
    images: [SITE_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [SITE_OG_IMAGE.url],
  },
};

/** 構造化データ（JSON-LD）を埋め込む。`<` はエスケープして壊れないようにする。 */
function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

const WEB_APPLICATION_JSON_LD: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: 'MultimediaApplication',
  applicationSubCategory: '動画からの静止画切り出し・顔写真抽出',
  operatingSystem: 'iOS, Windows, macOS, Android',
  browserRequirements: 'Safari / Chrome / Edge / Firefox の最新版（AI超解像はWebGLが動作する端末）',
  inLanguage: 'ja-JP',
  isAccessibleForFree: true,
  offers: [
    {
      '@type': 'Offer',
      name: '無料プラン',
      price: '0',
      priceCurrency: 'JPY',
      description: 'ログイン不要で1日3本まで（動画は5分以内）',
      availability: 'https://schema.org/InStock',
    },
    {
      '@type': 'Offer',
      name: 'Proプラン',
      price: String(PRO_PRICE_JPY),
      priceCurrency: 'JPY',
      description: '本数・動画の長さ無制限、端末内AI超解像つき（月額・税込）',
      availability: 'https://schema.org/InStock',
    },
  ],
  featureList: [
    '動画から「正面・ピント・顔の大きさ」で自動採点し、ベストショットを抽出',
    '解析・切り出し・高画質化は端末内で完結（動画をアップロードしない）',
    '端末内AI超解像（ESRGAN-slim）による高画質化',
    '512 / 768 / 1024pxでの書き出し・一括保存',
  ],
};

const FAQ_JSON_LD: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: { '@type': 'Answer', text: item.answer },
  })),
};

export default async function LandingPage() {
  let viewer: Viewer | null = null;
  try {
    viewer = await getViewer();
  } catch {
    viewer = null;
  }
  const demo = isDemoMode();
  const stripeReady = isStripeConfigured();
  const upscaleHref = viewer?.isPro ? '/app' : viewer ? '/#pricing' : '/signin?next=%2F%23pricing';
  const upscaleLabel = viewer?.isPro ? 'Proプラン利用中（ツールを開く）' : '✨ 月額500円・ProプランでAI超解像を使う';

  return (
    <>
      <JsonLd data={WEB_APPLICATION_JSON_LD} />
      <JsonLd data={FAQ_JSON_LD} />
      <main className="landing">
      <div className="container">
        <section className="hero">
          <div>
            <span className="eyebrow">🎬 動画 → 顔写真を自動で選ぶ</span>
            <h1>
              動画から、
              <br />
              <span className="accent">いちばん良い顔写真</span>を。
            </h1>
            <p className="hero-lead">
              長時間の動画から「正面を向いていて・ピントが合っていて・顔が大きい」コマを自動で点数付けして抽出。
              高画質補正もAI超解像も、すべてお使いの端末の中で完結します。
            </p>
            <div className="hero-actions">
              {viewer ? (
                <>
                  <Link href="/app" className="btn btn-primary">
                    顔抽出ツールを開く
                  </Link>
                  <Link href="/#pricing" className="btn btn-outline">
                    料金を見る
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/app" className="btn btn-primary">
                    無料ではじめる（ログイン不要）
                  </Link>
                  <Link href="/#pricing" className="btn btn-outline">
                    料金を見る
                  </Link>
                </>
              )}
            </div>
            <p className="hero-note">
              {demo
                ? 'デモモードで表示中です。Supabase を接続するとログイン・回数制限・課金が有効になります。'
                : 'クレジットカード登録もログインも不要。まずは1日3本まで無料で試せます（Proにする時だけログイン）。'}
            </p>
            <div className="hero-badges">
              <span className="hero-badge">🔒 動画は外部送信なし</span>
              <span className="hero-badge">📱 iPhone Safari 対応</span>
              <span className="hero-badge">✨ 端末内AI超解像</span>
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
                      alt={face.alt}
                      width={820}
                      height={820}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      fetchPriority={i === 0 ? 'high' : 'low'}
                      decoding="async"
                    />
                    <span className="thumb-rank">{face.rank}</span>
                    <span className="thumb-score">
                      {face.score}
                      <i>点</i>
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="hero-card-caption">
              <span>
                解析したフレーム <b>612</b> ／ 候補 <b>16</b> 枚
              </span>
              <span>解析 12.4秒</span>
            </div>
          </div>
        </section>

        <section className="feature-row" id="features">
          <div className="feature">
            <div className="feature-icon">🎯</div>
            <h3>正面・鮮明・大きさで採点</h3>
            <p>
              顔の向き（ヨー・ピッチ・ロール）、目の開き、エッジの鮮明さ、明るさを独自スコアで評価。
              遠くに小さく写った顔も2×2タイル走査で拾います。
            </p>
          </div>
          <div className="feature">
            <div className="feature-icon">🔒</div>
            <h3>動画は端末の外へ出ない</h3>
            <p>
              解析・切り出し・高画質化はすべてブラウザ内（MediaPipe / Canvas / TensorFlow.js）で実行。
              動画や画像がサーバーにアップロードされることはありません。
            </p>
          </div>
          <div className="feature">
            <div className="feature-icon">✨</div>
            <h3>保存まで一気に</h3>
            <p>
              512 / 768 / 1024px で書き出し、iPhoneは共有シートから「画像を保存」。
              1枚ずつでも、まとめてでも保存できます。
            </p>
          </div>
        </section>

        <section className="section upscale" id="upscale">
          <div className="section-head">
            <span className="eyebrow">✨ ProのAI超解像</span>
            <h2>
              同じ1枚が、<span className="accent">ここまで別次元</span>に。
            </h2>
            <p className="upscale-lead">
              遠目に小さく写った顔も、輪郭・肌・瞳のハイライトまで。
              Proプランの端末内AI超解像（ESRGAN-slim）なら、その1枚が「使える顔写真」になります。
            </p>
          </div>

          <div className="ba-wrap">
            <figure className="ba-card before">
              <div className="ba-art">
                <img
                  src="/images/sample-best-before.jpg"
                  alt="遠目の顔をそのまま切り出して拡大した、ぼやけて粗い画像"
                  width={820}
                  height={820}
                  loading="lazy"
                  decoding="async"
                />
                <span className="ba-pixel" />
              </div>
              <figcaption className="ba-caption">
                <span className="ba-tag">Before</span>
                そのまま切り出して拡大（無料プラン）
              </figcaption>
              <p className="ba-comment">遠目の顔だと、ぼやけて・のっぺり…</p>
            </figure>

            <div className="ba-arrow" aria-hidden="true">
              <span className="ba-arrow-star" />
              <span className="ba-arrow-head">→</span>
            </div>

            <figure className="ba-card after">
              <div className="ba-art">
                <img
                  src="/images/sample-best.jpg"
                  alt="同じ顔写真をAI超解像でくっきり高精細に仕上げた画像"
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
                <span className="ba-badge">✨ AI超解像 ON</span>
              </div>
              <figcaption className="ba-caption">
                <span className="ba-tag pro">After</span>
                Proプラン：AI超解像 ON
              </figcaption>
              <p className="ba-comment strong">くっきり・ツヤツヤ・生き生き！</p>
            </figure>
          </div>

          <p className="ba-note">※仕上がりイメージです。元動画の解像度や顔の大きさによって効果は変わります。</p>

          <div className="ba-highlights">
            <span>輪郭までシャープ</span>
            <span>肌の質感アップ</span>
            <span>瞳にハイライト</span>
          </div>

          <div className="ba-cta">
            <Link href={upscaleHref} className="btn btn-primary btn-lg">
              {upscaleLabel}
            </Link>
            <span className="ba-cta-note">Proなら本数・動画の長さ無制限／カスタマーポータルからいつでも解約OK</span>
          </div>
        </section>

        <section className="section" id="how">
          <div className="section-head">
            <h2>使い方は3ステップ</h2>
            <p>インストール不要。ブラウザで開いて、動画を選ぶだけ。</p>
          </div>
          <div className="steps">
            <div className="step">
              <span className="step-num">1</span>
              <h3>動画を読み込む</h3>
              <p>MP4 / MOV / WebM / M4V に対応。iPhoneは写真ライブラリからも選べます。</p>
            </div>
            <div className="step">
              <span className="step-num">2</span>
              <h3>解析スタート</h3>
              <p>間隔・候補数・対象の顔を選んでスタート。1秒間隔なら数分の動画でも数十秒で完了します。</p>
            </div>
            <div className="step">
              <span className="step-num">3</span>
              <h3>ベストショットを保存</h3>
              <p>点数順に並んだ候補から選んでJPG / PNG保存。ProならAI超解像でさらにくっきり。</p>
            </div>
          </div>
        </section>

        <section className="section pricing" id="pricing">
          <div className="section-head">
            <h2>料金プラン</h2>
            <p>まずは無料プランで。物足りなくなったら月額500円のProプランへ。</p>
          </div>

          <div className="price-grid">
            <div className="price-card">
              <div className="price-name">無料プラン</div>
              <div className="price-value">
                ¥0<small>/ 月</small>
              </div>
              <ul className="price-list">
                <li>
                  <span className="tick">✓</span>ログイン不要で1日3本まで（日本時間で0時にリセット）
                </li>
                <li>
                  <span className="tick">✓</span>動画の長さ5分（300秒）以内
                </li>
                <li>
                  <span className="tick">✓</span>高画質補正「標準 / 強」
                </li>
                <li>
                  <span className="tick">✓</span>512 / 768 / 1024px 書き出し・一括保存
                </li>
                <li className="muted">
                  <span className="lock">🔒</span>AI超解像（ESRGAN-slim）
                </li>
              </ul>
              <Link href="/app" className="btn btn-outline">
                {viewer ? 'ツールを開く' : '無料ではじめる（ログイン不要）'}
              </Link>
            </div>

            <div className="price-card pro">
              <span className="price-tag">おすすめ</span>
              <div className="price-name">Proプラン</div>
              <div className="price-value">
                ¥{PRO_PRICE_JPY.toLocaleString('ja-JP')}
                <small>/ 月（税込）</small>
              </div>
              <ul className="price-list">
                <li>
                  <span className="tick">✓</span>
                  <b>本数無制限</b>
                </li>
                <li>
                  <span className="tick">✓</span>
                  <b>動画の時間制限なし</b>
                </li>
                <li>
                  <span className="tick">✓</span>
                  <b>端末内AI超解像（ESRGAN-slim）</b>
                </li>
                <li>
                  <span className="tick">✓</span>「✨ AI超解像」「✨ すべてAI超解像」
                </li>
                <li>
                  <span className="tick">✓</span>高画質補正「標準 / 強」・全書き出しサイズ
                </li>
                <li>
                  <span className="tick">✓</span>カスタマーポータルでいつでも解約・カード変更
                </li>
              </ul>
              {viewer?.isPro ? (
                <Link href="/app" className="btn btn-outline">
                  Proプラン利用中（ツールを開く）
                </Link>
              ) : viewer && isStripeConfigured() ? (
                <form action="/api/stripe/checkout" method="post">
                  <button type="submit" className="btn btn-primary btn-block">
                    Proプランをはじめる（月額500円）
                  </button>
                </form>
              ) : demo ? (
                <Link href="/app?plan=pro" className="btn btn-primary">
                  Pro画面をデモ表示
                </Link>
              ) : (
                <Link href="/signin?next=/app%3Fupgrade%3D1" className="btn btn-primary">
                  Proプランをはじめる
                </Link>
              )}
            </div>
          </div>
          <p className="price-foot">
            表示価格は税込です。Proプランは毎月自動更新（Stripe）。解約はカスタマーポータルからいつでも可能で、解約後も次回更新日までProの機能が使えます。
            {!stripeReady && !demo ? '（Stripe未設定のため、現在決済は受け付けていません）' : ''}
          </p>
        </section>

        <section className="section" id="compare">
          <div className="section-head">
            <h2>無料プランとProプランの比較</h2>
          </div>
          <div className="compare-wrap">
            <table className="compare">
              <thead>
                <tr>
                  <th scope="col">機能</th>
                  <th scope="col">無料プラン</th>
                  <th scope="col" className="pro">
                    Proプラン（月額500円）
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">1日の解析本数</th>
                  <td>3本まで</td>
                  <td className="yes">無制限</td>
                </tr>
                <tr>
                  <th scope="row">動画の長さ</th>
                  <td>5分（300秒）以内</td>
                  <td className="yes">制限なし</td>
                </tr>
                <tr>
                  <th scope="row">ベストショット自動抽出</th>
                  <td className="yes">✓</td>
                  <td className="yes">✓</td>
                </tr>
                <tr>
                  <th scope="row">高画質補正（標準 / 強）</th>
                  <td className="yes">✓</td>
                  <td className="yes">✓</td>
                </tr>
                <tr>
                  <th scope="row">2×2タイル走査（遠目の顔）</th>
                  <td className="yes">✓</td>
                  <td className="yes">✓</td>
                </tr>
                <tr>
                  <th scope="row">書き出しサイズ 512 / 768 / 1024px</th>
                  <td className="yes">✓</td>
                  <td className="yes">✓</td>
                </tr>
                <tr>
                  <th scope="row">端末内AI超解像（ESRGAN-slim）</th>
                  <td className="no">🔒 ロック</td>
                  <td className="yes">✓</td>
                </tr>
                <tr>
                  <th scope="row">「すべてAI超解像」</th>
                  <td className="no">🔒 ロック</td>
                  <td className="yes">✓</td>
                </tr>
                <tr>
                  <th scope="row">プラン変更・解約</th>
                  <td>—</td>
                  <td className="yes">カスタマーポータル</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="section" id="faq">
          <div className="section-head">
            <h2>よくある質問</h2>
          </div>
          <div className="faq">
            {FAQ_ITEMS.map((item) => (
              <details key={item.question}>
                <summary>{item.question}</summary>
                <div className="answer">{item.answer}</div>
              </details>
            ))}
          </div>
        </section>

        <section className="cta-band">
          <div>
            <h2>その動画、眠らせておくのはもったいない。</h2>
            <p>数十秒で、SNSやプロフィールに使える一枚が見つかります。</p>
          </div>
          <Link href="/app" className="btn">
            {viewer ? 'ツールを開く' : '無料ではじめる（ログイン不要）'}
          </Link>
        </section>
      </div>
      </main>
    </>
  );
}
