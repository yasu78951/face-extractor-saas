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
| 1日の本数 | 3本（JST 0時リセット） | 無制限 |
| 動画の長さ | 5分（300秒）まで | 制限なし |
| 高画質補正 | 標準 / 強 | 標準 / 強 |
| 端末内AI超解像 | 🔒 ロック | ✓ |
| カスタマーポータル | — | ✓ |

制限は **クライアント側チェック（動画メタデータ）＋ サーバー側API（`/api/usage/check-and-increment`）** の二重で検証します。

## 画面

| パス | 内容 |
| --- | --- |
| `/` | ランディング（特徴・料金・無料/Pro比較表・FAQ・ログイン導線） |
| `/app` | 利用状況バナー＋顔抽出ツール本体（要ログイン。デモモードではログイン不要） |
| `/signin` | Google / メール（マジックリンク）ログイン |
| `/terms` | 利用規約 |
| `/privacy` | プライバシーポリシー |
| `/tokushoho` | 特定商取引法に基づく表記（環境変数で差し替え） |

## API Routes

| エンドポイント | 内容 |
| --- | --- |
| `POST /api/usage/check-and-increment` | 認証・プラン確認、無料は300秒以内＆1日3本チェック＋加算（`GET` は残り回数の照会） |
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
python3 scripts/verify.py     # Playwright（PC 1280px / iPhone 390px）
```

`scripts/verify.py` は本番ビルドを起動し、以下を自動確認して `screenshots/` に画像を保存します。
結果は `verify-report.json` に残ります。

- 主要ページ（`/` `/signin` `/terms` `/privacy` `/tokushoho` `/app`）の表示と文言
- JSエラー（console.error / pageerror）0件・HTTP 4xx/5xx 0件
- デモモードでテスト動画を読み込み→解析スタート→残り回数が3→2に減る（エンドツーエンド）
- 300秒超の動画は403、4本目は429、上限到達が画面に反映
- Pro表示（無制限・AI超解像ロック解除）
- Stripe未設定時のCheckout/Portalのリダイレクト、Webhookの拒否

## ディレクトリ

```
public/engine/            既存の顔抽出エンジン（app.js / enhance.js / lib / models）
  app.js                  プラン判定（window.__FE_GATE）と無料プランの開始前チェックを追加
src/app/app/engine.css    エンジン本来のUIスタイル（/app のみに読み込み）
src/app/app/tool-ui.css   SaaSシェル（利用状況バナー等）のスタイル
supabase/schema.sql       profiles / daily_usage / RLS / consume_daily_usage()
```

## ライセンス・注意

- 本サービスは生成物の肖像権等について保証しません。権利者の同意がある動画のみご利用ください。
- `public/engine/lib/tf.min.js` / `upscaler.min.js` / ESRGAN-slim モデルは端末内処理用に同梱しています。
