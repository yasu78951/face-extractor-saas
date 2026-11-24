/* 高画質化（ローカル処理）
   - 段階的な高品質アップスケール
   - 自動レベル補正（明るさ・コントラスト）
   - アンシャープマスク（輪郭・目元の鮮明化）＋マイクロコントラスト
   - 彩度のわずかな持ち上げ
   角度・構図は変えない（リサイズとピクセル補正のみ） */

const LEVELS = {
  none: null,
  std: { amount: 0.62, clarity: 0.18, r2: 3.0, levelK: 0.72, gamma: 1.0, sat: 1.045, limit: 46 },
  strong: { amount: 0.95, clarity: 0.30, r2: 4.6, levelK: 0.92, gamma: 1.02, sat: 1.075, limit: 60 },
};

function newCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/* 段階的に拡大（1パスで大きくすると眠くなるため 1.4倍ずつ） */
function stagedResize(src, targetMinSide, maxSide = 2400) {
  const srcMin = Math.min(src.width, src.height);
  let target = Math.round(targetMinSide);
  target = Math.min(target, maxSide);
  if (target <= srcMin + 1) {
    // 縮小・ほぼ同じ: 1回で高品質リサイズ
    const ratio = target / srcMin;
    const out = newCanvas(src.width * ratio, src.height * ratio);
    const g = out.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, out.width, out.height);
    return out;
  }
  let cur = src;
  let guard = 0;
  while (Math.min(cur.width, cur.height) < target - 1 && guard++ < 12) {
    const curMin = Math.min(cur.width, cur.height);
    const factor = Math.min(1.4, target / curMin);
    const nw = Math.round(cur.width * factor);
    const nh = Math.round(cur.height * factor);
    const out = newCanvas(nw, nh);
    const g = out.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(cur, 0, 0, nw, nh);
    cur = out;
  }
  // ちょうど目標サイズへ
  const ratio = target / Math.min(cur.width, cur.height);
  if (Math.abs(ratio - 1) > 0.01) {
    const out = newCanvas(cur.width * ratio, cur.height * ratio);
    const g = out.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(cur, 0, 0, out.width, out.height);
    return out;
  }
  return cur;
}

function boxBlur(src, w, h, r) {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const inv = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += src[row + Math.min(w - 1, Math.max(0, k))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = sum * inv;
      sum += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += tmp[Math.min(h - 1, Math.max(0, k)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum * inv;
      sum += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

function toneAndSharpen(canvas, p) {
  const w = canvas.width, h = canvas.height, n = w * h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  const L = new Float32Array(n);
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    L[i] = 0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2];
  }

  // 自動レベル（1%〜99.5%を基準に伸ばす）
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) hist[Math.min(255, Math.max(0, L[i] | 0))]++;
  let lo = 0, hi = 255, acc = 0;
  const lowCut = n * 0.01, highCut = n * 0.005;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= lowCut) { lo = v; break; } }
  acc = 0;
  for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= highCut) { hi = v; break; } }
  if (hi - lo < 24) { lo = 0; hi = 255; }
  const span = Math.max(1, hi - lo);
  const lut = new Float32Array(256);
  for (let v = 0; v < 256; v++) {
    let t = (v - lo) / span;
    t = Math.min(1, Math.max(0, t));
    if (p.gamma !== 1) t = Math.pow(t, p.gamma);
    lut[v] = t * 255;
  }

  const L2 = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const target = lut[Math.min(255, Math.max(0, L[i] | 0))];
    L2[i] = L[i] + (target - L[i]) * p.levelK;
  }

  // アンシャープ（細部）＋ マイクロコントラスト（大きめ）
  const r1 = Math.max(1, Math.round(Math.min(w, h) / 900));
  const r2 = Math.max(2, Math.round(p.r2 * Math.min(w, h) / 900));
  const blur1 = boxBlur(L2, w, h, r1);
  const blur2 = boxBlur(L2, w, h, r2);

  for (let i = 0, j = 0; i < n; i++, j += 4) {
    let delta = (L2[i] - blur1[i]) * p.amount + (L2[i] - blur2[i]) * p.clarity;
    if (delta > p.limit) delta = p.limit;
    if (delta < -p.limit) delta = -p.limit;
    const nl = L2[i] + delta;
    const r0 = d[j], g0 = d[j + 1], b0 = d[j + 2];
    const lum = Math.max(1, 0.299 * r0 + 0.587 * g0 + 0.114 * b0);
    const k = nl / lum;                        // 輝度差は保ったまま
    let r = (r0 - lum) * p.sat + lum + (nl - lum);
    let g = (g0 - lum) * p.sat + lum + (nl - lum);
    let b = (b0 - lum) * p.sat + lum + (nl - lum);
    d[j] = r < 0 ? 0 : r > 255 ? 255 : r;
    d[j + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    d[j + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/**
 * 切り出し画像を高画質化
 * @param {HTMLCanvasElement} src 元の切り出し（等倍）
 * @param {object} o { minSide: 最低出力サイズ, fixedSide: 固定出力サイズ, maxSide, level }
 */
export function enhanceCanvas(src, o = {}) {
  const level = o.level || 'std';
  const p = LEVELS[level] || LEVELS.std;
  const maxSide = o.maxSide || 2400;
  let target;
  if (o.fixedSide) target = o.fixedSide;
  else target = Math.max(o.minSide || 0, Math.min(src.width, src.height));
  target = Math.min(maxSide, Math.max(64, Math.round(target)));
  const work = stagedResize(src, target, maxSide);
  if (!p) return work;
  return toneAndSharpen(work, p);
}

export const ENHANCE_LEVELS = Object.keys(LEVELS);
