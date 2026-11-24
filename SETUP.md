# セットアップ手順（Supabase / Stripe / Vercel）

このアプリは **Next.js 16（App Router）+ Supabase（Auth + Postgres）+ Stripe（サブスク）** で動きます。
環境変数が未設定の間は **デモモード**（ログイン・課金なしでツール画面が開く）で起動します。

```
face-extractor-saas/
├─ public/engine/          # 既存の顔抽出エンジン（app.js, enhance.js, lib/, models/）
├─ src/app/                # 画面（/, /app, /signin, /terms, /privacy, /tokushoho）
│  └─ api/                 # usage / stripe のAPI Routes
├─ src/lib/                # env, auth, stripe, supabase クライアント
├─ src/components/         # ツール画面・利用状況バナー・ヘッダー
├─ supabase/schema.sql     # テーブル・RLS・回数加算関数
└─ .env.example
```

---

## 0. 必要なもの

- Node.js 20 以上（このリポジトリは Node 26 でビルド確認済み）
- Supabase アカウント（無料枠で可）
- Stripe アカウント（テストモードで可）
- Vercel アカウント

```bash
npm install
cp .env.example .env.local   # 値を埋める
npm run dev                  # http://localhost:3000
```

---

## 1. Supabase の準備

1. <https://supabase.com> で新規プロジェクトを作成（リージョンは `Northeast Asia (Tokyo)` 推奨）。
2. **SQL Editor** を開き、`supabase/schema.sql` の内容を全文貼り付けて実行。
   - `profiles`（プラン状態）と `daily_usage`（日次回数）、RLS、新規ユーザー作成トリガー、
     回数を原子的に加算する `consume_daily_usage()` が作成されます。
3. **Project Settings → API** から以下を `.env.local` に入れる。

   | 環境変数 | 場所 |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role secret key（**サーバー専用**） |

4. **Authentication → URL Configuration**
   - Site URL: `http://localhost:3000`（本番は `https://あなたのドメイン`）
   - Redirect URLs に追加:
     - `http://localhost:3000/auth/callback`
     - `https://あなたのドメイン/auth/callback`
5. **Authentication → Providers**
   - Email: 有効（既定）。マジックリンク方式でログインします。
   - Google: 有効にして、Google Cloud で OAuth クライアント（ウェブアプリ）を作成し、
     クライアントID / シークレットを登録。承認済みリダイレクトURIは
     `https://<project-ref>.supabase.co/auth/v1/callback`。
6. **Authentication → Emails** のテンプレートは既定のままで動きます。送信元を独自ドメインにしたい場合は SMTP を設定。

> メールのマジックリンクが届かない場合は、迷惑メールフォルダと Supabase の Rate Limit（無料枠は1時間あたりの送信数）を確認してください。

---

## 2. Stripe の準備

1. **商品カタログ → 商品を追加**
   - 名前: `ベストショット抽出 Pro`
   - 価格: **¥500 JPY / 月（継続）**
   - 作成後の **Price ID（`price_...`）** を `STRIPE_PRICE_ID` に入れる。
2. **開発者 → APIキー** の「シークレットキー」を `STRIPE_SECRET_KEY` に入れる。
   - 本番審査前は `sk_test_...` で動作確認できます。
3. **開発者 → Webhook**
   - エンドポイントURL: `https://あなたのドメイン/api/stripe/webhook`
   - 送信するイベント:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - 表示される **署名シークレット（`whsec_...`）** を `STRIPE_WEBHOOK_SECRET` に入れる。
   - ローカルで試す場合: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
4. **設定 → 請求 → カスタマーポータル**
   - ポータルを有効化（「解約を許可」「支払い方法の更新を許可」をON）。
   - 設定ID（`bpc_...`）を使う場合は `STRIPE_PORTAL_CONFIGURATION_ID` に入れる（任意）。
5. 本番（Live）に切り替えるときは、Live のキー・Price・Webhook を作り直して Vercel の環境変数を差し替える。

### プラン状態の反映

| イベント | 動作 |
| --- | --- |
| `checkout.session.completed` | `profiles.plan = 'pro'`、顧客ID・サブスクID・次回更新日を保存 |
| `customer.subscription.updated` | `active` / `trialing` → `pro`、それ以外 → `free` |
| `customer.subscription.deleted` | `plan = 'free'`（解約） |

Webhookは署名検証つきで、`service_role` キーでDBを更新します。

---

## 3. Vercel へのデプロイ

1. このフォルダをGitリポジトリにして Vercel にインポート（Framework: Next.js を自動検出）。
2. **Environment Variables** に `.env.example` の全項目を設定（Production / Preview 両方）。
   - `NEXT_PUBLIC_SITE_URL` は本番ドメイン（例 `https://face.example.com`）。
3. デプロイ後、Supabase の Redirect URLs と Stripe の Webhook URL を本番ドメインに更新。
4. `https://あなたのドメイン/api/stripe/webhook` が 200 を返すことを Stripe ダッシュボードで確認。

> `public/engine/models/` に約13MBのモデルファイルがあります。Vercel の静的配信で問題ありませんが、
> 初回アクセス時にモデル（MediaPipe 約10MB）を読み込むため、回線によっては数秒かかります。

---

## 4. 動作確認チェックリスト

- [ ] `/` … ランディング（特徴・料金比較表・ログイン導線）が表示される
- [ ] `/signin` … Googleログインとメールのマジックリンクが送れる
- [ ] ログイン後 `/app` … 「本日の残り回数：あと3回 / 無料プラン」とツール本体が表示される
- [ ] 5分を超える動画を選ぶと、無料プランでは開始できない（エラー＋アップグレード導線）
- [ ] 3本解析すると4本目がブロックされ、翌日0時（JST）に戻る
- [ ] AI超解像のトグルが「🔒 月額500円のProプランで利用可能」になっている
- [ ] カード（テスト用 `4242 4242 4242 4242`）でProに登録 → Webhookで `plan = pro` になり、無制限表示に変わる
- [ ] ProではAI超解像・「すべてAI超解像」が使える
- [ ] アカウントメニュー → カスタマーポータルが開き、解約すると `plan = free` に戻る
- [ ] `/terms` `/privacy` `/tokushoho` が表示され、事業者情報が正しい
- [ ] iPhone Safari で動画読み込み → 解析 → 共有シートから「画像を保存」できる

---

## 5. トラブルシューティング

| 症状 | 確認すること |
| --- | --- |
| ログインメールが届かない | Supabase の Email 設定・Rate Limit・迷惑メール。まず Supabase の Auth Logs を見る |
| `consume_daily_usage` が見つからない | `supabase/schema.sql` を再実行（関数が未作成だとルートはテーブル直接更新にフォールバック） |
| 回数が減らない/増えない | `SUPABASE_SERVICE_ROLE_KEY` が入っているか（RLSをバイパスするため必須） |
| 決済後にProにならない | Stripe Webhook の配信ログ（200か）と `STRIPE_WEBHOOK_SECRET`、Vercel の関数ログ |
| カスタマーポータルが開かない | 顧客IDが `profiles` に入っているか、ポータル設定が有効か |
| AIモデルが読み込めない | `/engine/lib/wasm/` と `/engine/models/` が配信されているか（404でないか） |
| 特商法の表記が空 | `.env.local` / Vercel の `NEXT_PUBLIC_OPERATOR_*`・`NEXT_PUBLIC_SUPPORT_EMAIL` を設定 |
