"""체험뷰 (chvu.co.kr)

로그인 없이 보이는 캠페인 목록 화면(/campaign)이 쓰는 공개 API(/v2/campaigns?category=search)를 읽는다.
robots.txt 는 `/campaign/`(상세 페이지)만 막고 목록 화면·API 는 허용(2026-10-15 확인) — 상세는 읽지 않는다.
- 서비스(맛집·뷰티·운동…)별로 마감 가까운 순(sort=+close)으로 받는다. 모집 중(status=pending)이 앞에 오고
  선정 끝난 공고(ongoing·completed)가 뒤에 오므로, 모집 중이 아닌 공고가 보이면 그 서비스는 멈춘다.
- 한 페이지 최대 100건, page×count 가 5000을 넘으면 API가 거절한다(campaign_search_depth_exceeded).
- 지역: 제목 앞 `[서울/금천]` → '금천구' (아래 시군구표 기준). 사이트 지역표는 광주를 '전남광주'로 묶는다.
- 마감: closeAt(신청 마감, epoch ms) → KST 날짜.
"""
from __future__ import annotations

import re

from common import SIGUNGU, full_sigungu, NATIONWIDE, fetch_json, make_item, norm_sido, polite_sleep, to_kst_date, today_kst

SITE = "chvu"
BASE = "https://chvu.co.kr"
PAGE_SIZE = 100  # API 최대
MAX_PAGES = 50   # 서비스당 (100×50 = API 한도 5000건). 10-15 기준 가장 많은 뷰티가 3페이지

# 목록 화면 '서비스' 선택지 (값, 화면 이름). 공고 하나는 서비스 하나에만 속한다.
SERVICES = [("hotplaces", "맛집"), ("beauty", "뷰티"), ("exercise", "운동"), ("life", "생활"), ("food", "식품"),
            ("travel", "여행"), ("fashion", "패션"), ("parenting", "육아/출산"), ("pet", "반려동물"),
            ("education", "교육"), ("misc", "기타")]
_TYPE = {"visit": "visit", "delivery": "delivery", "report": "reporter", "purchase": "purchase"}
_SHORT = {"insta": "reels", "blog": "clip", "youtube": "shorts"}  # contentType=short-form 일 때
_CHANNEL = {"insta": "insta", "blog": "blog", "youtube": "youtube"}


_TAG = re.compile(r"^\s*\[([^\]]{1,20})\]\s*")




def region(tag: str) -> tuple[str | None, str | None]:
    """'서울/금천' → ('서울','금천구'), '전남광주/광산' → ('광주','광산구'), '세종' → ('세종', None), '기자단' → (None, None)."""
    big, _, small = (p.strip() for p in tag.partition("/"))
    if big == "전남광주":  # 사이트가 광주·전남을 한 지역으로 묶는다
        sgg = full_sigungu("광주", small)
        return ("광주", sgg) if sgg else ("전남", full_sigungu("전남", small))
    sido = norm_sido(big)
    if sido is None or sido == NATIONWIDE:
        return None, None
    return sido, full_sigungu(sido, small) if small and sido != "세종" else None


def parse(o: dict, cat: str) -> dict | None:
    if o.get("status") != "pending":
        return None
    end = to_kst_date(o.get("closeAt"))
    if not end or end < today_kst():
        return None
    title, sido, sgg = o.get("title") or "", None, None
    while m := _TAG.match(title):  # [서울/금천] 지역 꼬리표, [기자단]·[구매형체험단] 같은 유형 꼬리표를 뗀다
        if sido is None:
            sido, sgg = region(m.group(1))
        title = title[m.end():]
    ctype = _TYPE.get(o.get("activity"), "etc")
    if ctype == "etc" and sido is None:
        sido = NATIONWIDE  # 기타 유형은 화상수업·온라인 사주 같은 비대면 서비스
    ch = o.get("channel")
    if ch == "misc":
        channel = "tiktok" if "틱톡" in (o.get("miscChannel") or "") else "etc"
    else:
        channel = (_SHORT if o.get("contentType") == "short-form" else _CHANNEL).get(ch, "etc")
    offer = o.get("subtitle") or ""
    if o.get("rewardPoint") and "포인트" not in offer:
        offer = f"{offer} (+{o['rewardPoint']:,}P)".strip()
    return make_item(
        site=SITE, sid=o["campaignId"], url=f"{BASE}/campaign/{o['campaignId']}",
        title=title.strip() or o.get("title") or "", offer=offer,
        ctype=ctype, channel=channel, sido=sido, sigungu=sgg, site_category=cat,
        apply_end=end, recruit=o.get("reviewerLimit"), applicants=o.get("currentApplicants"),
    )


def collect() -> list[dict]:
    out, seen = [], set()
    for svc, cat in SERVICES:
        n0 = len(out)
        for page in range(1, MAX_PAGES + 1):
            rows = fetch_json(f"{BASE}/v2/campaigns",
                              params={"category": "search", "services": svc, "sort": "+close",
                                      "page": page, "count": PAGE_SIZE},
                              headers={"Referer": f"{BASE}/campaign"}).get("data") or []
            for o in rows:
                if o.get("campaignId") in seen:
                    continue
                seen.add(o.get("campaignId"))
                it = parse(o, cat)
                if it:
                    out.append(it)
            polite_sleep(1.0)
            if len(rows) < PAGE_SIZE or any(o.get("status") != "pending" for o in rows):
                break  # 모집 중 공고가 다 나왔다
        print(f"  체험뷰 {cat}: {len(out) - n0}건")
    return out


if __name__ == "__main__":
    assert region("서울/금천") == ("서울", "금천구")
    assert region("경기/수원") == ("경기", "수원시")
    assert region("부산/부산진구") == ("부산", "부산진구")
    assert region("전남광주/광산") == ("광주", "광산구")
    assert region("전남광주/순천") == ("전남", "순천시")
    assert region("인천/서해") == ("인천", "서해구")
    assert region("세종") == ("세종", None)
    assert region("기자단") == (None, None) and region("구매형체험단") == (None, None)
    print("ok")
