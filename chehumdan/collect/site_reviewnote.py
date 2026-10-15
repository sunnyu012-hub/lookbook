"""리뷰노트 (www.reviewnote.co.kr)

로그인 없이 보이는 /campaigns 목록이 쓰는 공개 API(/api/v2/campaigns)를 읽는다.
robots.txt: /campaigns/(상세)·/users/·/applies/ 금지 — 상세 페이지는 읽지 않는다.
"""
from __future__ import annotations

from common import fetch_json, make_item, norm_sido, polite_sleep, to_kst_date, today_kst

SITE = "reviewnote"
BASE = "https://www.reviewnote.co.kr"
MAX_PAGES = 790   # 한 페이지 16건(사이트가 정한 최대). 사이트가 약 800페이지에서 끊는다
PAGE_SIZE = 16

# 모집 중 상태만 받는다. SELECT=모집(선정 전), PROGRESS=상시 모집형(구매평 등).
# 목록 API는 신청 마감일이 먼 순서로 준다.
OPEN_STATUS = {"SELECT", "PROGRESS"}

_TYPE = {"VISIT": "visit", "DELIVERY": "delivery", "REPORTER": "reporter",
         "TAKEOUT": "takeout", "PAYBACK": "purchase", "PURCHASE": "purchase", "ETC": "etc"}
_CHANNEL = {"BLOG": "blog", "BLOG_CLIP": "clip", "CLIP": "clip", "INSTAGRAM": "insta", "REELS": "reels",
            "YOUTUBE": "youtube", "SHORTS": "shorts", "TIKTOK": "tiktok"}


def parse(o: dict) -> dict | None:
    if o.get("status") not in OPEN_STATUS:
        return None
    end = to_kst_date(o.get("applyEndAt"))
    if not end or end < today_kst():
        return None  # 신청 마감이 지났으면 체험·리뷰 단계
    ctype = _TYPE.get(o.get("sort") or "", "etc")
    sido = norm_sido(o.get("city"))
    sgg = (o.get("sido") or {}).get("name")  # 리뷰노트의 'sido' 필드는 실제로 시/군/구
    if sgg and norm_sido(sgg) == "전국":
        sgg = None
    # 방문형인데 '재택'이면 실제로는 장소가 없는 공고
    if ctype == "visit" and sido == "전국":
        ctype = "etc"
    return make_item(
        site=SITE, sid=o["id"], url=f"{BASE}/campaigns/{o['id']}",
        title=o.get("title") or "", offer=o.get("offer") or "",
        ctype=ctype, channel=_CHANNEL.get(o.get("channel") or "", "etc"),
        sido=sido, sigungu=sgg,
        site_category=(o.get("category") or {}).get("title") or "",
        apply_end=end,
        recruit=o.get("infNum"), applicants=o.get("applicantCount"),
    )


def _pages(city: str, seen: set, out: list) -> int:
    """한 지역(city)의 목록을 끝까지 넘긴다. 받은 새 공고 수를 돌려준다."""
    before = len(out)
    for page in range(MAX_PAGES):
        data = fetch_json(f"{BASE}/api/v2/campaigns",
                          params={"page": page, "limit": PAGE_SIZE, "s": "default", "city": city},
                          headers={"Referer": f"{BASE}/campaigns"})
        objs = data.get("objects") or []
        if objs and all(o.get("id") in seen for o in objs):
            break  # 같은 페이지가 반복되면 끝
        for o in objs:
            if o.get("id") in seen:
                continue
            seen.add(o.get("id"))
            it = parse(o)
            if it:
                out.append(it)
        if not data.get("has_more") or not objs:
            break
        polite_sleep(0.4)
    return len(out) - before


def collect() -> list[dict]:
    # 전체 목록은 약 800페이지(12,800건)에서 끊겨서, 시/도별로 나눠 받는다.
    sidos = fetch_json(f"{BASE}/api/v2/sidos", headers={"Referer": f"{BASE}/campaigns"})
    cities = [s["name"] for s in sidos if s.get("name")]
    out, seen = [], set()
    for city in cities:
        n = _pages(city, seen, out)
        print(f"  리뷰노트 {city}: {n}건")
    return out
