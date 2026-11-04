"""미블 (mrblog.net) — robots 허용.

전체 목록(/campaigns/region·delivery?page=N)은 로그인해야 보인다. 사용자 결정(11-04): 부계정으로 전체 수집, 하루 2번.
- 부계정은 GitHub Secrets 의 MRBLOG_ID·MRBLOG_PW 에서만 읽는다(이메일 가입 계정, KR_PC.md 4번).
- 비밀값이 없거나 로그인에 실패하면 로그인 없이 보이는 첫 화면 카드(30건 안팎)만 저장한다.
"""
from __future__ import annotations

import html
import http.cookiejar
import os
import re
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta

from common import KST, UA, make_item
from site_cometoplay import region

SITE = "mrblog"
BASE = "https://www.mrblog.net"
MAX_PAGES = 300
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


def _open(op, url: str, data: bytes | None = None) -> tuple[str, str]:
    req = urllib.request.Request(url, data=data, headers={"User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9", "Referer": f"{BASE}/login"})
    with op.open(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace"), r.geturl()


def login(op) -> bool:
    uid, pw = os.environ.get("MRBLOG_ID"), os.environ.get("MRBLOG_PW")
    if not (uid and pw):
        print("  미블: MRBLOG_ID/PW 없음 — 첫 화면만 수집")
        return False
    page, _ = _open(op, f"{BASE}/login")
    token = re.search(r'name="_token"[^>]*value="([^"]+)"', page)
    if not token:
        print("  미블: 로그인 화면 구조가 바뀜 — 첫 화면만 수집")
        return False
    data = urllib.parse.urlencode({"_token": token[1], "referer": BASE, "username": uid, "password": pw}).encode()
    time.sleep(1)
    _open(op, f"{BASE}/login", data)
    _, final = _open(op, f"{BASE}/campaigns/region")
    ok = "/login" not in final
    print("  미블: 로그인 성공" if ok else "  미블: 로그인 실패 — 첫 화면만 수집")
    return ok


def collect() -> list[dict]:
    today = datetime.now(KST)
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
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

    if login(op):
        for path in ("region", "delivery"):
            n0 = len(out)
            for n in range(1, MAX_PAGES + 1):
                time.sleep(1)
                page, final = _open(op, f"{BASE}/campaigns/{path}?page={n}")
                if "/login" in final or not take(page):
                    break
            print(f"  미블 {path}: {len(out) - n0}건")
    if not out:
        take(_open(op, f"{BASE}/")[0])
        print(f"  미블 첫 화면: {len(out)}건")
    return out
