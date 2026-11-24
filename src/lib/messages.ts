import type { Lang } from './i18n';

/**
 * 画面に出す文言（日本語 / 英語）。
 * 英語側は日本語側と同じキー構成を型で強制しているので、キーの追加漏れは `npm run build` で検出される。
 */

const ja = {
  common: {
    siteName: 'ベストショット抽出',
    siteTitle: '動画からベストな顔写真を自動抽出｜AI高画質化・iPhone対応',
    siteDescription:
      '動画から「正面・ピント・大きさ」でベストショットを自動抽出し、高画質な顔写真として保存できるWebツール。処理はすべて端末内で完結し、動画が外部に送信されることはありません。iPhoneのSafariでも使え、無料プランは1日3本まで、Proプラン（月額500円）は本数無制限・AI超解像つき。',
    keywords: [
      '動画 顔 抽出',
      'ベストショット 自動選択',
      '動画 切り出し 高画質化',
      '動画から顔写真',
      '顔写真 抽出 無料',
      'AI 超解像 顔写真',
      'iPhone 動画 写真 保存',
    ],
    ogImageAlt: 'AI超解像で仕上げた顔写真のサンプル',
    proPriceNote: '月額500円（税込）',
    language: '言語',
    demoTool: 'デモモードでツールを開く',
  },

  nav: {
    aria: 'メインメニュー',
    how: '使い方',
    pricing: '料金',
    faq: 'よくある質問',
    terms: '利用規約',
    openTool: 'ツールを開く',
    planPro: 'Proプラン',
    planFree: '無料プラン',
    account: 'アカウント',
    accountMenuAria: 'アカウントメニュー',
    signedInAs: 'ログイン中のアカウント',
    toolLink: '顔抽出ツール',
    upgrade: 'Proプランにアップグレード（月額500円）',
    manage: 'プラン管理・カード変更・解約',
    signOut: 'ログアウト',
    demoPill: 'デモモード',
    tryFree: '無料で試す',
    signIn: 'ログイン',
    signInSuffix: ' / 新規登録',
    switchToEn: 'English に切り替える',
    switchToJa: '日本語に切り替える',
  },

  footer: {
    note: '動画はブラウザ内のメモリだけで処理され、サーバーには送信されません。',
    tagline: 'ベストショット抽出ツール — 動画から顔写真を自動抽出',
    terms: '利用規約',
    privacy: 'プライバシーポリシー',
    tokushoho: '特定商取引法に基づく表記',
    pricing: '料金',
  },

  demoBar:
    'デモモード（Supabase未設定）: ログインなしで画面を確認できます。SETUP.md の手順で接続すると本番のログイン・課金が有効になります。',

  landing: {
    eyebrow: '🎬 動画 → 顔写真を自動で選ぶ',
    titleLine1: '動画から、',
    titleAccent: 'いちばん良い顔写真',
    titleTail: 'を。',
    lead:
      '長時間の動画から「正面を向いていて・ピントが合っていて・顔が大きい」コマを自動で点数付けして抽出。高画質補正もAI超解像も、すべてお使いの端末の中で完結します。',
    ctaOpen: '顔抽出ツールを開く',
    ctaStart: '無料ではじめる（ログイン不要）',
    ctaPricing: '料金を見る',
    note: 'クレジットカード登録もログインも不要。まずは1日3本まで無料で試せます（Proにする時だけログイン）。',
    noteDemo:
      'デモモードで表示中です。Supabase を接続するとログイン・回数制限・課金が有効になります。',
    badgePrivate: '🔒 動画は外部送信なし',
    badgeIphone: '📱 iPhone Safari 対応',
    badgeAi: '✨ 端末内AI超解像',
    heroFramesLabel: '解析したフレーム',
    heroCandidatesLabel: '候補',
    heroPicksUnit: '枚',
    heroAnalyzedLabel: '解析',
    heroSecondsUnit: '秒',
    heroPointsUnit: '点',

    features: [
      {
        icon: '🎯',
        title: '正面・鮮明・大きさで採点',
        body:
          '顔の向き（ヨー・ピッチ・ロール）、目の開き、エッジの鮮明さ、明るさを独自スコアで評価。遠くに小さく写った顔も2×2タイル走査で拾います。',
      },
      {
        icon: '🔒',
        title: '動画は端末の外へ出ない',
        body:
          '解析・切り出し・高画質化はすべてブラウザ内（MediaPipe / Canvas / TensorFlow.js）で実行。動画や画像がサーバーにアップロードされることはありません。',
      },
      {
        icon: '✨',
        title: '保存まで一気に',
        body:
          '512 / 768 / 1024px で書き出し、iPhoneは共有シートから「画像を保存」。1枚ずつでも、まとめてでも保存できます。',
      },
    ],

    upscale: {
      eyebrow: '✨ ProのAI超解像',
      titlePre: '同じ1枚が、',
      titleAccent: 'ここまで別次元',
      titleTail: 'に。',
      lead:
        '遠目に小さく写った顔も、輪郭・肌・瞳のハイライトまで。Proプランの端末内AI超解像（ESRGAN-slim）なら、その1枚が「使える顔写真」になります。',
      beforeAlt: '遠目の顔をそのまま切り出して拡大した、ぼやけて粗い画像',
      beforeCaption: 'そのまま切り出して拡大（無料プラン）',
      beforeComment: '遠目の顔だと、ぼやけて・のっぺり…',
      afterAlt: '同じ顔写真をAI超解像でくっきり高精細に仕上げた画像',
      afterCaption: 'Proプラン：AI超解像 ON',
      afterComment: 'くっきり・ツヤツヤ・生き生き！',
      badge: '✨ AI超解像 ON',
      note: '※仕上がりイメージです。元動画の解像度や顔の大きさによって効果は変わります。',
      highlights: ['輪郭までシャープ', '肌の質感アップ', '瞳にハイライト'],
      ctaPro: 'Proプラン利用中（ツールを開く）',
      ctaUpgrade: '✨ 月額500円・ProプランでAI超解像を使う',
      ctaNote: 'Proなら本数・動画の長さ無制限／カスタマーポータルからいつでも解約OK',
    },

    how: {
      title: '使い方は3ステップ',
      lead: 'インストール不要。ブラウザで開いて、動画を選ぶだけ。',
      steps: [
        {
          title: '動画を読み込む',
          body: 'MP4 / MOV / WebM / M4V に対応。iPhoneは写真ライブラリからも選べます。',
        },
        {
          title: '解析スタート',
          body: '間隔・候補数・対象の顔を選んでスタート。1秒間隔なら数分の動画でも数十秒で完了します。',
        },
        {
          title: 'ベストショットを保存',
          body: '点数順に並んだ候補から選んでJPG / PNG保存。ProならAI超解像でさらにくっきり。',
        },
      ],
    },

    pricing: {
      title: '料金プラン',
      lead: 'まずは無料プランで。物足りなくなったら月額500円のProプランへ。',
      freeName: '無料プラン',
      freePrice: '¥0',
      perMonth: '/ 月',
      freeFeatures: [
        'ログイン不要で1日3本まで（日本時間で0時にリセット）',
        '動画の長さ5分（300秒）以内',
        '高画質補正「標準 / 強」',
        '512 / 768 / 1024px 書き出し・一括保存',
      ],
      freeLocked: 'AI超解像（ESRGAN-slim）',
      freeCta: '無料ではじめる（ログイン不要）',
      freeCtaViewer: 'ツールを開く',
      proTag: 'おすすめ',
      proName: 'Proプラン',
      proPriceNote: '/ 月（税込）',
      proApprox: '約 $3.5 USD',
      proFeatures: [
        '本数無制限',
        '動画の時間制限なし',
        '端末内AI超解像（ESRGAN-slim）',
        '「✨ AI超解像」「✨ すべてAI超解像」',
        '高画質補正「標準 / 強」・全書き出しサイズ',
        'カスタマーポータルでいつでも解約・カード変更',
      ],
      proActive: 'Proプラン利用中（ツールを開く）',
      proStart: 'Proプランをはじめる（月額500円）',
      proStartShort: 'Proプランをはじめる',
      proDemo: 'Pro画面をデモ表示',
      foot:
        '表示価格は税込です。Proプランは毎月自動更新（Stripe）。解約はカスタマーポータルからいつでも可能で、解約後も次回更新日までProの機能が使えます。',
      footUnavailable: '（Stripe未設定のため、現在決済は受け付けていません）',
    },

    compare: {
      title: '無料プランとProプランの比較',
      headFeature: '機能',
      headFree: '無料プラン',
      headPro: 'Proプラン（月額500円）',
      rows: [
        { feature: '1日の解析本数', free: '3本まで', freeTone: 'plain', pro: '無制限', proTone: 'yes' },
        { feature: '動画の長さ', free: '5分（300秒）以内', freeTone: 'plain', pro: '制限なし', proTone: 'yes' },
        { feature: 'ベストショット自動抽出', free: '✓', freeTone: 'yes', pro: '✓', proTone: 'yes' },
        { feature: '高画質補正（標準 / 強）', free: '✓', freeTone: 'yes', pro: '✓', proTone: 'yes' },
        { feature: '2×2タイル走査（遠目の顔）', free: '✓', freeTone: 'yes', pro: '✓', proTone: 'yes' },
        { feature: '書き出しサイズ 512 / 768 / 1024px', free: '✓', freeTone: 'yes', pro: '✓', proTone: 'yes' },
        {
          feature: '端末内AI超解像（ESRGAN-slim）',
          free: '🔒 ロック',
          freeTone: 'no',
          pro: '✓',
          proTone: 'yes',
        },
        { feature: '「すべてAI超解像」', free: '🔒 ロック', freeTone: 'no', pro: '✓', proTone: 'yes' },
        {
          feature: 'プラン変更・解約',
          free: '—',
          freeTone: 'plain',
          pro: 'カスタマーポータル',
          proTone: 'yes',
        },
      ],
    },

    faqTitle: 'よくある質問',

    ctaBand: {
      title: 'その動画、眠らせておくのはもったいない。',
      body: '数十秒で、SNSやプロフィールに使える一枚が見つかります。',
    },
  },

  faq: [
    {
      question: '動画はサーバーに送られますか？',
      answer:
        'いいえ。動画の解析・切り出し・高画質化はすべてお使いのブラウザ内で実行され、動画ファイルがアップロードされることはありません。サーバーとやり取りするのは、ログイン情報と「何本使ったか」という回数の記録だけです。',
    },
    {
      question: '無料プランの「1日3本」はいつリセットされますか？',
      answer:
        '日本時間（Asia/Tokyo）の0時にリセットされます。ログインなしでお使いの場合はお使いのブラウザ（Cookie）ごとにカウントし、ログインするとアカウントに紐づくので、端末を変えても同じアカウントなら回数は共有されます。',
    },
    {
      question: 'AI超解像はProプランだけですか？',
      answer:
        'はい。端末内AI超解像（ESRGAN-slim）はProプランの機能です。無料プランでは「標準」「強」の高画質補正をご利用いただけます。AI超解像は初回のみ約2.5MBのモデルを読み込みます（外部APIは使いません）。',
    },
    {
      question: 'iPhoneでも使えますか？',
      answer:
        'はい。Safariで開いて動画を選ぶだけで使えます。解析中は画面を閉じたりロックしたりすると停止しますので、画面を開いたままお待ちください。保存は共有シートの「画像を保存」が確実です。',
    },
    {
      question: '解約はどうすればいいですか？',
      answer:
        'アカウントメニューの「プラン管理・カード変更・解約」からStripeのカスタマーポータルを開き、解約できます。解約後も次回更新日まではProの機能をご利用いただけます。',
    },
  ],

  tool: {
    title: '🎬 顔写真抽出ツール',
    lead: '動画は端末内だけで処理されます（外部送信なし）',
    leadAnon: '／ログインなしでお試しいただけます',
    login: 'ログイン',
    upgrade: 'Proプランで本数無制限・AI超解像（月額500円）',
    back: 'サービス紹介へ',
    noticeSuccess:
      'Proプランへのお申し込みを受け付けました。反映まで数秒かかることがあります。表示が変わらない場合はページを再読み込みしてください。',
    noticeCancel: 'お申し込みをキャンセルしました。無料プランのままご利用いただけます。',
    noticeUnavailable: '現在Stripeが未設定のため、決済を受け付けられません（SETUP.md参照）。',
    noticeUpgradeTitle:
      'Proプラン（月額500円）にアップグレードすると、本数無制限・時間制限なし・AI超解像が使えます。',
    noticeUpgradeBtn: 'アップグレードへ進む',
    noticeDemo: 'デモモード: 回数制限とプラン表示のみ再現しています（Supabase未接続）。',
    noticeDemoLink: '料金プラン',

    step1: '動画を読み込む',
    pillSafe: '🔒 すべて端末内で処理・外部送信なし',
    pillSafeTitle: '動画はお使いの端末の外へ送信されません',
    modelLoading: 'AIモデル 準備中…',
    dzMain: 'ここに動画ファイルをドラッグ＆ドロップ',
    dzSub: 'または',
    pick: '動画ファイルを選ぶ',
    dzNote1: 'MP4 / MOV / WebM / M4V 対応（推奨: H.264 の MP4）',
    dzNote2: 'iPhoneは「写真ライブラリ」または「ファイル」から選べます',
    metaFile: 'ファイル',
    metaDur: '長さ',
    metaRes: '解像度',
    metaSize: 'サイズ',
    change: '別の動画を選ぶ',

    step2: '解析の設定',
    interval: '解析する間隔',
    intervalOptions: [
      { value: '0.25', label: '0.25秒ごと（細かい・時間がかかる）' },
      { value: '0.5', label: '0.5秒ごと' },
      { value: '1', label: '1秒ごと（おすすめ）' },
      { value: '2', label: '2秒ごと（速い）' },
      { value: '3', label: '3秒ごと（とても速い）' },
    ],
    max: '候補の最大枚数',
    maxUnit: '枚',
    who: '対象の顔',
    whoMain: '主役の顔（一番大きく写っている人）',
    whoAll: '全員の顔',
    far: '遠目の顔も探す',
    farCheck: '高精度（2×2タイル走査）',
    start: '解析スタート',
    hint: '「正面を向いていて・ピントが合っていて・顔が大きい」フレームを自動で点数付けして選びます。',
    hintNote:
      '※ 画面の奥に小さく写っている顔も探したいときは「遠目の顔も探す」をONのままにしてください。',

    progress: '解析中',
    cancel: 'キャンセル',
    mobileTip:
      '※ iPhoneでは画面を閉じたりロックしたりすると解析が止まります。画面を開いたままお待ちください。',

    results: 'ベストショット候補',
    crop: '切り取り',
    cropFace: '顔アップ（タイト）',
    cropChest: '胸上（おすすめ）',
    cropWide: 'ゆったり（上半身）',
    level: '高画質補正',
    levelStd: '標準（おすすめ）',
    levelStrong: '強（くっきり）',
    levelNone: 'なし（元の画質）',
    aiSr: 'AI超解像',
    aiOn: '端末内AI（API不要）',
    aiLocked: '🔒 月額500円のProプランで利用可能',
    aiLockedTitle: 'AI超解像（ESRGAN-slim）はProプランの機能です',
    size: '出力サイズ',
    sizeOptions: [
      { value: 'auto', label: '自動アップ（小さい顔も768px以上）' },
      { value: '512', label: '512 × 512 px' },
      { value: '768', label: '768 × 768 px' },
      { value: '1024', label: '1024 × 1024 px' },
      { value: 'natural', label: '元のサイズのまま' },
    ],
    aiAll: '✨ すべてAI超解像',
    aiAllLocked: '🔒 すべてAI超解像（Pro）',
    saveAll: '💾 すべてJPGで保存',
    saveFolder: '📁 フォルダに一括保存',
    aiLockBanner: '🔒 AI超解像（ESRGAN-slim）は月額500円のProプランで利用可能 → アップグレード',
    saveHintBold: 'iPhoneでの保存:',
    saveHint:
      '保存ボタンを押すと「ダウンロードしますか？」の確認が出ます → 許可すると「ファイル」アプリに保存されます。写真アプリに入れたいときは、画像をタップして拡大 → 右上の「共有」→「画像を保存」が確実です。',
    footnote1:
      '※ 保存時は元動画から切り出し、必要な場合はアップスケール＋鮮明化して書き出します（表示より綺麗な画像になります）。',
    footnote2: '※ 遠目の小さな顔でも、768px以上の大きさに拡大して保存できます。',
    footnote3:
      '※ 「AI超解像」は端末内AI（ESRGAN-slim）で顔を2倍に高画質化するProプランの機能です（初回だけ約2.5MBのモデルを読み込みます）。',
    engineFooter1: '動画はブラウザ内のメモリだけで処理され、どこにもアップロードされません。',
    engineFooter2: 'ベストショット抽出ツール v1.3（SaaS版・AI超解像対応）',
    lbClose: '閉じる',
    lbPreview: 'プレビュー',
    lbOrig: '元画像',
    lbEnh: '補正後',
    lbSave: 'この画像を保存',
    lbShare: '共有／写真に保存',
  },

  usage: {
    proTitle: 'Proプラン（無制限）',
    proSub: ' ／ 動画の長さ制限なし・AI超解像が使えます',
    remainingLabel: '本日の残り回数：',
    remainingCount: 'あと {n} 回',
    subFree: '（無料プラン・1日{limit}回まで・動画は5分以内）',
    subFreeAnon: '（無料プラン・ログイン不要・1日{limit}回まで・動画は5分以内）',
    subDemo: '・デモ表示',
    empty: '本日の無料回数を使い切りました。Proプランなら本数無制限で使えます。',
    login: 'ログイン / 新規登録',
    upgradeLogged: 'Proにアップグレード（月額500円）',
    upgradeAnon: 'Proプラン（月額500円）で無制限＆AI超解像',
    manage: 'プラン管理・解約',
  },

  signin: {
    title: 'ログイン / 新規登録',
    lead:
      'アカウントを作ると、1日の利用回数がアカウントに紐づきます（同じアカウントなら端末を変えても回数は共有）。Proプランもここからお申し込みいただけます。',
    skip: 'ログインはProプランにする時だけで大丈夫です。',
    skipLink: 'ログインなしで無料で試す（1日3本まで）',
    demoNotice: '現在はデモモードです（Supabase未設定）。',
    demoLink: 'ログインなしでツール画面を開く',
    demoAfter: ' か、SETUP.md の手順でSupabaseを接続してください。',
    sentEmailFallback: 'ご入力のメールアドレス',
    sentBefore: 'にログインリンクを送りました。メールを開いてリンクを押すとログインできます（迷惑メールフォルダもご確認ください）。',
    sentExpiry: 'リンクは1回だけ使えます（有効期限は約1時間）。同じリンクを2回押すと期限切れになります。',
    genericError: 'エラーが発生しました。',
    errors: {
      email: 'メールアドレスの形式を確認してください。',
      send: 'ログインメールを送信できませんでした。時間をおいてもう一度お試しください。',
      auth: 'ログインの確認に失敗しました。もう一度お試しください。',
      expired:
        'ログインリンクの有効期限が切れているか、すでに使用済みです。お手数ですが、もう一度ログインリンクを送信してください。',
      google: 'Googleログインを開始できませんでした。メールでのログインをお試しください。',
      demo: 'Supabaseが未設定のため、ログインは利用できません（デモモード）。',
    },
    google: 'Googleでログイン',
    divider: 'または メールアドレスで',
    emailLabel: 'メールアドレス',
    emailHint: 'パスワードは不要です。ログイン用のリンクをお送りします。',
    submit: 'ログインリンクを送る',
    demoBtn: 'デモモードでツールを開く',
    legalBefore: '続行すると ',
    legalTerms: '利用規約',
    legalMiddle: ' と ',
    legalPrivacy: 'プライバシーポリシー',
    legalAfter: ' に同意したものとみなされます。',
  },

  callback: {
    title: 'ログイン',
    checking: 'ログインを確認しています…',
    failed: 'ログインの確認ができませんでした。',
    hintBefore: '自動で切り替わらない場合は ',
    hintLink: 'ログイン画面へ',
    hintAfter: ' お進みください。',
  },

  legal: {
    termsTitle: '利用規約',
    privacyTitle: 'プライバシーポリシー',
    tokushohoTitle: '特定商取引法に基づく表記',
    effectiveDate: '制定日',
    backHome: 'トップへ戻る',
  },
};

export type Dict = typeof ja;

const en: Dict = {
  common: {
    siteName: 'Best Shot Extractor',
    siteTitle: 'Extract the best face photos from any video | AI upscaling, works on iPhone',
    siteDescription:
      'A web tool that scores the frames in your video for facing the camera, sharpness and face size, then extracts the best ones as high-quality face photos. Everything runs on your device — your video is never uploaded. Works in iPhone Safari; the free plan covers 3 videos a day, and Pro ($4.99/mo) is unlimited with AI upscaling.',
    keywords: [
      'extract face from video',
      'best shot picker',
      'face photo from video',
      'video frame to photo',
      'free face extractor',
      'AI face upscaling',
      'save photo from video iPhone',
    ],
    ogImageAlt: 'Sample face photo finished with AI upscaling',
    proPriceNote: '$4.99 / month',
    language: 'Language',
    demoTool: 'Open the tool in demo mode',
  },

  nav: {
    aria: 'Main menu',
    how: 'How it works',
    pricing: 'Pricing',
    faq: 'FAQ',
    terms: 'Terms',
    openTool: 'Open the tool',
    planPro: 'Pro',
    planFree: 'Free',
    account: 'Account',
    accountMenuAria: 'Account menu',
    signedInAs: 'Signed in as',
    toolLink: 'Face extractor',
    upgrade: 'Upgrade to Pro ($4.99/mo)',
    manage: 'Manage plan, card, cancel',
    signOut: 'Sign out',
    demoPill: 'Demo mode',
    tryFree: 'Try it free',
    signIn: 'Sign in',
    signInSuffix: ' / Sign up',
    switchToEn: 'Switch to English',
    switchToJa: '日本語に切り替える',
  },

  footer: {
    note: "Videos are processed in your browser's memory and never sent to a server.",
    tagline: 'Best Shot Extractor — pull the best face photos out of any video',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    tokushoho: 'Legal notice (Specified Commercial Transactions Act)',
    pricing: 'Pricing',
  },

  demoBar:
    "Demo mode (Supabase not configured): you can browse without signing in. Follow SETUP.md to enable real sign-in and billing.",

  landing: {
    eyebrow: '🎬 Video in → best face photo, picked for you',
    titleLine1: 'From any video,',
    titleAccent: 'the best face photo',
    titleTail: ' — automatically.',
    lead:
      'Every frame is scored for facing the camera, sharp focus and face size, and the winners are pulled out for you. Enhancement and on-device AI upscaling all happen locally — no uploads.',
    ctaOpen: 'Open the face extractor',
    ctaStart: 'Start free — no sign-up',
    ctaPricing: 'See pricing',
    note: 'No card, no sign-in. Try up to 3 videos a day for free — sign in only when you go Pro.',
    noteDemo: 'Showing demo mode. Connect Supabase to enable sign-in, usage limits and billing.',
    badgePrivate: '🔒 Nothing leaves your device',
    badgeIphone: '📱 Works in iPhone Safari',
    badgeAi: '✨ On-device AI upscaling',
    heroFramesLabel: 'Frames analyzed',
    heroCandidatesLabel: 'picks',
    heroPicksUnit: '',
    heroAnalyzedLabel: 'Analyzed',
    heroSecondsUnit: ' s',
    heroPointsUnit: ' pts',

    features: [
      {
        icon: '🎯',
        title: 'Scored on angle, sharpness and size',
        body:
          'Face orientation (yaw, pitch, roll), how open the eyes are, edge sharpness and brightness all feed one score. Small faces far from the camera are caught by a 2×2 tile scan.',
      },
      {
        icon: '🔒',
        title: 'Your video never leaves the device',
        body:
          'Analysis, cropping and enhancement run entirely in the browser (MediaPipe / Canvas / TensorFlow.js). No video or image is uploaded to a server.',
      },
      {
        icon: '✨',
        title: 'Saved in a couple of taps',
        body:
          'Export at 512 / 768 / 1024 px, and on iPhone save from the share sheet. One at a time or all at once.',
      },
    ],

    upscale: {
      eyebrow: '✨ AI upscaling on Pro',
      titlePre: 'The same frame. ',
      titleAccent: 'A different league',
      titleTail: '.',
      lead:
        'Even a small face in the distance keeps its outline, skin texture and catchlights. With on-device AI upscaling (ESRGAN-slim) on Pro, that frame becomes a photo you can actually use.',
      beforeAlt: 'A distant face cropped and enlarged as-is: soft and blocky',
      beforeCaption: 'Cropped and enlarged as-is (Free plan)',
      beforeComment: 'Distant faces come out soft and flat…',
      afterAlt: 'The same face photo, crisp and detailed after AI upscaling',
      afterCaption: 'Pro plan: AI upscaling ON',
      afterComment: 'Crisp, glowing, alive.',
      badge: '✨ AI upscaling ON',
      note: 'Results are illustrative. The effect depends on the source resolution and the size of the face.',
      highlights: ['Sharper edges', 'More skin detail', 'Catchlights in the eyes'],
      ctaPro: 'Pro plan active — open the tool',
      ctaUpgrade: '✨ Get AI upscaling with Pro — $4.99/mo',
      ctaNote: 'Pro is unlimited in videos and length · cancel anytime from the customer portal',
    },

    how: {
      title: 'Three steps',
      lead: 'Nothing to install. Open it in a browser and pick a video.',
      steps: [
        {
          title: 'Load a video',
          body: 'MP4 / MOV / WebM / M4V. On iPhone you can pick from Photos too.',
        },
        {
          title: 'Start the analysis',
          body: 'Choose the interval, how many candidates and whose face. At 1-second intervals, a few minutes of video takes seconds.',
        },
        {
          title: 'Save the best shot',
          body: 'Pick from the ranked candidates and save as JPG / PNG. Pro adds AI upscaling for extra clarity.',
        },
      ],
    },

    pricing: {
      title: 'Pricing',
      lead: 'Start free. Move to Pro at $4.99/month when you need more.',
      freeName: 'Free',
      freePrice: '$0',
      perMonth: '/ mo',
      freeFeatures: [
        '3 videos a day, no sign-up (resets at midnight JST)',
        'Videos up to 5 minutes (300 s)',
        'Enhancement: Standard / Strong',
        '512 / 768 / 1024 px export and batch save',
      ],
      freeLocked: 'AI upscaling (ESRGAN-slim)',
      freeCta: 'Start free — no sign-up',
      freeCtaViewer: 'Open the tool',
      proTag: 'Recommended',
      proName: 'Pro',
      proPriceNote: '/ mo',
      proApprox: '',
      proFeatures: [
        'Unlimited videos',
        'No video length limit',
        'On-device AI upscaling (ESRGAN-slim)',
        '“✨ AI upscale” and “✨ Upscale all”',
        'Enhancement Standard / Strong · every export size',
        'Cancel or change card anytime in the customer portal',
      ],
      proActive: 'Pro plan active — open the tool',
      proStart: 'Start Pro — $4.99/mo',
      proStartShort: 'Start Pro',
      proDemo: 'Preview the Pro screen',
      foot:
        'Pro renews monthly through Stripe. Cancel anytime from the customer portal; Pro features remain available until the next renewal date.',
      footUnavailable: ' (Stripe is not configured, so payments are currently closed.)',
    },

    compare: {
      title: 'Free vs Pro',
      headFeature: 'Feature',
      headFree: 'Free',
      headPro: 'Pro ($4.99/mo)',
      rows: [
        { feature: 'Videos per day', free: 'Up to 3', freeTone: 'plain', pro: 'Unlimited', proTone: 'yes' },
        { feature: 'Video length', free: 'Up to 5 min (300 s)', freeTone: 'plain', pro: 'No limit', proTone: 'yes' },
        { feature: 'Automatic best-shot picks', free: '✓', freeTone: 'yes', pro: '✓', proTone: 'yes' },
        { feature: 'Enhancement (Standard / Strong)', free: '✓', freeTone: 'yes', pro: '✓', proTone: 'yes' },
        { feature: '2×2 tile scan (distant faces)', free: '✓', freeTone: 'yes', pro: '✓', proTone: 'yes' },
        { feature: 'Export sizes 512 / 768 / 1024 px', free: '✓', freeTone: 'yes', pro: '✓', proTone: 'yes' },
        {
          feature: 'On-device AI upscaling (ESRGAN-slim)',
          free: '🔒 Locked',
          freeTone: 'no',
          pro: '✓',
          proTone: 'yes',
        },
        { feature: '“Upscale all”', free: '🔒 Locked', freeTone: 'no', pro: '✓', proTone: 'yes' },
        {
          feature: 'Change plan / cancel',
          free: '—',
          freeTone: 'plain',
          pro: 'Customer portal',
          proTone: 'yes',
        },
      ],
    },

    faqTitle: 'Frequently asked questions',

    ctaBand: {
      title: 'That video has a shot worth keeping.',
      body: "In seconds you'll have a photo that works for your profile or feed.",
    },
  },

  faq: [
    {
      question: 'Is my video uploaded to a server?',
      answer:
        "No. Analysis, cropping and enhancement all run in your browser, and the video file is never uploaded. The only things that reach our server are your sign-in details and a record of how many videos you've used.",
    },
    {
      question: 'When does the free “3 videos a day” reset?',
      answer:
        "At midnight Japan Standard Time (UTC+9). Without signing in, usage is counted per browser (cookie); once you sign in it follows your account, so the same account shares its count across devices.",
    },
    {
      question: 'Is AI upscaling only on Pro?',
      answer:
        'Yes. On-device AI upscaling (ESRGAN-slim) is a Pro feature. The free plan includes Standard and Strong enhancement. The AI model is about 2.5 MB and downloads once — no external API is used.',
    },
    {
      question: 'Does it work on iPhone?',
      answer:
        'Yes — open it in Safari and pick a video. Analysis pauses if you close or lock the screen, so keep the page open. To save, use “Save Image” from the share sheet.',
    },
    {
      question: 'How do I cancel?',
      answer:
        'Open the customer portal from “Manage plan, card, cancel” in the account menu. Pro stays available until the next renewal date.',
    },
  ],

  tool: {
    title: '🎬 Face Photo Extractor',
    lead: 'Videos are processed on your device (nothing is uploaded)',
    leadAnon: ' · no sign-in needed',
    login: 'Sign in',
    upgrade: 'Unlimited videos + AI upscaling on Pro ($4.99/mo)',
    back: 'Back to overview',
    noticeSuccess:
      'Your Pro subscription is confirmed. It can take a few seconds to apply — reload the page if nothing changes.',
    noticeCancel: "Checkout was cancelled. You're still on the free plan.",
    noticeUnavailable: 'Stripe is not configured, so payments are unavailable (see SETUP.md).',
    noticeUpgradeTitle:
      'Pro ($4.99/mo) gives you unlimited videos, no length limit and AI upscaling.',
    noticeUpgradeBtn: 'Continue to upgrade',
    noticeDemo: 'Demo mode: only the usage limits and plan display are simulated (Supabase not connected).',
    noticeDemoLink: 'Pricing',

    step1: 'Load a video',
    pillSafe: '🔒 Processed on your device — nothing uploaded',
    pillSafeTitle: 'The video never leaves your device',
    modelLoading: 'AI model loading…',
    dzMain: 'Drag & drop a video file here',
    dzSub: 'or',
    pick: 'Choose a video file',
    dzNote1: 'MP4 / MOV / WebM / M4V (H.264 MP4 recommended)',
    dzNote2: 'On iPhone you can pick from Photos or Files',
    metaFile: 'File',
    metaDur: 'Length',
    metaRes: 'Resolution',
    metaSize: 'Size',
    change: 'Choose another video',

    step2: 'Analysis settings',
    interval: 'Frame interval',
    intervalOptions: [
      { value: '0.25', label: 'Every 0.25 s (detailed, slower)' },
      { value: '0.5', label: 'Every 0.5 s' },
      { value: '1', label: 'Every 1 s (recommended)' },
      { value: '2', label: 'Every 2 s (faster)' },
      { value: '3', label: 'Every 3 s (fastest)' },
    ],
    max: 'Max candidates',
    maxUnit: '',
    who: 'Whose face',
    whoMain: 'Main subject (the largest face)',
    whoAll: 'Everyone',
    far: 'Find distant faces',
    farCheck: 'High accuracy (2×2 tile scan)',
    start: 'Start analysis',
    hint:
      'Frames are scored and picked automatically for facing the camera, sharp focus and face size.',
    hintNote: 'Leave “Find distant faces” on to catch faces that appear small in the background.',

    progress: 'Analyzing',
    cancel: 'Cancel',
    mobileTip:
      'On iPhone, analysis stops if you close or lock the screen. Please keep the page open while it runs.',

    results: 'Best-shot candidates',
    crop: 'Crop',
    cropFace: 'Face (tight)',
    cropChest: 'Head & chest (recommended)',
    cropWide: 'Upper body',
    level: 'Enhancement',
    levelStd: 'Standard (recommended)',
    levelStrong: 'Strong (crisper)',
    levelNone: 'None (original)',
    aiSr: 'AI upscaling',
    aiOn: 'On-device AI (no API)',
    aiLocked: '🔒 Available on Pro — $4.99/mo',
    aiLockedTitle: 'AI upscaling (ESRGAN-slim) is a Pro feature',
    size: 'Output size',
    sizeOptions: [
      { value: 'auto', label: 'Auto (small faces up to 768 px+)' },
      { value: '512', label: '512 × 512 px' },
      { value: '768', label: '768 × 768 px' },
      { value: '1024', label: '1024 × 1024 px' },
      { value: 'natural', label: 'Keep original size' },
    ],
    aiAll: '✨ Upscale all',
    aiAllLocked: '🔒 Upscale all (Pro)',
    saveAll: '💾 Save all as JPG',
    saveFolder: '📁 Save to folder',
    aiLockBanner: '🔒 AI upscaling (ESRGAN-slim) is available on Pro — $4.99/mo → Upgrade',
    saveHintBold: 'Saving on iPhone:',
    saveHint:
      'Tap a save button, allow the download, and the images go to the Files app. To get them into Photos, tap an image to enlarge it, then “Share” → “Save Image”.',
    footnote1:
      'Saved images are cropped from the source video and, when needed, upscaled and sharpened — so the file is sharper than the preview.',
    footnote2: 'Even a small, distant face can be saved at 768 px or larger.',
    footnote3:
      '“AI upscaling” is a Pro feature that doubles face resolution with on-device AI (ESRGAN-slim). The model is about 2.5 MB and downloads on first use.',
    engineFooter1: 'Videos are processed in browser memory only and are never uploaded anywhere.',
    engineFooter2: 'Best Shot Extractor v1.3 (SaaS edition, AI upscaling)',
    lbClose: 'Close',
    lbPreview: 'Preview',
    lbOrig: 'Original',
    lbEnh: 'Enhanced',
    lbSave: 'Save this image',
    lbShare: 'Share / Save to Photos',
  },

  usage: {
    proTitle: 'Pro plan (unlimited)',
    proSub: ' / no length limit · AI upscaling included',
    remainingLabel: 'Left today: ',
    remainingCount: '{n}',
    subFree: ' (free plan · up to {limit} a day · videos up to 5 min)',
    subFreeAnon: ' (free plan · no sign-in · up to {limit} a day · videos up to 5 min)',
    subDemo: ' · demo',
    empty: 'You’ve used all your free analyses today. Pro is unlimited.',
    login: 'Sign in / Sign up',
    upgradeLogged: 'Upgrade to Pro ($4.99/mo)',
    upgradeAnon: 'Go Pro ($4.99/mo) — unlimited + AI upscaling',
    manage: 'Manage / cancel',
  },

  signin: {
    title: 'Sign in / Sign up',
    lead:
      'With an account, your daily usage follows the account (the same account shares its count across devices), and you can subscribe to Pro from here.',
    skip: 'You only need to sign in when you go Pro.',
    skipLink: 'Try it free without signing in (3 a day)',
    demoNotice: 'Demo mode is on (Supabase not configured). ',
    demoLink: 'Open the tool without signing in',
    demoAfter: ' or follow SETUP.md to connect Supabase.',
    sentEmailFallback: 'your email address',
    sentBefore: ' — we sent a sign-in link. Open the email and tap the link to sign in (check your spam folder too).',
    sentExpiry: 'The link works once (it expires in about an hour). Opening it a second time counts as expired.',
    genericError: 'Something went wrong.',
    errors: {
      email: 'Please check the format of your email address.',
      send: "We couldn't send the sign-in email. Please try again in a little while.",
      auth: "We couldn't verify your sign-in. Please try again.",
      expired:
        'This sign-in link has expired or has already been used. Please request a new sign-in link.',
      google: "Google sign-in couldn't start. Please try signing in with email instead.",
      demo: 'Supabase is not configured, so sign-in is unavailable (demo mode).',
    },
    google: 'Continue with Google',
    divider: 'or with email',
    emailLabel: 'Email address',
    emailHint: 'No password needed — we’ll email you a sign-in link.',
    submit: 'Send sign-in link',
    demoBtn: 'Open the tool in demo mode',
    legalBefore: 'By continuing you agree to our ',
    legalTerms: 'Terms of Service',
    legalMiddle: ' and ',
    legalPrivacy: 'Privacy Policy',
    legalAfter: '.',
  },

  callback: {
    title: 'Sign in',
    checking: 'Checking your sign-in…',
    failed: "We couldn't verify your sign-in.",
    hintBefore: "If nothing happens, continue to ",
    hintLink: 'the sign-in page',
    hintAfter: '.',
  },

  legal: {
    termsTitle: 'Terms of Service',
    privacyTitle: 'Privacy Policy',
    tokushohoTitle: 'Legal Notice (Specified Commercial Transactions Act)',
    effectiveDate: 'Effective date',
    backHome: 'Back to home',
  },
};

export const messages: Record<Lang, Dict> = { ja, en };

export function t(lang: Lang): Dict {
  return messages[lang] ?? messages.ja;
}
