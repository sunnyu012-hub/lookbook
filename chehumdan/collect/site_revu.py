"""레뷰 (www.revu.net) — 부계정 로그인 후 목록 수집. 한국 PC(self-hosted runner)에서만 돈다.

공고 목록 API(api.weble.net/v1/campaigns)는 로그인 토큰이 있어야 열린다.
로그인은 accounts.revu.net(OIDC)을 거쳐서, 화면 없는 크롬(Playwright)으로 실제 로그인한 뒤
레뷰 화면이 API에 보내는 Authorization 토큰을 받아 쓴다.

환경 변수: REVU_ID, REVU_PW (GitHub Secrets)
디버그: CHEHUMDAN_DEBUG 폴더를 주면 실패 때 화면 캡처·HTML·받은 API 주소를 남긴다.
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path

from common import UA, fetch_json, make_item, norm_sido, polite_sleep, split_address, to_kst_date, today_kst

SITE = "revu"
WWW = "https://www.revu.net"
API = "https://api.weble.net/v1/campaigns"
PAGE_SIZE = 35
MAX_PAGES = 400

DEBUG = Path(os.environ["CHEHUMDAN_DEBUG"]) if os.environ.get("CHEHUMDAN_DEBUG") else None


def _debug(name: str, data) -> None:
    if not DEBUG:
        return
    DEBUG.mkdir(parents=True, exist_ok=True)
    p = DEBUG / name
    if isinstance(data, bytes):
        p.write_bytes(data)
    else:
        text = data if isinstance(data, str) else json.dumps(data, ensure_ascii=False, indent=1)
        # 토큰·비밀번호는 남기지 않는다
        text = re.sub(r"Bearer\s+[\w\-.]+", "Bearer [REDACTED]", text)
        pw = os.environ.get("REVU_PW")
        if pw:
            text = text.replace(pw, "[REDACTED]")
        p.write_text(text, encoding="utf-8")


def login_token() -> str:
    """부계정으로 로그인하고 api.weble.net 에 쓰는 'Bearer …' 값을 돌려준다."""
    from playwright.sync_api import sync_playwright

    uid, pw = os.environ.get("REVU_ID"), os.environ.get("REVU_PW")
    if not uid or not pw:
        raise RuntimeError("REVU_ID / REVU_PW 가 없음 (GitHub Secrets 확인)")

    token: dict[str, str] = {}
    seen_api: list[str] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(locale="ko-KR", user_agent=UA, viewport={"width": 1280, "height": 900})
        page = ctx.new_page()

        def on_request(req):
            if "api.weble.net" in req.url:
                seen_api.append(req.url)
                auth = req.headers.get("authorization", "")
                if auth.startswith("Bearer ") and len(auth) > 20:
                    token["v"] = auth

        page.on("request", on_request)
        try:
            page.goto(f"{WWW}/", wait_until="domcontentloaded", timeout=60_000)
            page.wait_for_timeout(2500)
            # 로그인 버튼 → accounts.revu.net
            for sel in ["text=로그인", "a[href*='login']", "button:has-text('로그인')"]:
                loc = page.locator(sel).first
                if loc.count():
                    loc.click()
                    break
            page.wait_for_url(re.compile(r"accounts\.revu\.net|/login"), timeout=30_000)
            page.wait_for_timeout(1500)
            # 이메일 로그인 폼이 탭/버튼 뒤에 숨어 있으면 연다
            for sel in ["text=이메일로 로그인", "text=이메일 로그인", "text=아이디로 로그인"]:
                loc = page.locator(sel).first
                if loc.count() and loc.is_visible():
                    loc.click()
                    page.wait_for_timeout(800)
                    break
            id_box = page.locator("input[type=email], input[name*=email i], input[name*=id i], input[type=text]").first
            pw_box = page.locator("input[type=password]").first
            id_box.fill(uid)
            pw_box.fill(pw)
            pw_box.press("Enter")
            page.wait_for_url(re.compile(r"www\.revu\.net"), timeout=45_000)
            page.wait_for_timeout(3000)
            if "v" not in token:
                page.goto(f"{WWW}/campaign", wait_until="domcontentloaded", timeout=60_000)
                page.wait_for_timeout(5000)
            if "v" not in token:
                # 화면이 토큰을 저장소에 두는 경우
                stored = page.evaluate("() => JSON.stringify({...localStorage})")
                m = re.search(r"eyJ[\w\-]+\.[\w\-]+\.[\w\-]+", stored)
                if m:
                    token["v"] = "Bearer " + m.group(0)
        except Exception:
            if DEBUG:
                _debug("revu_login.png", page.screenshot(full_page=True))
                _debug("revu_login.html", page.content())
                _debug("revu_url.txt", page.url)
            raise
        finally:
            _debug("revu_api_urls.txt", "\n".join(dict.fromkeys(seen_api)))
            browser.close()
    if "v" not in token:
        raise RuntimeError("로그인은 됐지만 토큰을 찾지 못함")
    return token["v"]


# ── 응답 → 공통 레코드 ─────────────────────────────────
_TYPE = {"local": "visit", "visit": "visit", "visiting": "visit", "product": "delivery",
         "delivery": "delivery", "shipping": "delivery", "reporter": "reporter", "press": "reporter",
         "purchase": "purchase", "market": "purchase"}
_CHANNEL = {"blog": "blog", "naver_blog": "blog", "instagram": "insta", "insta": "insta", "reels": "reels",
            "youtube": "youtube", "shorts": "shorts", "tiktok": "tiktok", "clip": "clip"}


def _first(o: dict, *keys):
    for k in keys:
        v = o.get(k)
        if v not in (None, "", []):
            return v
    return None


def parse(o: dict) -> dict | None:
    cid = _first(o, "id", "campaignId")
    title = _first(o, "title", "name", "campaignTitle")
    if not cid or not title:
        return None
    end = to_kst_date(_first(o, "requestEndedOn", "requestEndAt", "recruitEndAt", "applyEndAt", "endDate"))
    if end and end < today_kst():
        return None
    cat = _first(o, "category", "categoryName", "cat") or ""
    if isinstance(cat, dict):
        cat = cat.get("name") or cat.get("title") or ""
    kind = str(_first(o, "type", "campaignType", "kind") or "").lower()
    ctype = _TYPE.get(kind)
    if not ctype:
        ctype = "visit" if any(w in str(cat) for w in ("지역", "맛집", "방문", "여행", "숙박")) else "delivery"
    addr = _first(o, "address", "venueAddress", "localAddress", "addr") or ""
    if isinstance(addr, dict):
        addr = addr.get("address") or addr.get("roadAddress") or ""
    sido, sgg = split_address(addr)
    if not sido:
        sido = norm_sido(_first(o, "area", "region", "sido") or "")
    media = str(_first(o, "media", "mediaType", "channel") or "blog").lower()
    return make_item(
        site=SITE, sid=cid, url=f"{WWW}/campaign/{cid}",
        title=title, offer=str(_first(o, "item", "offer", "reward", "providedItem", "benefit") or ""),
        ctype=ctype, channel=_CHANNEL.get(media, "etc"),
        sido=sido, sigungu=sgg, site_category=str(cat), apply_end=end,
        recruit=_first(o, "reviewerLimit", "recruitCount", "limit", "quota"),
        applicants=_first(o, "requestCount", "applicantCount", "applyCount"),
    )


def collect() -> list[dict]:
    auth = login_token()
    headers = {"Authorization": auth, "Origin": WWW, "Referer": f"{WWW}/campaign"}
    out, seen = [], set()
    for page in range(1, MAX_PAGES + 1):
        res = fetch_json(API, params={"type": "all", "sort": "latest", "page": page, "limit": PAGE_SIZE},
                         headers=headers)
        rows = res.get("items") or res.get("data") or []
        if page == 1:
            _debug("revu_sample.json", {"keys": list(res.keys()), "total": res.get("total"), "first": rows[:2]})
        if not rows:
            break
        new = 0
        for o in rows:
            if o.get("id") in seen:
                continue
            seen.add(o.get("id"))
            new += 1
            it = parse(o)
            if it:
                out.append(it)
        if not new:
            break
        polite_sleep(1.2)  # 계정 보호: 천천히
    return out
