"""키플랫·데일리뷰 공통: 같은 솔루션이라 목록 화면이 쓰는 JSON 이 같다.

review_campaign_list.php?json=list&category_id=…&page=N (70건씩, total_page 까지). 상세·이미지는 읽지 않는다.
- 세부 카테고리를 먼저 돌아 사이트 분류를 붙이고, 상위 카테고리로 나머지를 줍는다(앞에서 잡힌 cp_id 가 이긴다).
- 유형은 cp_type_cut, 지역은 cp_addr1, 마감은 cp_day('D-Day 27'·'7일 남음' → 오늘 + N일).
"""
from __future__ import annotations

import html
import re
from datetime import datetime, timedelta

from common import KST, fetch_json, make_item, polite_sleep, split_address
from site_cometoplay import region

_TYPE = {"방문형": "visit", "배송형": "delivery", "기자단": "reporter", "구매형": "purchase", "공동구매": "purchase"}
_MEDIA = [("blog", "blog"), ("instagram_reels", "reels"), ("instagram", "insta"), ("clip", "clip"),
          ("youtube_shorts", "shorts"), ("youtube", "youtube"), ("tiktok", "tiktok")]
_TAG = re.compile(r"^\s*\[([^\]]{1,20})\]\s*")
_DUP_TAGS = {"기자단", "배송형", "방문형", "구매평", "구매형", "인스타", "릴스", "클립", "블로그"}
MAX_PAGES = 60


def _text(s) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", str(s or ""))).replace("\xa0", " ")).strip()


def clean_title(raw: str) -> str:
    """앞의 지역·유형 꼬리표를 뗀다. '[쇼핑몰]' 같이 뜻이 있는 꼬리표는 남긴다."""
    t = raw
    while (m := _TAG.match(t)) and (m[1] in _DUP_TAGS or "/" in m[1] or " " in m[1]):
        t = t[m.end():]
    return t.strip() or raw


def days_left(s) -> int | None:
    m = re.search(r"\d+", str(s or ""))
    if m:
        return int(m[0])
    return 0 if "D-Day" in str(s) or "오늘" in str(s) else None


def parse(x: dict, site: str, base: str, cat: str, today: datetime) -> dict | None:
    if "마감" in str(x.get("cp_day")):
        return None
    n = days_left(x.get("cp_day"))
    raw = _text(x.get("cp_subject"))
    sido, sgg = split_address(_text(x.get("cp_addr1")))
    tag = _TAG.match(raw)
    if not sido and tag:  # 주소가 빈 방문형은 제목 앞 '[세종시]' 꼬리표로 본다
        sido, sgg = region(tag[1].replace("/", " "))
    channel = next((c for k, c in _MEDIA if str(x.get(f"cp_media_{k}")) not in ("", "0", "None")), "etc")
    num = lambda k: int(x[k]) if str(x.get(k, "")).isdigit() else None  # noqa: E731
    return make_item(
        site=site, sid=x["cp_id"], url=f"{base}/review_campaign.php?cp_id={x['cp_id']}",
        title=clean_title(raw),
        offer=_text(x.get("cp_reward_cut") or x.get("cp_description")),
        ctype=_TYPE.get(x.get("cp_type_cut"), "etc"), channel=channel, sido=sido, sigungu=sgg, site_category=cat,
        apply_end=(today + timedelta(days=n)).strftime("%Y-%m-%d") if n is not None else None,
        recruit=num("cp_recruit_cut"), applicants=num("cp_order_cut"),
    )


def collect_site(site: str, label: str, base: str, cats: list[tuple[str, str]]) -> list[dict]:
    today = datetime.now(KST)
    out, seen = [], set()
    for cid, cat in cats:
        n0, page, last = len(out), 1, 1
        while page <= min(last, MAX_PAGES):
            d = fetch_json(f"{base}/review_campaign_list.php",
                           params={"json": "list", "category_id": cid, "page": page},
                           headers={"Referer": f"{base}/review_campaign_list.php?category_id={cid}",
                                    "X-Requested-With": "XMLHttpRequest"})
            polite_sleep(1.0)
            last = int(d.get("total_page") or 1)
            for x in d.get("list") or []:
                if x.get("cp_id") in seen:
                    continue
                seen.add(x.get("cp_id"))
                it = parse(x, site, base, cat, today)
                if it:
                    out.append(it)
            page += 1
        print(f"  {label} {cat or cid}: {len(out) - n0}건")
    return out


if __name__ == "__main__":  # 파싱 자체 점검
    assert clean_title("[용인/능원]15년 전통 순두부") == "15년 전통 순두부"
    assert clean_title("[충남 천안] 육본 천안점") == "육본 천안점"
    assert clean_title("[기자단] 파모스짐") == "파모스짐"
    assert clean_title("[쇼핑몰] 한우") == "[쇼핑몰] 한우"
    assert days_left("D-Day 27") == 27 and days_left("7일 남음") == 7
    assert days_left("D-Day") == 0 and days_left("") is None
    print("ok")
