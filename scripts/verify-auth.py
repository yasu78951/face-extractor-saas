#!/usr/bin/env python3
"""
メールログイン（Magic Link / implicit フロー）まわりの検証。

  npm run build && python3 scripts/verify-auth.py

確認内容:
- /auth/callback に #error=access_denied&error_code=otp_expired で来たとき /signin?error=expired へ
- ハッシュ無し・?code= 無しの /auth/callback は /signin?error=auth へ（クラッシュしない）
- ?code= 付きは /auth/exchange を経由して適切にリダイレクト（サーバーが500を返さない）
- /auth/callback の #access_token=... は setSession 失敗時に /signin?error=auth へ
- /signin?sent=1&email=... にリンク案内・有効期限の注意・メール入力欄の引き継ぎが表示され、
  PC / iPhone幅(390px) ともレイアウトが崩れない
- /signin?error=expired の文言表示
- 戻り先(?next=)の外部URLは /app に落ちる
"""
import json
import os
import subprocess
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, "screenshots")
CHROME = "/workspace/.cache/chrome/chrome-linux64/chrome"
NODE_BIN = "/workspace/.local/node/bin"

os.makedirs(SHOTS, exist_ok=True)
results = {"checks": [], "console_errors": [], "http_errors": [], "shots": []}
# 認証失敗はこの検証の想定内なので console エラー扱いから除く
EXPECTED_CONSOLE = ("[auth]", "Failed to load resource", "net::ERR")


def check(name, ok, detail=""):
    results["checks"].append({"name": name, "ok": bool(ok), "detail": detail})
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""))


def base_env(port):
    env = os.environ.copy()
    env["PATH"] = NODE_BIN + ":" + env.get("PATH", "")
    env["LD_LIBRARY_PATH"] = "/workspace/.cache/libs" + (":" + env["LD_LIBRARY_PATH"] if env.get("LD_LIBRARY_PATH") else "")
    env["NEXT_PUBLIC_SITE_URL"] = f"http://127.0.0.1:{port}"
    env.setdefault("NODE_ENV", "production")
    return env


def start_server(port, extra_env=None):
    env = base_env(port)
    if extra_env:
        env.update(extra_env)
    log = open(f"/tmp/verify-auth-{port}.log", "w")
    proc = subprocess.Popen(
        [os.path.join(NODE_BIN, "node"), os.path.join(ROOT, "node_modules/next/dist/bin/next"), "start", "-p", str(port)],
        cwd=ROOT,
        env=env,
        stdout=log,
        stderr=subprocess.STDOUT,
    )
    deadline = time.time() + 90
    base = f"http://127.0.0.1:{port}"
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(base + "/", timeout=2) as r:
                if r.status == 200:
                    return proc, base
        except Exception:
            time.sleep(1)
    print(open(f"/tmp/verify-auth-{port}.log").read()[-2000:])
    raise RuntimeError(f"server on {port} did not start")


def stop_server(proc):
    proc.terminate()
    try:
        proc.wait(timeout=10)
    except Exception:
        proc.kill()


def new_page(browser, width, height, mobile=False):
    ctx = browser.new_context(
        viewport={"width": width, "height": height},
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
        if any(n in msg.text for n in EXPECTED_CONSOLE):
            return
        results["console_errors"].append({"page": page.url, "text": msg.text[:300]})

    page.on("console", on_console)
    page.on("pageerror", lambda err: results["console_errors"].append({"page": page.url, "text": str(err)[:300]}))

    def on_response(res):
        if res.status >= 400:
            results["http_errors"].append({"page": page.url, "status": res.status, "url": res.url})

    page.on("response", on_response)
    return page


def settle(page, timeout=8000):
    """クライアント側リダイレクト（location.replace）の完了を待つ"""
    try:
        page.wait_for_load_state("networkidle", timeout=timeout)
    except Exception:
        pass
    page.wait_for_timeout(600)


def main():
    web_env = {
        "NEXT_PUBLIC_SUPABASE_URL": "https://verify-dummy.supabase.co",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY": "dummy-anon-key-for-verify",
    }
    exit_code = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=CHROME,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )

        # ============ 1) Supabase 未設定（デモ） ============
        proc, BASE = start_server(3101)
        try:
            page = new_page(browser, 1280, 900)
            expired_url = (
                BASE + "/auth/callback?next=%2Fapp#error=access_denied&error_code=otp_expired"
                "&error_description=Email+link+is+invalid+or+has+expired&sb="
            )
            page.goto(expired_url, wait_until="load")
            settle(page)
            check(
                "期限切れリンク → /signin?error=expired",
                "/signin" in page.url and "error=expired" in page.url,
                page.url,
            )
            body = page.inner_text("body")
            check("期限切れ文言の表示", "有効期限が切れているか、すでに使用済み" in body)
            page.screenshot(path=os.path.join(SHOTS, "auth-expired-pc.png"), full_page=True)
            results["shots"].append(os.path.join(SHOTS, "auth-expired-pc.png"))

            page.goto(BASE + "/auth/callback", wait_until="load")
            settle(page)
            check("パラメータ無し → /signin?error=auth", "/signin" in page.url and "error=auth" in page.url, page.url)
            check("エラー時もページが表示される", "ログイン / 新規登録" in page.inner_text("body"))

            page.goto(BASE + "/auth/callback#error=access_denied", wait_until="load")
            settle(page)
            check("error のみ → /signin?error=auth", "error=auth" in page.url, page.url)

            page.goto(BASE + "/auth/callback?code=bogus-code&next=%2Fapp", wait_until="load")
            settle(page)
            check(
                "?code= は /auth/exchange 経由で /signin へ（500なし）",
                "/signin" in page.url and "error=" in page.url,
                page.url,
            )

            page.goto(BASE + "/auth/exchange", wait_until="load")
            check("/auth/exchange 直接アクセス → /signin", "/signin" in page.url, page.url)
            check("/auth/exchange が500を返さない", "500" not in page.inner_text("body")[:200])

            # 送信後の案内（PC）
            page.goto(BASE + "/signin?sent=1&email=test%40example.com&next=%2Fapp", wait_until="load")
            page.wait_for_timeout(400)
            body = page.inner_text("body")
            check("送信案内にメールアドレス", "test@example.com" in body)
            check("送信案内に1回限り・有効期限の注意", "1回だけ使えます" in body and "約1時間" in body)
            shot = os.path.join(SHOTS, "auth-sent-pc.png")
            page.screenshot(path=shot, full_page=True)
            results["shots"].append(shot)

            page.goto(BASE + "/signin?error=expired", wait_until="load")
            page.wait_for_timeout(300)
            check("?error=expired の文言", "有効期限が切れているか、すでに使用済み" in page.inner_text("body"))

            # 送信後の案内（iPhone幅）
            m = new_page(browser, 390, 844, mobile=True)
            m.goto(BASE + "/signin?sent=1&email=test%40example.com", wait_until="load")
            m.wait_for_timeout(500)
            check(
                "iPhone: 横スクロールなし（送信後）",
                m.evaluate("() => document.documentElement.scrollWidth <= window.innerWidth + 1"),
                str(m.evaluate("() => [document.documentElement.scrollWidth, window.innerWidth]")),
            )
            shot = os.path.join(SHOTS, "auth-sent-iphone.png")
            m.screenshot(path=shot, full_page=True)
            results["shots"].append(shot)

            m.goto(BASE + "/auth/callback?next=%2Fapp#error=access_denied&error_code=otp_expired", wait_until="load")
            settle(m)
            check("iPhone: 期限切れ → /signin?error=expired", "error=expired" in m.url, m.url)
        finally:
            stop_server(proc)

        # ============ 2) Supabase 設定あり（ダミー値で失敗経路を確認） ============
        proc, BASE = start_server(3102, web_env)
        try:
            page = new_page(browser, 1280, 900)
            page.goto(BASE + "/auth/callback?next=%2Fapp#access_token=dummy&refresh_token=dummy&type=magiclink", wait_until="load")
            settle(page, timeout=20000)
            check(
                "access_token 付き（認証失敗）→ /signin?error=auth",
                "/signin" in page.url and "error=auth" in page.url,
                page.url,
            )
            page.goto(BASE + "/auth/exchange?code=bogus&next=%2Fapp", wait_until="load")
            page.wait_for_timeout(500)
            check(
                "?code= 不正（設定あり）→ /signin?error=auth",
                "/signin" in page.url and "error=auth" in page.url,
                page.url,
            )
            page.goto(BASE + "/signin?sent=1&email=test%40example.com&next=%2Fapp", wait_until="load")
            page.wait_for_timeout(400)
            body = page.inner_text("body")
            check("設定あり: メールログインフォーム表示", "ログインリンクを送る" in body)
            check("メール入力欄にアドレス引き継ぎ", page.input_value("#email") == "test@example.com")
            check("next が hidden に引き継がれる", page.locator("input[name=next]").first.get_attribute("value") == "/app")
            shot = os.path.join(SHOTS, "auth-sent-pc.png")
            page.screenshot(path=shot, full_page=True)
            results["shots"].append(shot)

            page.goto(BASE + "/signin?next=%2F%2Fevil.example", wait_until="load")
            page.wait_for_timeout(300)
            check(
                "外部URLの next は /app に落ちる",
                page.locator("input[name=next]").first.get_attribute("value") == "/app",
                page.locator("input[name=next]").first.get_attribute("value"),
            )

            page.goto(BASE + "/signin?error=expired", wait_until="load")
            page.wait_for_timeout(300)
            check("設定あり: 期限切れ文言", "有効期限が切れているか、すでに使用済み" in page.inner_text("body"))
        finally:
            stop_server(proc)

        browser.close()

    print("\n===== RESULT =====")
    fails = [c for c in results["checks"] if not c["ok"]]
    print(f"checks: {len(results['checks'])} / failed: {len(fails)}")
    print(f"console errors: {len(results['console_errors'])}")
    for e in results["console_errors"][:10]:
        print("  -", e["text"][:200])
    print(f"http errors: {len(results['http_errors'])}")
    for e in results["http_errors"][:10]:
        print("  -", e["status"], e["url"])
    with open(os.path.join(ROOT, "verify-auth-report.json"), "w") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    ok = not fails and not results["console_errors"] and not results["http_errors"]
    print("VERIFY-AUTH:", "PASS" if ok else "FAIL")
    return 0 if ok else 2


if __name__ == "__main__":
    sys.exit(main())
