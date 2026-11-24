import type { Metadata } from 'next';
import Link from 'next/link';
import { getLang } from '@/lib/i18n-server';
import { legal, legalEn } from '@/lib/legal';
import { pageMetadata } from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return pageMetadata({
    title: lang === 'en' ? 'Privacy Policy' : 'プライバシーポリシー',
    description:
      lang === 'en'
        ? 'Privacy Policy for Best Shot Extractor: videos and images are processed on your device and never sent to a server; what information we collect, why, and who processes it.'
        : 'ベストショット抽出のプライバシーポリシー。動画・画像は端末内で処理されサーバーへ送信されないこと、取得する情報と利用目的、第三者提供・委託先を説明します。',
    path: '/privacy',
    lang,
  });
}

export default async function PrivacyPage() {
  const lang = await getLang();
  return (
    <div className="legal-page">
      <div className="container">
        <article className="legal-paper">{lang === 'en' ? <PrivacyEn /> : <PrivacyJa />}</article>
      </div>
    </div>
  );
}

function PrivacyJa() {
  return (
    <>
      <h1>プライバシーポリシー</h1>
      <p className="updated">制定日: {legal.effectiveDate}</p>

      <p>
        {legal.operatorName}（以下「当社」といいます）は、当社が提供する「{legal.serviceName}」（以下「本サービス」といいます）における
        個人情報および利用者情報の取扱いについて、以下のとおり定めます。
      </p>

      <h2>1. 本サービスの基本方針（動画は送信されません）</h2>
      <p>
        本サービスは、動画ファイルの解析・顔の検出・画像の切り出し・高画質化・AI超解像を、すべて利用者のブラウザ（端末）内で実行します。
        <b>動画ファイルおよび生成された画像が、当社のサーバーや外部のAIサービスに送信・保存されることはありません。</b>
        本サービスは外部の画像生成・画像処理APIを利用していません。
      </p>

      <h2>2. 取得する情報</h2>
      <p>当社は、本サービスの提供にあたり、以下の情報を取得します。</p>
      <ol>
        <li>
          <b>アカウント情報</b>: メールアドレス、認証基盤（Supabase Auth）が発行するユーザーID、ログイン方法（Googleログインの場合は
          プロバイダの識別子）。パスワードは当社が保持しません（マジックリンク方式）。
        </li>
        <li>
          <b>利用状況</b>: 解析を実行した日時、本数、動画の長さ（秒）、プラン（無料 / Pro）。無料プランの1日3本制限の判定に利用します。
          動画の内容やファイル名は送信されません。
        </li>
        <li>
          <b>決済情報</b>: 決済代行会社 Stripe, Inc. が処理する顧客ID、サブスクリプションID、契約状況、次回更新日。
          クレジットカード番号・セキュリティコードは当社に提供されず、当社は保持しません。
        </li>
        <li>
          <b>技術情報</b>: サービス提供・障害対応のために、サーバー（Vercel）のアクセスログ（IPアドレス、ユーザーエージェント等）が
          記録される場合があります。
        </li>
        <li>
          <b>お問い合わせ情報</b>: お問い合わせの際にご提供いただく氏名、連絡先、内容。
        </li>
      </ol>

      <h2>3. 利用目的</h2>
      <ol>
        <li>本サービスの提供、本人確認、利用回数の管理およびプランの適用</li>
        <li>有料プランの課金、請求、返金その他の決済管理</li>
        <li>お問い合わせへの対応、障害の調査および復旧</li>
        <li>本サービスの改善、不正利用の防止、利用規約違反への対応</li>
        <li>法令に基づく対応</li>
      </ol>

      <h2>4. 第三者提供・委託</h2>
      <p>
        当社は、法令に基づく場合を除き、本人の同意なく個人情報を第三者に提供しません。本サービスの運営のため、以下の事業者に
        業務を委託しており、必要な範囲で情報を取り扱わせています。
      </p>
      <ul>
        <li>Supabase, Inc.（認証・データベース。アカウント情報、利用回数の記録）</li>
        <li>Stripe, Inc.（決済処理。メールアドレス、決済情報）</li>
        <li>Vercel Inc.（ホスティング。アクセスログ）</li>
      </ul>
      <p>
        これらの事業者は日本国外に所在する場合があります。当社は、委託先に対して必要かつ適切な監督を行います。
      </p>

      <h2>5. Cookie等の利用</h2>
      <p>
        本サービスは、ログイン状態の維持および利用回数の管理のために、Cookie（Supabase AuthのセッションCookie等）を使用します。
        これらは本サービスの提供に必要なものであり、広告配信や行動ターゲティングのためのCookieは使用していません。
      </p>

      <h2>6. 保存期間</h2>
      <p>
        アカウント情報は、アカウントが存在する間保存されます。利用回数の記録は、制限判定に必要な期間（日次）保存されます。
        決済に関する記録は、法令上の保存義務に従い保存されます。アカウント削除のご希望は下記の連絡先までご連絡ください。
      </p>

      <h2>7. 開示・訂正・削除等の請求</h2>
      <p>
        利用者は、当社が保有する自己の個人情報について、開示、訂正、追加、削除、利用停止を請求することができます。
        ご本人であることを確認したうえで、法令に従い遅滞なく対応します。下記の連絡先までお申し出ください。
      </p>

      <h2>8. 安全管理措置</h2>
      <p>
        当社は、個人情報への不正アクセス、紛失、改ざん、漏えいを防止するため、通信の暗号化（HTTPS）、アクセス制御、
        認証情報の適切な管理、委託先の監督等の措置を講じます。
      </p>

      <h2>9. 未成年者の利用</h2>
      <p>
        未成年者が本サービスを利用する場合、親権者等の法定代理人の同意を得たうえでご利用ください。有料プランのお申し込みは、
        法定代理人の同意がある場合に限ります。
      </p>

      <h2>10. プライバシーポリシーの変更</h2>
      <p>
        当社は、必要に応じて本ポリシーを変更することがあります。変更後の内容は本サービス上に掲載した時点から適用されます。
        重要な変更がある場合は、本サービス上でお知らせします。
      </p>

      <h2>11. お問い合わせ窓口</h2>
      <p>
        {legal.operatorName}
        <br />
        メールアドレス: {legal.email}
        <br />
        所在地・電話番号: 請求があった場合に遅滞なく開示いたします。
      </p>

      <p className="legal-note">
        関連: <Link href="/terms">利用規約</Link> ／ <Link href="/tokushoho">特定商取引法に基づく表記</Link>
      </p>
    </>
  );
}

function PrivacyEn() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="updated">Effective date: {legalEn.effectiveDate}</p>

      <p>
        {legalEn.operatorName} (the “Operator”) sets out below how personal information and user information are handled
        in “{legalEn.serviceName}” (the “Service”), which the Operator provides.
      </p>

      <h2>1. Our basic policy: videos are never transmitted</h2>
      <p>
        The Service performs video analysis, face detection, image cropping, enhancement and AI upscaling entirely
        inside your browser (device). <b>Video files and the images generated from them are never sent to or stored on
        the Operator&apos;s servers or on any external AI service.</b> The Service does not use external image
        generation or image processing APIs.
      </p>

      <h2>2. Information we collect</h2>
      <p>In providing the Service, the Operator collects the following information.</p>
      <ol>
        <li>
          <b>Account information</b>: your email address, the user ID issued by our authentication provider (Supabase
          Auth), and your sign-in method (for Google sign-in, the provider identifier). The Operator does not store
          passwords (magic-link sign-in).
        </li>
        <li>
          <b>Usage</b>: when you ran an analysis, how many videos you analyzed, the video duration in seconds, and your
          plan (Free / Pro). This is used to apply the free plan&apos;s limit of 3 videos a day. Video content and file
          names are not transmitted.
        </li>
        <li>
          <b>Payment information</b>: the customer ID, subscription ID, subscription status and next renewal date
          processed by our payment provider, Stripe, Inc. Card numbers and security codes are not provided to the
          Operator and are not stored by the Operator.
        </li>
        <li>
          <b>Technical information</b>: for service delivery and troubleshooting, access logs of the hosting provider
          (Vercel), such as IP address and user agent, may be recorded.
        </li>
        <li>
          <b>Inquiry information</b>: the name, contact details and content you provide when you contact us.
        </li>
      </ol>

      <h2>3. Purposes of use</h2>
      <ol>
        <li>Providing the Service, verifying identity, managing usage counts and applying plans</li>
        <li>Billing, invoicing, refunds and other payment management for paid plans</li>
        <li>Responding to inquiries and investigating and recovering from failures</li>
        <li>Improving the Service, preventing misuse and responding to violations of the Terms of Service</li>
        <li>Complying with laws and regulations</li>
      </ol>

      <h2>4. Third-party provision and outsourcing</h2>
      <p>
        The Operator does not provide personal information to third parties without the individual&apos;s consent,
        except as required by law. To operate the Service, the Operator outsources work to the following providers,
        which handle information only to the extent necessary.
      </p>
      <ul>
        <li>Supabase, Inc. (authentication and database: account information, usage records)</li>
        <li>Stripe, Inc. (payment processing: email address, payment information)</li>
        <li>Vercel Inc. (hosting: access logs)</li>
      </ul>
      <p>
        These providers may be located outside Japan. The Operator exercises necessary and appropriate supervision over
        them.
      </p>

      <h2>5. Cookies</h2>
      <p>
        The Service uses cookies (such as the Supabase Auth session cookie) to keep you signed in and to manage usage
        counts. These are necessary to provide the Service. The Service does not use cookies for advertising or
        behavioural targeting.
      </p>

      <h2>6. Retention</h2>
      <p>
        Account information is kept for as long as the account exists. Usage records are kept for the period needed to
        apply the limits (daily). Payment records are kept in accordance with statutory retention requirements. To
        request deletion of your account, please contact us at the address below.
      </p>

      <h2>7. Requests for disclosure, correction and deletion</h2>
      <p>
        You may request the disclosure, correction, addition, deletion or suspension of use of your personal
        information held by the Operator. After confirming your identity, the Operator will respond without delay in
        accordance with applicable law. Please contact us at the address below.
      </p>

      <h2>8. Security measures</h2>
      <p>
        To prevent unauthorized access to, loss of, tampering with or leakage of personal information, the Operator
        takes measures such as encryption of communications (HTTPS), access control, appropriate management of
        credentials and supervision of contractors.
      </p>

      <h2>9. Use by minors</h2>
      <p>
        Minors must use the Service with the consent of a parent or other legal representative. A paid plan may only be
        purchased with the consent of a legal representative.
      </p>

      <h2>10. Changes to this policy</h2>
      <p>
        The Operator may change this policy as necessary. Changes apply from the time they are posted on the Service.
        Material changes will be announced on the Service.
      </p>

      <h2>11. Contact</h2>
      <p>
        {legalEn.operatorName}
        <br />
        Email: {legalEn.email}
        <br />
        Address and phone number: disclosed without delay upon request.
      </p>

      <p className="legal-note">
        Related: <Link href="/terms?lang=en">Terms of Service</Link> ／{' '}
        <Link href="/tokushoho?lang=en">Legal notice (Specified Commercial Transactions Act)</Link>
      </p>
    </>
  );
}
