# ベストショット抽出（フリーミアム版Webアプリ）

動画から「正面を向いていて・ピントが合っていて・顔が大きい」コマを自動抽出するツールの、
サブスクリプション（無料 / Pro 月額500円）版です。

- **フロント**: Next.js 16（App Router / TypeScript）
- **認証・DB**: Supabase（Auth + PostgreSQL / RLS）
- **課金**: Stripe（Checkout + Webhook + Customer Portal）
- **画像処理**: すべてブラウザ内（MediaPipe Face Landmarker / Canvas / TensorFlow.js + ESRGAN-slim）
  - 外部AI API（fal.ai等）は使用しません。動画・画像はサーバーに送信されません。

## プラン

| | 無料 | Pro（月額500円） |
| --- | --- | --- |
| ログイン | 不要（ブラウザのCookieで数える） | 必要 |
| 1日の本数 | 3本（JST 0時リセット） | 無制限 |
| 動画の長さ | 5分（300秒）まで | 制限なし |
| 高画質補正 | 標準 / 強 | 標準 / 強 |
| 端末内AI超解像 | 🔒 ロック | ✓ |
| カスタマーポータル | — | ✓ |

制限は **クライアント側チェック（動画メタデータ）＋ サーバー側API（`/api/usage/check-and-increment`）** の二重で検証します。

### 無料プランはログイン不要

- 未ログインの利用者は **HMAC-SHA256署名付きのHttpOnly Cookie**（`fe_anon` = `v1.<YYYY-MM-DD(JST)>.<使用数>.<署名>`）で数えます。
  署名鍵は `SUPABASE_SERVICE_ROLE_KEY`（任意で `USAGE_COOKIE_SECRET` を優先可）。改ざん・別日付のCookieは0本扱いです。
- ログイン済みは従来どおり Supabase の `daily_usage`（アカウント単位）で数えます。
- ブラウザの履歴削除・シークレットモードではリセットされ得ます（離脱を減らすことを優先した割り切り）。
- 画面側は `localStorage`（`fe_usage`）に補助記録し、リロード時は `/api/usage/status` と突き合わせて残り回数を表示します。

## 画面

| パス | 内容 |
| --- | --- |
| `/` | ランディング（特徴・料金・無料/Pro比較表・FAQ・ログイン導線） |
| `/app` | 利用状況バナー＋顔抽出ツール本体（**ログイン不要**。Pro/AI超解像を使う時だけログイン） |
| `/signin` | Google / メール（マジックリンク）ログイン |
| `/auth/callback` | ログインリンクの受け口（`#access_token=...` をクライアントで処理してセッションCookie化） |
| `/auth/exchange` | `?code=`（Google OAuth などの PKCE）をサーバー側で交換してCookieを付与 |
| `/terms` | 利用規約 |
| `/privacy` | プライバシーポリシー |
| `/tokushoho` | 特定商取引法に基づく表記（環境変数で差し替え） |

## API Routes

| エンドポイント | 内容 |
| --- | --- |
| `POST /api/usage/check-and-increment` | プラン確認、無料は300秒以内＆1日3本チェック＋加算（ログイン済み=DB / 未ログイン=署名Cookie。`GET` は残り回数の照会） |
| `GET /api/usage/status` | 現在の残り回数（ログイン済み=アカウント / 未ログイン=Cookie） |
| `POST /api/stripe/checkout` | 月額500円のサブスクリプションCheckoutセッション作成 |
| `POST /api/stripe/portal` | Customer Portal セッション作成 |
| `POST /api/stripe/webhook` | `checkout.session.completed` / `customer.subscription.updated` / `customer.subscription.deleted` でプラン更新 |

## 開発

```bash
npm install
cp .env.example .env.local
npm run dev     # http://localhost:3000
npm run build   # 本番ビルド
npm start       # 本番サーバー
```

環境変数が未設定のときは **デモモード** で起動し、ログインなしで `/app` を確認できます
（`/app?plan=pro` でPro画面のプレビュー）。本番接続の手順は [SETUP.md](./SETUP.md) を参照してください。

## 検証（ビルド＋スクリーンショット）

```bash
npm run build
python3 scripts/verify.py       # Playwright（PC 1280px / iPhone 390px・デモモード）
python3 scripts/verify-anon.py  # 本番設定（Supabase env あり）で未ログイン導線を実測
python3 scripts/verify-auth.py  # メールログインのコールバック・エラー表示（デモ / env あり）
```

`scripts/verify.py` は本番ビルドを起動し、以下を自動確認して `screenshots/` に画像を保存します。
結果は `verify-report.json` に残ります。

- 主要ページ（`/` `/signin` `/terms` `/privacy` `/tokushoho` `/app`）の表示と文言
- JSエラー（console.error / pageerror）0件・HTTP 4xx/5xx 0件
- デモモードでテスト動画を読み込み→解析スタート→残り回数が3→2に減る（エンドツーエンド）
- 300秒超の動画は403、4本目は429、上限到達が画面に反映
- Pro表示（無制限・AI超解像ロック解除）
- Stripe未設定時のCheckout/Portalのリダイレクト、Webhookの拒否

`scripts/verify-anon.py` は Supabase の環境変数だけ入れた「本番に近い」状態で起動し、
未ログインのまま `/` → `/app` に入れること、解析で残り3→2・リロードで維持、4本目は429、
300秒超は403（回数消費なし）、CookieのHttpOnly・署名（改ざん・未来日付は無効）を確認します。

## メールログインの仕組み（PKCE を使わない理由）

メールのログインリンクは **implicit フロー** で送ります（`src/lib/supabase/implicit.ts`）。
`@supabase/ssr` の既定は PKCE で、リンクを開いたブラウザに `code_verifier` Cookie が残っていないと
`exchangeCodeForSession` が失敗します（iPhone の Gmail アプリ内ブラウザで開くと必ず失敗）。
implicit ならリンクを踏むと `/auth/callback#access_token=...&refresh_token=...` が返り、
クライアント側（`CallbackClient.tsx`）で `setSession` して Cookie に保存するため、どのブラウザからでもログインできます。

- リンクは1回だけ有効（既定1時間）。期限切れ・使用済みは `#error_code=otp_expired` で戻るので `/signin?error=expired` を表示。
- Google OAuth は従来どおり PKCE（`/auth/google` → `/auth/callback?code=...` → `/auth/exchange` で交換）。
- 認証 Cookie は `NextResponse` に直接セットします（`cookies()` の Set-Cookie がリダイレクトで落ちる環境対策）。
- Supabase の無料プラン（カスタムSMTPなし）ではメールテンプレートを編集できず、6桁コードをメールに載せられないため、コード入力ログインは実装していません。

## ディレクトリ

```
public/engine/            既存の顔抽出エンジン（app.js / enhance.js / lib / models）
  app.js                  プラン判定（window.__FE_GATE）と無料プランの開始前チェックを追加
src/app/app/engine.css    エンジン本来のUIスタイル（/app のみに読み込み）
src/app/app/tool-ui.css   SaaSシェル（利用状況バナー等）のスタイル
src/lib/anon-usage.ts     未ログイン利用の署名Cookie（回数カウント）
src/lib/usage.ts          残り回数の取得（ログイン/未ログイン共通）
supabase/schema.sql       profiles / daily_usage / RLS / consume_daily_usage()
```

## ライセンス・注意

- 本サービスは生成物の肖像権等について保証しません。権利者の同意がある動画のみご利用ください。
- `public/engine/lib/tf.min.js` / `upscaler.min.js` / ESRGAN-slim モデルは端末内処理用に同梱しています。
