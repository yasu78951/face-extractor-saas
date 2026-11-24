#!/usr/bin/env python3
"""
ローカル検証スクリプト（本番ビルドを起動してPlaywrightで確認する）

  npm run build && python3 scripts/verify.py

確認内容:
- PC幅(1280px) / iPhone幅(390px) のスクリーンショット
- JSエラー（console.error / pageerror）が0
- HTTP 404 などの4xx/5xx（ページ本体を除く）が0
- 主要テキストの存在
- デモモードで動画を読み込み→解析スタート→利用回数が減る（エンドツーエンド）
- API: 300秒超 → 403 / 4本目 → 429
"""
import base64
import json
import os
import subprocess
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(os.environ.get("VERIFY_PORT", "3100"))
BASE = f"http://127.0.0.1:{PORT}"
SHOTS = os.path.join(ROOT, "screenshots")
CHROME = "/workspace/.cache/chrome/chrome-linux64/chrome"
NODE_BIN = "/workspace/.local/node/bin"

os.makedirs(SHOTS, exist_ok=True)
results = {"console_errors": [], "http_errors": [], "checks": [], "shots": []}
# 意図的に4xxを返すAPIテスト中は、その通信を記録から除外するフラグ
STATE = {"ignore_expected": False}
# MediaPipe/TFがINFOをconsole.errorで出す（エンジン由来の既知ログ）
KNOWN_NOISE = ("XNNPACK",)


def check(name, ok, detail=""):
    results["checks"].append({"name": name, "ok": bool(ok), "detail": detail})
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""))


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


def make_video_b64(page):
    """canvas + MediaRecorder で短いWebMを作る（顔なしの動画）"""
    return page.evaluate(
        """
        async () => {
          const c = document.createElement('canvas');
          c.width = 320; c.height = 240;
          const ctx = c.getContext('2d');
          const stream = c.captureStream(12);
          const rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
          const chunks = [];
          rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
          rec.start(100);
          let i = 0;
          const timer = setInterval(() => {
            ctx.fillStyle = `hsl(${(i += 17) % 360}, 60%, 45%)`;
            ctx.fillRect(0, 0, 320, 240);
            ctx.fillStyle = '#fff';
            ctx.font = '20px sans-serif';
            ctx.fillText('test ' + i, 20, 60);
          }, 80);
          await new Promise((r) => setTimeout(r, 1400));
          clearInterval(timer);
          await new Promise((r) => { rec.onstop = r; rec.stop(); });
          const blob = new Blob(chunks, { type: 'video/webm' });
          const buf = new Uint8Array(await blob.arrayBuffer());
          let bin = '';
          for (let k = 0; k < buf.length; k++) bin += String.fromCharCode(buf[k]);
          return btoa(bin);
        }
        """
    )


def main():
    env = os.environ.copy()
    env["PATH"] = NODE_BIN + ":" + env.get("PATH", "")
    env["LD_LIBRARY_PATH"] = "/workspace/.cache/libs" + (":" + env["LD_LIBRARY_PATH"] if env.get("LD_LIBRARY_PATH") else "")
    env["NEXT_PUBLIC_SITE_URL"] = BASE
    env.setdefault("NODE_ENV", "production")

    log = open("/tmp/verify-next.log", "w")
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
            print(open("/tmp/verify-next.log").read()[-3000:])
            return 1

        with sync_playwright() as p:
            browser = p.chromium.launch(
                executable_path=CHROME,
                args=["--no-sandbox", "--disable-dev-shm-usage"],
                env=env,
            )

            def new_page(width, height, mobile=False):
                ctx = browser.new_context(
                    viewport={"width": width, "height": height},
                    # 日本語利用者のブラウザを再現する（表示言語は Accept-Language でも決まる）
                    locale="ja-JP",
                    device_scale_factor=2 if mobile else 1,
                    is_mobile=mobile,
                    has_touch=mobile,
                    user_agent=(
                        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 "
                        "(KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
                        if mobile
                        else None
                    ),
                )
                page = ctx.new_page()
                def on_console(msg):
                    if msg.type != "error":
                        return
                    if any(n in msg.text for n in KNOWN_NOISE):
                        return
                    if STATE["ignore_expected"] and "Failed to load resource" in msg.text:
                        return
                    results["console_errors"].append({"page": page.url, "type": msg.type, "text": msg.text})

                page.on("console", on_console)
                page.on("pageerror", lambda err: results["console_errors"].append(
                    {"page": page.url, "type": "pageerror", "text": str(err)}))
                def on_response(res):
                    if res.status < 400:
                        return
                    if STATE["ignore_expected"] and "/api/usage/check-and-increment" in res.url:
                        return
                    # favicon は /icon.svg へのrewriteで200になる（404は記録）
                    results["http_errors"].append({"page": page.url, "status": res.status, "url": res.url})

                page.on("response", on_response)
                return page

            PAGES = [
                ("landing", "/", ["動画から", "料金プラン", "無料プランとProプランの比較", "AI超解像"]),
                ("signin", "/signin", ["ログイン / 新規登録", "デモモード"]),
                ("terms", "/terms", ["利用規約", "第1条（適用）"]),
                ("privacy", "/privacy", ["プライバシーポリシー", "動画ファイルの解析"]),
                ("tokushoho", "/tokushoho", ["特定商取引法に基づく表記", "月額500円"]),
            ]

            # ---- PC ----
            page = new_page(1280, 900)
            for slug, path, texts in PAGES:
                page.goto(BASE + path, wait_until="load")
                page.wait_for_timeout(600)
                body = page.inner_text("body")
                for t in texts:
                    check(f"PC {path} に「{t}」", t in body)
                shot = os.path.join(SHOTS, f"pc-{slug}.png")
                page.screenshot(path=shot, full_page=True)
                results["shots"].append(shot)

            # ---- /app（無料・デモ） ----
            page.goto(BASE + "/app", wait_until="load")
            page.wait_for_timeout(800)
            body = page.inner_text("body")
            check("無料: 本日の残り回数", "本日の残り回数" in body)
            check("無料: あと 3 回", "あと 3 回" in body, body.split("本日の残り回数")[1][:40] if "本日の残り回数" in body else "")
            check("無料: AI超解像ロック文言", "月額500円のProプランで利用可能" in page.locator("#aiSrLabel").inner_text(),
                  page.locator("#aiSrLabel").inner_text())
            check("無料: 抽出UI（動画を選ぶ）", "動画ファイルを選ぶ" in body)
            check("AIモデル要素あり", page.locator("#modelStatus").count() == 1)
            # モデル読み込み完了を待つ（最大60秒）
            try:
                page.wait_for_function(
                    "() => { const el = document.getElementById('modelStatus'); return el && /準備完了|エラー/.test(el.textContent); }",
                    timeout=60000,
                )
                status = page.locator("#modelStatus").inner_text()
                check("AIモデルの読み込み", "準備完了" in status, status)
            except Exception as e:
                check("AIモデルの読み込み", False, str(e)[:160])

            page.screenshot(path=os.path.join(SHOTS, "pc-app-free.png"), full_page=True)
            results["shots"].append(os.path.join(SHOTS, "pc-app-free.png"))

            # ---- エンドツーエンド: 動画を読み込んで解析開始 ----
            video_path = "/workspace/tmp/test_video.mp4"
            if not os.path.exists(video_path):
                video_b64 = make_video_b64(page)
                video_path = "/tmp/fe-test.webm"
                with open(video_path, "wb") as f:
                    f.write(base64.b64decode(video_b64))
            check("テスト動画の準備", os.path.getsize(video_path) > 1000, f"{video_path} {os.path.getsize(video_path)} bytes")

            page.set_input_files("#fileInput", video_path)
            page.wait_for_selector("#videoInfo:not([hidden])", timeout=20000)
            page.wait_for_function("() => !document.getElementById('startBtn').disabled", timeout=20000)
            check("動画の読み込み（メタデータ表示）", True, page.locator("#mDur").inner_text())

            page.click("#startBtn")
            page.wait_for_function(
                "() => /残り 0 回/.test(document.querySelector('.usage-banner').innerText) || /あと 2 回/.test(document.querySelector('.usage-banner').innerText)",
                timeout=30000,
            )
            banner = page.locator(".usage-banner").inner_text()
            check("解析スタートで残り回数が減る（3→2）", "あと 2 回" in banner, banner.replace("\n", " ")[:80])

            # 解析完了（顔なし→候補0）まで待つ
            page.wait_for_function(
                "() => { const r = document.getElementById('resultCard'); return r && !r.hidden; }",
                timeout=180000,
            )
            cands = page.locator(".cand").count()
            check("解析が最後まで実行され候補が出る", cands > 0, f"{cands}枚 / " + page.locator("#summary").inner_text()[:70])
            # 結果まで含めた全体を1枚に（full_pageはヘッダーが合成される環境があるため、
            # ビューポートをページ全体の高さに広げてからスクロール0で撮る）
            doc_h = page.evaluate("() => document.documentElement.scrollHeight")
            page.set_viewport_size({"width": 1280, "height": min(doc_h + 40, 5000)})
            page.evaluate("() => window.scrollTo(0, 0)")
            page.wait_for_timeout(900)
            page.screenshot(path=os.path.join(SHOTS, "pc-app-analyzed.png"))
            page.set_viewport_size({"width": 1280, "height": 900})
            page.wait_for_timeout(200)
            results["shots"].append(os.path.join(SHOTS, "pc-app-analyzed.png"))

            # ---- API: 300秒超は403 ----
            STATE["ignore_expected"] = True
            r = page.evaluate(
                """async () => {
                    const res = await fetch('/api/usage/check-and-increment', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ durationSeconds: 360 })
                    });
                    return { status: res.status, body: await res.json() };
                  }"""
            )
            check("5分超の動画は403 duration_limit", r["status"] == 403 and r["body"].get("reason") == "duration_limit", json.dumps(r, ensure_ascii=False))

            # ---- API: 残り1回→上限→429 ----
            r2 = page.evaluate(
                """async () => {
                    const out = [];
                    for (let i = 0; i < 3; i++) {
                      const res = await fetch('/api/usage/check-and-increment', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ durationSeconds: 120 })
                      });
                      out.push({ status: res.status, body: await res.json() });
                    }
                    return out;
                  }"""
            )
            statuses = [x["status"] for x in r2]
            check("4本目以降は429 daily_limit", statuses[:1] == [200] and 429 in statuses, json.dumps(statuses))

            STATE["ignore_expected"] = False
            page.reload(wait_until="load")
            page.wait_for_timeout(500)
            check("上限到達が画面に反映（あと 0 回）", "あと 0 回" in page.locator(".usage-banner").inner_text())

            # ---- /app?plan=pro（デモPro） ----
            pro = new_page(1280, 900)
            pro.goto(BASE + "/app?plan=pro", wait_until="load")
            pro.wait_for_timeout(900)
            pbody = pro.inner_text("body")
            check("Pro: 無制限表示", "Proプラン（無制限）" in pbody)
            check("Pro: AI超解像ロックなし", "月額500円のProプランで利用可能" not in pbody)
            check("Pro: AIトグル有効", pro.eval_on_selector("#aiSrChk", "el => !el.disabled"))
            check("Pro: すべてAI超解像ボタンあり", pro.locator("#aiAllBtn").count() == 1)
            pro.screenshot(path=os.path.join(SHOTS, "pc-app-pro.png"), full_page=True)
            results["shots"].append(os.path.join(SHOTS, "pc-app-pro.png"))

            # ---- Stripe / API の未設定時・異常系 ----
            STATE["ignore_expected"] = True
            r = page.request.post(BASE + "/api/stripe/checkout", max_redirects=0)
            check("Stripe未設定: Checkoutは案内へ303", r.status == 303 and "checkout=unavailable" in (r.headers.get("location") or ""),
                  f"{r.status} {r.headers.get('location')}")
            r = page.request.post(BASE + "/api/stripe/portal", max_redirects=0)
            check("Stripe未設定: Portalは案内へ303", r.status == 303 and "checkout=unavailable" in (r.headers.get("location") or ""),
                  f"{r.status} {r.headers.get('location')}")
            r = page.request.post(BASE + "/api/stripe/webhook", data="{}", headers={"content-type": "application/json"})
            check("Webhook: 署名なし/未設定は拒否", r.status >= 400, str(r.status))
            r = page.request.post(BASE + "/api/usage/check-and-increment", data={}, headers={"content-type": "application/json"})
            check("usage API: 不正bodyは400", r.status == 400, str(r.status))
            STATE["ignore_expected"] = False

            # ---- 決済完了バナー ----
            page.goto(BASE + "/app?checkout=success", wait_until="load")
            page.wait_for_timeout(500)
            check("checkout=success の案内表示", "お申し込みを受け付けました" in page.inner_text("body"))
            page.goto(BASE + "/app?checkout=cancel", wait_until="load")
            page.wait_for_timeout(400)
            check("checkout=cancel の案内表示", "キャンセルしました" in page.inner_text("body"))

            # ---- モバイル 390px ----
            m = new_page(390, 844, mobile=True)
            for slug, path, _ in PAGES:
                m.goto(BASE + path, wait_until="load")
                m.wait_for_timeout(500)
                shot = os.path.join(SHOTS, f"iphone-{slug}.png")
                m.screenshot(path=shot, full_page=True)
                results["shots"].append(shot)
            m.goto(BASE + "/app", wait_until="load")
            m.wait_for_timeout(1500)
            check("iPhone: 横スクロールなし", m.evaluate("() => document.documentElement.scrollWidth <= window.innerWidth + 1"),
                  str(m.evaluate("() => [document.documentElement.scrollWidth, window.innerWidth]")))
            shot = os.path.join(SHOTS, "iphone-app-free.png")
            m.screenshot(path=shot, full_page=True)
            results["shots"].append(shot)

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
    print(f"console errors: {len(results['console_errors'])}")
    for e in results["console_errors"][:20]:
        print("  -", e["type"], e["text"][:300])
    print(f"http errors: {len(results['http_errors'])}")
    for e in results["http_errors"][:20]:
        print("  -", e["status"], e["url"])
    with open(os.path.join(ROOT, "verify-report.json"), "w") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    ok = not fails and not results["console_errors"] and not results["http_errors"]
    print("VERIFY:", "PASS" if ok else "FAIL")
    return 0 if ok else 2


if __name__ == "__main__":
    sys.exit(main())
