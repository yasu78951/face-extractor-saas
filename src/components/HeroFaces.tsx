/**
 * トップページのヒーロープレビュー用に描いたベクター人物イラスト。
 * 実在人物の写真は使わず、すべて SVG の図形だけで描いています。
 */

type HairStyle = 'short' | 'side' | 'bob' | 'long' | 'curly' | 'bun';
type EyeStyle = 'open' | 'happy' | 'narrow' | 'closed';
type MouthStyle = 'big' | 'smile' | 'soft' | 'neutral';

type Face = {
  bg: [string, string];
  shirt: [string, string];
  skin: string;
  skinLight: string;
  skinShade: string;
  hair: string;
  hairStyle: HairStyle;
  /** 顔の向き（左右のズレ）。0 が真正面。 */
  turn: number;
  eyes: EyeStyle;
  mouth: MouthStyle;
  score: number;
  rank: string;
};

export const HERO_FACES: Face[] = [
  {
    bg: ['#dce4ff', '#adbefc'],
    shirt: ['#3b5bdb', '#2a41a6'],
    skin: '#f8cfae',
    skinLight: '#fee6d2',
    skinShade: '#e0a883',
    hair: '#241f2b',
    hairStyle: 'short',
    turn: 0,
    eyes: 'open',
    mouth: 'big',
    score: 98,
    rank: '★ BEST',
  },
  {
    bg: ['#e7ecff', '#c2cffb'],
    shirt: ['#425a72', '#2c3f52'],
    skin: '#f2c5a3',
    skinLight: '#fbdcbf',
    skinShade: '#dba47e',
    hair: '#3a2b22',
    hairStyle: 'side',
    turn: 1.7,
    eyes: 'open',
    mouth: 'smile',
    score: 94,
    rank: '#2',
  },
  {
    bg: ['#e9f3ff', '#c3dbf7'],
    shirt: ['#7a4a63', '#5b3249'],
    skin: '#f9d5ba',
    skinLight: '#fde8d8',
    skinShade: '#e3b394',
    hair: '#2b2320',
    hairStyle: 'bob',
    turn: -1.5,
    eyes: 'open',
    mouth: 'smile',
    score: 91,
    rank: '#3',
  },
  {
    bg: ['#f1ecff', '#d2c7f7'],
    shirt: ['#4b5a7a', '#34415c'],
    skin: '#e7b48c',
    skinLight: '#f7d4b2',
    skinShade: '#c78e68',
    hair: '#241a16',
    hairStyle: 'long',
    turn: 2.3,
    eyes: 'narrow',
    mouth: 'soft',
    score: 87,
    rank: '#4',
  },
  {
    bg: ['#e7f6f1', '#bfe4da'],
    shirt: ['#2f6d5f', '#1f4d43'],
    skin: '#f4c9a6',
    skinLight: '#fce1c9',
    skinShade: '#dba67d',
    hair: '#3b2a1f',
    hairStyle: 'curly',
    turn: -2.5,
    eyes: 'open',
    mouth: 'smile',
    score: 83,
    rank: '#5',
  },
  {
    bg: ['#fff1e7', '#fad2b9'],
    shirt: ['#8a5a35', '#684026'],
    skin: '#f7d2b4',
    skinLight: '#fee9d8',
    skinShade: '#dfb08e',
    hair: '#2c2523',
    hairStyle: 'bun',
    turn: 2.9,
    eyes: 'closed',
    mouth: 'soft',
    score: 79,
    rank: '#6',
  },
];

function HairBack({ face }: { face: Face }) {
  const { hair, hairStyle } = face;
  if (hairStyle === 'long') {
    return (
      <path
        d="M24 34c0-15 11-24 26-24s26 9 26 24v52h-8V62c0-8-1-14-3-18-4-3-9-4-15-4s-11 1-15 4c-2 4-3 10-3 18v24h-8z"
        fill={hair}
      />
    );
  }
  if (hairStyle === 'bob') {
    return (
      <path
        d="M25 40c0-16 11-26 25-26s25 10 25 26v17c0 3-7 4-7 0V45c-3-5-9-7-18-7s-15 2-18 7v12c0 4-7 3-7 0z"
        fill={hair}
      />
    );
  }
  if (hairStyle === 'curly') {
    return (
      <g fill={hair}>
        <circle cx="32" cy="31" r="9.5" />
        <circle cx="43" cy="23" r="10" />
        <circle cx="56" cy="22" r="10.5" />
        <circle cx="68" cy="30" r="9.5" />
        <circle cx="28" cy="43" r="7" />
        <circle cx="72" cy="42" r="7" />
      </g>
    );
  }
  if (hairStyle === 'bun') {
    return <circle cx={67 + face.turn * 0.3} cy="15.5" r="7.6" fill={hair} />;
  }
  return null;
}

function HairFront({ face }: { face: Face }) {
  const { hair, hairStyle } = face;
  switch (hairStyle) {
    case 'side':
      return (
        <path
          d="M29.5 45c0-18 9-27 21-27 10.5 0 18 6.5 20 17-3.4-6.4-8.6-9.5-14.6-9.5-8.4 0-13.6 4.2-16.4 9.6-1.8 3.4-4.6 7.4-10 9.9z"
          fill={hair}
        />
      );
    case 'bob':
      return (
        <path
          d="M29 44c0-16 9-25 21-25s21 9 21 25c-2-9-6-14-12-16-3 2.4-5.8 3.4-9 3.4s-6-1-9-3.4c-6 2-10 7-12 16z"
          fill={hair}
        />
      );
    case 'long':
      return (
        <path
          d="M28.5 45c0-17 9.5-27 21.5-27s21.5 10 21.5 27c-2.6-10-6.5-15-12-17-3 2.6-6 3.8-9.5 3.8s-6.5-1.2-9.5-3.8c-5.5 2-9.4 7-12 17z"
          fill={hair}
        />
      );
    case 'curly':
      return (
        <path
          d="M30 45c0-16 9-25 20-25s20 9 20 25c-2.2-8-6-12.6-11.4-14.8-2.6 2.4-5.4 3.4-8.6 3.4s-6-1-8.6-3.4C36 32.4 32.2 37 30 45z"
          fill={hair}
        />
      );
    case 'bun':
      return (
        <path
          d="M30 44c0-17 9-26 20-26s20 9 20 26c-2.4-8.6-6-13.4-11.6-15.8-2.6 2.6-5.4 3.8-8.4 3.8s-5.8-1.2-8.4-3.8C36 31.6 32.4 36.4 30 44z"
          fill={hair}
        />
      );
    default:
      return (
        <path
          d="M30.5 44c0-17 8.5-26 19.5-26s19.5 9 19.5 26c-1.8-8.5-4.6-13-9-15.5-3 2.8-6.4 4-10.5 4s-7.5-1.2-10.5-4c-4.4 2.5-7.2 7-9 15.5z"
          fill={hair}
        />
      );
  }
}

function Eyes({ face, x }: { face: Face; x: number }) {
  const ink = '#26232b';
  switch (face.eyes) {
    case 'happy':
      return (
        <path
          d={`M${x - 3.1} 46.2q3.1-4.2 6.2 0`}
          stroke={ink}
          strokeWidth="1.9"
          fill="none"
          strokeLinecap="round"
        />
      );
    case 'narrow':
      return (
        <g>
          <ellipse cx={x} cy={45.4} rx="2.5" ry="1.8" fill={ink} />
          <circle cx={x + 0.7} cy={44.8} r="0.6" fill="#fff" />
        </g>
      );
    case 'closed':
      return (
        <path
          d={`M${x - 3.1} 45.6q3.1 2.4 6.2 0`}
          stroke={ink}
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
      );
    default:
      return (
        <g>
          <ellipse cx={x} cy={45.2} rx="2.5" ry="2.9" fill={ink} />
          <circle cx={x + 0.9} cy={44.2} r="0.95" fill="#fff" />
          <circle cx={x - 0.7} cy={46.4} r="0.45" fill="#fff" opacity="0.65" />
        </g>
      );
  }
}

function Mouth({ face, x }: { face: Face; x: number }) {
  const lip = '#a94e56';
  switch (face.mouth) {
    case 'big':
      return (
        <g>
          <path
            d={`M${x - 7.6} 57.4Q${x} 67.4 ${x + 7.6} 57.4Q${x} 60.8 ${x - 7.6} 57.4Z`}
            fill="#fff"
            stroke={lip}
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <path d={`M${x - 5.4} 59.4q5.4 2 10.8 0`} stroke="#e2b6b8" strokeWidth="0.7" fill="none" />
        </g>
      );
    case 'smile':
      return (
        <path
          d={`M${x - 6} 58q6 5.6 12 0`}
          stroke={lip}
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
      );
    case 'soft':
      return (
        <path
          d={`M${x - 5} 58.6q5 3.4 10 0`}
          stroke={lip}
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
      );
    default:
      return (
        <path d={`M${x - 4.6} 59h9.2`} stroke={lip} strokeWidth="1.6" strokeLinecap="round" />
      );
  }
}

type FaceSvgProps = {
  /** HERO_FACES の index */
  variant: number;
  /** 同じページ内で gradient id が重複しないようにする接尾辞 */
  uid: string;
  className?: string;
};

export function FaceSvg({ variant, uid, className }: FaceSvgProps) {
  const face = HERO_FACES[variant] ?? HERO_FACES[0];
  const id = `face-${variant}-${uid}`;
  const t = face.turn;
  const eyeGap = 8.3 - Math.abs(t) * 0.5;
  const lx = 50 - eyeGap + t * 0.9;
  const rx = 50 + eyeGap + t * 0.9;
  const cx = 50 + t * 0.35;

  return (
    <svg
      viewBox="0 0 100 100"
      className={className ? `hero-face ${className}` : 'hero-face'}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0.65" y2="1">
          <stop offset="0%" stopColor={face.bg[0]} />
          <stop offset="100%" stopColor={face.bg[1]} />
        </linearGradient>
        <linearGradient id={`${id}-shirt`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={face.shirt[0]} />
          <stop offset="100%" stopColor={face.shirt[1]} />
        </linearGradient>
        <radialGradient id={`${id}-skin`} cx="0.4" cy="0.3" r="0.8">
          <stop offset="0%" stopColor={face.skinLight} />
          <stop offset="100%" stopColor={face.skin} />
        </radialGradient>
      </defs>

      <rect width="100" height="100" fill={`url(#${id}-bg)`} />
      <circle cx="16" cy="20" r="18" fill="#ffffff" opacity="0.16" />
      <circle cx="86" cy="74" r="22" fill="#ffffff" opacity="0.1" />

      {/* 肩 */}
      <path d="M4 100c0-15 20-24 46-24s46 9 46 24z" fill={`url(#${id}-shirt)`} />
      <path d="M4 100c0-15 20-24 46-24s46 9 46 24z" fill="#0b1020" opacity="0.06" />

      <HairBack face={face} />

      {/* 首 */}
      <path d={`M${43.5 + t * 0.3} 57h13v13c0 4-13 4-13 0z`} fill={face.skinShade} />
      <ellipse cx={cx} cy="69" rx="11" ry="4" fill="#000" opacity="0.07" />

      {/* 顔 */}
      <ellipse cx={cx} cy="46" rx="19.4" ry="23" fill={`url(#${id}-skin)`} />
      {/* 耳 */}
      <ellipse cx={cx - 19.2} cy="48.4" rx="3.2" ry="4.6" fill={face.skin} />
      <ellipse cx={cx + 19.2} cy="48.4" rx="3.2" ry="4.6" fill={face.skin} />

      <HairFront face={face} />

      {/* 眉 */}
      <path
        d={`M${lx - 4.8} 39.4q4.8-2.4 9.6 0`}
        stroke={face.hair}
        strokeWidth="1.7"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${rx - 4.8} 39.4q4.8-2.4 9.6 0`}
        stroke={face.hair}
        strokeWidth="1.7"
        fill="none"
        strokeLinecap="round"
      />

      <Eyes face={face} x={lx} />
      <Eyes face={face} x={rx} />

      {/* 鼻 */}
      <path
        d={`M${50 + t * 0.8} 48.4q-1.7 4 2 4.6`}
        stroke={face.skinShade}
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />

      {/* 頬 */}
      <ellipse cx={lx - 3.6} cy="52.4" rx="3.4" ry="2.1" fill="#e8737b" opacity="0.2" />
      <ellipse cx={rx + 3.6} cy="52.4" rx="3.4" ry="2.1" fill="#e8737b" opacity="0.2" />

      <Mouth face={face} x={50 + t * 0.85} />

      {/* 髪のツヤ */}
      <path
        d={`M${36} ${28}c4-6 12-8 18-7`}
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.16"
      />
    </svg>
  );
}
