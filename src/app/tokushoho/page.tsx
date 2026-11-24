import type { Metadata } from 'next';
import Link from 'next/link';
import { addressDisplay, legal, phoneDisplay } from '@/lib/legal';

export const metadata: Metadata = {
  title: '特定商取引法に基づく表記 | ベストショット抽出',
  description: 'ベストショット抽出（Proプラン）の特定商取引法に基づく表記です。',
};

export default function TokushohoPage() {
  return (
    <div className="legal-page">
      <div className="container">
        <article className="legal-paper">
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
                <td>{addressDisplay}</td>
              </tr>
              <tr>
                <th scope="row">電話番号</th>
                <td>{phoneDisplay}</td>
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
                <td>
                  お申し込み時に初回のお支払いが発生し、以降は毎月の更新日に自動的に請求されます。
                </td>
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
                <td>
                  本サービスはデジタル役務であり、提供開始後の返品はお受けできません。
                </td>
              </tr>
            </tbody>
          </table>

          <p className="legal-note">
            関連: <Link href="/terms">利用規約</Link> ／ <Link href="/privacy">プライバシーポリシー</Link>
          </p>
        </article>
      </div>
    </div>
  );
}
