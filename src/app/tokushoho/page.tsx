import type { Metadata } from 'next';
import Link from 'next/link';
import { getLang } from '@/lib/i18n-server';
import {
  addressDisplayFor,
  legal,
  legalEn,
  phoneDisplayFor,
} from '@/lib/legal';
import { pageMetadata } from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return pageMetadata({
    title: lang === 'en' ? 'Legal Notice (Specified Commercial Transactions Act)' : '特定商取引法に基づく表記',
    description:
      lang === 'en'
        ? 'Legal notice for Best Shot Extractor (Pro plan) under the Japanese Specified Commercial Transactions Act: seller, price (¥500/month, tax included), payment, cancellation and refunds.'
        : 'ベストショット抽出（Proプラン）の特定商取引法に基づく表記。販売事業者・販売価格（月額500円・税込）・支払方法・解約と返金の取扱いを記載しています。',
    path: '/tokushoho',
    lang,
  });
}

export default async function TokushohoPage() {
  const lang = await getLang();
  return (
    <div className="legal-page">
      <div className="container">
        <article className="legal-paper">{lang === 'en' ? <TokushohoEn /> : <TokushohoJa />}</article>
      </div>
    </div>
  );
}

function TokushohoJa() {
  return (
    <>
      <h1>特定商取引法に基づく表記</h1>
      <p className="updated">制定日: {legal.effectiveDate}</p>

      <table>
        <tbody>
          <tr>
            <th scope="row">販売事業者</th>
            <td>{legal.operatorName}</td>
          </tr>
          <tr>
            <th scope="row">運営統括責任者</th>
            <td>{legal.representative}</td>
          </tr>
          <tr>
            <th scope="row">所在地</th>
            <td>{addressDisplayFor('ja')}</td>
          </tr>
          <tr>
            <th scope="row">電話番号</th>
            <td>{phoneDisplayFor('ja')}</td>
          </tr>
          <tr>
            <th scope="row">メールアドレス</th>
            <td>{legal.email}</td>
          </tr>
          <tr>
            <th scope="row">お問い合わせ受付</th>
            <td>メールにて随時受け付けます（通常3営業日以内に返信いたします）</td>
          </tr>
          <tr>
            <th scope="row">販売URL</th>
            <td>/（本サービス）</td>
          </tr>
          <tr>
            <th scope="row">販売価格</th>
            <td>
              Proプラン {legal.priceLabel}（サブスクリプション・毎月自動更新）
              <br />
              無料プラン 0円
            </td>
          </tr>
          <tr>
            <th scope="row">商品代金以外の必要料金</th>
            <td>
              本サービスの利用に必要なインターネット接続料金、通信料金、端末代金等はお客様のご負担となります。
            </td>
          </tr>
          <tr>
            <th scope="row">支払方法</th>
            <td>クレジットカード決済（Stripe, Inc. の決済システムを利用）</td>
          </tr>
          <tr>
            <th scope="row">支払時期</th>
            <td>お申し込み時に初回のお支払いが発生し、以降は毎月の更新日に自動的に請求されます。</td>
          </tr>
          <tr>
            <th scope="row">役務の提供時期</th>
            <td>決済完了後、ただちにProプランの機能をご利用いただけます。</td>
          </tr>
          <tr>
            <th scope="row">解約・返金について</th>
            <td>
              カスタマーポータル（アカウントメニューの「プラン管理・カード変更・解約」）からいつでも解約できます。
              解約後は次回更新日までProプランをご利用いただけ、その後の請求は発生しません。日割りによる返金は行いません。
              <br />
              サービスに重大な不具合があった場合等は、個別にご相談ください。
            </td>
          </tr>
          <tr>
            <th scope="row">動作環境</th>
            <td>
              iOS / iPadOS のSafari、Android のChrome、PC の Chrome / Edge / Safari / Firefox の最新版。
              AI超解像の利用には WebGL が動作する端末が必要です。
            </td>
          </tr>
          <tr>
            <th scope="row">返品・キャンセル（役務の性質）</th>
            <td>本サービスはデジタル役務であり、提供開始後の返品はお受けできません。</td>
          </tr>
        </tbody>
      </table>

      <p className="legal-note">
        関連: <Link href="/terms">利用規約</Link> ／ <Link href="/privacy">プライバシーポリシー</Link>
      </p>
    </>
  );
}

function TokushohoEn() {
  return (
    <>
      <h1>Legal Notice (Specified Commercial Transactions Act)</h1>
      <p className="updated">Effective date: {legalEn.effectiveDate}</p>

      <table>
        <tbody>
          <tr>
            <th scope="row">Seller</th>
            <td>{legalEn.operatorName}</td>
          </tr>
          <tr>
            <th scope="row">Operations manager</th>
            <td>{legalEn.representative}</td>
          </tr>
          <tr>
            <th scope="row">Address</th>
            <td>{addressDisplayFor('en')}</td>
          </tr>
          <tr>
            <th scope="row">Phone number</th>
            <td>{phoneDisplayFor('en')}</td>
          </tr>
          <tr>
            <th scope="row">Email address</th>
            <td>{legalEn.email}</td>
          </tr>
          <tr>
            <th scope="row">Enquiries</th>
            <td>By email at any time (we usually reply within 3 business days)</td>
          </tr>
          <tr>
            <th scope="row">Sales URL</th>
            <td>/ (this Service)</td>
          </tr>
          <tr>
            <th scope="row">Price</th>
            <td>
              Pro plan {legalEn.priceLabel} (subscription, renews automatically each month)
              <br />
              Free plan ¥0
            </td>
          </tr>
          <tr>
            <th scope="row">Costs other than the price</th>
            <td>
              Internet connection charges, data charges, device costs and any other costs required to use the Service
              are borne by the customer.
            </td>
          </tr>
          <tr>
            <th scope="row">Payment method</th>
            <td>Credit card (using the payment system of Stripe, Inc.)</td>
          </tr>
          <tr>
            <th scope="row">Payment timing</th>
            <td>
              The first payment is taken when you subscribe; after that you are charged automatically on the monthly
              renewal date.
            </td>
          </tr>
          <tr>
            <th scope="row">When the service is provided</th>
            <td>Pro features are available immediately after payment completes.</td>
          </tr>
          <tr>
            <th scope="row">Cancellation and refunds</th>
            <td>
              You can cancel at any time from the customer portal (Account menu → “Manage plan, card, cancel”). After
              cancelling you can use Pro until the next renewal date, and no further charges are made. No partial
              refunds are given.
              <br />
              If the Service has a serious defect, please contact us individually.
            </td>
          </tr>
          <tr>
            <th scope="row">System requirements</th>
            <td>
              Latest Safari on iOS / iPadOS, Chrome on Android, and latest Chrome / Edge / Safari / Firefox on desktop.
              AI upscaling requires a device that supports WebGL.
            </td>
          </tr>
          <tr>
            <th scope="row">Returns and cancellations (nature of the service)</th>
            <td>
              This is a digital service; returns after delivery has begun cannot be accepted.
            </td>
          </tr>
        </tbody>
      </table>

      <p className="legal-note">
        Related: <Link href="/terms?lang=en">Terms of Service</Link> ／{' '}
        <Link href="/privacy?lang=en">Privacy Policy</Link>
      </p>
    </>
  );
}
