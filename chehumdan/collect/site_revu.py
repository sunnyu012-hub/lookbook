"""레뷰 (www.revu.net) — 부계정 로그인 후 목록 수집. 사무실 PC(self-hosted runner)에서만 돈다.

공고 목록 API(api.weble.net/v1/campaigns)는 로그인 토큰이 있어야 열린다.
화면 없는 크롬(Playwright)으로 레뷰를 열어, 레뷰 화면이 API에 보내는 Authorization 토큰을 받아 쓴다.

로그인 방법 (위가 우선)
1. 저장된 로그인 상태: 사람이 revu_login.py(tools/revu-login.ps1)로 한 번 로그인해 둔 파일.
   SNS(네이버·카카오) 부계정은 이 방식. 만료되면 같은 SNS 버튼을 눌러 조용히 다시 로그인해 본다.
   파일: CHEHUMDAN_REVU_STATE (기본 C:\\chehumdan\\revu-state.json)
2. 이메일 계정: REVU_ID, REVU_PW (GitHub Secrets)
디버그: CHEHUMDAN_DEBUG 폴더를 주면 실패 때 화면 캡처·HTML·받은 API 주소를 남긴다(비밀값은 가림).
"""
from __future__ import annotations

import json
import os
import re
import urllib.parse
from pathlib import Path

from common import UA, fetch_json, make_item, norm_sido, polite_sleep, split_address, to_kst_date, today_kst

SITE = "revu"
WWW = "https://www.revu.net"
API = "https://api.weble.net/v1/campaigns"
PAGE_SIZE = 30
MAX_PAGES = 300
CATS = ["지역", "제품", "서비스", "기자단"]  # 상위 분류. 같은 공고가 겹치면 id 로 거른다
MEDIA = ["blog", "instagram", "youtube", "clip", "etc"]

DEBUG = Path(os.environ["CHEHUMDAN_DEBUG"]) if os.environ.get("CHEHUMDAN_DEBUG") else None
STATE = Path(os.environ.get("CHEHUMDAN_REVU_STATE", r"C:\chehumdan\revu-state.json"))
_PROVIDER_BUTTON = {"naver": "네이버", "kakao": "카카오", "google": "구글|Google", "apple": "Apple|애플",
                    "facebook": "페이스북|Facebook"}


def _debug(name: str, data) -> None:
    if not DEBUG:
        return
    DEBUG.mkdir(parents=True, exist_ok=True)
    p = DEBUG / name
    if isinstance(data, bytes):
        p.write_bytes(data)
    else:
        text = data if isinstance(data, str) else json.dumps(data, ensure_ascii=False, indent=1)
        # 토큰·아이디·비밀번호는 남기지 않는다 (공개 저장소에 올라간다)
        text = re.sub(r"Bearer\s+[\w\-.]+", "Bearer [REDACTED]", text)
        text = re.sub(r"(users/|userId=)\d+", r"\1[REDACTED]", text)  # 부계정 번호
        for secret in (os.environ.get("REVU_PW"), os.environ.get("REVU_ID")):
            if secret:
                text = text.replace(secret, "[REDACTED]")
        p.write_text(text, encoding="utf-8")


def _find_token(page, token: dict) -> None:
    if "v" in token:
        return
    try:
        stored = page.evaluate("() => JSON.stringify({...localStorage})")
    except Exception:  # noqa: BLE001
        return
    m = re.search(r"eyJ[\w\-]+\.[\w\-]+\.[\w\-]+", stored or "")
    if m:
        token["v"] = "Bearer " + m.group(0)


def _open_login(page) -> None:
    """로그인 화면(www.revu.net/login: 이메일·비밀번호 칸 + SNS 버튼, 10-15 확인)으로 바로 간다.
    메인의 '로그인' 글자는 첫 번째가 버튼이 아닌 안내 문구라 누르면 안 넘어간다."""
    page.goto(f"{WWW}/login", wait_until="domcontentloaded", timeout=60_000)
    page.locator("input[type=password]").first.wait_for(timeout=30_000)
    page.wait_for_timeout(1000)


def _left_login(url: str) -> bool:
    return "revu.net" in url and "/login" not in url


def login_token() -> str:
    """로그인하고 api.weble.net 에 쓰는 'Bearer …' 값을 돌려준다."""
    from playwright.sync_api import sync_playwright

    uid, pw = os.environ.get("REVU_ID"), os.environ.get("REVU_PW")
    state = None
    if STATE.exists():
        state = json.loads(STATE.read_text(encoding="utf-8"))
    elif not (uid and pw):
        raise RuntimeError(f"로그인 정보 없음: {STATE} 도 REVU_ID/REVU_PW 도 없음 (KR_PC.md 참고)")
    provider = (state or {}).pop("chehumdan_provider", None)

    token: dict[str, str] = {}
    seen_api: list[str] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(locale="ko-KR", user_agent=UA, viewport={"width": 1280, "height": 900},
                                  storage_state=state)
        page = ctx.new_page()

        def on_request(req):
            if "api.weble.net" in req.url:
                seen_api.append(req.url)
                auth = req.headers.get("authorization", "")
                if auth.startswith("Bearer ") and len(auth) > 20:
                    token["v"] = auth

        ctx.on("request", on_request)
        try:
            if state is not None:
                # 1) 저장된 로그인 상태로 바로 공고 화면
                page.goto(f"{WWW}/campaign", wait_until="domcontentloaded", timeout=60_000)
                page.wait_for_timeout(5000)
                _find_token(page, token)
                if "v" not in token and provider in _PROVIDER_BUTTON:
                    # 만료됐으면 같은 SNS 버튼으로 조용히 다시 로그인 (SNS 쪽 로그인이 살아 있으면 통과)
                    _open_login(page)
                    page.locator(f"text=/{_PROVIDER_BUTTON[provider]}/").first.click()
                    page.wait_for_url(_left_login, timeout=45_000)
                    page.goto(f"{WWW}/campaign", wait_until="domcontentloaded", timeout=60_000)
                    page.wait_for_timeout(5000)
                    _find_token(page, token)
                if "v" not in token and not (uid and pw):
                    raise RuntimeError("레뷰 로그인이 만료됨 — 사무실 PC에서 로그인 도우미를 다시 실행해 주세요")
            if "v" not in token:
                # 2) 이메일 계정
                _open_login(page)
                token.clear()  # 로그인 전 손님용 토큰(/tokens)은 버린다
                page.locator("input[placeholder*='이메일'], input[type=email], input[type=text]").first.fill(uid)
                page.locator("input[type=password]").first.fill(pw)
                page.locator("button[type=submit]").first.click()
                page.wait_for_url(_left_login, timeout=45_000)
                page.goto(f"{WWW}/campaign", wait_until="domcontentloaded", timeout=60_000)
                page.wait_for_timeout(5000)
                _find_token(page, token)
            if "v" in token and state is not None:
                # 갱신된 쿠키를 다시 저장해서 로그인 상태를 오래 유지한다
                fresh = ctx.storage_state()
                fresh["chehumdan_provider"] = provider
                STATE.write_text(json.dumps(fresh, ensure_ascii=False), encoding="utf-8")
        except Exception:
            if DEBUG:
                _debug("revu_url.txt", page.url)
                try:  # 캡처가 시간 초과되면 원래 오류가 가려지므로 실패해도 넘어간다
                    _debug("revu_login.html", page.content())
                    _debug("revu_login.png", page.screenshot(timeout=10_000))
                except Exception:  # noqa: BLE001
                    pass
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
    """응답 필드는 10-15 첫 수집 샘플(_debug/revu_sample.json) 기준.
    이름은 item, 제공은 campaignData.reward, 유형은 category 배열('방문형'·'배송형'·'기자단'), 모집 중 = status REQUEST."""
    cid = o.get("id")
    title = _first(o, "item", "title")
    if not cid or not title or o.get("status") not in (None, "REQUEST") or o.get("active") is False:
        return None
    end = to_kst_date(o.get("requestEndedOn"))
    if not end or end < today_kst():
        return None
    cats = [c for c in (o.get("category") or []) if isinstance(c, str)]
    joined = " ".join(cats)
    if "기자단" in joined:
        ctype = "reporter"
    elif "구매평" in joined or (o.get("campaignOptions") or {}).get("onlyMarketReview"):
        ctype = "purchase"
    elif "포장" in joined:
        ctype = "takeout"
    elif "방문" in joined or "지역" in joined or o.get("localTag"):
        ctype = "visit"
    else:
        ctype = "delivery"
    venue = o.get("venue") or {}
    sido, sgg = split_address(venue.get("addressFirst") or "")
    if not sido and o.get("localTag"):
        sido, sgg = split_address(" ".join(map(str, o["localTag"])))
    media = str(o.get("media") or "blog").lower()
    channel = _CHANNEL.get(media, "etc")
    short = str((o.get("campaignOptions") or {}).get("shortForm") or "")
    if channel == "insta" and "reels" in short:
        channel = "reels"
    data = o.get("campaignData") or {}
    offer = str(data.get("reward") or "")
    if data.get("point"):
        offer = f"{offer} + {int(data['point']):,}P" if offer else f"{int(data['point']):,}P"
    site_cat = next((c for c in cats if c not in ("방문형", "배송형", "기자단", "프리미어형")), cats[0] if cats else "")
    return make_item(
        site=SITE, sid=cid, url=f"{WWW}/campaign/{cid}",
        title=title, offer=offer, ctype=ctype, channel=channel,
        sido=sido, sigungu=sgg, site_category=site_cat, apply_end=end,
        recruit=o.get("reviewerLimit"),
        applicants=(o.get("campaignStats") or {}).get("requestCount"),
    )


def _list_url(cat: str, page: int) -> str:
    """카테고리 화면이 부르는 목록 주소 그대로 (10-15 러너에서 확인). type=play = 모집 중."""
    q = [("cat", cat), ("limit", PAGE_SIZE)] + [("media[]", m) for m in MEDIA] + \
        [("page", page), ("sort", "latest"), ("type", "play")]
    return f"{API}?{urllib.parse.urlencode(q)}"


def collect() -> list[dict]:
    auth = login_token()
    headers = {"Authorization": auth, "Origin": WWW, "Referer": f"{WWW}/"}
    out, seen = [], set()
    for cat in CATS:
        empty = 0
        for page in range(1, MAX_PAGES + 1):
            try:
                res = fetch_json(_list_url(cat, page), headers=headers)
            except RuntimeError as e:
                if "404" in str(e) and page > 1:  # 마지막 쪽 다음은 404
                    break
                raise
            rows = res.get("items") or res.get("data") or []
            if cat == CATS[0] and page == 1:
                _debug("revu_sample.json", {"cat": cat, "keys": list(res.keys()), "total": res.get("total"),
                                            "first": rows[:2]})
            print(f"  레뷰 {cat} {page}쪽: {len(rows)}건 (전체 {res.get('total')})", flush=True)
            new = [o for o in rows if o.get("id") not in seen]
            if not new:
                break
            got = 0
            for o in new:
                seen.add(o.get("id"))
                it = parse(o)
                if it:
                    out.append(it)
                    got += 1
            empty = 0 if got else empty + 1
            if empty >= 3 or len(rows) < PAGE_SIZE:  # 덜 찬 쪽이 마지막 (지역 10-15: 2,494건 = 84쪽)
                break
            polite_sleep(1.2)  # 계정 보호: 천천히
    return out
