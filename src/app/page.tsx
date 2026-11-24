import Link from 'next/link';
import { getViewer, type Viewer } from '@/lib/auth';
import { isDemoMode, isStripeConfigured, PRO_PRICE_JPY } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  let viewer: Viewer | null = null;
  try {
    viewer = await getViewer();
  } catch {
    viewer = null;
  }
  const demo = isDemoMode();
  const stripeReady = isStripeConfigured();

  return (
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
                <div className="hero-thumb best">★ BEST</div>
                <div className="hero-thumb">#2</div>
                <div className="hero-thumb">#3</div>
                <div className="hero-thumb">#4</div>
                <div className="hero-thumb">#5</div>
                <div className="hero-thumb">#6</div>
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
            <details>
              <summary>動画はサーバーに送られますか？</summary>
              <div className="answer">
                いいえ。動画の解析・切り出し・高画質化はすべてお使いのブラウザ内で実行され、動画ファイルがアップロードされることはありません。
                サーバーとやり取りするのは、ログイン情報と「何本使ったか」という回数の記録だけです。
              </div>
            </details>
            <details>
              <summary>無料プランの「1日3本」はいつリセットされますか？</summary>
              <div className="answer">
                日本時間（Asia/Tokyo）の0時にリセットされます。ログインなしでお使いの場合はお使いのブラウザ（Cookie）ごとにカウントし、
                ログインするとアカウントに紐づくので、端末を変えても同じアカウントなら回数は共有されます。
              </div>
            </details>
            <details>
              <summary>AI超解像はProプランだけですか？</summary>
              <div className="answer">
                はい。端末内AI超解像（ESRGAN-slim）はProプランの機能です。無料プランでは「標準」「強」の高画質補正をご利用いただけます。AI超解像は初回のみ約2.5MBのモデルを読み込みます（外部APIは使いません）。
              </div>
            </details>
            <details>
              <summary>iPhoneでも使えますか？</summary>
              <div className="answer">
                はい。Safariで開いて動画を選ぶだけで使えます。解析中は画面を閉じたりロックしたりすると停止しますので、画面を開いたままお待ちください。保存は共有シートの「画像を保存」が確実です。
              </div>
            </details>
            <details>
              <summary>解約はどうすればいいですか？</summary>
              <div className="answer">
                アカウントメニューの「プラン管理・カード変更・解約」からStripeのカスタマーポータルを開き、解約できます。解約後も次回更新日まではProの機能をご利用いただけます。
              </div>
            </details>
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
  );
}
