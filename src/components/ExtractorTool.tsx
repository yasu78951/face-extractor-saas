'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    __FE_GATE?: {
      isPro: boolean;
      remaining: number | null;
      plan?: string;
      upgradeUrl: string;
    };
    __FE_SCRIPT_ADDED?: boolean;
    __FE_BOOTED?: boolean;
  }
}

type Props = {
  isPro: boolean;
  upgradeHref: string;
};

/**
 * 既存の顔抽出エンジン（public/engine/app.js）をそのまま動かすための画面。
 * マークアップのID・クラスはエンジンが参照するため変更しない。
 * エンジンはマウント後に <script type="module"> で読み込む。
 */
export default function ExtractorTool({ isPro, upgradeHref }: Props) {
  const started = useRef(false);

  useEffect(() => {
    if (started.current || window.__FE_SCRIPT_ADDED) return;
    started.current = true;
    window.__FE_GATE = { isPro, remaining: null, plan: isPro ? 'pro' : 'free', upgradeUrl: upgradeHref };

    const script = document.createElement('script');
    script.type = 'module';
    script.src = '/engine/app.js';
    script.async = true;
    document.body.appendChild(script);
    window.__FE_SCRIPT_ADDED = true;
  }, [isPro, upgradeHref]);

  return (
    <>
      <main>
        {/* STEP 1 */}
        <section className="card" id="step1">
          <h2>
            <span className="stepnum">1</span> 動画を読み込む
          </h2>
          <div className="model-row">
            <span className="pill pill-safe" title="動画はお使いの端末の外へ送信されません">
              🔒 すべて端末内で処理・外部送信なし
            </span>
            <span id="modelStatus" className="pill pill-wait">
              AIモデル 準備中…
            </span>
          </div>
          <div id="dropzone" className="dropzone">
            <div className="dz-icon">📥</div>
            <div className="dz-main">ここに動画ファイルをドラッグ＆ドロップ</div>
            <div className="dz-sub">または</div>
            <button id="pickBtn" className="btn btn-main" type="button">
              動画ファイルを選ぶ
            </button>
            <div className="dz-note">
              MP4 / MOV / WebM / M4V 対応（推奨: H.264 の MP4）
              <br />
              iPhoneは「写真ライブラリ」または「ファイル」から選べます
            </div>
            <input id="fileInput" type="file" accept="video/*,.mp4,.mov,.m4v,.webm,.mkv" hidden />
          </div>

          <div id="videoInfo" className="videoinfo" hidden>
            <video id="preview" playsInline muted preload="auto" />
            <div className="meta">
              <div className="metaline">
                <span className="k">ファイル</span>
                <span id="mName" className="v" />
              </div>
              <div className="metaline">
                <span className="k">長さ</span>
                <span id="mDur" className="v" />
              </div>
              <div className="metaline">
                <span className="k">解像度</span>
                <span id="mRes" className="v" />
              </div>
              <div className="metaline">
                <span className="k">サイズ</span>
                <span id="mSize" className="v" />
              </div>
              <button id="changeBtn" className="btn btn-ghost small" type="button">
                別の動画を選ぶ
              </button>
            </div>
          </div>
          <div id="loadError" className="error" hidden />
        </section>

        {/* STEP 2 */}
        <section className="card" id="step2">
          <h2>
            <span className="stepnum">2</span> 解析の設定
          </h2>
          <div className="settings">
            <label className="setting">
              <span className="label">解析する間隔</span>
              <select id="stepSel" defaultValue="1">
                <option value="0.25">0.25秒ごと（細かい・時間がかかる）</option>
                <option value="0.5">0.5秒ごと</option>
                <option value="1">1秒ごと（おすすめ）</option>
                <option value="2">2秒ごと（速い）</option>
                <option value="3">3秒ごと（とても速い）</option>
              </select>
            </label>
            <label className="setting">
              <span className="label">候補の最大枚数</span>
              <select id="maxSel" defaultValue="16">
                <option value="8">8枚</option>
                <option value="12">12枚</option>
                <option value="16">16枚</option>
                <option value="20">20枚</option>
                <option value="30">30枚</option>
              </select>
            </label>
            <label className="setting">
              <span className="label">対象の顔</span>
              <select id="whoSel" defaultValue="main">
                <option value="main">主役の顔（一番大きく写っている人）</option>
                <option value="all">全員の顔</option>
              </select>
            </label>
            <label className="setting check">
              <span className="label">遠目の顔も探す</span>
              <span className="checkrow">
                <input id="farChk" type="checkbox" defaultChecked /> 高精度（2×2タイル走査）
              </span>
            </label>
            <div className="setting setting-btn">
              <button id="startBtn" className="btn btn-main big" type="button" disabled>
                解析スタート
              </button>
            </div>
          </div>
          <div className="hint">
            「正面を向いていて・ピントが合っていて・顔が大きい」フレームを自動で点数付けして選びます。
            <br />
            ※ 画面の奥に小さく写っている顔も探したいときは「遠目の顔も探す」をONのままにしてください。
          </div>
        </section>

        {/* PROGRESS */}
        <section className="card" id="progressCard" hidden>
          <h2>
            <span className="stepnum">3</span> 解析中
          </h2>
          <div className="barwrap">
            <div id="bar" className="bar" />
          </div>
          <div className="progressrow">
            <span id="progressText">準備中…</span>
            <button id="cancelBtn" className="btn btn-ghost small" type="button">
              キャンセル
            </button>
          </div>
          <div className="hint small" id="mobileTip" hidden>
            ※ iPhoneでは画面を閉じたりロックしたりすると解析が止まります。画面を開いたままお待ちください。
          </div>
        </section>

        {/* RESULTS */}
        <section className="card" id="resultCard" hidden>
          <h2>
            <span className="stepnum">4</span> ベストショット候補
          </h2>
          <div id="summary" className="summary" />
          <div className="toolbar">
            <label className="setting inline">
              <span className="label">切り取り</span>
              <select id="cropSel" defaultValue="chest">
                <option value="face">顔アップ（タイト）</option>
                <option value="chest">胸上（おすすめ）</option>
                <option value="wide">ゆったり（上半身）</option>
              </select>
            </label>
            <label className="setting inline">
              <span className="label">高画質補正</span>
              <select id="levelSel" defaultValue="std">
                <option value="std">標準（おすすめ）</option>
                <option value="strong">強（くっきり）</option>
                <option value="none">なし（元の画質）</option>
              </select>
            </label>
            <label className={`setting inline ai-switch`}>
              <span className="label">AI超解像</span>
              {isPro ? (
                <span className="aisw">
                  <input id="aiSrChk" type="checkbox" defaultChecked={false} />
                  <span id="aiSrLabel" className="aisw-text">
                    端末内AI（API不要）
                  </span>
                </span>
              ) : (
                <span className="aisw locked" title="AI超解像（ESRGAN-slim）はProプランの機能です">
                  <input id="aiSrChk" type="checkbox" disabled defaultChecked={false} />
                  <span id="aiSrLabel" className="aisw-text">
                    🔒 月額500円のProプランで利用可能
                  </span>
                </span>
              )}
            </label>
            <label className="setting inline">
              <span className="label">出力サイズ</span>
              <select id="sizeSel" defaultValue="auto">
                <option value="auto">自動アップ（小さい顔も768px以上）</option>
                <option value="512">512 × 512 px</option>
                <option value="768">768 × 768 px</option>
                <option value="1024">1024 × 1024 px</option>
                <option value="natural">元のサイズのまま</option>
              </select>
            </label>
            <div className="toolbar-right">
              {isPro ? (
                <button id="aiAllBtn" className="btn btn-sr" type="button" hidden>
                  ✨ すべてAI超解像
                </button>
              ) : (
                <a className="btn btn-sr lock-btn" href={upgradeHref}>
                  🔒 すべてAI超解像（Pro）
                </a>
              )}
              <button id="saveAllBtn" className="btn btn-main" type="button">
                💾 すべてJPGで保存
              </button>
              <button id="saveFolderBtn" className="btn btn-second" type="button" hidden>
                📁 フォルダに一括保存
              </button>
            </div>
          </div>
          {!isPro ? (
            <a className="ai-lock" href={upgradeHref}>
              🔒 AI超解像（ESRGAN-slim）は月額500円のProプランで利用可能 → アップグレード
            </a>
          ) : null}
          <div id="aiSrStatus" className="aistatus" hidden />
          <div id="saveHint" className="savehint" hidden>
            <b>iPhoneでの保存:</b> 保存ボタンを押すと「ダウンロードしますか？」の確認が出ます → 許可すると「ファイル」アプリに保存されます。
            写真アプリに入れたいときは、画像をタップして拡大 → 右上の「共有」→「画像を保存」が確実です。
          </div>
          <div id="grid" className="grid" />
          <div id="noFace" className="error" hidden />
          <div className="footnote">
            ※ 保存時は元動画から切り出し、必要な場合はアップスケール＋鮮明化して書き出します（表示より綺麗な画像になります）。
            <br />
            ※ 遠目の小さな顔でも、768px以上の大きさに拡大して保存できます。
            <br />
            ※ 「AI超解像」は端末内AI（ESRGAN-slim）で顔を2倍に高画質化するProプランの機能です（初回だけ約2.5MBのモデルを読み込みます）。
          </div>
        </section>
      </main>

      <div className="engine-footer">
        動画はブラウザ内のメモリだけで処理され、どこにもアップロードされません。
        <br />
        ベストショット抽出ツール v1.3（SaaS版・AI超解像対応）
      </div>

      <div id="lightbox" className="lightbox" hidden>
        <div className="lb-inner">
          <button id="lbClose" className="lb-close" type="button" aria-label="閉じる">
            ✕
          </button>
          <div className="lb-stage">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img id="lbImg" alt="プレビュー" />
          </div>
          <div className="lb-bar">
            <button id="lbOrig" className="btn btn-ghost small" type="button">
              元画像
            </button>
            <button id="lbEnh" className="btn btn-second small" type="button">
              補正後
            </button>
            <span id="lbInfo" className="lb-info" />
            <button id="lbSave" className="btn btn-main small" type="button">
              この画像を保存
            </button>
            <button id="lbShare" className="btn btn-second small" type="button" hidden>
              共有／写真に保存
            </button>
          </div>
        </div>
      </div>
      <div id="toast" className="toast" hidden />
    </>
  );
}
