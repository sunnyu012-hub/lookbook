"""똑똑 리워드 (ddok.it) — 똑똑체험단(ddok.co.kr)이 2026-07-31 종료하고 옮겨 간 새 플랫폼.

로그인 없이 캠페인 목록 화면(/campaigns)이 쓰는 API(/api/campaigns?limit=&cursor=)를 읽는다.
robots.txt 는 /admin·/mypage·/auth 등만 막고 /campaigns·/api/campaigns 는 허용(2026-10-15 확인).
- 목록에 마감된 공고(isExpired)도 섞여 오므로 status == 'recruiting' 이고 모집 마감일이 안 지난 것만 남긴다.
- 제목 칸은 '방문형 캠페인' 같은 고정 문구라 업체·브랜드명(visitInfo.companyName)을 제목으로 쓴다.
"""
from __future__ import annotations

from common import fetch_json, make_item, polite_sleep, split_address, to_kst_date, today_kst

SITE = "ddok"
BASE = "https://ddok.it"
LIMIT = 50
MAX_PAGES = 100

_TYPE = {"visit": "visit", "delivery": "delivery", "press": "reporter"}
_CHANNEL = {"blog": "blog", "influencer_blog": "blog", "blog_p": "blog", "blog_pp": "blog",
            "naver_clip": "clip", "instagram_feed": "insta", "instagram_reels": "reels",
            "youtube_shorts": "shorts", "youtube_long": "youtube", "tiktok": "tiktok"}


def _int(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def parse(o: dict) -> dict | None:
    if o.get("status") != "recruiting" or o.get("isExpired"):
        return None
    end = to_kst_date(o.get("recruitDeadline") or o.get("deadline"))
    if not end or end < today_kst():
        return None
    v = o.get("visitInfo") or {}
    chs = (o.get("channels") or []) + (o.get("additionalChannels") or [])
    ctype = _TYPE.get(o.get("campaignType"), "etc")
    if any(c.startswith("purchase_review") for c in chs):
        ctype = "purchase"
    elif "delivery_service" in chs:  # 배달앱 주문 후기
        ctype = "takeout"
    channel = next((_CHANNEL[c] for c in chs if c in _CHANNEL), "etc")
    region = (o.get("region") or "").replace("·", " ")
    sido, sgg = split_address(region)
    if not sido:
        sido, sgg = split_address(v.get("address"))
    offer = (v.get("experienceBenefits") or (o.get("deliveryInfo") or {}).get("productName") or "").strip().split("\n")[0]
    fee = _int(v.get("manuscriptFee")) or _int(o.get("adFee")) or 0
    if fee:
        offer = f"{offer} + 원고료 {fee:,}원" if offer else f"원고료 {fee:,}원"
    return make_item(
        site=SITE, sid=o["id"], url=f"{BASE}/campaigns/{o['id']}",
        title=(v.get("companyName") or "").strip() or o.get("title") or "",
        offer=offer, ctype=ctype, channel=channel, sido=sido, sigungu=sgg,
        site_category=o.get("category") or "", apply_end=end,
        recruit=_int(o.get("maxInfluencers")), applicants=_int(o.get("currentApplicants")),
    )


def collect() -> list[dict]:
    out, seen, cursor = [], set(), None
    for _ in range(MAX_PAGES):
        params = {"limit": LIMIT}
        if cursor:
            params["cursor"] = cursor
        res = fetch_json(f"{BASE}/api/campaigns", params=params, headers={"Referer": f"{BASE}/campaigns"})
        rows = res.get("campaigns") or []
        for o in rows:
            if o.get("id") in seen:
                continue
            seen.add(o.get("id"))
            it = parse(o)
            if it:
                out.append(it)
        cursor = res.get("nextCursor")
        if not cursor or not rows:
            break
        polite_sleep(1.0)
    return out
