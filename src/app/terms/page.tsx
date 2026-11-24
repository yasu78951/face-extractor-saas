import type { Metadata } from 'next';
import Link from 'next/link';
import { getLang } from '@/lib/i18n-server';
import { legal, legalEn } from '@/lib/legal';
import { pageMetadata } from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return pageMetadata({
    title: lang === 'en' ? 'Terms of Service' : '利用規約',
    description:
      lang === 'en'
        ? 'Terms of Service for Best Shot Extractor, the tool that extracts face photos from videos. It covers conditions of use, prohibited acts, paid plans and cancellation, and disclaimers.'
        : 'ベストショット抽出（動画から顔写真を自動抽出するツール）の利用規約。サービスの利用条件、禁止事項、有料プランと解約、免責事項を定めています。',
    path: '/terms',
    lang,
  });
}

export default async function TermsPage() {
  const lang = await getLang();
  return (
    <div className="legal-page">
      <div className="container">
        <article className="legal-paper">{lang === 'en' ? <TermsEn /> : <TermsJa />}</article>
      </div>
    </div>
  );
}

function TermsJa() {
  return (
    <>
      <h1>利用規約</h1>
      <p className="updated">制定日: {legal.effectiveDate}</p>

      <p>
        この利用規約（以下「本規約」といいます）は、{legal.operatorName}（以下「当社」といいます）が提供する
        ウェブサービス「{legal.serviceName}」（以下「本サービス」といいます）の利用条件を定めるものです。
        ユーザーは、本規約に同意のうえ本サービスを利用するものとします。
      </p>

      <h2>第1条（適用）</h2>
      <ol>
        <li>本規約は、ユーザーと当社との間の本サービスの利用に関わる一切の関係に適用されます。</li>
        <li>
          当社が本サービス上で掲載する利用上の注意、ヘルプ、料金表示その他の規定は、本規約の一部を構成するものとします。
        </li>
        <li>本規約の内容と前項の規定が異なる場合、本規約の規定が優先するものとします。</li>
      </ol>

      <h2>第2条（利用登録）</h2>
      <ol>
        <li>
          本サービスの有料機能の利用を希望する場合、または利用回数の管理を希望する場合、ユーザーは当社の定める方法により
          アカウントを作成するものとします。Googleアカウントまたはメールアドレスによるログインを利用できます。
        </li>
        <li>ユーザーは、正確かつ最新の情報を登録するものとします。</li>
        <li>
          アカウントの管理責任はユーザーに帰属します。第三者によるアカウントの利用により生じた損害について、
          当社は故意または重過失による場合を除き責任を負いません。
        </li>
      </ol>

      <h2>第3条（本サービスの内容）</h2>
      <ol>
        <li>
          本サービスは、ユーザーが選択した動画ファイルから、顔が写ったフレームを自動的に検出・採点し、画像として
          切り出す機能を提供します。画像の高画質化および端末内AIによる超解像処理も本サービスに含まれます。
        </li>
        <li>
          動画ファイルの解析・切り出し・高画質化は、ユーザーのブラウザ（端末）内で実行されます。当社のサーバーに
          動画ファイルが送信・保存されることはありません。
        </li>
        <li>
          当社のサーバーが取り扱う情報は、アカウント情報、利用回数の記録、および決済に関する情報（決済代行会社が処理）に限られます。
        </li>
      </ol>

      <h2>第4条（料金および支払い）</h2>
      <ol>
        <li>本サービスには無料プランと有料プラン（Proプラン）があります。各プランの内容は本サービス上の料金表示に従います。</li>
        <li>Proプランの利用料金は月額500円（税込）とし、Stripe, Inc. の決済サービスを通じてクレジットカードにより支払うものとします。</li>
        <li>
          Proプランは、解約の手続きがない限り、毎月自動的に更新されます。更新日はStripeのカスタマーポータルで確認できます。
        </li>
        <li>
          ユーザーは、Stripeのカスタマーポータル（本サービスのアカウントメニューから開けます）で、プランの確認、カード情報の変更、
          解約を行うことができます。
        </li>
        <li>
          解約した場合、次回更新日まではProプランの機能を利用できます。日割りによる返金は行いません。ただし、法令上必要な場合
          または当社が返金を相当と判断した場合はこの限りではありません。
        </li>
        <li>決済に関する情報（カード番号等）はStripeが処理し、当社はカード番号を保持しません。</li>
      </ol>

      <h2>第5条（無料プランの利用制限）</h2>
      <ol>
        <li>無料プランは、日本時間（Asia/Tokyo）の1日につき3本まで動画の解析を行うことができます。回数は日本時間の0時にリセットされます。</li>
        <li>無料プランで解析できる動画の長さは5分（300秒）以内です。</li>
        <li>端末内AI超解像の機能は、Proプランに限り利用できます。</li>
        <li>
          利用回数はサーバー側で記録・検証されます。不正な方法により制限を回避する行為（複数アカウントの濫用、APIの直接呼び出し等）は
          禁止します。
        </li>
      </ol>

      <h2>第6条（禁止事項）</h2>
      <p>ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
      <ol>
        <li>法令または公序良俗に違反する行為</li>
        <li>犯罪行為に関連する行為、またはその準備行為</li>
        <li>第三者の肖像権、プライバシー、名誉、著作権その他の権利を侵害する行為</li>
        <li>他人の動画や画像を、権利者の同意なく本サービスで処理する行為</li>
        <li>わいせつな目的、ストーキング、なりすましその他不適切な目的で本サービスを利用する行為</li>
        <li>本サービスのサーバーに過度の負荷をかける行為、不正アクセス、リバースエンジニアリング、自動化ツールによる大量アクセス</li>
        <li>本サービスの運営を妨害する行為、またはそのおそれのある行為</li>
        <li>その他、当社が不適切と判断する行為</li>
      </ol>

      <h2>第7条（生成物の取扱い）</h2>
      <ol>
        <li>本サービスにより生成された画像（切り出し・高画質化・超解像の結果）の利用に関する責任は、ユーザーに帰属します。</li>
        <li>
          ユーザーは、生成物を第三者に公開・送信する場合、被写体の肖像権その他の権利を侵害しないよう、自らの責任で確認するものとします。
        </li>
        <li>当社は生成物について、第三者の権利を侵害しないこと、特定の目的に適合することを保証しません。</li>
      </ol>

      <h2>第8条（知的財産権）</h2>
      <p>
        本サービスに関するプログラム、デザイン、文章その他の知的財産権は、当社または正当な権利者に帰属します。
        本規約は、本サービスの利用以外の目的でこれらを利用する権利をユーザーに付与するものではありません。
      </p>

      <h2>第9条（サービスの変更・停止・終了）</h2>
      <ol>
        <li>
          当社は、ユーザーへの事前の通知なく、本サービスの内容を変更し、または提供を一時停止・終了することができます。
          ただし、有料プランに重大な影響を与える変更については、合理的な範囲で事前に周知するよう努めます。
        </li>
        <li>当社は、前項の措置によりユーザーに生じた損害について、故意または重過失による場合を除き責任を負いません。</li>
        <li>
          本サービスを終了する場合、当社は有料プランの未経過分について、合理的な方法により返金の対応を行います。
        </li>
      </ol>

      <h2>第10条（免責事項）</h2>
      <ol>
        <li>
          本サービスは、顔の検出・採点・画質補正の結果について、その正確性、完全性、特定の目的への適合性を保証しません。
          動画の形式、明るさ、顔の向きなどにより、顔が検出されない場合や期待する画質にならない場合があります。
        </li>
        <li>
          ユーザーの端末、ブラウザ、通信環境に起因する不具合（解析の中断、メモリ不足、保存の失敗等）について、当社は責任を負いません。
        </li>
        <li>
          当社は、本サービスの利用によりユーザーに生じた損害について、当社に故意または重大な過失がある場合を除き、
          責任を負いません。当社が責任を負う場合、その範囲はユーザーが直近12か月間に支払った利用料金の額を上限とします。
        </li>
      </ol>

      <h2>第11条（個人情報の取扱い）</h2>
      <p>
        当社は、本サービスの利用により取得する個人情報を、
        <Link href="/privacy">プライバシーポリシー</Link> に従って適切に取り扱います。
      </p>

      <h2>第12条（規約の変更）</h2>
      <p>
        当社は、必要と判断した場合、本規約を変更することができます。変更後の規約は、本サービス上に掲載した時点から効力を生じるものとし、
        重要な変更は本サービス上でお知らせします。変更後に本サービスを利用した場合、変更後の規約に同意したものとみなします。
      </p>

      <h2>第13条（準拠法・裁判管轄）</h2>
      <p>
        本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して紛争が生じた場合には、当社の所在地を管轄する裁判所を
        第一審の専属的合意管轄とします。
      </p>

      <h2>第14条（お問い合わせ）</h2>
      <p>本サービスに関するお問い合わせは、{legal.email} までご連絡ください。</p>

      <p className="legal-note">
        制定: {legal.effectiveDate}　{legal.operatorName}
      </p>
    </>
  );
}

function TermsEn() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="updated">Effective date: {legalEn.effectiveDate}</p>

      <p>
        These Terms of Service (these “Terms”) set out the conditions for using the web service “{legalEn.serviceName}”
        (the “Service”) provided by {legalEn.operatorName} (the “Operator”). By using the Service you agree to these
        Terms.
      </p>

      <h2>1. Application</h2>
      <ol>
        <li>These Terms apply to all matters relating to your use of the Service and to your relationship with the Operator.</li>
        <li>
          Usage notes, help content, price displays and other rules posted by the Operator on the Service form part of
          these Terms.
        </li>
        <li>If these Terms conflict with the provisions of the preceding paragraph, these Terms prevail.</li>
      </ol>

      <h2>2. Accounts</h2>
      <ol>
        <li>
          To use paid features, or to have your usage counted to an account, you must create an account in the manner
          the Operator specifies. You can sign in with a Google account or an email address.
        </li>
        <li>You must register accurate and up-to-date information.</li>
        <li>
          You are responsible for managing your account. The Operator is not liable for damage caused by a third
          party&apos;s use of your account, except in cases of the Operator&apos;s intent or gross negligence.
        </li>
      </ol>

      <h2>3. What the Service does</h2>
      <ol>
        <li>
          The Service detects and scores frames containing faces in a video file you select, and extracts them as
          images. Image enhancement and on-device AI upscaling are also part of the Service.
        </li>
        <li>
          Analysis, cropping and enhancement of video files are performed inside your browser (device). No video file
          is sent to or stored on the Operator&apos;s servers.
        </li>
        <li>
          The information handled by the Operator&apos;s servers is limited to account information, usage records and
          payment information (processed by the payment provider).
        </li>
      </ol>

      <h2>4. Fees and payment</h2>
      <ol>
        <li>
          The Service has a free plan and a paid plan (Pro). The content of each plan follows the price display on the
          Service.
        </li>
        <li>
          The Pro plan costs ¥500 per month (tax included), paid by credit card through the payment services of Stripe,
          Inc.
        </li>
        <li>
          The Pro plan renews automatically each month unless you cancel. You can check the renewal date in the Stripe
          customer portal.
        </li>
        <li>
          You can review your plan, change your card and cancel in the Stripe customer portal (opened from the account
          menu of the Service).
        </li>
        <li>
          After cancelling, you can use Pro features until the next renewal date. No partial refunds are made, except
          where required by law or where the Operator determines that a refund is appropriate.
        </li>
        <li>Payment information (card number etc.) is processed by Stripe; the Operator does not store card numbers.</li>
      </ol>

      <h2>5. Free plan limits</h2>
      <ol>
        <li>
          The free plan allows you to analyze up to 3 videos per day in Japan time (Asia/Tokyo). The count resets at
          midnight Japan time.
        </li>
        <li>Videos analyzed on the free plan must be 5 minutes (300 seconds) or shorter.</li>
        <li>On-device AI upscaling is available only on the Pro plan.</li>
        <li>
          Usage is recorded and verified on the server. Circumventing the limits by improper means (abusing multiple
          accounts, calling the API directly, etc.) is prohibited.
        </li>
      </ol>

      <h2>6. Prohibited acts</h2>
      <p>You must not do any of the following when using the Service.</p>
      <ol>
        <li>Acts that violate laws, regulations or public order and morals</li>
        <li>Acts related to criminal activity, or preparation for such acts</li>
        <li>
          Acts that infringe the portrait rights, privacy, reputation, copyright or other rights of third parties
        </li>
        <li>Processing another person&apos;s video or images with the Service without the rights holder&apos;s consent</li>
        <li>
          Using the Service for obscene purposes, stalking, impersonation or any other inappropriate purpose
        </li>
        <li>
          Placing an excessive load on the Service&apos;s servers, unauthorized access, reverse engineering, or
          large-scale access using automated tools
        </li>
        <li>Interfering with, or risking interference with, the operation of the Service</li>
        <li>Any other act that the Operator deems inappropriate</li>
      </ol>

      <h2>7. Generated images</h2>
      <ol>
        <li>
          You are responsible for how you use images generated by the Service (the results of cropping, enhancement and
          upscaling).
        </li>
        <li>
          If you publish or send generated images to third parties, you must confirm at your own responsibility that you
          are not infringing the portrait rights or other rights of the person depicted.
        </li>
        <li>
          The Operator does not warrant that generated images do not infringe third-party rights, or that they are fit
          for a particular purpose.
        </li>
      </ol>

      <h2>8. Intellectual property</h2>
      <p>
        The programs, designs, texts and other intellectual property relating to the Service belong to the Operator or
        their rightful owners. These Terms do not grant you any right to use them for purposes other than using the
        Service.
      </p>

      <h2>9. Changes, suspension and termination</h2>
      <ol>
        <li>
          The Operator may change the Service, or suspend or end its provision, without prior notice to users. However,
          for changes that materially affect the paid plan, the Operator will make reasonable efforts to give advance
          notice.
        </li>
        <li>
          The Operator is not liable for damage caused to users by the measures in the preceding paragraph, except in
          cases of intent or gross negligence.
        </li>
        <li>
          If the Operator ends the Service, it will refund the unused portion of the paid plan by reasonable means.
        </li>
      </ol>

      <h2>10. Disclaimer</h2>
      <ol>
        <li>
          The Service does not warrant the accuracy, completeness or fitness for a particular purpose of face
          detection, scoring or image enhancement results. Faces may not be detected, or image quality may not meet
          your expectations, depending on the video format, brightness, face orientation and so on.
        </li>
        <li>
          The Operator is not liable for problems caused by your device, browser or network environment (interrupted
          analysis, out of memory, failed saving, etc.).
        </li>
        <li>
          The Operator is not liable for damage caused to you by your use of the Service, except in cases of the
          Operator&apos;s intent or gross negligence. Where the Operator is liable, its liability is capped at the
          amount of fees you paid in the most recent 12 months.
        </li>
      </ol>

      <h2>11. Personal information</h2>
      <p>
        The Operator handles personal information obtained through the Service appropriately in accordance with the{' '}
        <Link href="/privacy?lang=en">Privacy Policy</Link>.
      </p>

      <h2>12. Changes to these Terms</h2>
      <p>
        The Operator may change these Terms when it considers necessary. Changed Terms take effect when posted on the
        Service, and material changes will be announced on the Service. If you use the Service after a change, you are
        deemed to have agreed to the changed Terms.
      </p>

      <h2>13. Governing law and jurisdiction</h2>
      <p>
        These Terms are governed by the laws of Japan. Any dispute relating to the Service is subject to the exclusive
        jurisdiction of the court having jurisdiction over the Operator&apos;s location as the court of first instance.
      </p>

      <h2>14. Contact</h2>
      <p>For questions about the Service, please contact {legalEn.email}.</p>

      <p className="legal-note">
        Effective: {legalEn.effectiveDate} — {legalEn.operatorName}
      </p>
    </>
  );
}
