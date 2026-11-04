"""미블 (mrblog.net) — robots 허용.

전체 목록은 로그인해야 보인다(GET /xhr/campaigns?type=region|delivery&page=N, 24건씩, 카드 HTML). 사용자 결정(11-04): 네이버 부계정으로 전체 수집, 하루 2번.
- 미블은 SNS 가입만 돼서 mrblog_login.py 로 사람이 한 번 로그인해 둔 쿠키를 쓴다(C:\\chehumdan\\mrblog-state.json).
- 파일이 없거나 로그인이 풀렸으면 로그인 없이 보이는 첫 화면 카드(30건 안팎)만 저장한다.
"""
from __future__ import annotations

import html
import http.cookiejar
import json
import os
import re
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path

from common import KST, UA, make_item
from site_cometoplay import region

SITE = "mrblog"
BASE = "https://www.mrblog.net"
STATE = Path(os.environ.get("CHEHUMDAN_MRBLOG_STATE", r"C:\chehumdan\mrblog-state.json"))
MAX_PAGES = 300
PAGE_SIZE = 24
_CARD = re.compile(r'href="https://www\.mrblog\.net/campaigns/(\d+)"[^>]*class="campaign_item".*?class="area">(.*?)</span>\s*'
                   r'<strong class="subject">(.*?)</strong>\s*<p class="desc">(.*?)</p>.*?class="d_day">\s*(.*?)\s*</span>'
                   r'.*?class="current">\D*(\d+)\D*</strong>.*?/\s*\D*(\d+)', re.S)


def _text(s: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def parse(m: re.Match, today: datetime) -> dict | None:
    d = re.search(r"\d+", m[5])
    if not d and "D-Day" not in m[5]:
        return None
    area, icons = _text(m[2]), m[2]
    ctype = "delivery" if "배송" in area else "visit"
    words = [w for w in area.split() if w not in ("클립", "릴스", "배송")]
    sido, sgg = region(" ".join(words)) if ctype == "visit" else (None, None)
    channel = "clip" if "클립" in area else "reels" if "릴스" in area else "insta" if "insta" in icons else "blog"
    left = int(d[0]) if d else 0
    return make_item(site=SITE, sid=m[1], url=f"{BASE}/campaigns/{m[1]}", title=_text(m[3]), offer=_text(m[4]),
                     ctype=ctype, channel=channel, sido=sido, sigungu=sgg,
                     apply_end=(today + timedelta(days=left)).strftime("%Y-%m-%d"),
                     recruit=int(m[7]), applicants=int(m[6]))


def load_cookies(jar: http.cookiejar.CookieJar) -> bool:
    if not STATE.exists():
        print(f"  미블: {STATE} 없음 — 첫 화면만 수집")
        return False
    for c in json.loads(STATE.read_text(encoding="utf-8"))["cookies"]:
        exp = c.get("expires", -1)
        jar.set_cookie(http.cookiejar.Cookie(
            0, c["name"], c["value"], None, False, c["domain"], True, c["domain"].startswith("."),
            c.get("path", "/"), True, bool(c.get("secure")), int(exp) if exp and exp > 0 else None,
            False, None, None, {}))
    return True


def save_cookies(jar: http.cookiejar.CookieJar) -> None:
    """서버가 새로 준 쿠키를 저장해 다음 수집까지 로그인을 잇는다."""
    cookies = [{"name": c.name, "value": c.value, "domain": c.domain, "path": c.path,
                "secure": c.secure, "expires": c.expires or -1} for c in jar]
    STATE.write_text(json.dumps({"cookies": cookies}, ensure_ascii=False), encoding="utf-8")


def _open(op, url: str) -> tuple[str, str]:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9"})
    with op.open(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace"), r.geturl()


def collect() -> list[dict]:
    today = datetime.now(KST)
    jar = http.cookiejar.CookieJar()
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    out, seen = [], set()

    def take(page: str) -> int:
        new = 0
        for m in _CARD.finditer(page):
            if m[1] in seen:
                continue
            seen.add(m[1])
            new += 1
            it = parse(m, today)
            if it:
                out.append(it)
        return new

    if load_cookies(jar):
        for path in ("region", "delivery"):
            n0 = len(out)
            page, final = _open(op, f"{BASE}/campaigns/{path}")
            time.sleep(1)
            if "/login" in final:
                print("  미블: 로그인이 풀림 — mrblog_login.py 를 다시 실행해 주세요")
                break
            token = re.search(r'name="csrf-token" content="([^"]+)"', page)[1]
            for n in range(1, MAX_PAGES + 1):
                q = urllib.parse.urlencode({"type": path, "page": n, "category": "", "order_by": 1, "category_seq": ""})
                req = urllib.request.Request(f"{BASE}/xhr/campaigns?{q}", headers={
                    "User-Agent": UA, "X-Requested-With": "XMLHttpRequest", "Accept": "application/json",
                    "X-CSRF-TOKEN": token, "Referer": f"{BASE}/campaigns/{path}"})
                with op.open(req, timeout=30) as r:
                    d = json.load(r)
                time.sleep(1)
                if not take(d.get("html") or "") or d.get("count", 0) < PAGE_SIZE:
                    break
            print(f"  미블 {path}: {len(out) - n0}건")
        if out:
            save_cookies(jar)
    if not out:
        take(_open(op, f"{BASE}/")[0])
        print(f"  미블 첫 화면: {len(out)}건")
    return out
