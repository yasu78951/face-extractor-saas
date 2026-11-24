#!/usr/bin/env python3
"""
「無料はログイン不要（署名Cookieで1日3本）」改修の検証スクリプト。

  npm run build && python3 scripts/verify-anon.py

本番に近い設定（Supabaseの環境変数を入れた状態 = デモモードではない）で起動し、
ログインしていない利用者として次を実測する:

1. トップの「無料ではじめる（ログイン不要）」から /app に入れる（/signin へ飛ばされない）
2. 実際に動画を解析すると残り 3 → 2 になり、リロードしても 2 のまま
3. 3本使い切ると4本目は 429 でブロックされ、Pro/ログイン案内が出る
4. 300秒超の動画は 403 でブロック（回数は消費しない）
5. 回数Cookieは HttpOnly・署名付き（改ざん・未来日付は無効）
"""
import base64
import hashlib
import hmac
import json
import os
import subprocess
import sys
import time
import urllib.request
from datetime import datetime, timedelta, timezone

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(os.environ.get("VERIFY_ANON_PORT", "3110"))
BASE = f"http://127.0.0.1:{PORT}"
CHROME = "/workspace/.cache/chrome/chrome-linux64/chrome"
NODE_BIN = "/workspace/.local/node/bin"
TEST_VIDEO = "/workspace/tmp/test_video.mp4"

results = {"checks": [], "console_errors": []}


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


def jst_day(offset_days=0):
    d = datetime.now(timezone(timedelta(hours=9))) + timedelta(days=offset_days)
    return d.strftime("%Y-%m-%d")


ANON_SECRET = "verify-anon-service-role-key"  # このスクリプトが起動時に渡す SUPABASE_SERVICE_ROLE_KEY


def make_cookie(day, count, secret=ANON_SECRET):
    msg = f"v1.{day}.{count}".encode()
    sig = base64.urlsafe_b64encode(
        hmac.new(secret.encode(), msg, hashlib.sha256).digest()
    ).decode().rstrip("=")[:32]
    return f"v1.{day}.{count}.{sig}"


def post_usage(page, duration):
    res = page.request.post(
        BASE + "/api/usage/check-and-increment",
        data=json.dumps({"durationSeconds": duration}),
        headers={"content-type": "application/json"},
    )
    try:
        body = res.json()
    except Exception:
        body = {}
    return res, body


def main():
    if not os.path.exists(TEST_VIDEO):
        print(f"テスト動画がありません: {TEST_VIDEO}")
        return 1

    env = os.environ.copy()
    env["PATH"] = NODE_BIN + ":" + env.get("PATH", "")
    env["LD_LIBRARY_PATH"] = "/workspace/.cache/libs" + (
        ":" + env["LD_LIBRARY_PATH"] if env.get("LD_LIBRARY_PATH") else ""
    )
    env["NEXT_PUBLIC_SITE_URL"] = BASE
    env.setdefault("NODE_ENV", "production")
    # 「Supabase接続済み（=デモモードではない）」状態を再現する。
    # ログインCookieが無いので getViewer() は null を返し、未ログイン経路に入る。
    env["NEXT_PUBLIC_SUPABASE_URL"] = "https://verify-anon.supabase.co"
    env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = "verify-anon-key"
    env["SUPABASE_SERVICE_ROLE_KEY"] = "verify-anon-service-role-key"

    log = open("/tmp/verify-anon-next.log", "w")
    server = subprocess.Popen(
        [os.path.join(NODE_BIN, "node"), os.path.join(ROOT, "node_modules/next/dist/bin/next"),
         "start", "-p", str(PORT)],
        cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT,
    )
    try:
        if not wait_server():
            print("server did not start; log:")
            print(open("/tmp/verify-anon-next.log").read()[-3000:])
            return 1

        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox", "--disable-dev-shm-usage"], env=env)

            ctx = browser.new_context(viewport={"width": 1280, "height": 900})
            page = ctx.new_page()
            STATE = {"ignore_429": False}

            def on_console(msg):
                if msg.type != "error":
                    return
                if "XNNPACK" in msg.text:
                    return
                if STATE["ignore_429"] and "429" in msg.text:
                    return
                results["console_errors"].append(msg.text)

            page.on("pageerror", lambda e: results["console_errors"].append(str(e)))
            page.on("console", on_console)

            # ---- 1. トップ → /app（ログイン不要） ----
            page.goto(BASE + "/", wait_until="load")
            page.wait_for_timeout(400)
            body = page.inner_text("body")
            check("トップに「無料ではじめる（ログイン不要）」", "無料ではじめる（ログイン不要）" in body)
            href = page.get_attribute(".hero-actions a.btn-primary", "href")
            check("トップCTAの遷移先が /app", href == "/app", str(href))

            page.goto(BASE + "/app", wait_until="load")
            page.wait_for_timeout(700)
            check("/app が未ログインでも開ける（リダイレクトなし）", page.url.rstrip("/") == BASE + "/app", page.url)
            banner = page.locator(".usage-banner").inner_text()
            check("初期表示が「あと 3 回」", "あと 3 回" in banner, banner.replace("\n", " ")[:90])
            check("「ログイン不要」の注記", "ログイン不要" in banner)
            check("/app 右上にログイン導線", page.locator("a.btn-top-login").count() == 1)
            pro_href = page.locator(".usage-actions a.btn-primary-solid").get_attribute("href") or ""
            check("Pro導線はログイン経由（/signin?next=…）", pro_href.startswith("/signin?next="), pro_href)

            # ---- 2. 実際の解析で 3 → 2、リロードで維持 ----
            page.set_input_files("#fileInput", TEST_VIDEO)
            page.wait_for_selector("#videoInfo:not([hidden])", timeout=20000)
            page.wait_for_function("() => !document.getElementById('startBtn').disabled", timeout=20000)
            page.click("#startBtn")
            page.wait_for_function(
                "() => /あと 2 回/.test(document.querySelector('.usage-banner').innerText)", timeout=60000
            )
            check("未ログインで解析開始 → 残り 3→2", True)
            page.reload(wait_until="load")
            page.wait_for_timeout(700)
            check("リロードしても「あと 2 回」", "あと 2 回" in page.locator(".usage-banner").inner_text(),
                  page.locator(".usage-banner").inner_text().replace("\n", " ")[:80])
            status = page.request.get(BASE + "/api/usage/status").json()
            check("GET /api/usage/status が匿名の残り2回を返す",
                  status.get("anonymous") is True and status.get("remaining") == 2, json.dumps(status))

            # Cookieの属性（HttpOnly / 署名付き）
            cookies = {c["name"]: c for c in ctx.cookies()}
            anon_cookie = cookies.get("fe_anon")
            check("fe_anon Cookie が発行される", anon_cookie is not None)
            if anon_cookie:
                check("Cookie は HttpOnly", anon_cookie.get("httpOnly") is True, json.dumps(anon_cookie))
                value = anon_cookie["value"]
                parts = value.split(".")
                check("Cookie 形式 v1.<日付>.<使用数>.<署名>",
                      len(parts) == 4 and parts[0] == "v1" and parts[1] == jst_day() and parts[2] == "1", value)

            # ---- 3. 3本使い切る → 4本目は 429 ----
            res, data = post_usage(page, 60)  # 2本目
            check("2本目は 200 で残り 1", res.status == 200 and data.get("remaining") == 1, f"{res.status} {data}")
            res, data = post_usage(page, 60)  # 3本目
            check("3本目は 200 で残り 0", res.status == 200 and data.get("remaining") == 0, f"{res.status} {data}")
            res, data = post_usage(page, 60)  # 4本目
            check("4本目は 429 daily_limit", res.status == 429 and data.get("reason") == "daily_limit",
                  f"{res.status} {data}")
            check("429 が匿名利用として返る", data.get("anonymous") is True)

            # 画面側: 4本目を実行すると Pro/ログイン案内（エンジン経由）
            STATE["ignore_429"] = True
            page.set_input_files("#fileInput", TEST_VIDEO)
            page.wait_for_selector("#videoInfo:not([hidden])", timeout=20000)
            page.wait_for_function("() => !document.getElementById('startBtn').disabled", timeout=20000)
            page.click("#startBtn")
            page.wait_for_selector("#loadError:not([hidden])", timeout=20000)
            err = page.locator("#loadError").inner_text()
            check("4本目でブロック案内が出る", "使い切りました" in err, err.replace("\n", " ")[:120])
            check("案内にログイン→Proのリンク", page.locator("#loadError a.upgrade-link").count() >= 1,
                  (page.locator("#loadError a.upgrade-link").first.get_attribute("href") or ""))
            check("上限到達で「あと 0 回」表示", "あと 0 回" in page.locator(".usage-banner").inner_text(),
                  page.locator(".usage-banner").inner_text().replace("\n", " ")[:80])
            STATE["ignore_429"] = False

            # ---- 4. 300秒超は 403（回数は消費しない） ----
            ctx2 = browser.new_context(viewport={"width": 1280, "height": 900})
            p2 = ctx2.new_page()
            p2.goto(BASE + "/app", wait_until="load")
            p2.wait_for_timeout(400)
            res, data = post_usage(p2, 360)
            check("5分超の動画は 403 duration_limit", res.status == 403 and data.get("reason") == "duration_limit",
                  f"{res.status} {data}")
            status = p2.request.get(BASE + "/api/usage/status").json()
            check("403 では回数を消費しない", status.get("used") == 0 and status.get("remaining") == 3, json.dumps(status))

            # ---- 5. 改ざん・未来日付のCookieは無効 ----
            forged_future = f"v1.{jst_day()[:8]}99-01-01.0.{'a' * 32}"
            ctx2.add_cookies([{"name": "fe_anon", "value": forged_future, "url": BASE}])
            status = p2.request.get(BASE + "/api/usage/status").json()
            check("未来日付のCookieは無効（0本扱い）", status.get("used") == 0, json.dumps(status))

            valid = f"v1.{jst_day()}.3.{'a' * 32}"
            ctx2.add_cookies([{"name": "fe_anon", "value": valid, "url": BASE}])
            res, data = post_usage(p2, 30)
            check("署名が違うCookieは0本から数え直す", res.status == 200 and data.get("used") == 1,
                  f"{res.status} {data}")

            # 正しく署名されたCookieは受け付ける（=署名検証そのものが機能している）
            ctx2.add_cookies([{"name": "fe_anon", "value": make_cookie(jst_day(), 2), "url": BASE}])
            status = p2.request.get(BASE + "/api/usage/status").json()
            check("正しく署名されたCookieは使用数2として認識",
                  status.get("used") == 2 and status.get("remaining") == 1, json.dumps(status))

            # 日付が変わったCookieはリセット（JST 0時リセット）
            ctx2.add_cookies([{"name": "fe_anon", "value": make_cookie(jst_day(-1), 3), "url": BASE}])
            status = p2.request.get(BASE + "/api/usage/status").json()
            check("前日までのCookieは0本にリセット", status.get("used") == 0, json.dumps(status))

            # ---- 6. ログインページ・トップの整合 ----
            p3 = browser.new_context(viewport={"width": 1280, "height": 900}).new_page()
            p3.goto(BASE + "/signin", wait_until="load")
            check("/signin にログイン不要の案内", "ログインなしで無料で試す" in p3.inner_text("body"))
            check("/signin はデモ表記なし（本番設定）", "デモモード" not in p3.inner_text("body"))

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
    for e in results["console_errors"][:10]:
        print("  -", e[:200])
    with open(os.path.join(ROOT, "verify-anon-report.json"), "w") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print("VERIFY-ANON:", "PASS" if not fails else "FAIL")
    return 0 if not fails else 2


if __name__ == "__main__":
    sys.exit(main())
