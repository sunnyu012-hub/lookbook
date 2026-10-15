"""클라우드리뷰 (cloudreview.co.kr)

로그인 없이 보이는 채널별 목록 화면(/campaign/blog·instagram·short·buy)을 읽는다.
목록은 한 화면에 모집 중인 공고 전부가 HTML로 들어 있다(무한 스크롤 /campaign/blog_block 은 막혀 있고 404).
robots.txt 는 /app/standalone/campaign/·/app/ad/·/excel/ 등만 막고 목록·상세(/campaign/detail/N)는 허용(2026-10-15 확인).
- 제목: '[맛집] [경기 용인시] 곤드레밥 …' → 첫 꼬리표는 사이트 카테고리, 지역 꼬리표는 시/도·시/군/구로 뗀다.
- 유형: #방문형 visit · #리뷰형 reporter · #배송형+#페이백 purchase · #배송형 delivery.
- 마감: 'N일남음' → 오늘 + N일, 'D-Day' → 오늘 (상세의 모집 기간 끝날과 같음).
"""
from __future__ import annotations

import html
import re
from datetime import datetime, timedelta

from common import KST, SIGUNGU, fetch, make_item, norm_sido, polite_sleep

SITE = "cloudreview"
BASE = "https://cloudreview.co.kr"
# 채널별 목록 화면 하나가 곧 전체 목록이다 (10-15 기준 블로그 799·인스타 188·숏폼 281·구매평 25건).
PAGES = [("blog", "blog"), ("instagram", "insta"), ("short", None), ("buy", "etc")]

_CARD = re.compile(r'<div class="col-span-1 pt-4">')
_TAG = re.compile(r"^\s*\[([^\]]{1,20})\]\s*")


def _text(s: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", " ", s or "")).strip()


def _int(m):
    return int(m.group(1).replace(",", "")) if m else None


def _regions() -> dict[str, list[str]]:
    """시/군/구 전체 이름표 (common.SIGUNGU)."""
    return SIGUNGU


def region(tag: str, regions: dict[str, list[str]]) -> tuple[str | None, str | None] | None:
    """'경기 남양주'·'방문형/경기 여주시'·'고양 일산' → ('경기','남양주시') 등. 지역 꼬리표가 아니면 None."""
    words = tag.split("/")[-1].split()
    if not words:
        return None
    sido = norm_sido(words[0])
    rest = words[1:]
    if not sido:  # '고양 일산'처럼 시/도 없이 시 이름부터
        for sd, names in regions.items():
            if any(n.startswith(words[0]) and n[len(words[0]):] in ("시", "군", "구") for n in names):
                sido, rest = sd, words
                break
        else:
            return None
    if not rest or sido in ("세종", "전국"):
        return sido, None
    short = rest[0]
    for name in regions.get(sido, []):
        if name == short or (name.startswith(short) and name[len(short):] in ("시", "군", "구")):
            return sido, name
    return sido, short if re.search(r"(시|군|구)$", short) else None


def parse(card: str, channel: str | None, regions: dict, today: datetime) -> dict | None:
    pid = re.search(r"/campaign/detail/(\d+)", card)
    head = re.search(r'truncate pl-1 dark:text-gray-200">([^<]*)<', card)
    if not pid or not head:
        return None
    raw = _text(head.group(1))
    title, cat, sido, sgg = raw, "", None, None
    m = _TAG.match(title)
    if m:
        cat, title = m.group(1).strip(), title[m.end():]
    m = _TAG.match(title)
    if m and (r := region(m.group(1), regions)):
        (sido, sgg), title = r, title[m.end():]
    tags = re.findall(r">#([^<]+)</span>", card)
    if "방문형" in tags:
        ctype = "visit"
    elif "리뷰형" in tags:
        ctype = "reporter"
    elif "페이백" in tags:
        ctype = "purchase"
    else:
        ctype = "delivery"
    if channel is None:  # 숏폼 화면: 아이콘으로 클립/릴스 구분
        channel = "clip" if "clip.png" in card else "reels" if "url(#a)" in card else "etc"
    left = re.search(r"(\d+)\s*일남음", card)
    end = today + timedelta(days=int(left.group(1))) if left else (today if "D-Day" in card else None)
    offer = re.search(r'dark:text-sky-300"><a[^>]*>(.*?)</a>', card, re.S)
    return make_item(
        site=SITE, sid=pid.group(1), url=f"{BASE}/campaign/detail/{pid.group(1)}",
        title=title.strip() or raw, offer=_text(offer.group(1)) if offer else "",
        ctype=ctype, channel=channel, sido=sido, sigungu=sgg, site_category=cat,
        apply_end=end.strftime("%Y-%m-%d") if end else None,
        recruit=_int(re.search(r"([\d,]+)인 모집", card)), applicants=_int(re.search(r"([\d,]+)인 참여", card)),
    )


def collect() -> list[dict]:
    regions = _regions()
    today = datetime.now(KST)
    out, seen = [], set()
    for path, channel in PAGES:
        polite_sleep(1.0)
        body = fetch(f"{BASE}/campaign/{path}", headers={"Referer": f"{BASE}/"}).decode("utf-8", "replace")
        lists = body.find('id="campaign-lists"')
        n0 = len(out)
        for card in _CARD.split(body[lists:])[1:] if lists >= 0 else []:
            it = parse(card, channel, regions, today)
            if it and it["id"] not in seen:
                seen.add(it["id"])
                out.append(it)
        print(f"  클라우드리뷰 {path}: {len(out) - n0}건")
    return out


if __name__ == "__main__":
    R = {"경기": ["남양주시", "고양시", "여주시"], "전남": ["목포시"], "서울": ["송파구"]}
    assert region("경기 남양주", R) == ("경기", "남양주시")
    assert region("고양 일산", R) == ("경기", "고양시")
    assert region("방문형/경기 여주시", R) == ("경기", "여주시")
    assert region("전남광주 목포", R) == ("전남", "목포시")
    assert region("서울  송파", R) == ("서울", "송파구")
    assert region("착불", R) is None and region("리뷰연장X", R) is None
    print("ok")
