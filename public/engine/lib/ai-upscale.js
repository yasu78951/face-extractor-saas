/* AI超解像（APIキー不要・端末内AI / ブラウザ内完結）
 *
 *   UpscalerJS 1.0 + ESRGAN-slim（2倍）を、このサイト内に同梱したファイルだけで動かす。
 *   - tf.min.js（TensorFlow.js）と upscaler.min.js は、必要になったときだけ読み込む（遅延ロード）
 *   - モデル（約0.9MB）も同じくオンデマンド
 *   - すべて同じ配信元から読むので CORS の問題がない（オフラインでも一度読めば動く）
 *   - WebGL が使えない端末では「使えない」と返し、呼び出し側が標準補正にフォールバックする
 */

const HERE = new URL('.', import.meta.url);
const TF_URL = new URL('tf.min.js', HERE).href;
const UPSCALER_URL = new URL('upscaler.min.js', HERE).href;
const MODEL_URL = new URL('../models/ai/esrgan-slim/x2/model.json', HERE).href;

const PATCH = 128;   // ESRGAN-slim の学習パッチサイズ
const PAD = 8;       // パッチの継ぎ目を消すための重なり

const st = {
  upscaler: null,
  loading: null,
  backend: '',
  supported: null,
};

/* ---------- 補助 ---------- */

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('script: ' + src));
    document.head.appendChild(s);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image decode failed'));
    img.src = src;
  });
}

function resized(src, side) {
  const scale = side / Math.min(src.width, src.height);
  const out = makeCanvas(Math.round(src.width * scale), Math.round(src.height * scale));
  const g = out.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, out.width, out.height);
  return out;
}

/* ---------- 端末が対応しているか ---------- */

export function aiSupported() {
  if (st.supported !== null) return st.supported;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    st.supported = !!gl;
  } catch (e) {
    st.supported = false;
  }
  return st.supported;
}

/* ---------- モデルの読み込み（オンデマンド・1回だけ） ---------- */

export async function ensureAi({ onStatus } = {}) {
  if (st.upscaler) return st.upscaler;
  if (st.loading) return st.loading;

  st.loading = (async () => {
    if (!aiSupported()) throw new Error('nosupport');
    const note = (t) => { if (onStatus) onStatus(t); };

    note('AI超解像モデル読み込み中…（初回のみ 約2.5MB）');
    await loadScript(TF_URL);
    await loadScript(UPSCALER_URL);

    const tf = window.tf;
    const Upscaler = window.Upscaler;
    if (!tf || typeof Upscaler !== 'function') throw new Error('library');

    try {
      await tf.setBackend('webgl');
      await tf.ready();
    } catch (e) {
      // WebGL が使えない場合は tfjs 既定（CPU）のまま進む
      console.warn('tfjs webgl backend unavailable', e);
    }
    st.backend = tf.getBackend();

    note('AI超解像モデル読み込み中…（モデル 0.9MB）');
    const upscaler = new Upscaler({
      model: {
        scale: 2,
        modelType: 'layers',
        path: MODEL_URL,
        name: 'esrgan-slim',
        meta: { patchSize: PATCH, size: 'slim', architecture: 'rdn' },
      },
    });
    await upscaler.ready;
    st.upscaler = upscaler;
    return upscaler;
  })();

  try {
    return await st.loading;
  } catch (e) {
    st.loading = null;
    throw e;
  }
}

export function aiBackend() { return st.backend; }

/* ---------- 推論 ---------- */

async function runOnce(canvas, { onProgress } = {}) {
  const upscaler = await ensureAi();
  const src = Math.min(canvas.width, canvas.height) > 0 ? canvas : null;
  if (!src) throw new Error('empty');
  const dataUrl = await upscaler.upscale(src, {
    patchSize: PATCH,
    padding: PAD,
    progress: onProgress ? (p) => onProgress(p) : undefined,
  });
  const img = await loadImage(dataUrl);
  const out = makeCanvas(img.naturalWidth, img.naturalHeight);
  out.getContext('2d').drawImage(img, 0, 0);
  return out;
}

/**
 * 画像（canvas）をAI超解像して2倍のcanvasを返す。
 * maxSide: モデルに入れる前の長辺上限（メモリ対策）。超える場合は縮小してから2倍する。
 * 失敗したときは一段小さい入力で1回だけ再試行し、それでも駄目なら例外を投げる。
 */
export async function aiUpscale(canvas, { maxSide = 512, onProgress } = {}) {
  let inputSide = Math.min(canvas.width, canvas.height);
  let work = canvas;
  if (inputSide > maxSide) {
    work = resized(canvas, maxSide);
    inputSide = maxSide;
  }
  // 極端に小さい入力は避ける（完全畳み込みなので、多少拡大してから入れても問題ない）
  if (inputSide < 32) {
    work = resized(work, 32);
    inputSide = 32;
  }
  try {
    return await runOnce(work, { onProgress });
  } catch (e) {
    if (inputSide > 192) {
      // メモリ不足などの可能性 → 小さい入力で再挑戦
      try { return await runOnce(resized(canvas, 192), { onProgress }); } catch (e2) { throw e2; }
    }
    throw e;
  }
}

export function aiSizeFor(side, maxSide) {
  return Math.min(Math.max(32, Math.round(side)), maxSide) * 2;
}
