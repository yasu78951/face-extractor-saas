#!/usr/bin/env python3
"""
英語対応（バイリンガル）の検証スクリプト。本番ビルドを起動して Playwright で確認する。

  npm run build && python3 scripts/verify-i18n.py

確認内容:
- `?lang=en` で英語ページ（トップ / ツール / ログイン / 法務3ページ）が表示され、日本語の文字が残っていない
- `<html lang>`・canonical・hreflang（alternate）が言語に合っている
- ヘッダーの言語切替（JP / EN）で即座に切り替わり、Cookie `fe_lang` が更新される
- 優先順位: `?lang=` > Cookie > Accept-Language、`ja` を含まない Accept-Language は英語
- iPhone 390px 幅で英語ページがはみ出さず、ヘッダーの言語切替が押せる
- JSエラー・404 が出ない
"""
import json
import os
import re
import subprocess
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(os.environ.get("VERIFY_I18N_PORT", "3110"))
BASE = f"http://127.0.0.1:{PORT}"
SHOTS = os.path.join(ROOT, "screenshots")
CHROME = "/workspace/.cache/chrome/chrome-linux64/chrome"
NODE_BIN = "/workspace/.local/node/bin"
CJK = re.compile(r"[\u3040-\u30ff\u4e00-\u9faf]")

os.makedirs(SHOTS, exist_ok=True)
results = {"console_errors": [], "http_errors": [], "checks": [], "shots": []}


def check(name, ok, detail=""):
    results["checks"].append({"name": name, "ok": bool(ok), "detail": detail})
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""), flush=True)


def wait_server(timeout=90):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(BASE + "/", timeout=2) as r:
                if r.status == 200:
                    return True
        except Exception:
            time.sleep(1)
    return False


def main():
    env = os.environ.copy()
    env["PATH"] = NODE_BIN + ":" + env.get("PATH", "")
    env["LD_LIBRARY_PATH"] = "/workspace/.cache/libs" + (":" + env["LD_LIBRARY_PATH"] if env.get("LD_LIBRARY_PATH") else "")
    env["NEXT_PUBLIC_SITE_URL"] = BASE
    env.setdefault("NODE_ENV", "production")

    log = open("/tmp/verify-i18n-next.log", "w")
    server = subprocess.Popen(
        [os.path.join(NODE_BIN, "node"), os.path.join(ROOT, "node_modules/next/dist/bin/next"), "start", "-p", str(PORT)],
        cwd=ROOT,
        env=env,
        stdout=log,
        stderr=subprocess.STDOUT,
    )
    try:
        if not wait_server():
            print("server did not start; log:")
            print(open("/tmp/verify-i18n-next.log").read()[-3000:])
            return 1

        with sync_playwright() as p:
            browser = p.chromium.launch(
                executable_path=CHROME,
                args=["--no-sandbox", "--disable-dev-shm-usage"],
                env=env,
            )

            def new_page(width=1280, height=900, mobile=False, locale="ja-JP", cookie_lang=None):
                ctx = browser.new_context(
                    viewport={"width": width, "height": height},
                    device_scale_factor=2 if mobile else 1,
                    is_mobile=mobile,
                    has_touch=mobile,
                    locale=locale,
                    user_agent=(
                        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 "
                        "(KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
                        if mobile
                        else None
                    ),
                )
                if cookie_lang:
                    ctx.add_cookies([{
                        "name": "fe_lang", "value": cookie_lang, "domain": "127.0.0.1", "path": "/",
                    }])
                page = ctx.new_page()

                def on_console(msg):
                    if msg.type != "error":
                        return
                    if "XNNPACK" in msg.text:
                        return
                    results["console_errors"].append({"page": page.url, "text": msg.text[:300]})

                page.on("console", on_console)
                page.on("pageerror", lambda err: results["console_errors"].append(
                    {"page": page.url, "type": "pageerror", "text": str(err)[:300]}))

                def on_response(res):
                    if res.status < 400:
                        return
                    results["http_errors"].append({"page": page.url, "status": res.status, "url": res.url})

                page.on("response", on_response)
                return ctx, page

            def cookie_lang(page):
                for c in page.context.cookies():
                    if c["name"] == "fe_lang":
                        return c["value"]
                return None

            # ---- 1. 英語ページ（?lang=en） ----
            ctx, page = new_page()
            EN_PAGES = [
                ("landing", "/?lang=en", ["From any video", "Pricing", "Free vs Pro", "Frequently asked questions"]),
                ("app", "/app?lang=en", ["Face Photo Extractor", "Load a video", "Start analysis", "Left today"]),
                ("signin", "/signin?lang=en", ["Sign in / Sign up", "You only need to sign in when you go Pro"]),
                ("terms", "/terms?lang=en", ["Terms of Service", "1. Application"]),
                ("privacy", "/privacy?lang=en", ["Privacy Policy", "never sent"]),
                ("tokushoho", "/tokushoho?lang=en", ["Legal Notice", "Yasufumi Onishi", "$4.99 per month"]),
            ]
            for slug, path, texts in EN_PAGES:
                page.goto(BASE + path, wait_until="load")
                page.wait_for_timeout(500)
                body = page.inner_text("body")
                for t in texts:
                    check(f"EN {path} に「{t}」", t in body, body[:0])
                check(f"EN {path} の lang 属性", page.evaluate("() => document.documentElement.lang") == "en",
                      page.evaluate("() => document.documentElement.lang"))
                leftovers = CJK.findall(body)
                check(f"EN {path} に日本語が残っていない", not leftovers, "".join(leftovers[:20]))
                shot = os.path.join(SHOTS, f"en-{slug}.png")
                page.screenshot(path=shot, full_page=slug in ("landing", "app"))
                results["shots"].append(shot)

            # 英語トップの価格表記（海外向けはUSD $4.99/月で統一）
            page.goto(BASE + "/?lang=en", wait_until="load")
            page.wait_for_timeout(400)
            body = page.inner_text("body")
            check("EN 価格に $4.99 表記", "$4.99" in body)
            check("EN 価格に / mo 表記", "/ mo" in body)
            check("EN に代理店価格（¥500 / $3.5）が残っていない",
                  "¥500" not in body and "$3.5" not in body)
            page.goto(BASE + "/app?lang=en", wait_until="load")
            page.wait_for_timeout(400)
            app_body = page.inner_text("body")
            check("EN /app の Pro 文言が $4.99", "$4.99" in app_body and "¥500" not in app_body)
            # hreflang / canonical
            alt = page.eval_on_selector_all(
                "link[rel='alternate']",
                "els => els.map(e => [e.getAttribute('hreflang'), e.getAttribute('href')])",
            )
            check("hreflang に ja / en がある",
                  any(a[0] == "ja" for a in alt) and any(a[0] == "en" for a in alt), json.dumps(alt, ensure_ascii=False)[:160])
            canonical = page.get_attribute("link[rel='canonical']", "href") or ""
            check("EN の canonical が ?lang=en", "lang=en" in canonical, canonical)
            ctx.close()

            # ---- 2. 言語切替ボタン ----
            ctx_ja, page_ja = new_page()
            page_ja.goto(BASE + "/", wait_until="load")
            page_ja.wait_for_timeout(400)
            check("JA トップは日本語", "動画から、" in page_ja.inner_text("body"))
            check("JA トップの lang 属性", page_ja.evaluate("() => document.documentElement.lang") == "ja")
            page_ja.click(".lang-switch a[hrefLang='en']")
            page_ja.wait_for_load_state("load")
            page_ja.wait_for_timeout(500)
            body = page_ja.inner_text("body")
            check("切替ボタンで英語になる（即時）", "From any video" in body and "lang=en" in page_ja.url,
                  page_ja.url)
            check("切替で Cookie fe_lang=en", cookie_lang(page_ja) == "en", str(cookie_lang(page_ja)))
            check("切替後の lang 属性", page_ja.evaluate("() => document.documentElement.lang") == "en")
            page_ja.screenshot(path=os.path.join(SHOTS, "en-after-switch.png"), full_page=True)
            results["shots"].append(os.path.join(SHOTS, "en-after-switch.png"))

            # Cookie だけで英語が続く（クエリ無しのURLへ移動）
            page_ja.goto(BASE + "/app", wait_until="load")
            page_ja.wait_for_timeout(500)
            check("Cookie で /app も英語", "Left today" in page_ja.inner_text("body"))
            page_ja.click(".lang-switch a[hrefLang='ja']")
            page_ja.wait_for_load_state("load")
            page_ja.wait_for_timeout(500)
            check("JP に戻せる", "本日の残り回数" in page_ja.inner_text("body"))
            check("戻すと Cookie fe_lang=ja", cookie_lang(page_ja) == "ja", str(cookie_lang(page_ja)))
            ctx_ja.close()

            # ---- 3. 優先順位 ----
            # 3-a. Accept-Language が英語なら（Cookie/クエリ無し）英語
            ctx_en, page_en = new_page(locale="en-US")
            page_en.goto(BASE + "/", wait_until="load")
            page_en.wait_for_timeout(400)
            check("Accept-Language=en で英語", "From any video" in page_en.inner_text("body"),
                  page_en.evaluate("() => document.documentElement.lang"))
            # 3-b. Cookie が日本語なら Accept-Language=en でも日本語
            ctx_c, page_c = new_page(locale="en-US", cookie_lang="ja")
            page_c.goto(BASE + "/terms", wait_until="load")
            page_c.wait_for_timeout(300)
            check("Cookie=ja は Accept-Language より優先", "利用規約" in page_c.inner_text("body"))
            # 3-c. ?lang=en は Cookie=ja より優先
            page_c.goto(BASE + "/terms?lang=en", wait_until="load")
            page_c.wait_for_timeout(300)
            check("?lang=en は Cookie より優先", "Terms of Service" in page_c.inner_text("body"))
            # 3-d. Accept-Language に ja を含めば日本語
            ctx_j, page_j = new_page(locale="ja-JP")
            page_j.goto(BASE + "/privacy", wait_until="load")
            page_j.wait_for_timeout(300)
            check("Accept-Language=ja で日本語", "プライバシーポリシー" in page_j.inner_text("body"))
            for c in (ctx_en, ctx_c, ctx_j):
                c.close()

            # ---- 4. iPhone 390px ----
            ctx_m, m = new_page(390, 844, mobile=True, locale="en-US")
            for slug, path in [("landing", "/?lang=en"), ("app", "/app?lang=en"), ("terms", "/terms?lang=en")]:
                m.goto(BASE + path, wait_until="load")
                m.wait_for_timeout(600)
                check(f"iPhone EN {path} 横スクロールなし",
                      m.evaluate("() => document.documentElement.scrollWidth <= window.innerWidth + 1"),
                      str(m.evaluate("() => [document.documentElement.scrollWidth, window.innerWidth]")))
                shot = os.path.join(SHOTS, f"iphone-en-{slug}.png")
                m.screenshot(path=shot, full_page=slug in ("landing", "app"))
                results["shots"].append(shot)
            # ヘッダーの言語切替が画面内に収まっている
            box = m.locator(".lang-switch").bounding_box()
            check("iPhone ヘッダーの言語切替が見える", bool(box) and box["x"] >= 0 and box["x"] + box["width"] <= 390,
                  json.dumps(box))
            check("iPhone ヘッダーの JP/EN が1行に収まる",
                  m.locator(".site-header-inner").bounding_box()["height"] <= 70,
                  str(m.locator(".site-header-inner").bounding_box()))
            # Before/After 比較セクションの $4.99/mo ボタンが390px幅ではみ出さない
            m.goto(BASE + "/?lang=en#upscale", wait_until="load")
            m.wait_for_timeout(500)
            cta = m.locator(".ba-cta a.btn")
            cta.scroll_into_view_if_needed()
            m.wait_for_timeout(300)
            cta_text = cta.inner_text()
            fits = m.evaluate(
                """() => {
                  const el = document.querySelector('.ba-cta a.btn');
                  const r = el.getBoundingClientRect();
                  const card = el.parentElement.getBoundingClientRect();
                  return {
                    scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
                    left: r.left, right: r.right, cardLeft: card.left, cardRight: card.right,
                  };
                }"""
            )
            check("iPhone EN 比較セクションのボタン文言が $4.99", "$4.99" in cta_text, cta_text)
            check("iPhone EN 比較セクションのボタンがはみ出さない",
                  fits["scrollWidth"] <= fits["clientWidth"] + 1
                  and fits["right"] <= 390 + 1 and fits["left"] >= -1
                  and fits["left"] >= fits["cardLeft"] - 1 and fits["right"] <= fits["cardRight"] + 1,
                  json.dumps(fits))
            m.screenshot(path=os.path.join(SHOTS, "iphone-en-upscale.png"))
            results["shots"].append(os.path.join(SHOTS, "iphone-en-upscale.png"))
            ctx_m.close()

            # ---- 5. 日本語ページの回帰（?lang=ja） ----
            ctx_ja2, page_ja2 = new_page()
            JA_PAGES = [
                ("landing", "/?lang=ja", ["動画から、", "料金プラン", "無料プランとProプランの比較"]),
                ("app", "/app?lang=ja", ["顔写真抽出ツール", "解析スタート", "本日の残り回数"]),
                ("signin", "/signin?lang=ja", ["ログイン / 新規登録"]),
                ("terms", "/terms?lang=ja", ["利用規約", "第1条（適用）"]),
                ("privacy", "/privacy?lang=ja", ["プライバシーポリシー"]),
                ("tokushoho", "/tokushoho?lang=ja", ["特定商取引法に基づく表記", "月額500円"]),
            ]
            for slug, path, texts in JA_PAGES:
                page_ja2.goto(BASE + path, wait_until="load")
                page_ja2.wait_for_timeout(350)
                body = page_ja2.inner_text("body")
                for t in texts:
                    check(f"JA {path} に「{t}」", t in body)
                check(f"JA {path} の lang 属性", page_ja2.evaluate("() => document.documentElement.lang") == "ja")
            ctx_ja2.close()

            # ---- 6. 英語ツール画面のエンジン文言（AIモデル読込完了） ----
            ctx_final, page = new_page()
            page.goto(BASE + "/app?lang=en", wait_until="load")
            page.wait_for_timeout(800)
            try:
                page.wait_for_function(
                    "() => { const el = document.getElementById('modelStatus'); return el && /ready|failed/i.test(el.textContent); }",
                    timeout=60000,
                )
                status = page.locator("#modelStatus").inner_text()
                check("EN エンジン: AIモデルの準備完了が英語", "AI model ready" in status, status)
            except Exception as e:
                check("EN エンジン: AIモデルの準備完了が英語", False, str(e)[:160])
            check("EN ツール: AI超解像ロック文言が英語・$4.99",
                  "Available on Pro" in page.locator("#aiSrLabel").inner_text()
                  and "$4.99" in page.locator("#aiSrLabel").inner_text(),
                  page.locator("#aiSrLabel").inner_text())
            check("EN ツール: ステップ見出しが英語",
                  "Analysis settings" in page.inner_text("body"))

            # ---- 7. 英語UIでの解析（結果カードのラベルまで英語） ----
            video = "/workspace/tmp/test_video.mp4"
            if not os.path.exists(video):
                video = "/workspace/tmp/en_test.webm"
                if not os.path.exists(video):
                    b64 = page.evaluate(
                        """
                        async () => {
                          const c = document.createElement('canvas');
                          c.width = 320; c.height = 240;
                          const ctx = c.getContext('2d');
                          const rec = new MediaRecorder(c.captureStream(12), { mimeType: 'video/webm;codecs=vp8' });
                          const chunks = [];
                          rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
                          rec.start(100);
                          let i = 0;
                          const timer = setInterval(() => { ctx.fillStyle = `hsl(${(i += 17) % 360}, 60%, 45%)`; ctx.fillRect(0, 0, 320, 240); }, 80);
                          await new Promise((r) => setTimeout(r, 1400));
                          clearInterval(timer);
                          await new Promise((r) => { rec.onstop = r; rec.stop(); });
                          const buf = new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer());
                          let bin = '';
                          for (let k = 0; k < buf.length; k++) bin += String.fromCharCode(buf[k]);
                          return btoa(bin);
                        }
                        """
                    )
                    import base64 as _b64
                    with open(video, "wb") as f:
                        f.write(_b64.b64decode(b64))
            page.set_input_files("#fileInput", video)
            page.wait_for_selector("#videoInfo:not([hidden])", timeout=20000)
            page.wait_for_function("() => !document.getElementById('startBtn').disabled", timeout=20000)
            page.click("#startBtn")
            try:
                page.wait_for_function(
                    "() => { const r = document.getElementById('resultCard'); return r && !r.hidden; }",
                    timeout=120000,
                )
                body = page.inner_text("body")
                check("EN 解析: 結果カードのボタンが英語", "Save JPG" in body and "Full frame" in body, body[:0])
                check("EN 解析: スコア見出しが英語", ("Facing" in body and "Sharpness" in body) or "No faces were detected" in body,
                      body[:0])
                check("EN 解析: 日本語が残っていない", not CJK.findall(body), "".join(CJK.findall(body)[:20]))
                doc_h = page.evaluate("() => document.documentElement.scrollHeight")
                page.set_viewport_size({"width": 1280, "height": min(doc_h + 40, 5000)})
                page.evaluate("() => window.scrollTo(0, 0)")
                page.wait_for_timeout(700)
                page.screenshot(path=os.path.join(SHOTS, "en-app-results.png"))
                results["shots"].append(os.path.join(SHOTS, "en-app-results.png"))
            except Exception as e:
                check("EN 解析: 結果カードのボタンが英語", False, str(e)[:160])
            ctx_final.close()

            browser.close()

    finally:
        server.terminate()
        try:
            server.wait(timeout=10)
        except Exception:
            server.kill()

    print("\n===== RESULT =====")
    fails = [c for c in results["checks"] if not c["ok"]]
    print(f"checks: {len(results['checks'])} / failed: {len(fails)}")
    for f in fails:
        print("  FAILED:", f["name"], f["detail"][:120] if f.get("detail") else "")
    print(f"console errors: {len(results['console_errors'])}")
    for e in results["console_errors"][:20]:
        print("  -", e.get("type", "console"), e["text"][:250])
    print(f"http errors: {len(results['http_errors'])}")
    for e in results["http_errors"][:20]:
        print("  -", e["status"], e["url"])
    with open(os.path.join(ROOT, "verify-i18n-report.json"), "w") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    ok = not fails and not results["console_errors"] and not results["http_errors"]
    print("VERIFY-I18N:", "PASS" if ok else "FAIL")
    return 0 if ok else 2


if __name__ == "__main__":
    sys.exit(main())
