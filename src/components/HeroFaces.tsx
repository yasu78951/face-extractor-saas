/**
 * トップページのヒーロープレビューに並べるサンプル写真。
 * 同一人物の別フレームを、`public/images/` の正方形JPG（顔が中央〜上部に入るよう切り出し済み）で表示します。
 * 実在の人物ではなく、サンプル用に用意した架空の人物の写真です。
 */

export type HeroFace = {
  /** public/images/ 以下のパス */
  src: string;
  score: number;
  rank: string;
  alt: string;
  /** 英語表示用の代替テキスト */
  altEn: string;
  /**
   * 下位ほどほんのり控えめなトーンにするための段階（0 = ベストショット）。
   * 写真そのものの表情・角度の違いを活かし、CSS側はごく軽い調整に留めています。
   */
  tone: number;
};

export const HERO_FACES: HeroFace[] = [
  {
    src: '/images/sample-best.jpg',
    score: 98,
    rank: '★ BEST',
    alt: '正面・笑顔でくっきりしたサンプル写真（ベストショット）',
    altEn: 'Sample portrait facing the camera with a clear smile (best shot)',
    tone: 0,
  },
  {
    src: '/images/sample-2.jpg',
    score: 94,
    rank: '#2',
    alt: '少し横向きのサンプル写真',
    altEn: 'Sample portrait turned slightly to the side',
    tone: 1,
  },
  {
    src: '/images/sample-3.jpg',
    score: 91,
    rank: '#3',
    alt: '目を閉じかけたサンプル写真',
    altEn: 'Sample portrait with the eyes half closed',
    tone: 2,
  },
  {
    src: '/images/sample-4.jpg',
    score: 87,
    rank: '#4',
    alt: '横顔のサンプル写真',
    altEn: 'Sample portrait in profile',
    tone: 3,
  },
  {
    src: '/images/sample-5.jpg',
    score: 83,
    rank: '#5',
    alt: '少し遠目のサンプル写真',
    altEn: 'Sample portrait photographed from a little further away',
    tone: 4,
  },
  {
    src: '/images/sample-6.jpg',
    score: 79,
    rank: '#6',
    alt: '動きでブレたサンプル写真',
    altEn: 'Sample portrait blurred by motion',
    tone: 5,
  },
];
