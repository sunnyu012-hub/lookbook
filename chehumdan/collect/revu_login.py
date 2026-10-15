"""레뷰 로그인 도우미 — 사무실 PC에서 사람이 한 번 실행한다.

크롬 창이 뜨면 레뷰에 직접 로그인(네이버·카카오 등 SNS 로그인 가능)한다.
로그인이 확인되면 로그인 상태(쿠키)를 C:\\chehumdan\\revu-state.json 에 저장하고 창을 닫는다.
수집기(site_revu.py)는 이 파일로 로그인 상태를 이어 쓴다. SNS 비밀번호는 어디에도 저장하지 않는다.

이 파일은 다른 파일 없이 혼자 돈다(tools/revu-login.ps1 이 내려받아 실행).
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
from pathlib import Path

STATE = Path(os.environ.get("CHEHUMDAN_REVU_STATE", r"C:\chehumdan\revu-state.json"))
WWW = "https://www.revu.net"
PROVIDERS = {"nid.naver.com": "naver", "kauth.kakao.com": "kakao", "accounts.kakao.com": "kakao",
             "accounts.google.com": "google", "appleid.apple.com": "apple", "facebook.com": "facebook"}


def main() -> int:
    from playwright.sync_api import sync_playwright

    token = {}
    provider = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        ctx = browser.new_context(locale="ko-KR", viewport={"width": 1100, "height": 900})
        page = ctx.new_page()

        def on_request(req):
            if "api.weble.net" in req.url:
                auth = req.headers.get("authorization", "")
                if auth.startswith("Bearer ") and len(auth) > 20:
                    token["v"] = True
            for host, name in PROVIDERS.items():
                if host in req.url:
                    provider["v"] = name

        ctx.on("request", on_request)
        page.goto(WWW, wait_until="domcontentloaded")
        print("\n크롬 창에서 레뷰에 로그인해 주세요. (SNS 로그인이면 '로그인 상태 유지'를 켜 주세요)")
        print("로그인이 확인되면 창이 저절로 닫혀요. 최대 10분 기다립니다.\n")
        deadline = time.time() + 600
        checked_campaign = False
        while time.time() < deadline:
            time.sleep(2)
            try:
                if token.get("v"):
                    break
                stored = page.evaluate("() => JSON.stringify({...localStorage})") if "revu.net" in page.url else ""
                if re.search(r"eyJ[\w\-]+\.[\w\-]+\.[\w\-]+", stored or ""):
                    break
                # 로그인 뒤 메인으로 돌아왔으면 공고 화면을 한 번 열어 토큰을 확인
                if "www.revu.net" in page.url and not checked_campaign and len(ctx.cookies(WWW)) > 3:
                    checked_campaign = True
                    page.goto(f"{WWW}/campaign", wait_until="domcontentloaded")
            except Exception:  # noqa: BLE001 — 사용자가 페이지를 옮기는 중
                continue
        else:
            print("10분 안에 로그인을 확인하지 못했어요. 다시 실행해 주세요.")
            browser.close()
            return 1
        page.wait_for_timeout(2000)
        STATE.parent.mkdir(parents=True, exist_ok=True)
        ctx.storage_state(path=str(STATE))
        meta = json.loads(STATE.read_text(encoding="utf-8"))
        meta["chehumdan_provider"] = provider.get("v")
        STATE.write_text(json.dumps(meta, ensure_ascii=False), encoding="utf-8")
        browser.close()
    print(f"로그인 상태를 저장했어요: {STATE}  (로그인 방식: {provider.get('v') or '레뷰 계정'})")
    print("이제 창을 닫으셔도 됩니다. 수집기가 하루 두 번 이 상태로 레뷰를 읽어요.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
