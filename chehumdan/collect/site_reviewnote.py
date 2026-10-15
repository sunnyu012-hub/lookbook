"""리뷰노트 (www.reviewnote.co.kr)

로그인 없이 보이는 /campaigns 목록이 쓰는 공개 API(/api/v2/campaigns)를 읽는다.
robots.txt: /campaigns/(상세)·/users/·/applies/ 금지 — 상세 페이지는 읽지 않는다.
"""
from __future__ import annotations

from common import fetch_json, make_item, norm_sido, polite_sleep, to_kst_date

SITE = "reviewnote"
BASE = "https://www.reviewnote.co.kr"
MAX_PAGES = 800   # 한 페이지 16건(사이트가 정한 최대) → 최대 12,800건
PAGE_SIZE = 16

_TYPE = {"VISIT": "visit", "DELIVERY": "delivery", "REPORTER": "reporter",
         "TAKEOUT": "takeout", "PAYBACK": "purchase", "PURCHASE": "purchase", "ETC": "etc"}
_CHANNEL = {"BLOG": "blog", "BLOG_CLIP": "clip", "CLIP": "clip", "INSTAGRAM": "insta", "REELS": "reels",
            "YOUTUBE": "youtube", "SHORTS": "shorts", "TIKTOK": "tiktok"}


def parse(o: dict) -> dict | None:
    if o.get("status") not in (None, "SELECT", "PROGRESS", "RECRUIT", "OPEN"):
        return None
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
        apply_end=to_kst_date(o.get("applyEndAt")),
        recruit=o.get("infNum"), applicants=o.get("applicantCount"),
    )


def collect() -> list[dict]:
    out, seen = [], set()
    for page in range(MAX_PAGES):
        data = fetch_json(f"{BASE}/api/v2/campaigns", params={"page": page, "limit": PAGE_SIZE, "s": "default"},
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
        polite_sleep(0.7)
    return out
