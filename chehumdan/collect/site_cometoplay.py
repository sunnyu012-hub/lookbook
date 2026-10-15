"""놀러와체험단 (www.cometoplay.kr)

로그인 없이 보이는 카테고리 목록 화면(/item_list.php?category_id=…&page=N, 20건씩, 서버 렌더링 HTML)을 읽는다.
JSON API·ajax 목록은 없다. robots.txt 는 `Allow: /` 전체 허용(2026-10-15 확인). 상세 페이지는 읽지 않는다.
- 하위 카테고리(맛집·뷰티·생활…)별로 돌아서 사이트 카테고리를 붙인다. 마감된 공고는 썸네일에 'end' 표시 → 뺀다.
- 마감: 'D-day N' → 오늘 + N일 (리뷰어 신청 마지막 날과 일치).
- 지역: 제목 앞 `[서울 은평]` → '은평구' (아래 시군구표 기준). `[서울 신도림]`처럼 동네 이름이면 시/군/구는 비운다.
- 제공내역은 상세에만 있어 offer 는 비운다.
"""
from __future__ import annotations

import html
import re
from datetime import datetime, timedelta

from common import SIGUNGU, full_sigungu, KST, fetch, make_item, norm_sido, polite_sleep

SITE = "cometoplay"
BASE = "https://www.cometoplay.kr"
MAX_PAGES = 60  # 카테고리당, 20건씩 (10-15 기준 맛집이 가장 많아 약 9페이지)

# (category_id, 사이트 카테고리, 유형)
CATS = [
    ("001012", "맛집", "visit"), ("001013", "뷰티", "visit"), ("001014", "숙박", "visit"),
    ("001015", "문화", "visit"), ("001016", "배달", "takeout"), ("001017", "기타", "visit"),
    ("002006", "생활", "delivery"), ("002007", "디지털", "delivery"), ("002008", "패션", "delivery"),
    ("002009", "뷰티", "delivery"), ("002010", "식품", "delivery"), ("002011", "기타", "delivery"),
    ("004", "기자단", "reporter"),
]
_CHANNEL = {"blog": "blog", "insta": "insta", "instagram": "insta", "reels": "reels", "youtube": "youtube",
            "shorts": "shorts", "tiktok": "tiktok", "clip": "clip"}


# 시/군/구 대신 자주 쓰는 동네·옛 이름 (ponytail: 보이는 것만, 새로 나오면 추가)
_ALIAS = {"일산": ("경기", "고양시"), "동탄": ("경기", "화성시"), "거제도": ("경남", "거제시"), "세종": ("세종", None)}

_ITEM = re.compile(r"<li>\s*<div class=\"thumb\">(.*?)</li>", re.S)
_ID = re.compile(r"item\.php\?it_id=(\d+)")
_NAME = re.compile(r'<span class="it_name">(.*?)</span>', re.S)
_REGION = re.compile(r"^\s*\[([^\]]{1,20})\]\s*")
_DDAY = re.compile(r"D-day\s*(-?\d+)")
_NUM = re.compile(r"신청\s*([\d,]+)\s*명\s*/\s*모집\s*([\d,]+)")


def _text(s: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", " ", s or "")).strip()




def region(tag: str) -> tuple[str | None, str | None]:
    """'서울 은평' → ('서울','은평구'), '파주 운정' → ('경기','파주시'), '서울 신도림' → ('서울', None)."""
    parts = tag.split()
    if not parts:
        return None, None
    for p in parts:
        if p in _ALIAS:
            return _ALIAS[p]
    sido = norm_sido(parts[0])
    if sido:
        return sido, full_sigungu(sido, parts[1]) if len(parts) > 1 else None
    hits = [(s, n) for s, names in SIGUNGU.items() for n in names if parts[0] in (n, n[:-1])]
    return hits[0] if len(hits) == 1 else (None, None)


def parse(li: str, cat: str, ctype: str, today: datetime) -> dict | None:
    if '<div class="end">' in li:
        return None  # 마감
    pid, name = _ID.search(li), _NAME.search(li)
    if not pid or not name:
        return None
    raw = _text(name.group(1))
    sido = sgg = None
    m = _REGION.match(raw)
    title = raw
    if m:
        sido, sgg = region(m.group(1))
        title = raw[m.end():]
    d = _DDAY.search(li)
    if not d or int(d.group(1)) < 0:
        return None
    icon = re.findall(r'<i class="([^"]+)"', li)
    num = _NUM.search(_text(li))
    return make_item(
        site=SITE, sid=pid.group(1), url=f"{BASE}/item.php?it_id={pid.group(1)}",
        title=title.strip() or raw, ctype=ctype,
        channel=_CHANNEL.get(icon[0].lower(), "etc") if icon else "blog",
        sido=sido, sigungu=sgg, site_category=cat,
        apply_end=(today + timedelta(days=int(d.group(1)))).strftime("%Y-%m-%d"),
        recruit=int(num.group(2).replace(",", "")) if num else None,
        applicants=int(num.group(1).replace(",", "")) if num else None,
    )


def collect() -> list[dict]:
    today = datetime.now(KST)
    out, seen = [], set()
    for cid, cat, ctype in CATS:
        n0 = len(out)
        for page in range(1, MAX_PAGES + 1):
            body = fetch(f"{BASE}/item_list.php", params={"category_id": cid, "sst": "it_datetime", "sod": "desc", "page": page},
                         headers={"Referer": f"{BASE}/item_list.php?category_id={cid}"}).decode("utf-8", "replace")
            new = [li for li in _ITEM.findall(body) if (m := _ID.search(li)) and m.group(1) not in seen]
            for li in new:
                seen.add(_ID.search(li).group(1))
                it = parse(li, cat, ctype, today)
                if it:
                    out.append(it)
            polite_sleep(1.0)
            if not new or f"page={page + 1}'" not in body:
                break
        print(f"  놀러와 {cat}({cid}): {len(out) - n0}건")
    return out


if __name__ == "__main__":  # 지역 파싱 자체 점검
    for tag, want in [("서울 은평", ("서울", "은평구")), ("파주 운정", ("경기", "파주시")), ("서울 신도림", ("서울", None)),
                      ("일산 동구", ("경기", "고양시")), ("충북 세종", ("세종", None)), ("경기 광주", ("경기", "광주시"))]:
        assert region(tag) == want, (tag, region(tag))
    print("ok")
