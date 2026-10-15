"""포포몬 (popomon.com)

로그인 없이 공고 목록 화면(/next/campaign)이 쓰는 API(/api_p/campaign/fetch_getcampaignlist)를 읽는다.
robots.txt 가 목록 수집을 금지하고 있지만, 사용자 결정으로 수집한다(2026-10-15). 요청 간격을 두고 천천히 돈다.
"""
from __future__ import annotations

import re

from common import fetch_json, make_item, norm_sido, polite_sleep, to_kst_date, today_kst

SITE = "popomon"
BASE = "https://popomon.com"
MAX_PAGES = 600  # 한 페이지 12건

# (큰 유형, 세부 유형) → 공통 유형
KINDS = [
    ("Lvisiting", "visiting", "visit"),
    ("Lvisiting", "reporting", "reporter"),
    ("Pshipping", "shipping", "delivery"),
    ("Pshipping", "buyReview", "purchase"),
]
_CHANNEL = {"BLOG": "blog", "INSTA": "insta", "INSTAGRAM": "insta", "REELS": "reels", "YOUTUBE": "youtube",
            "SHORTS": "shorts", "TIKTOK": "tiktok", "CLIP": "clip", "BLOG_CLIP": "clip"}
_CT = {"ROOMS": "숙박", "CAFEorRESTAURANT": "맛집", "RESTAURANT": "맛집", "CAFE": "카페", "LEISURE": "체험", "BEAUTYorFASHION": "뷰티",
       "BEAUTY": "뷰티", "FASHION": "패션", "FOOD": "식품", "LIFE": "생활", "ETC": "기타"}
_REGION = re.compile(r"^\s*\[([가-힣]{2,7})\s*/\s*([가-힣]{1,8})\]\s*")
_TAG = re.compile(r"^\s*\[[^\]]{1,12}\]\s*")


def _channel(cs: str) -> str:
    cs = (cs or "").upper()
    for k in ("REELS", "SHORTS", "TIKTOK", "YOUTUBE", "CLIP", "INSTA", "BLOG"):
        if k in cs:
            return _CHANNEL.get(k, "etc")
    return "etc"


def _int(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def parse(o: dict, ctype: str) -> dict | None:
    if o.get("C_state") not in (None, "ONGOING"):
        return None
    end = to_kst_date(o.get("C_regi_end_date"))
    if not end or end < today_kst():
        return None
    raw = o.get("C_title") or ""
    sido = sgg = None
    m = _REGION.match(raw)
    if m:
        sido = norm_sido(m.group(1))
        sgg = m.group(2) if re.search(r"(시|군|구)$", m.group(2)) else None
        title = raw[m.end():]
    else:
        title = raw
    while _TAG.match(title):  # [부산/광안리] 같은 꼬리표가 더 붙어 있으면 뗀다
        title = _TAG.sub("", title, count=1)
    offer = o.get("C_provision") or o.get("C_goods_name") or ""
    if o.get("transformedPrice"):
        offer = f"{offer} ({o['transformedPrice']})" if offer else o["transformedPrice"]
    return make_item(
        site=SITE, sid=o["C_idx"], url=f"{BASE}/campaignDetail/{o['C_idx']}",
        title=title.strip() or raw, offer=offer,
        ctype=ctype, channel=_channel(o.get("CS_type")),
        sido=sido, sigungu=sgg,
        site_category=_CT.get(o.get("CT_type") or "", o.get("CT_type") or ""),
        apply_end=end,
        recruit=_int(o.get("C_choice_count")), applicants=_int(o.get("C_volunteer_count")),
    )


def collect() -> list[dict]:
    out, seen = [], set()
    for big, kind, ctype in KINDS:
        n0 = len(out)
        for page in range(MAX_PAGES):
            params = {"searchAlign": "latest", "bigRecruitType": big, "recruitType": kind,
                      "interestsFilter": "ALL", "pageNum": page}
            if big == "Lvisiting":
                params["cityLocation"] = "ALL"
            res = fetch_json(f"{BASE}/api_p/campaign/fetch_getcampaignlist", params=params,
                             headers={"Referer": f"{BASE}/next/campaign"})
            rows = (res.get("data") or {}).get("contentsData") or []
            new = 0
            for o in rows:
                if o.get("C_idx") in seen:
                    continue
                seen.add(o.get("C_idx"))
                new += 1
                it = parse(o, ctype)
                if it:
                    out.append(it)
            if len(rows) < 12 or not new:
                break
            polite_sleep(0.8)
        print(f"  포포몬 {kind}: {len(out) - n0}건")
    return out
