'use client';

import { useEffect, useRef } from 'react';
import type { Lang } from '@/lib/i18n';
import { messages } from '@/lib/messages';

declare global {
  interface Window {
    __FE_GATE?: {
      isPro: boolean;
      remaining: number | null;
      plan?: string;
      upgradeUrl: string;
      /** 未ログイン（Cookieで回数を数えている）か */
      anonymous?: boolean;
    };
    /** エンジン（public/engine/app.js）が表示文言を切り替えるための言語 */
    __FE_LANG?: Lang;
    __FE_SCRIPT_ADDED?: boolean;
    __FE_BOOTED?: boolean;
  }
}

type Props = {
  isPro: boolean;
  upgradeHref: string;
  /** サーバーが返した本日の残り回数（初期表示用） */
  remaining?: number | null;
  /** 未ログイン利用者か */
  anonymous?: boolean;
  /** 表示言語（日本語 / 英語） */
  lang?: Lang;
};

/**
 * 既存の顔抽出エンジン（public/engine/app.js）をそのまま動かすための画面。
 * マークアップのID・クラスはエンジンが参照するため変更しない。
 * エンジンはマウント後に <script type="module"> で読み込む。
 */
export default function ExtractorTool({
  isPro,
  upgradeHref,
  remaining = null,
  anonymous = false,
  lang = 'ja',
}: Props) {
  const started = useRef(false);
  const t = messages[lang].tool;

  useEffect(() => {
    if (started.current || window.__FE_SCRIPT_ADDED) return;
    started.current = true;
    window.__FE_GATE = {
      isPro,
      remaining: isPro ? null : remaining,
      plan: isPro ? 'pro' : 'free',
      upgradeUrl: upgradeHref,
      anonymous,
    };
    window.__FE_LANG = lang;

    const script = document.createElement('script');
    script.type = 'module';
    script.src = '/engine/app.js';
    script.async = true;
    document.body.appendChild(script);
    window.__FE_SCRIPT_ADDED = true;
  }, [isPro, upgradeHref, remaining, anonymous, lang]);

  return (
    <>
      <main>
        {/* STEP 1 */}
        <section className="card" id="step1">
          <h2>
            <span className="stepnum">1</span> {t.step1}
          </h2>
          <div className="model-row">
            <span className="pill pill-safe" title={t.pillSafeTitle}>
              {t.pillSafe}
            </span>
            <span id="modelStatus" className="pill pill-wait">
              {t.modelLoading}
            </span>
          </div>
          <div id="dropzone" className="dropzone">
            <div className="dz-icon">📥</div>
            <div className="dz-main">{t.dzMain}</div>
            <div className="dz-sub">{t.dzSub}</div>
            <button id="pickBtn" className="btn btn-main" type="button">
              {t.pick}
            </button>
            <div className="dz-note">
              {t.dzNote1}
              <br />
              {t.dzNote2}
            </div>
            <input id="fileInput" type="file" accept="video/*,.mp4,.mov,.m4v,.webm,.mkv" hidden />
          </div>

          <div id="videoInfo" className="videoinfo" hidden>
            <video id="preview" playsInline muted preload="auto" />
            <div className="meta">
              <div className="metaline">
                <span className="k">{t.metaFile}</span>
                <span id="mName" className="v" />
              </div>
              <div className="metaline">
                <span className="k">{t.metaDur}</span>
                <span id="mDur" className="v" />
              </div>
              <div className="metaline">
                <span className="k">{t.metaRes}</span>
                <span id="mRes" className="v" />
              </div>
              <div className="metaline">
                <span className="k">{t.metaSize}</span>
                <span id="mSize" className="v" />
              </div>
              <button id="changeBtn" className="btn btn-ghost small" type="button">
                {t.change}
              </button>
            </div>
          </div>
          <div id="loadError" className="error" hidden />
        </section>

        {/* STEP 2 */}
        <section className="card" id="step2">
          <h2>
            <span className="stepnum">2</span> {t.step2}
          </h2>
          <div className="settings">
            <label className="setting">
              <span className="label">{t.interval}</span>
              <select id="stepSel" defaultValue="1">
                {t.intervalOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="setting">
              <span className="label">{t.max}</span>
              <select id="maxSel" defaultValue="16">
                <option value="8">8{t.maxUnit}</option>
                <option value="12">12{t.maxUnit}</option>
                <option value="16">16{t.maxUnit}</option>
                <option value="20">20{t.maxUnit}</option>
                <option value="30">30{t.maxUnit}</option>
              </select>
            </label>
            <label className="setting">
              <span className="label">{t.who}</span>
              <select id="whoSel" defaultValue="main">
                <option value="main">{t.whoMain}</option>
                <option value="all">{t.whoAll}</option>
              </select>
            </label>
            <label className="setting check">
              <span className="label">{t.far}</span>
              <span className="checkrow">
                <input id="farChk" type="checkbox" defaultChecked /> {t.farCheck}
              </span>
            </label>
            <div className="setting setting-btn">
              <button id="startBtn" className="btn btn-main big" type="button" disabled>
                {t.start}
              </button>
            </div>
          </div>
          <div className="hint">
            {t.hint}
            <br />
            {t.hintNote}
          </div>
        </section>

        {/* PROGRESS */}
        <section className="card" id="progressCard" hidden>
          <h2>
            <span className="stepnum">3</span> {t.progress}
          </h2>
          <div className="barwrap">
            <div id="bar" className="bar" />
          </div>
          <div className="progressrow">
            <span id="progressText">…</span>
            <button id="cancelBtn" className="btn btn-ghost small" type="button">
              {t.cancel}
            </button>
          </div>
          <div className="hint small" id="mobileTip" hidden>
            {t.mobileTip}
          </div>
        </section>

        {/* RESULTS */}
        <section className="card" id="resultCard" hidden>
          <h2>
            <span className="stepnum">4</span> {t.results}
          </h2>
          <div id="summary" className="summary" />
          <div className="toolbar">
            <label className="setting inline">
              <span className="label">{t.crop}</span>
              <select id="cropSel" defaultValue="chest">
                <option value="face">{t.cropFace}</option>
                <option value="chest">{t.cropChest}</option>
                <option value="wide">{t.cropWide}</option>
              </select>
            </label>
            <label className="setting inline">
              <span className="label">{t.level}</span>
              <select id="levelSel" defaultValue="std">
                <option value="std">{t.levelStd}</option>
                <option value="strong">{t.levelStrong}</option>
                <option value="none">{t.levelNone}</option>
              </select>
            </label>
            <label className={`setting inline ai-switch`}>
              <span className="label">{t.aiSr}</span>
              {isPro ? (
                <span className="aisw">
                  <input id="aiSrChk" type="checkbox" defaultChecked={false} />
                  <span id="aiSrLabel" className="aisw-text">
                    {t.aiOn}
                  </span>
                </span>
              ) : (
                <span className="aisw locked" title={t.aiLockedTitle}>
                  <input id="aiSrChk" type="checkbox" disabled defaultChecked={false} />
                  <span id="aiSrLabel" className="aisw-text">
                    {t.aiLocked}
                  </span>
                </span>
              )}
            </label>
            <label className="setting inline">
              <span className="label">{t.size}</span>
              <select id="sizeSel" defaultValue="auto">
                {t.sizeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="toolbar-right">
              {isPro ? (
                <button id="aiAllBtn" className="btn btn-sr" type="button" hidden>
                  {t.aiAll}
                </button>
              ) : (
                <a className="btn btn-sr lock-btn" href={upgradeHref}>
                  {t.aiAllLocked}
                </a>
              )}
              <button id="saveAllBtn" className="btn btn-main" type="button">
                {t.saveAll}
              </button>
              <button id="saveFolderBtn" className="btn btn-second" type="button" hidden>
                {t.saveFolder}
              </button>
            </div>
          </div>
          {!isPro ? (
            <a className="ai-lock" href={upgradeHref}>
              {t.aiLockBanner}
            </a>
          ) : null}
          <div id="aiSrStatus" className="aistatus" hidden />
          <div id="saveHint" className="savehint" hidden>
            <b>{t.saveHintBold}</b> {t.saveHint}
          </div>
          <div id="grid" className="grid" />
          <div id="noFace" className="error" hidden />
          <div className="footnote">
            {t.footnote1}
            <br />
            {t.footnote2}
            <br />
            {t.footnote3}
          </div>
        </section>
      </main>

      <div className="engine-footer">
        {t.engineFooter1}
        <br />
        {t.engineFooter2}
      </div>

      <div id="lightbox" className="lightbox" hidden>
        <div className="lb-inner">
          <button id="lbClose" className="lb-close" type="button" aria-label={t.lbClose}>
            ✕
          </button>
          <div className="lb-stage">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img id="lbImg" alt={t.lbPreview} />
          </div>
          <div className="lb-bar">
            <button id="lbOrig" className="btn btn-ghost small" type="button">
              {t.lbOrig}
            </button>
            <button id="lbEnh" className="btn btn-second small" type="button">
              {t.lbEnh}
            </button>
            <span id="lbInfo" className="lb-info" />
            <button id="lbSave" className="btn btn-main small" type="button">
              {t.lbSave}
            </button>
            <button id="lbShare" className="btn btn-second small" type="button" hidden>
              {t.lbShare}
            </button>
          </div>
        </div>
      </div>
      <div id="toast" className="toast" hidden />
    </>
  );
}
