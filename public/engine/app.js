/* 動画から顔写真を自動抽出 — アプリ本体（すべて端末内で処理）
 * SaaS版: プラン判定（無料/Pro）はサーバーAPIで検証し、結果だけを window.__FE_GATE で受け取る。
 * 外部AI API（fal.ai等）は使わない。 */
import { FilesetResolver, FaceLandmarker } from './lib/vision_bundle.mjs';
import { enhanceCanvas } from './enhance.js';
import { aiSupported, ensureAi, aiUpscale } from './lib/ai-upscale.js';

const $ = (id) => document.getElementById(id);
const DEBUG = new URLSearchParams(location.search).has('debug');

/* ---------- 表示言語（日本語 / 英語） ----------
 * 画面の言語はサーバー側（Cookie fe_lang / ?lang= / Accept-Language）が決め、
 * ExtractorTool が window.__FE_LANG で渡す。動的に出す文言は T(日本語, 英語) で切り替える。 */
const LANG = window.__FE_LANG === 'en' ? 'en' : 'ja';
const T = (ja, en) => (LANG === 'en' ? en : ja);
if (window.__FE_BOOTED) throw new Error('face-extractor already booted');
window.__FE_BOOTED = true;
window.__fe = { debug: [] };

/* ---------- プラン判定（サーバーAPIで検証） ---------- */
const FREE_DAILY_LIMIT = 3;
const FREE_MAX_SECONDS = 300;
const gate = () => window.__FE_GATE || { isPro: false, remaining: null, upgradeUrl: '/#pricing' };
const isPro = () => !!gate().isPro;
const isAnonymous = () => !!gate().anonymous;
const upgradeHref = () => gate().upgradeUrl || '/#pricing';
const upgradeLink = (label = T('月額500円のProプランを見る', 'View the Pro plan (¥500/mo)')) => `<a class="upgrade-link" href="${upgradeHref()}">${label} →</a>`;

/* 未ログイン利用の補助記録（サーバーの署名Cookieが正。こちらは表示同期用） */
const USAGE_STORAGE_KEY = 'fe_usage';
function todayJst() {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
  } catch (e) {
    return new Date().toISOString().slice(0, 10);
  }
}
function rememberUsage(used) {
  if (typeof used !== 'number' || !(used >= 0)) return;
  try { localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify({ d: todayJst(), n: used })); } catch (e) { /* ignore */ }
}

function showLimit(title, detail) {
  els.loadError.innerHTML = `<b>${title}</b><br>${detail}`;
  els.loadError.hidden = false;
  try { els.loadError.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { /* ignore */ }
  toast(title, 5200);
}

/** 解析開始前にサーバーで利用回数を検証・加算する（無料プランのみ） */
async function requestStart(duration) {
  if (isPro()) return true;
  if (!(duration > 0)) {
    showLimit(T('動画の長さを確認できませんでした', 'Could not read the video length'),
      T('この形式の動画は解析できない可能性があります。H.264 の MP4 でお試しください。', 'This format may not be analyzable. Please try an H.264 MP4.'));
    return false;
  }
  if (duration > FREE_MAX_SECONDS) {
    showLimit(T('無料プランは5分（300秒）までの動画に対応しています', 'The free plan covers videos up to 5 minutes (300 s)'),
      T(`この動画は ${Math.round(duration)} 秒です。5分を超える動画は ${upgradeLink()}。`,
        `This video is ${Math.round(duration)} s long. For videos over 5 minutes, ${upgradeLink()}.`));
    return false;
  }
  try {
    const res = await fetch('/api/usage/check-and-increment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ durationSeconds: duration }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data && data.ok) {
      window.__FE_GATE = Object.assign({}, gate(), { remaining: data.remaining, plan: data.plan });
      if (data.anonymous !== false) rememberUsage(data.used);
      window.dispatchEvent(new CustomEvent('fe:usage', { detail: data }));
      return true;
    }
    if (data && data.reason === 'daily_limit') {
      if (data.anonymous !== false) rememberUsage(data.used);
      if (typeof data.remaining === 'number') {
        window.__FE_GATE = Object.assign({}, gate(), { remaining: data.remaining });
        window.dispatchEvent(new CustomEvent('fe:usage', { detail: { plan: 'free', remaining: data.remaining } }));
      }
      const anon = data.anonymous !== undefined ? !!data.anonymous : isAnonymous();
      const lead = anon
        ? T('無料プランはログインなしで1日3本まで試せます（日本時間の0時にリセット）。',
            'The free plan lets you try 3 videos a day without signing in (resets at midnight JST).')
        : T('無料プランは1日3本までです（日本時間の0時にリセット）。',
            'The free plan allows 3 videos a day (resets at midnight JST).');
      const cta = anon
        ? T('ログインしてProプラン（月額500円）にすると、本数無制限・時間制限なし・AI超解像が使えます。',
            'Sign in and go Pro (¥500/mo) for unlimited videos, no length limit and AI upscaling.')
        : T('本数を気にせず使うならProプラン（月額500円）がおすすめです。',
            'Go Pro (¥500/mo) to stop counting videos.');
      showLimit(T('本日の無料回数（3回）を使い切りました', 'You have used all 3 free analyses for today'),
        `${lead}${cta} ${upgradeLink(anon ? T('ログインしてProプランを見る', 'Sign in and see Pro') : T('月額500円のProプランを見る', 'View the Pro plan (¥500/mo)'))}`);
    } else if (data && data.reason === 'duration_limit') {
      showLimit(T('無料プランは5分（300秒）までの動画に対応しています', 'The free plan covers videos up to 5 minutes (300 s)'),
        T(`5分を超える動画は ${upgradeLink('Proプランなら時間制限なし')}。`,
          `For longer videos, ${upgradeLink('Pro has no length limit')}.`));
    } else if (data && data.reason === 'unauthenticated') {
      showLimit(T('ログインが必要です', 'Please sign in'),
        T(`ログインし直すか、${upgradeLink('ログインして続ける')}`, `Sign in again, or ${upgradeLink('sign in to continue')}`));
    } else {
      const generic = T('利用状況を確認できませんでした。時間をおいてもう一度お試しください。',
        'Could not check your usage. Please try again in a moment.');
      showLimit(T('解析を開始できませんでした', 'Could not start the analysis'),
        `${LANG === 'en' ? generic : ((data && data.message) || generic)} ${upgradeLink()}`);
    }
    return false;
  } catch (e) {
    console.error(e);
    showLimit(T('通信エラーで利用状況を確認できませんでした', 'Could not reach the server to check your usage'),
      T('インターネット接続を確認して、もう一度「解析スタート」を押してください。',
        'Check your internet connection, then press “Start analysis” again.'));
    return false;
  }
}

/* iOS Safari 判定（動画のシーク描画がデスクトップと挙動が違うため分岐する） */
const UA = navigator.userAgent;
const IS_IOS = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const IS_STANDALONE = IS_IOS && (navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches);
if (IS_IOS) document.documentElement.classList.add('ios');

const els = {
  dropzone: $('dropzone'), pickBtn: $('pickBtn'), fileInput: $('fileInput'),
  videoInfo: $('videoInfo'), preview: $('preview'), changeBtn: $('changeBtn'),
  mName: $('mName'), mDur: $('mDur'), mRes: $('mRes'), mSize: $('mSize'),
  loadError: $('loadError'), modelStatus: $('modelStatus'),
  stepSel: $('stepSel'), maxSel: $('maxSel'), whoSel: $('whoSel'), farChk: $('farChk'), startBtn: $('startBtn'),
  progressCard: $('progressCard'), bar: $('bar'), progressText: $('progressText'), cancelBtn: $('cancelBtn'),
  resultCard: $('resultCard'), summary: $('summary'), grid: $('grid'), noFace: $('noFace'),
  cropSel: $('cropSel'), sizeSel: $('sizeSel'), levelSel: $('levelSel'),
  saveAllBtn: $('saveAllBtn'), saveFolderBtn: $('saveFolderBtn'),
  aiSrChk: $('aiSrChk'), aiSrLabel: $('aiSrLabel'), aiSrStatus: $('aiSrStatus'), aiAllBtn: $('aiAllBtn'),
  saveHint: $('saveHint'), mobileTip: $('mobileTip'),
  toast: $('toast'),
  lightbox: $('lightbox'), lbImg: $('lbImg'), lbClose: $('lbClose'), lbBar: $('lbBar'),
  lbOrig: $('lbOrig'), lbEnh: $('lbEnh'), lbInfo: $('lbInfo'), lbSave: $('lbSave'), lbShare: $('lbShare'),
};

const state = {
  file: null, url: null, duration: 0, vw: 0, vh: 0,
  landmarker: null, modelState: 'loading', modelPromise: null, delegate: 'GPU',
  running: false, cancelRequested: false,
  candidates: [],
  baseName: 'face',
  exportVideo: null,
  aw: 0, ah: 0,
  aiOn: false, aiFailNotified: false, aiChain: Promise.resolve(),
};

/* ---------- 汎用 ---------- */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function once(target, ev, timeout = 8000) {
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (err) => { if (done) return; done = true; target.removeEventListener(ev, ok); clearTimeout(timer); err ? reject(err) : resolve(); };
    const ok = () => finish(null);
    const timer = setTimeout(() => finish(new Error('timeout')), timeout);
    target.addEventListener(ev, ok);
  });
}
function toast(msg, ms = 2800) {
  els.toast.textContent = msg;
  els.toast.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { els.toast.hidden = true; }, ms);
}
function fmtTime(t) {
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`;
}
function fmtDur(t) {
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = Math.floor(t % 60);
  return h > 0
    ? T(`${h}時間${m}分${s}秒`, `${h} h ${m} min ${s} s`)
    : T(`${m}分${s}秒`, `${m} min ${s} s`);
}
function fmtBytes(b) {
  if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(2)} GB`;
  if (b >= 1024 ** 2) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024).toFixed(0)} KB`;
}
function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}
function blobToImage(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}
function newCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/* ---------- AIモデル ---------- */
function setModelStatus(kind, text) {
  els.modelStatus.className = 'pill ' + (kind === 'ok' ? 'pill-ok' : kind === 'ng' ? 'pill-ng' : 'pill-wait');
  els.modelStatus.textContent = text;
}
function loadModel() {
  if (state.modelPromise) return state.modelPromise;
  state.modelPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks('/engine/lib/wasm');
    const make = (delegate) => ({
      baseOptions: { modelAssetPath: '/engine/models/face_landmarker.task', delegate },
      runningMode: 'IMAGE',
      numFaces: 4,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
      // 遠目の小さな顔も拾いやすいようにしきい値を低めに
      minFaceDetectionConfidence: 0.22,
      minFacePresenceConfidence: 0.22,
      minTrackingConfidence: 0.25,
    });
    let inst;
    try {
      inst = await FaceLandmarker.createFromOptions(vision, make('GPU'));
      state.delegate = 'GPU';
    } catch (e) {
      console.warn('GPU delegate failed, retrying with CPU', e);
      inst = await FaceLandmarker.createFromOptions(vision, make('CPU'));
      state.delegate = 'CPU';
    }
    state.vision = vision;
    state.landmarker = inst;
    return inst;
  })();
  state.modelPromise.then(
    () => { state.modelState = 'ready'; setModelStatus('ok', T('AIモデル 準備完了', 'AI model ready')); },
    (err) => {
      state.modelState = 'error'; state.modelError = err;
      console.error(err);
      setModelStatus('ng', T('AIモデル読込エラー', 'AI model failed to load'));
      showError(T('AIモデルの読み込みに失敗しました。<br>通信環境を確認してページを再読み込みしてください（初回だけAIモデル数MBをダウンロードします）。<br>解決しない場合は、しばらく時間をおいてからもう一度お試しください。',
        'The AI model failed to load.<br>Check your connection and reload the page (the model is a few MB and downloads only once).<br>If it still fails, please try again later.'));
    }
  );
  return state.modelPromise;
}

/** GPU実行が途中で失敗し続ける場合にCPUへ切り替える（Safari/iPhone対策） */
async function switchToCPU() {
  if (state.delegate === 'CPU' || !state.vision) return;
  setModelStatus('wait', T('AIモデル 切替中…', 'Switching AI model…'));
  try {
    const make = {
      baseOptions: { modelAssetPath: '/engine/models/face_landmarker.task', delegate: 'CPU' },
      runningMode: 'IMAGE',
      numFaces: 4,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
      minFaceDetectionConfidence: 0.22,
      minFacePresenceConfidence: 0.22,
      minTrackingConfidence: 0.25,
    };
    const inst = await FaceLandmarker.createFromOptions(state.vision, make);
    try { state.landmarker.close && state.landmarker.close(); } catch (e) { /* ignore */ }
    state.landmarker = inst;
    state.delegate = 'CPU';
    setModelStatus('ok', T('AIモデル 準備完了', 'AI model ready'));
  } catch (e) {
    console.error('CPU fallback failed', e);
    setModelStatus('ok', T('AIモデル 準備完了', 'AI model ready'));
  }
}

/* ---------- 動画の読み込み ---------- */
function showError(html) {
  els.loadError.innerHTML = html;
  els.loadError.hidden = false;
}
function clearError() { els.loadError.hidden = true; els.loadError.innerHTML = ''; }

async function loadFile(file) {
  if (!file) return;
  if (state.running) { toast(T('解析中は動画を変えられません', 'You cannot change the video while analyzing')); return; }
  clearError();
  els.resultCard.hidden = true;
  els.progressCard.hidden = true;
  state.candidates = [];
  els.grid.innerHTML = '';

  if (state.url) URL.revokeObjectURL(state.url);
  state.url = null;
  state.file = file;
  const url = URL.createObjectURL(file);
  const v = els.preview;
  v.src = url;
  v.load();

  try { await once(v, 'loadedmetadata', 15000); } catch (e) { /* 下のサイズ判定へ */ }

  if (!v.videoWidth || !v.videoHeight) {
    els.videoInfo.hidden = true;
    els.startBtn.disabled = true;
    showError(T('この動画はブラウザで再生できませんでした。<br>動画が壊れているか、ブラウザが対応していない形式（HEVC/H.265 など）の可能性があります。<br><b>H.264 の MP4</b> に変換してから読み込んでください。',
      'This video could not be played in your browser.<br>The file may be damaged, or in a format the browser does not support (such as HEVC/H.265).<br>Please convert it to an <b>H.264 MP4</b> and load it again.'));
    URL.revokeObjectURL(url);
    return;
  }

  state.url = url;
  // WebMのライブ録画などは duration が Infinity になることがあるため、有限の値だけ採用する
  state.duration = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
  state.vw = v.videoWidth;
  state.vh = v.videoHeight;
  state.baseName = (file.name.replace(/\.[^.]+$/, '') || 'video').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 30);

  els.mName.textContent = file.name;
  els.mDur.textContent = state.duration ? fmtDur(state.duration) : T('不明', 'Unknown');
  els.mRes.textContent = `${state.vw} × ${state.vh}`;
  els.mSize.textContent = fmtBytes(file.size);
  els.videoInfo.hidden = false;
  els.startBtn.disabled = false;

  // 無料プランは5分まで（クライアント側の事前チェック。サーバー側でも duration を検証する）
  if (!isPro() && state.duration > FREE_MAX_SECONDS) {
    els.startBtn.disabled = true;
    showLimit(T('無料プランは5分（300秒）までの動画に対応しています', 'The free plan covers videos up to 5 minutes (300 s)'),
      T(`この動画は ${Math.round(state.duration)} 秒です。5分を超える動画は ${upgradeLink()}。`,
        `This video is ${Math.round(state.duration)} s long. For videos over 5 minutes, ${upgradeLink()}.`));
  }
  // iOS Safari は「一度も再生していない動画」からの描画が不安定なので、読み込み直後に無音で一瞬だけ再生しておく
  await primeVideo(v);

  if (!state.duration) {
    showError(T('動画の長さを取得できませんでした。この形式は解析できない可能性があります（H.264 の MP4 を推奨）。',
      'Could not read the video length. This format may not be analyzable (H.264 MP4 recommended).'));
    els.startBtn.disabled = true;
  }
}

/* ---------- シーク ---------- */
async function primeVideo(v) {
  try {
    v.muted = true;
    const pr = v.play();
    if (pr && pr.catch) pr.catch(() => {});
    await sleep(IS_IOS ? 180 : 80);
    v.pause();
    if (Number.isFinite(v.duration) && v.duration > 0) { try { v.currentTime = 0; } catch (e) { /* ignore */ } }
    await sleep(40);
  } catch (e) { /* 自動再生できなくても続行 */ }
}

function seekVideo(video, t) {
  return new Promise((resolve) => {
    let done = false;
    let frameTimer = null;
    const finish = () => {
      if (done) return;
      done = true;
      video.removeEventListener('seeked', onSeeked);
      clearTimeout(timer);
      if (frameTimer) clearTimeout(frameTimer);
      resolve();
    };
    // iOS Safari は 'seeked' 直後の drawImage が前フレーム／真っ黒のままになることがあるため、
    // 新しいフレームが描画された通知（requestVideoFrameCallback）を待ってから描く
    const onSeeked = () => {
      if (IS_IOS && typeof video.requestVideoFrameCallback === 'function') {
        let fired = false;
        try {
          video.requestVideoFrameCallback(() => { fired = true; finish(); });
        } catch (e) { /* fallthrough */ }
        frameTimer = setTimeout(() => { if (!fired) finish(); }, 260);
      } else if (IS_IOS) {
        frameTimer = setTimeout(finish, 70);
      } else {
        finish();
      }
    };
    const timer = setTimeout(finish, IS_IOS ? 6000 : 5000);
    video.addEventListener('seeked', onSeeked);
    const target = clamp(t, 0, Math.max(0, (video.duration || 0) - 0.04));
    if (Math.abs(video.currentTime - target) < 0.005 && video.readyState >= 2) {
      if (IS_IOS) { frameTimer = setTimeout(finish, 90); } else { setTimeout(finish, 20); }
      return;
    }
    try { video.currentTime = target; } catch (e) { finish(); }
  });
}

/* ---------- 計測 ---------- */
const tmpCanvas = newCanvas(8, 8);
const tmpCtx = tmpCanvas.getContext('2d', { willReadFrequently: true });

function laplacianVar(ctx, sx, sy, sw, sh) {
  const maxSide = 220;
  const sc = Math.min(1, maxSide / Math.max(sw, sh));
  const tw = Math.max(12, Math.round(sw * sc));
  const th = Math.max(12, Math.round(sh * sc));
  if (tmpCanvas.width !== tw || tmpCanvas.height !== th) { tmpCanvas.width = tw; tmpCanvas.height = th; }
  tmpCtx.drawImage(ctx.canvas, sx, sy, sw, sh, 0, 0, tw, th);
  const d = tmpCtx.getImageData(0, 0, tw, th).data;
  const n = tw * th;
  const g = new Float32Array(n);
  let sumGray = 0;
  for (let i = 0; i < n; i++) {
    const v = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    g[i] = v; sumGray += v;
  }
  let s = 0, s2 = 0, m = 0;
  for (let y = 1; y < th - 1; y++) {
    for (let x = 1; x < tw - 1; x++) {
      const i = y * tw + x;
      const l = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - tw] - g[i + tw];
      s += l; s2 += l * l; m++;
    }
  }
  const mean = m ? s / m : 0;
  return { variance: m ? Math.max(0, s2 / m - mean * mean) : 0, grayMean: sumGray / n };
}

function landmarkBoxPx(lms, cw, ch) {
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const q of lms) {
    if (q.x < minX) minX = q.x; if (q.y < minY) minY = q.y;
    if (q.x > maxX) maxX = q.x; if (q.y > maxY) maxY = q.y;
  }
  return { x: minX * cw, y: minY * ch, w: Math.max(1, (maxX - minX) * cw), h: Math.max(1, (maxY - minY) * ch) };
}

/**
 * 顔1つ分の計測
 * pass: { lms, bs, mx, cw, ch, map }  map はフレーム正規化座標への変換
 */
function measureFace(pass, frameCtx) {
  const { lms, bs, mx, cw, ch, map } = pass;
  const p = (i) => ({ x: lms[i].x * cw, y: lms[i].y * ch });
  const b = landmarkBoxPx(lms, cw, ch);

  // フレーム正規化のバウンディングボックス
  const box = {
    x: map.ox + (b.x / cw) * map.rw,
    y: map.oy + (b.y / ch) * map.rh,
    w: (b.w / cw) * map.rw,
    h: (b.h / ch) * map.rh,
  };

  const nose = p(1), cheekL = p(234), cheekR = p(454);
  const eyeOutL = p(33), eyeOutR = p(263), eyeInL = p(133), eyeInR = p(362);
  const eyeUpL = p(159), eyeDownL = p(145), eyeUpR = p(386), eyeDownR = p(374);

  const dL = dist(nose, cheekL), dR = dist(nose, cheekR);
  const yawLM = (dR - dL) / (dR + dL + 1e-6);
  const roll = Math.abs(Math.atan2(eyeOutR.y - eyeOutL.y, eyeOutR.x - eyeOutL.x) * 180 / Math.PI);
  const earL = dist(eyeUpL, eyeDownL) / (dist(eyeOutL, eyeInL) + 1e-6);
  const earR = dist(eyeUpR, eyeDownR) / (dist(eyeOutR, eyeInR) + 1e-6);
  const ear = (earL + earR) / 2;

  let yawM = 0, pitchM = 0;
  if (mx && mx.data && mx.data.length >= 16) {
    const d = mx.data;
    yawM = Math.atan2(d[8], d[10]) * 180 / Math.PI;
    pitchM = Math.asin(clamp(-d[9], -1, 1)) * 180 / Math.PI;
  }
  const poseDev = Math.abs(yawM) / 90 * 0.60 + Math.abs(pitchM) / 90 * 0.40 + roll / 45 * 0.25 + Math.abs(yawLM) * 1.4;

  // 鮮明さは解析フレーム（原寸に近い方）で測る
  const ap = { x: box.x * state.aw, y: box.y * state.ah, w: box.w * state.aw, h: box.h * state.ah };
  const sharp = laplacianVar(frameCtx, ap.x, ap.y, ap.w, ap.h);

  let blink = null;
  if (bs && bs.categories) {
    const get = (nm) => (bs.categories.find((c) => c.categoryName === nm) || {}).score;
    const bl = get('eyeBlinkLeft'), br = get('eyeBlinkRight');
    if (typeof bl === 'number' && typeof br === 'number') blink = (bl + br) / 2;
  }

  return {
    box,
    facePxW: box.w * state.vw,
    facePxH: box.h * state.vh,
    yawM, pitchM, yawLM, roll, ear, blink, poseDev,
    sharpVar: sharp.variance, grayMean: sharp.grayMean,
  };
}

/* ---------- スコア ---------- */
function scoreAll(list) {
  const vars = list.map((a) => a.sharpVar).sort((a, b) => a - b);
  const ref = Math.max(40, vars.length ? vars[Math.min(vars.length - 1, Math.floor(vars.length * 0.9))] : 300);
  for (const a of list) {
    const frontScore = clamp(100 * Math.exp(-Math.pow(a.poseDev, 2) / (2 * Math.pow(0.33, 2))), 0, 100);
    const sharpScore = clamp(100 * Math.pow(Math.min(1, a.sharpVar / ref), 0.7), 0, 100);
    const sizeScore = clamp(100 * Math.min(1, a.box.w / 0.16), 0, 100);
    let eyeScore;
    if (a.blink !== null && a.blink !== undefined) eyeScore = clamp(100 * (1 - a.blink / 0.55), 0, 100);
    else eyeScore = clamp(100 * (a.ear - 0.10) / 0.20, 0, 100);
    const gm = a.grayMean;
    const expScore = clamp(100 - Math.max(0, 72 - gm) * 1.1 - Math.max(0, gm - 205) * 1.1, 0, 100);

    const total = 0.32 * frontScore + 0.28 * sharpScore + 0.18 * sizeScore + 0.12 * eyeScore + 0.10 * expScore;
    a.score = { total, front: frontScore, sharp: sharpScore, size: sizeScore, eye: eyeScore, exp: expScore };
    a.warns = [];
    if (frontScore < 45) a.warns.push(T('横向き', 'sideways'));
    if (sharpScore < 45) a.warns.push(T('ブレ', 'blurry'));
    if (eyeScore < 45) a.warns.push(T('目つむり', 'eyes closed'));
    if (sizeScore < 35) a.warns.push(T('小さい', 'too small'));
    if (expScore < 45) a.warns.push(T('暗い/白飛び', 'dark/blown out'));
  }
  return list;
}

function pickCandidates(list, maxOut, step, who) {
  const sorted = [...list].sort((a, b) => b.score.total - a.score.total);
  const out = [];
  const gap = Math.max(0.3, step * 0.85);
  for (const c of sorted) {
    if (out.length >= maxOut) break;
    const tooClose = out.some((o) => Math.abs(o.t - c.t) < gap &&
      Math.hypot((o.box.x + o.box.w / 2) - (c.box.x + c.box.w / 2), (o.box.y + o.box.h / 2) - (c.box.y + c.box.h / 2)) < 0.12);
    if (tooClose) continue;
    out.push(c);
  }
  if (out.length < maxOut) {
    for (const c of sorted) {
      if (out.length >= maxOut) break;
      if (!out.includes(c)) out.push(c);
    }
  }
  return out.sort((a, b) => b.score.total - a.score.total);
}


/* ---------- 遠目の顔のための補助 ---------- */
const FRAME_MAP = { ox: 0, oy: 0, rw: 1, rh: 1 };

/** 顔の周辺を正方形で切り出す（ネイティブ解像度の座標） */
function roiFor(box, pad = 2.6) {
  const bw = box.w * state.vw, bh = box.h * state.vh;
  const side = Math.min(Math.max(bw, bh) * pad, Math.min(state.vw, state.vh));
  const cx = (box.x + box.w / 2) * state.vw;
  const cy = (box.y + box.h / 2) * state.vh;
  const sx = clamp(cx - side / 2, 0, Math.max(0, state.vw - side));
  const sy = clamp(cy - side / 2, 0, Math.max(0, state.vh - side));
  return { sx, sy, side };
}

/** 動画の指定領域を拡大して顔検出（小さい顔の精度アップ用） */
function detectRegion(video, canvas, ctx, roi) {
  try {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(video, roi.sx, roi.sy, roi.side, roi.side, 0, 0, canvas.width, canvas.height);
    const res = state.landmarker.detect(canvas);
    if (!res || !res.faceLandmarks || !res.faceLandmarks.length) return null;
    const map = { ox: roi.sx / state.vw, oy: roi.sy / state.vh, rw: roi.side / state.vw, rh: roi.side / state.vh };
    return { landmarks: res.faceLandmarks, blendshapes: res.faceBlendshapes || [], matrices: res.facialTransformationMatrixes || [], map, cw: canvas.width, ch: canvas.height };
  } catch (e) { return null; }
}

/** 2×2 タイル走査（画面全体に映る遠目の顔を拾う） */
function tileScan(video, canvas, ctx) {
  const N = 2, pad = 0.08, out = [];
  const tw = state.vw / N, th = state.vh / N;
  for (let iy = 0; iy < N; iy++) {
    for (let ix = 0; ix < N; ix++) {
      const px = Math.max(0, ix * tw - tw * pad);
      const py = Math.max(0, iy * th - th * pad);
      const pw = Math.min(state.vw - px, tw * (1 + 2 * pad));
      const ph = Math.min(state.vh - py, th * (1 + 2 * pad));
      const cw = Math.round(Math.min(640, pw)), ch = Math.max(64, Math.round(cw * ph / pw));
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(video, px, py, pw, ph, 0, 0, cw, ch);
      let r = null;
      try { r = state.landmarker.detect(canvas); } catch (e) { continue; }
      const lms = (r && r.faceLandmarks) || [];
      for (let k = 0; k < lms.length; k++) {
        const b = landmarkBoxPx(lms[k], cw, ch);
        if (b.w < 14) continue;
        const box = {
          x: (px + (b.x / cw) * pw) / state.vw,
          y: (py + (b.y / ch) * ph) / state.vh,
          w: ((b.w / cw) * pw) / state.vw,
          h: ((b.h / ch) * ph) / state.vh,
        };
        // 重なりタイルでの二重検出を除く
        const dup = out.some((o) => Math.hypot((o.box.x + o.box.w / 2) - (box.x + box.w / 2), (o.box.y + o.box.h / 2) - (box.y + box.h / 2)) < box.w * 0.6);
        if (dup) continue;
        out.push({
          box, lms: lms[k],
          bs: r.faceBlendshapes ? r.faceBlendshapes[k] : null,
          mx: r.facialTransformationMatrixes ? r.facialTransformationMatrixes[k] : null,
          cw, ch, map: { ox: px / state.vw, oy: py / state.vh, rw: pw / state.vw, rh: ph / state.vh },
        });
      }
    }
  }
  return out;
}

/* ---------- 解析 ---------- */
async function analyze() {
  if (state.running || !state.url) return;
  clearError();
  els.noFace.hidden = true;

  if (state.modelState !== 'ready') {
    els.progressCard.hidden = false;
    els.progressText.textContent = T('AIモデルを読み込み中…（初回は数秒かかります）', 'Loading the AI model… (a few seconds the first time)');
    try { await loadModel(); } catch (e) { els.progressCard.hidden = true; return; }
  }

  const step = parseFloat(els.stepSel.value);
  const maxOut = parseInt(els.maxSel.value, 10);
  const who = els.whoSel.value;

  state.running = true;
  state.cancelRequested = false;
  els.startBtn.disabled = true;
  els.resultCard.hidden = true;
  els.progressCard.hidden = false;
  els.grid.innerHTML = '';
  setBar(0);

  const video = els.preview;
  video.pause();

  // 解析解像度: 長辺 1280px（MediaPipeは内部で縮小するため、これ以上上げても検出精度は変わらない）
  const farMode = els.farChk.checked;
  const long = Math.max(state.vw, state.vh);
  const scale = Math.min(1, 1280 / long);
  const aw = Math.max(64, Math.round(state.vw * scale));
  const ah = Math.max(64, Math.round(state.vh * scale));
  state.aw = aw; state.ah = ah;

  const canvas = newCanvas(aw, ah);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // 小さい顔の再検出用（ネイティブ解像度から切り出して拡大）
  const roiCanvas = newCanvas(640, 640);
  const roiCtx = roiCanvas.getContext('2d', { willReadFrequently: true });
  // 遠目の顔の走査用（2×2タイル）
  const tileCanvas = newCanvas(512, 288);
  const tileCtx = tileCanvas.getContext('2d', { willReadFrequently: true });

  const times = [];
  const end = Math.max(0.06, state.duration - 0.05);
  for (let t = Math.min(0.06, end); t <= end; t += step) times.push(t);
  if (!times.length) times.push(0);

  const found = [];
  let framesWithFace = 0;
  let roiPasses = 0;
  let detectErrors = 0;
  const t0 = performance.now();

  try {
    for (let i = 0; i < times.length; i++) {
      if (state.cancelRequested) break;
      await seekVideo(video, times[i]);
      ctx.drawImage(video, 0, 0, aw, ah);

      let res = null;
      try {
        res = state.landmarker.detect(canvas);
        detectErrors = 0;
      } catch (e) {
        detectErrors++;
        console.warn('detect error', e);
        // GPU実行が続けて失敗する場合はCPUへ切り替える（iOS Safariで止まらないように）
        if (detectErrors >= 3) { await switchToCPU(); detectErrors = 0; }
      }
      const lmsList = (res && res.faceLandmarks) || [];
      const bsList = (res && res.faceBlendshapes) || [];
      const mxList = (res && res.facialTransformationMatrixes) || [];

      const pushFace = (l, bs, mx, cw, ch, map) => {
        const m = measureFace({ lms: l, bs, mx, cw, ch, map }, ctx);
        if (!m || m.facePxW < 16) return;
        m.t = times[i];
        found.push(m);
        if (DEBUG) window.__fe.debug.push({
          t: m.t, yawM: m.yawM, pitchM: m.pitchM, yawLM: m.yawLM, roll: m.roll, ear: m.ear, blink: m.blink,
          sharp: m.sharpVar, gm: m.grayMean, facePxW: m.facePxW, boxW: m.box.w, roi: map !== FRAME_MAP,
        });
      };

      if (lmsList.length) {
        framesWithFace++;
        const boxes = lmsList.map((l) => landmarkBoxPx(l, aw, ah));
        const areas = boxes.map((b) => b.w * b.h);
        const maxArea = Math.max(...areas);
        let bi = 0;
        for (let k = 1; k < areas.length; k++) if (areas[k] > areas[bi]) bi = k;

        if (lmsList.length === 1 && boxes[bi].w / aw < 0.16) {
          // 遠目の小さい顔 → ネイティブ解像度で周辺を切り出して再検出（精度アップ）
          const fb = { x: boxes[0].x / aw, y: boxes[0].y / ah, w: boxes[0].w / aw, h: boxes[0].h / ah };
          const p = detectRegion(video, roiCanvas, roiCtx, roiFor(fb));
          if (p && p.landmarks.length) {
            roiPasses++;
            for (let fi = 0; fi < p.landmarks.length; fi++) {
              pushFace(p.landmarks[fi], p.blendshapes[fi], p.matrices[fi], p.cw, p.ch, p.map);
            }
          } else {
            pushFace(lmsList[0], bsList[0], mxList[0], aw, ah, FRAME_MAP);
          }
        } else {
          for (let fi = 0; fi < lmsList.length; fi++) {
            if (who === 'main' && areas[fi] < maxArea * 0.85) continue;
            if (boxes[fi].w < 18 || boxes[fi].h < 18) continue;
            pushFace(lmsList[fi], bsList[fi], mxList[fi], aw, ah, FRAME_MAP);
          }
        }
      } else if (farMode) {
        // フレーム全体では見つからない遠目の顔 → 2×2タイルで再走査
        const hits = tileScan(video, tileCanvas, tileCtx);
        if (DEBUG) { window.__fe.frames = window.__fe.frames || []; window.__fe.frames.push({ t: times[i], full: 0, tiles: hits.length, tls: hits.map(h => Math.round(h.box.w * state.vw)) }); }
        if (hits.length) {
          framesWithFace++;
          for (const h of hits) {
            const p = detectRegion(video, roiCanvas, roiCtx, roiFor(h.box));
            if (p && p.landmarks.length) {
              roiPasses++;
              pushFace(p.landmarks[0], p.blendshapes[0], p.matrices[0], p.cw, p.ch, p.map);
            } else {
              pushFace(h.lms, h.bs, h.mx, h.cw, h.ch, h.map);
            }
          }
        }
      }

      const doneN = i + 1;
      const el = (performance.now() - t0) / 1000;
      const per = el / doneN;
      const remain = Math.max(0, per * (times.length - doneN));
      setBar(doneN / times.length * 100);
      els.progressText.textContent = LANG === 'en'
        ? `Analyzing… ${doneN} / ${times.length} frames (${Math.round(doneN / times.length * 100)}%) · about ${remain < 60 ? Math.ceil(remain) + ' s' : Math.ceil(remain / 60) + ' min'} left`
        : `解析中… ${doneN} / ${times.length} フレーム（${Math.round(doneN / times.length * 100)}%） 残り約${remain < 60 ? Math.ceil(remain) + '秒' : Math.ceil(remain / 60) + '分'}`;
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
    }
  } catch (e) {
    console.error(e);
    showError(T('解析中にエラーが発生しました: ', 'An error occurred during analysis: ') + (e && e.message ? e.message : e));
  }

  if (state.cancelRequested) {
    state.running = false;
    els.startBtn.disabled = false;
    els.progressCard.hidden = true;
    toast(T('解析をキャンセルしました', 'Analysis cancelled'));
    return;
  }

  scoreAll(found);
  const picked = pickCandidates(found, maxOut, step, who);

  if (!picked.length) {
    state.running = false;
    els.startBtn.disabled = false;
    els.progressCard.hidden = true;
    els.resultCard.hidden = false;
    els.summary.innerHTML = T(`解析したフレーム: <b>${times.length}</b> ／ 顔が見つかったフレーム: <b>0</b>`,
      `Frames analyzed: <b>${times.length}</b> / frames with a face: <b>0</b>`);
    els.noFace.innerHTML = T('顔を検出できませんでした。<br>・顔が小さすぎる / 暗すぎる / 横向きが強い動画では検出できないことがあります。<br>・「解析する間隔」を 0.5秒 にして再試行すると見つかる場合があります。',
      'No faces were detected.<br>· Faces that are too small, too dark, or mostly turned away may not be detected.<br>· Retrying with the frame interval set to 0.5 s can help.');
    els.noFace.hidden = false;
    return;
  }

  els.progressText.textContent = T('候補の画像を切り出しています…', 'Cropping the candidate images…');
  setBar(100);
  for (let i = 0; i < picked.length; i++) {
    await seekVideo(video, picked[i].t);
    ctx.drawImage(video, 0, 0, aw, ah);
    picked[i].frameBlob = await canvasToBlob(canvas, 'image/jpeg', 0.92);
    picked[i].frameW = aw;
    picked[i].frameH = ah;
    picked[i].view = 'enh';
    picked[i].ai = null;
    await new Promise((r) => setTimeout(r, 0));
  }

  state.candidates = picked;
  state.running = false;
  els.startBtn.disabled = false;
  els.progressCard.hidden = true;
  els.resultCard.hidden = false;
  const smallCount = picked.filter((c) => c.facePxW < 120).length;
  const secs = ((performance.now() - t0) / 1000).toFixed(1);
  const farNote = smallCount
    ? T(`<br><span class="warn-tag">遠目の顔が ${smallCount} 枚あります — 自動でアップ・高画質化して保存できます</span>`,
        `<br><span class="warn-tag">${smallCount} small/distant face${smallCount === 1 ? '' : 's'} — saved upscaled and enhanced automatically</span>`)
    : '';
  els.summary.innerHTML =
    (LANG === 'en'
      ? `Frames analyzed: <b>${times.length}</b> / frames with a face: <b>${framesWithFace}</b> / picks: <b>${picked.length}</b>`
      : `解析したフレーム: <b>${times.length}</b> ／ 顔を検出: <b>${framesWithFace}</b> フレーム ／ 候補: <b>${picked.length}</b> 枚`) +
    (LANG === 'en'
      ? `　<span class="small">(analyzed in ${secs} s${roiPasses ? ` · ${roiPasses} distant-face passes` : ''})</span>`
      : `　<span class="small">（解析 ${secs}秒${roiPasses ? `・遠目補正 ${roiPasses}回` : ''}）</span>`) +
    farNote;
  renderGrid();
  els.resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (state.aiOn) processCardAi(cardRefs[0]);
}

function setBar(v) { els.bar.style.width = `${clamp(v, 0, 100)}%`; }

/* ---------- クロップ ---------- */
const CROP_K = { face: 1.55, chest: 2.45, wide: 3.4 };

function cropRect(box, W, H, mode) {
  const k = CROP_K[mode] || CROP_K.chest;
  const faceH = box.h * H;
  let size = faceH * k;
  let cx = (box.x + box.w / 2) * W;
  let cy = box.y * H + faceH * (0.62 + (k - 2.45) * 0.12) + size * 0.06;
  size = Math.min(size, Math.min(W, H));
  const sx = clamp(cx - size / 2, 0, Math.max(0, W - size));
  const sy = clamp(cy - size / 2, 0, Math.max(0, H - size));
  return { sx, sy, size: Math.max(8, Math.min(size, W - sx, H - sy)) };
}

function minOutSide() {
  const v = els.sizeSel.value;
  if (v === 'auto') return 768;
  if (v === 'natural') return 0;
  return parseInt(v, 10);
}
function maxOutSide() { return els.sizeSel.value === 'natural' ? 4096 : 2400; }

function cropSizeNative(c) {
  return cropRect(c.box, state.vw, state.vh, els.cropSel.value).size;
}
function fixedOutSide() {
  const v = els.sizeSel.value;
  return (v === 'auto' || v === 'natural') ? 0 : parseInt(v, 10);
}
function outSideFor(c) {
  const fixed = fixedOutSide();
  if (fixed) return fixed;
  const nat = cropSizeNative(c);
  const out = Math.max(nat, minOutSide());
  return Math.min(maxOutSide(), Math.max(64, Math.round(out)));
}

/* ---------- サムネイル ---------- */
const THUMB = 400;

async function makeThumbs(c) {
  const img = await blobToImage(c.frameBlob);
  const r = cropRect(c.box, img.naturalWidth, img.naturalHeight, els.cropSel.value);
  // 元の切り出しは原寸に近い解像度で持っておく（補正前後の比較を正しく見せるため）
  const baseSide = Math.min(r.size, 900);
  const base = newCanvas(baseSide, baseSide);
  base.getContext('2d').drawImage(img, r.sx, r.sy, r.size, r.size, 0, 0, base.width, base.height);
  const plain = newCanvas(THUMB, THUMB);
  plain.getContext('2d').drawImage(base, 0, 0, THUMB, THUMB);
  c.thumbOrig = plain.toDataURL('image/jpeg', 0.88);
  c.thumbEnh = enhanceCanvas(base, { fixedSide: THUMB, level: els.levelSel.value, maxSide: 900 }).toDataURL('image/jpeg', 0.92);
}

/* ---------- 表示 ---------- */
const cardRefs = [];

function sizeClass(c) { return c.facePxW < 80 ? 'tiny' : c.facePxW < 120 ? 'small' : ''; }

function sizeInfoHtml(c) {
  const outPx = outSideFor(c);
  const sr = (state.aiOn && c.sr && c.sr.key === els.cropSel.value) ? c.sr : null;
  let html = T(`元の顔 <b>${Math.round(c.facePxW)}×${Math.round(c.facePxH)}px</b>`,
    `Source face <b>${Math.round(c.facePxW)}×${Math.round(c.facePxH)}px</b>`);
  if (sr) html += T(` → AI超解像 <b>${sr.side}×${sr.side}px</b>`, ` → AI upscaled <b>${sr.side}×${sr.side}px</b>`);
  html += T(` → 出力 <b>${outPx}×${outPx}px</b>`, ` → output <b>${outPx}×${outPx}px</b>`);
  if (sr) html += T('<div class="small-note">※ AI超解像（端末内AI）で高画質化した画像を保存します</div>',
    '<div class="small-note">Saves the image upscaled by on-device AI.</div>');
  else if (c.facePxW < 80) html += T('<div class="tiny-note">※ 元画像が小さいため、AI補完時に顔立ちが変わる場合があります</div>',
    '<div class="tiny-note">The source is small, so facial features can shift when AI completes it.</div>');
  else if (c.facePxW < 120) html += T('<div class="small-note">※ 元画像が小さめです。アップ＋補正して保存します</div>',
    '<div class="small-note">The source is smallish — it will be upscaled and enhanced when saved.</div>');
  return html;
}

async function renderGrid() {
  els.grid.innerHTML = '';
  cardRefs.length = 0;
  const mode = els.cropSel.value;
  const level = els.levelSel.value;

  for (let i = 0; i < state.candidates.length; i++) {
    const c = state.candidates[i];
    const sc = c.score;
    const card = document.createElement('div');
    card.className = 'cand';
    const srcPx = `${Math.round(c.facePxW)}×${Math.round(c.facePxH)}px`;
    const outPx = outSideFor(c);
    const tiny = c.facePxW < 80;
    const aiOk = aiSupported() && isPro();
    card.innerHTML = `
      <div class="thumbwrap">
        <img alt="${T('候補', 'Candidate')} ${i + 1}" src="">
        <div class="rank ${i === 0 ? 'top1' : ''}">${i === 0 ? '★ BEST' : '#' + (i + 1)}</div>
        <div class="total">${Math.round(sc.total)}${T('点', ' pts')}</div>
        <div class="time">${fmtTime(c.t)}</div>
        ${level !== 'none' ? `<div class="badge-enh">${T('✨ 補正', '✨ Enhanced')}</div>` : ''}
        <div class="badge-ai" hidden>AI</div>
        <div class="badge-sr" hidden>${T('AI超解像', 'AI upscale')}</div>
      </div>
      <div class="cbody">
        <div class="srow"><span>${T('正面度', 'Facing')}</span><div class="track"><div class="fill" style="width:${sc.front}%"></div></div><span class="num">${Math.round(sc.front)}</span></div>
        <div class="srow"><span>${T('鮮明さ', 'Sharpness')}</span><div class="track"><div class="fill" style="width:${sc.sharp}%"></div></div><span class="num">${Math.round(sc.sharp)}</span></div>
        <div class="srow"><span>${T('大きさ', 'Size')}</span><div class="track"><div class="fill" style="width:${sc.size}%"></div></div><span class="num">${Math.round(sc.size)}</span></div>
        ${c.warns.length ? `<div class="warns">${c.warns.map((w) => `<span class="warn-tag">${w}</span>`).join('')}</div>` : ''}
        <div class="sizeinfo ${sizeClass(c)}">${sizeInfoHtml(c)}</div>
        ${level !== 'none' ? `<button class="btn btn-ghost small toggle" data-act="toggle" data-i="${i}">${T('元画像を見る', 'View original')}</button>` : ''}
        <div class="acts">
          <button class="btn btn-main" data-act="jpg" data-i="${i}">${T('JPG保存', 'Save JPG')}</button>
          <button class="btn btn-ghost" data-act="png" data-i="${i}">PNG</button>
          <button class="btn btn-ghost" data-act="frame" data-i="${i}">${T('全体', 'Full frame')}</button>
        </div>
        ${aiOk ? `<button class="btn btn-sr" data-act="sr" data-i="${i}">${T('✨ AI超解像', '✨ AI upscale')}</button>` : ''}
      </div>`;
    els.grid.appendChild(card);
    cardRefs.push({ card, img: card.querySelector('img'), c, aiBadge: card.querySelector('.badge-ai'), enhBadge: card.querySelector('.badge-enh'), srBadge: card.querySelector('.badge-sr'), toggle: card.querySelector('[data-act="toggle"]') });
  }

  // サムネイルを順番に生成（UIを止めない）
  for (const ref of cardRefs) {
    await makeThumbs(ref.c);
    applyView(ref);
    await sleep(0);
  }
}

function applyView(ref) {
  const { c, img } = ref;
  const srOn = state.aiOn && c.sr && c.sr.key === els.cropSel.value && c.sr.thumb;
  const isOrig = c.view === 'orig' || (!srOn && els.levelSel.value === 'none');
  img.src = isOrig ? c.thumbOrig : (srOn ? c.sr.thumb : c.thumbEnh);
  if (ref.enhBadge) ref.enhBadge.hidden = isOrig || !!srOn;
  if (ref.srBadge) ref.srBadge.hidden = !(srOn && !isOrig);
  if (ref.aiBadge) ref.aiBadge.hidden = true;
  if (ref.toggle) ref.toggle.textContent = c.view === 'orig' ? T('補正後を見る', 'View enhanced') : T('元画像を見る', 'View original');
  const info = ref.card && ref.card.querySelector('.sizeinfo');
  if (info) info.innerHTML = sizeInfoHtml(c);
}

async function recropAll() {
  for (const ref of cardRefs) {
    ref.c.thumbOrig = null; ref.c.thumbEnh = null;
    await makeThumbs(ref.c);
    if (ref.c.view !== 'ai') applyView(ref);
    await sleep(0);
  }
  if (state.aiOn) processCardAi(cardRefs[0]);
}

/* ---------- 書き出し ---------- */
function ensureExportVideo() {
  if (state.exportVideo) return state.exportVideo;
  const v = document.createElement('video');
  v.playsInline = true; v.muted = true; v.preload = 'auto';
  v.style.cssText = 'position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0;pointer-events:none';
  document.body.appendChild(v);
  state.exportVideo = v;
  return v;
}

function isBlankCanvas(c) {
  try {
    const t = document.createElement('canvas');
    t.width = 8; t.height = 8;
    const g = t.getContext('2d', { willReadFrequently: true });
    g.drawImage(c, 0, 0, 8, 8);
    const d = g.getImageData(0, 0, 8, 8).data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] + d[i + 1] + d[i + 2] > 12) return false;
    }
    return true;
  } catch (e) { return false; }
}

async function fullResFrame(t) {
  // iOS は画面外の video だとフレームを描画しないことがあるため、表示中のプレビュー要素を使う
  const v = IS_IOS ? els.preview : ensureExportVideo();
  if (v !== els.preview && (!v.src || v.dataset.url !== state.url)) {
    v.src = state.url;
    v.dataset.url = state.url;
    v.load();
    try { await once(v, 'loadedmetadata', 15000); } catch (e) { /* ignore */ }
  }
  await seekVideo(v, t);
  const c = newCanvas(v.videoWidth, v.videoHeight);
  c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
  // 真っ黒（フレーム未描画）だったら一度再生してから描き直す（主に Safari 向けの保険）
  if (isBlankCanvas(c)) {
    try {
      v.muted = true;
      const pr = v.play();
      if (pr && pr.catch) pr.catch(() => {});
      await sleep(200);
      v.pause();
      try { v.currentTime = t; } catch (e) { /* ignore */ }
      await sleep(140);
    } catch (e) { /* ignore */ }
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
  }
  return c;
}

/** 切り出し＋高画質化した canvas を作る（AI超解像ONならAIの結果を元にする） */
async function buildCropCanvas(c, opts = {}) {
  const level = opts.level !== undefined ? opts.level : els.levelSel.value;
  const minSide = opts.minSide !== undefined ? opts.minSide : minOutSide();
  const fixedSide = opts.fixedSide || fixedOutSide();
  const maxSide = opts.maxSide || maxOutSide();

  if (state.aiOn && !opts.noAi) {
    const sr = await ensureSr(c, opts);
    if (sr) {
      const out = enhanceCanvas(sr.canvas, { minSide, fixedSide, maxSide, level });
      if (DEBUG) window.__fe.lastExport = { natural: sr.side, out: out.width, ai: true };
      return out;
    }
  }

  const src = await fullResFrame(c.t);
  const r = cropRect(c.box, src.width, src.height, els.cropSel.value);
  const cut = newCanvas(r.size, r.size);
  cut.getContext('2d').drawImage(src, r.sx, r.sy, r.size, r.size, 0, 0, cut.width, cut.height);
  const out = enhanceCanvas(cut, { minSide, fixedSide, maxSide, level });
  if (DEBUG) window.__fe.lastExport = { natural: r.size, out: out.width, ai: false };
  return out;
}

function exportName(c, i, format, suffix) {
  const t = c.t.toFixed(1).replace('.', '-');
  const tag = suffix ? `_${suffix}` : '';
  return `${state.baseName}_${String(i + 1).padStart(2, '0')}_${t}s${tag}.${format}`;
}

function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 6000);
}

async function saveOne(i, format) {
  const c = state.candidates[i];
  if (!c) return;
  try {
    const out = await buildCropCanvas(c);
    const usedAi = state.aiOn && c.sr && c.sr.key === els.cropSel.value;
    const blob = await canvasToBlob(out, format === 'png' ? 'image/png' : 'image/jpeg', 0.95);
    const suffix = usedAi ? 'ai-sr' : (els.levelSel.value === 'none' ? '' : 'hq');
    downloadBlob(blob, exportName(c, i, format, suffix));
  } catch (e) {
    console.error(e);
    toast(T('保存に失敗しました', 'Could not save'));
  }
}

async function saveFrame(i) {
  const c = state.candidates[i];
  try {
    const src = await fullResFrame(c.t);
    const blob = await canvasToBlob(src, 'image/jpeg', 0.95);
    downloadBlob(blob, exportName(c, i, 'jpg', 'frame'));
  } catch (e) { toast(T('保存に失敗しました', 'Could not save')); }
}

async function saveAll() {
  els.saveAllBtn.disabled = true;
  const n = state.candidates.length;
  if (IS_IOS) toast(T('「ダウンロード」を許可してください（ファイルアプリに保存されます）', 'Please allow the download — it is saved to the Files app'), 4000);
  for (let i = 0; i < n; i++) {
    toast(state.aiOn
      ? T(`AI超解像して保存中… ${i + 1} / ${n}`, `Upscaling and saving… ${i + 1} / ${n}`)
      : T(`保存中… ${i + 1} / ${n}`, `Saving… ${i + 1} / ${n}`), 900);
    await saveOne(i, 'jpg');
    await sleep(IS_IOS ? 700 : 340);
  }
  els.saveAllBtn.disabled = false;
  toast(IS_IOS
    ? T(`${n}枚を保存しました。写真アプリに入れるには、画像を長押し→「写真に保存」が確実です`,
        `Saved ${n} images. To put them in Photos, long-press an image and choose “Save to Photos”.`)
    : T(`${n}枚を保存しました（ブラウザの複数ダウンロード許可が必要な場合があります）`,
        `Saved ${n} images (your browser may ask to allow multiple downloads).`), 5000);
}

async function saveFolder() {
  if (!window.showDirectoryPicker) {
    toast(T('このブラウザではフォルダ保存が使えません。「すべてJPGで保存」をお使いください。',
      'Folder saving is not available in this browser. Please use “Save all as JPG”.'));
    return;
  }
  let dir;
  try { dir = await window.showDirectoryPicker({ mode: 'readwrite' }); } catch (e) { return; }
  els.saveFolderBtn.disabled = true;
  const n = state.candidates.length;
  for (let i = 0; i < n; i++) {
    toast(T(`保存中… ${i + 1} / ${n}`, `Saving… ${i + 1} / ${n}`), 900);
    try {
      let blob, name;
      {
        const out = await buildCropCanvas(state.candidates[i]);
        const usedAi = state.aiOn && state.candidates[i].sr && state.candidates[i].sr.key === els.cropSel.value;
        blob = await canvasToBlob(out, 'image/jpeg', 0.95);
        name = exportName(state.candidates[i], i, 'jpg', usedAi ? 'ai-sr' : (els.levelSel.value === 'none' ? '' : 'hq'));
      }
      const fh = await dir.getFileHandle(name, { create: true });
      const w = await fh.createWritable();
      await w.write(blob);
      await w.close();
    } catch (e) { console.error(e); }
  }
  els.saveFolderBtn.disabled = false;
  toast(T(`${n}枚をフォルダに保存しました`, `Saved ${n} images to the folder`), 3500);
}

/* ---------- AI超解像（端末内AI・API不要） ---------- */

/** AIに入れる画像の上限（メモリと時間のため）。出力はこの2倍。 */
function aiMaxSide() {
  return IS_IOS ? 256 : 384;
}

function setAiStatus(text, kind) {
  const el = els.aiSrStatus;
  if (!el) return;
  if (!text) { el.hidden = true; el.textContent = ''; return; }
  el.hidden = false;
  el.textContent = text;
  el.className = 'aistatus' + (kind ? ' ' + kind : '');
}

function thumbFromCanvas(src, side = 400) {
  const c = newCanvas(side, side);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, side, side);
  return c.toDataURL('image/jpeg', 0.92);
}

function canvasToJpegUrl(src, maxSide = 1000) {
  const s = Math.min(1, maxSide / Math.max(src.width, src.height));
  const c = newCanvas(src.width * s, src.height * s);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.95);
}

/** AI処理は1件ずつ順番に（tfjsの同時実行を避ける） */
function aiEnqueue(fn) {
  const run = state.aiChain.then(fn, fn);
  state.aiChain = run.then(() => {}, () => {});
  return run;
}

/**
 * 候補1枚をAI超解像（2倍）。適用済みならキャッシュを返す。
 * AI OFF / 失敗時は null を返し、呼び出し側は標準補正へフォールバックする。
 */
async function ensureSr(c, opts = {}) {
  if (!state.aiOn) return null;
  const key = els.cropSel.value;
  if (c.sr && c.sr.key === key) return c.sr;

  return aiEnqueue(async () => {
    if (!state.aiOn) return null;
    if (c.sr && c.sr.key === key) return c.sr;
    setAiStatus(T('高画質化中…（AI超解像）', 'Enhancing… (AI upscaling)'), 'busy');
    try {
      const full = await fullResFrame(c.t);
      const r = cropRect(c.box, full.width, full.height, key);
      const cut = newCanvas(r.size, r.size);
      cut.getContext('2d').drawImage(full, r.sx, r.sy, r.size, r.size, 0, 0, cut.width, cut.height);
      const out = await aiUpscale(cut, {
        maxSide: aiMaxSide(),
        onProgress: (p) => { if (opts.onProgress) opts.onProgress(p); },
      });
      const sr = { key, canvas: out, thumb: thumbFromCanvas(out, 400), side: Math.min(out.width, out.height) };
      c.sr = sr;
      return sr;
    } catch (e) {
      console.error('AI超解像 失敗', e);
      c.sr = null;
      if (!state.aiFailNotified) {
        state.aiFailNotified = true;
        toast(T('この画像はAI超解像にできませんでした（端末のメモリ不足などの可能性）。標準の高画質補正で保存します。',
          'AI upscaling failed for this image (possibly low device memory). It will be saved with standard enhancement.'), 6000);
      }
      return null;
    }
  });
}

/** グローバルスイッチをONにする（モデルの読み込みはここで初めて走る） */
async function enableAi({ demo = true } = {}) {
  if (state.aiOn) return true;
  if (!aiSupported()) {
    setAiStatus(T('この端末・ブラウザではAI超解像を使えません（WebGL非対応）。標準の高画質補正は使えます。',
      'AI upscaling is not available in this browser (no WebGL). Standard enhancement still works.'), 'ng');
    els.aiSrChk.checked = false;
    return false;
  }
  els.aiSrChk.disabled = true;
  try {
    await ensureAi({ onStatus: (t) => setAiStatus(t, 'busy') });
    state.aiOn = true;
    state.aiFailNotified = false;
    els.aiSrChk.checked = true;
    setAiStatus(T(`AI超解像 ON（2倍・端末内AI）／元の${aiMaxSide()}px → ${aiMaxSide() * 2}px で高画質化します`,
      `AI upscaling ON (2×, on-device) · enhancing from ${aiMaxSide()}px to ${aiMaxSide() * 2}px`), 'ok');
    if (els.aiAllBtn) els.aiAllBtn.hidden = false;
    for (const ref of cardRefs) applyView(ref);
    if (demo && cardRefs.length) await processCardAi(cardRefs[0]);
    return true;
  } catch (e) {
    console.error('AI超解像モデル 読み込み失敗', e);
    state.aiOn = false;
    els.aiSrChk.checked = false;
    setAiStatus(T('AI超解像モデルを読み込めませんでした。通信環境を確認してください（標準の高画質補正はそのまま使えます）。',
      'Could not load the AI upscaling model. Check your connection — standard enhancement still works.'), 'ng');
    toast(T('AI超解像モデルを読み込めませんでした。標準の高画質補正はそのまま使えます。',
      'Could not load the AI upscaling model. Standard enhancement still works.'), 6000);
    return false;
  } finally {
    els.aiSrChk.disabled = false;
  }
}

function disableAi() {
  state.aiOn = false;
  els.aiSrChk.checked = false;
  if (els.aiAllBtn) els.aiAllBtn.hidden = true;
  for (const ref of cardRefs) applyView(ref);
  setAiStatus(T('AI超解像 OFF（標準の高画質補正で保存します）', 'AI upscaling OFF (saved with standard enhancement)'), '');
  setTimeout(() => { if (!state.aiOn) setAiStatus('', ''); }, 4000);
}

/** カード1枚のAI超解像を実行して表示を差し替える */
async function processCardAi(ref) {
  if (!ref || ref.srBusy) return;
  if (!state.aiOn) {
    const ok = await enableAi({ demo: false });
    if (!ok) return;
  }
  ref.srBusy = true;
  const btn = ref.card.querySelector('[data-act="sr"]');
  if (btn) { btn.disabled = true; btn.textContent = T('AI処理中…', 'AI processing…'); }
  try {
    const sr = await ensureSr(ref.c, {
      onProgress: (p) => {
        if (btn) btn.textContent = T(`AI処理中… ${Math.round(p)}%`, `AI processing… ${Math.round(p)}%`);
        setAiStatus(T(`高画質化中…（AI超解像 ${Math.round(p)}%）`, `Enhancing… (AI upscaling ${Math.round(p)}%)`), 'busy');
      },
    });
    applyView(ref);
    if (sr) {
      setAiStatus(T(`AI超解像 適用済み（${sr.side}×${sr.side}px）`, `AI upscaled (${sr.side}×${sr.side}px)`), 'ok');
      const info = ref.card.querySelector('.sizeinfo');
      if (info) info.innerHTML = sizeInfoHtml(ref.c);
    } else {
      setAiStatus(T('AI超解像を使えませんでした（標準補正で保存します）', 'AI upscaling failed (saved with standard enhancement)'), 'ng');
    }
  } finally {
    ref.srBusy = false;
    if (btn) { btn.disabled = false; btn.textContent = T('✨ AI超解像（やり直す）', '✨ AI upscale (retry)'); }
  }
}

/** 表示中の全候補をAI超解像（ボタンで任意実行） */
async function processAllAi() {
  for (let i = 0; i < cardRefs.length; i++) {
    if (!state.aiOn) break;
    const ref = cardRefs[i];
    if (ref.c.sr && ref.c.sr.key === els.cropSel.value) continue;
    setAiStatus(T(`AI超解像をまとめて適用中… ${i + 1} / ${cardRefs.length}`, `Upscaling all… ${i + 1} / ${cardRefs.length}`), 'busy');
    await processCardAi(ref);
    await sleep(0);
  }
  if (state.aiOn) setAiStatus(T('AI超解像 適用済み（2倍）', 'AI upscaled (2×)'), 'ok');
}


/* ---------- 拡大プレビュー（補正前後の比較） ---------- */
const lb = { ref: null, mode: 'enh', cache: new Map() };

async function lbRender(c, mode) {
  const key = `${mode}:${els.cropSel.value + '/' + els.levelSel.value + '/' + (state.aiOn ? 'ai' : 'std')}`;
  if (lb.cache.has(c) && lb.cache.get(c).has(key)) return lb.cache.get(c).get(key);
  let url;
  if (mode !== 'orig' && state.aiOn) {
    // AI超解像 ON の「補正後」は、AIで2倍にした画像をそのまま見せる
    els.lbInfo.textContent = T('高画質化中…（AI超解像）', 'Enhancing… (AI upscaling)');
    const sr = await ensureSr(c);
    if (sr) {
      url = canvasToJpegUrl(sr.canvas, 1000);
    } else {
      url = await lbClassic(c, mode === 'orig');
    }
  } else {
    url = await lbClassic(c, mode === 'orig');
  }
  if (!lb.cache.has(c)) lb.cache.set(c, new Map());
  lb.cache.get(c).set(key, url);
  return url;
}

/** 従来の補正（AIなし）でのプレビュー画像 */
async function lbClassic(c, plainOnly) {
  const img = await blobToImage(c.frameBlob);
  const r = cropRect(c.box, img.naturalWidth, img.naturalHeight, els.cropSel.value);
  const baseSide = Math.min(r.size, 1000);
  const base = newCanvas(baseSide, baseSide);
  base.getContext('2d').drawImage(img, r.sx, r.sy, r.size, r.size, 0, 0, baseSide, baseSide);
  const target = Math.min(900, Math.round(baseSide * 1.6));
  if (plainOnly || els.levelSel.value === 'none') {
    const plain = newCanvas(target, target);
    const pc = plain.getContext('2d');
    pc.imageSmoothingEnabled = true;
    pc.imageSmoothingQuality = 'high';
    pc.drawImage(base, 0, 0, target, target);
    return plain.toDataURL('image/jpeg', 0.94);
  }
  return enhanceCanvas(base, { fixedSide: target, level: els.levelSel.value }).toDataURL('image/jpeg', 0.95);
}

async function openLightbox(ref) {
  lb.ref = ref;
  lb.mode = els.levelSel.value === 'none' && !state.aiOn ? 'orig' : 'enh';
  lb.cache.delete(ref.c);
  els.lightbox.hidden = false;
  await lbShow();
}

async function lbShow() {
  const ref = lb.ref;
  if (!ref) return;
  const c = ref.c;
  els.lbImg.src = await lbRender(c, lb.mode);
  els.lbOrig.setAttribute('aria-pressed', String(lb.mode === 'orig'));
  els.lbEnh.setAttribute('aria-pressed', String(lb.mode === 'enh'));
  const sr = (state.aiOn && c.sr && c.sr.key === els.cropSel.value) ? c.sr : null;
  els.lbEnh.textContent = state.aiOn ? T('補正後（AI）', 'Enhanced (AI)') : T('補正後', 'Enhanced');
  const out = outSideFor(c);
  els.lbInfo.textContent = T(`${fmtTime(c.t)} ・ 元の顔 ${Math.round(c.facePxW)}×${Math.round(c.facePxH)}px`,
    `${fmtTime(c.t)} · source face ${Math.round(c.facePxW)}×${Math.round(c.facePxH)}px`)
    + (sr ? T(` ・ AI超解像 ${sr.side}×${sr.side}px`, ` · AI upscaled ${sr.side}×${sr.side}px`) : '')
    + T(` ・ 出力 ${out}×${out}px`, ` · output ${out}×${out}px`);
}

function closeLightbox() { els.lightbox.hidden = true; lb.ref = null; }

async function lbSaveImage() {
  const ref = lb.ref;
  if (!ref) return;
  const i = cardRefs.indexOf(ref);
  await saveOne(i, 'jpg');
  toast(IS_IOS
    ? T('保存しました（「ファイル」または長押しで「写真に保存」）', 'Saved (see Files, or long-press to “Save to Photos”)')
    : T('保存しました', 'Saved'));
}

/** 共有シートで保存（iPhoneは「画像を保存」で写真アプリに入る） */
async function lbShareImage() {
  const ref = lb.ref;
  if (!ref) return;
  const i = cardRefs.indexOf(ref);
  const c = state.candidates[i];
  if (!c) return;
  els.lbShare.disabled = true;
  try {
    const out = await buildCropCanvas(c);
    const blob = await canvasToBlob(out, 'image/jpeg', 0.95);
    const usedAi = state.aiOn && c.sr && c.sr.key === els.cropSel.value;
    const name = exportName(c, i, 'jpg', usedAi ? 'ai-sr' : 'hq');
    const file = new File([blob], name, { type: 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: T('ベストショット', 'Best shot') });
    } else {
      downloadBlob(blob, name);
      toast(T('共有シートが使えないためダウンロードしました。画像を長押し→「写真に保存」で保存できます',
        'The share sheet is unavailable, so the image was downloaded. Long-press it to “Save to Photos”.'), 5000);
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
    console.error(e);
    toast(T('共有シートを開けませんでした。画像を長押し→「写真に保存」で保存できます',
      'Could not open the share sheet. Long-press the image to “Save to Photos”.'), 5000);
  } finally {
    els.lbShare.disabled = false;
  }
}

/* ---------- イベント ---------- */
function bind() {
  els.pickBtn.addEventListener('click', (e) => { e.stopPropagation(); els.fileInput.click(); });
  els.dropzone.addEventListener('click', () => els.fileInput.click());
  els.fileInput.addEventListener('change', () => loadFile(els.fileInput.files[0]));
  els.changeBtn.addEventListener('click', () => els.fileInput.click());

  ['dragenter', 'dragover'].forEach((ev) => els.dropzone.addEventListener(ev, (e) => {
    e.preventDefault(); e.stopPropagation(); els.dropzone.classList.add('over');
  }));
  ['dragleave', 'drop'].forEach((ev) => els.dropzone.addEventListener(ev, (e) => {
    e.preventDefault(); e.stopPropagation(); els.dropzone.classList.remove('over');
  }));
  els.dropzone.addEventListener('drop', (e) => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) loadFile(f);
  });
  ['dragover', 'drop'].forEach((ev) => document.addEventListener(ev, (e) => {
    if (ev === 'drop' && e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
      e.preventDefault();
      if (!els.dropzone.contains(e.target)) loadFile(e.dataTransfer.files[0]);
    } else if (ev === 'dragover') { e.preventDefault(); }
  }));

  els.startBtn.addEventListener('click', async () => {
    if (state.running) return;
    if (!state.url) return;
    els.startBtn.disabled = true;
    const allowed = await requestStart(state.duration);
    if (!allowed) { els.startBtn.disabled = false; return; }
    await analyze();
  });
  els.cancelBtn.addEventListener('click', () => { state.cancelRequested = true; els.progressText.textContent = T('キャンセルしています…', 'Cancelling…'); });
  els.cropSel.addEventListener('change', recropAll);
  els.levelSel.addEventListener('change', recropAll);
  els.saveAllBtn.addEventListener('click', saveAll);
  els.saveFolderBtn.addEventListener('click', saveFolder);
  els.aiSrChk.addEventListener('change', async () => {
    if (!isPro()) {
      els.aiSrChk.checked = false;
      showLimit(T('AI超解像はProプランの機能です', 'AI upscaling is a Pro feature'),
        T(`無料プランでは「標準 / 強」の高画質補正が使えます。AI超解像は ${upgradeLink()}。`,
          `The free plan includes Standard / Strong enhancement. For AI upscaling, ${upgradeLink()}.`));
      return;
    }
    if (els.aiSrChk.checked) await enableAi({ demo: true });
    else disableAi();
  });
  if (els.aiAllBtn) {
    els.aiAllBtn.hidden = !isPro();
    els.aiAllBtn.addEventListener('click', async () => {
      if (!isPro()) { showLimit(T('AI超解像はProプランの機能です', 'AI upscaling is a Pro feature'), `${upgradeLink()}`); return; }
      if (!state.aiOn) { const ok = await enableAi({ demo: false }); if (!ok) return; }
      els.aiAllBtn.disabled = true;
      try { await processAllAi(); } finally { els.aiAllBtn.disabled = false; }
    });
  }

  els.grid.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) {
      const tw = e.target.closest('.thumbwrap');
      if (tw) {
        const idx = [...els.grid.querySelectorAll('.cand')].indexOf(tw.closest('.cand'));
        if (idx >= 0) openLightbox(cardRefs[idx]);
      }
      return;
    }
    const i = parseInt(b.dataset.i, 10);
    const ref = cardRefs[i];
    const act = b.dataset.act;
    if (act === 'jpg') saveOne(i, 'jpg');
    else if (act === 'png') saveOne(i, 'png');
    else if (act === 'frame') saveFrame(i);
    else if (act === 'sr') processCardAi(ref);
    else if (act === 'toggle') {
      ref.c.view = ref.c.view === 'orig' ? 'enh' : 'orig';
      applyView(ref);
    }
  });

}

els.lbClose.addEventListener('click', closeLightbox);
els.lightbox.addEventListener('click', (e) => { if (e.target === els.lightbox) closeLightbox(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !els.lightbox.hidden) closeLightbox(); });
els.lbOrig.addEventListener('click', () => { lb.mode = 'orig'; lbShow(); });
els.lbEnh.addEventListener('click', () => { lb.mode = 'enh'; lbShow(); });
els.lbSave.addEventListener('click', lbSaveImage);
els.lbShare.addEventListener('click', lbShareImage);

/* ---------- 端末ごとのUI調整 ---------- */
function applyPlatformUi() {
  // フォルダ一括保存は未対応ブラウザ（iOS Safari など）では出さない
  els.saveFolderBtn.hidden = typeof window.showDirectoryPicker !== 'function';
  if (IS_IOS) {
    els.saveHint.hidden = false;
    els.mobileTip.hidden = false;
    els.saveAllBtn.textContent = T('💾 すべて保存（iPhone）', '💾 Save all (iPhone)');
  }
  if (navigator.share && navigator.canShare) els.lbShare.hidden = false;
  // AI超解像の可/不可（無料プランではロック）
  if (!aiSupported()) {
    els.aiSrChk.disabled = true;
    els.aiSrLabel.textContent = T('この端末では使えません', 'Not available on this device');
    els.aiSrLabel.title = T('WebGL が使えないためAI超解像を実行できません。標準の高画質補正は使えます。',
      'AI upscaling cannot run because WebGL is unavailable. Standard enhancement still works.');
  } else if (!isPro()) {
    els.aiSrChk.disabled = true;
    els.aiSrChk.checked = false;
    els.aiSrLabel.textContent = T('🔒 月額500円のProプランで利用可能', '🔒 Available on Pro — ¥500/mo');
    els.aiSrLabel.title = T('AI超解像（ESRGAN-slim）はProプランの機能です。無料プランでは標準・強の補正が使えます。',
      'AI upscaling (ESRGAN-slim) is a Pro feature. The free plan includes Standard and Strong enhancement.');
    els.aiSrLabel.classList.add('locked');
  } else if (IS_IOS) {
    els.aiSrLabel.textContent = T('端末内AI（API不要）', 'On-device AI (no API)');
  }
  if (!isPro() && els.aiAllBtn) els.aiAllBtn.hidden = true;
}

bind();
applyPlatformUi();
loadModel();
