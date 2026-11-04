"""미블 로그인 도우미 — 사무실 PC에서 사람이 실행한다. 로그인이 풀렸을 때도 이걸 다시 돌린다.

크롬 창에서 직접 네이버로 미블에 로그인하면, 미블 쿠키만 C:\\chehumdan\\mrblog-state.json 에 저장한다.
네이버 쿠키와 비밀번호는 저장하지 않는다. 수집기(site_mrblog.py)가 이 파일을 이어 쓴다.
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

STATE = Path(os.environ.get("CHEHUMDAN_MRBLOG_STATE", r"C:\chehumdan\mrblog-state.json"))
BASE = "https://www.mrblog.net"


def main() -> int:
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        ctx = browser.new_context(locale="ko-KR", viewport={"width": 1100, "height": 900})
        page = ctx.new_page()
        page.goto(f"{BASE}/login", wait_until="domcontentloaded")
        print("크롬 창에서 네이버로 미블에 로그인해 주세요. 최대 10분 기다립니다.", flush=True)
        deadline = time.time() + 600
        while time.time() < deadline:
            page.wait_for_timeout(2000)
            url = page.url
            if "mrblog.net" not in url or "/login" in url:
                continue
            res = ctx.request.get(f"{BASE}/campaigns/region")  # 로그인 전이면 /login 으로 돌아간다
            if "/login" not in res.url:
                break
        else:
            print("10분 안에 로그인을 확인하지 못했어요. 다시 실행해 주세요.")
            browser.close()
            return 1
        cookies = [c for c in ctx.cookies() if "mrblog.net" in c["domain"]]
        STATE.parent.mkdir(parents=True, exist_ok=True)
        STATE.write_text(json.dumps({"cookies": cookies}, ensure_ascii=False), encoding="utf-8")
        browser.close()
    print(f"로그인 상태를 저장했어요: {STATE}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
