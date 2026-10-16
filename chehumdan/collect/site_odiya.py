"""어디야 체험단 (odiya.kr)

로그인 없이 보이는 카테고리 목록 화면(/category.php?category=…&start=N, 85건씩, 서버 렌더링 HTML)을 읽는다.
JSON API·ajax 목록은 없다. 상세 페이지는 읽지 않는다.
robots.txt 는 `/category/`·`/detail/` 같은 폴더 경로만 막고 실제 주소인 /category.php 는 막지 않는다(2026-10-15 확인).
다만 목록을 막으려던 의도로 보여, 포포몬처럼 알고도 수집하기로 사용자가 정했다(10-16). 한국 PC에서 하루 2번, 요청 사이 1초.
- 목록은 모집 중 → 마감 순이라, 모집 중 공고가 없는 페이지가 나오면 그 카테고리는 끝.
- 마감: 카드의 '리뷰어신청 D-N' → 오늘 + N일 ('D-Day' = 오늘, '마감'은 뺀다).
- 지역: 제목 앞 `[서울 성북]` → '성북구' (놀러와체험단 모듈의 시군구표를 같이 쓴다).
- 목록 제목·제공내역은 사이트가 20자 안팎에서 '...'로 자른다. 자른 그대로 둔다.
"""
from __future__ import annotations

import html
import re
from datetime import datetime, timedelta

from common import KST, fetch, make_item, polite_sleep
from site_cometoplay import region  # ponytail: 시군구표를 common.py 로 옮기면 거기서 import

SITE = "odiya"
BASE = "https://odiya.kr"
PAGE = 85
MAX_PAGES = 20  # 카테고리당 (10-15 기준 맛집 모집 중이 약 3페이지)

# (category, 사이트 카테고리, 유형) — None 이면 지역 꼬리표가 있으면 방문형, 없으면 배송형
CATS = [("829", "맛집", "visit"), ("832", "체험", "visit"), ("1016", "제품", "delivery"),
        ("1020", "배송형", "delivery"), ("834", "기자단", "reporter"), ("1023", "사진촬영만", None)]
_CHANNEL = {"blog": "blog", "editor": "blog", "insta": "insta", "instagram": "insta", "reels": "reels",
            "youtube": "youtube", "shorts": "shorts", "tiktok": "tiktok", "clip": "clip"}

_NUM = re.compile(r"number=(\d+)&(?:amp;)?category=\d+")
_DDAY = re.compile(r"리뷰어신청</strong></td>\s*<td[^>]*><strong>([^<]*)<")
_TITLE = re.compile(r'letter_s2"[^>]*><strong[^>]*>(.*?)</strong>.*?<td class="font_14 font_malgun letter_s1"[^>]*>(.*?)</td>', re.S)
_ICON = re.compile(r'<img src="/img/([a-z_]+)\.png">')
_COUNT = re.compile(r"신청\s*([\d,]+)\s*/\s*모집\s*([\d,]+)")
_REGION = re.compile(r"^\s*\[([^\]]{1,20})\]\s*\+?\s*")


def _text(s: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s or "")).replace("\xa0", " ")).strip()


def _cut(s: str) -> str:
    return re.sub(r"\s*\.{2,}$", "", s).strip()


def parse(blk: str, cat: str, ctype: str | None, today: datetime) -> dict | None:
    pid, d, t = _NUM.search(blk), _DDAY.search(blk), _TITLE.search(blk)
    if not pid or not d or not t:
        return None  # 모집 안내 없는 카드(하단 베스트 리뷰 등)
    m = re.fullmatch(r"D-(\d+|Day)", d.group(1).strip(), re.I)
    if not m:
        return None  # 마감
    end = today + timedelta(days=0 if m.group(1).lower() == "day" else int(m.group(1)))
    raw = _cut(_text(t.group(1)))
    offer = _cut(_text(t.group(2)))
    if offer == raw:
        offer = ""  # 기자단 카드는 제공내역 칸에 제목을 한 번 더 쓴다
    title, sido, sgg = raw, None, None
    r = _REGION.match(raw)
    if r:
        sido, sgg = region(r.group(1))
        if sido == "부산" and not sgg and "진구" in r.group(1):
            sgg = "부산진구"  # 사이트가 '[부산 진구]'로 줄여 쓴다
        if sido:
            title = raw[r.end():]
    if ctype is None:
        ctype = "visit" if sido and sido != "전국" else "delivery"
    if ctype == "visit" and offer.startswith("(포장)"):
        ctype = "takeout"
    icon = _ICON.search(blk)
    num = _COUNT.search(_text(blk))
    return make_item(
        site=SITE, sid=pid.group(1), url=f"{BASE}/detail.php?number={pid.group(1)}&category={cat}",
        title=title.strip() or raw, offer=offer, ctype=ctype,
        channel=_CHANNEL.get(icon.group(1), "etc") if icon else "blog",
        sido=sido, sigungu=sgg, site_category=dict((c, n) for c, n, _ in CATS)[cat],
        apply_end=end.strftime("%Y-%m-%d"),
        recruit=int(num.group(2).replace(",", "")) if num else None,
        applicants=int(num.group(1).replace(",", "")) if num else None,
    )


def collect() -> list[dict]:
    today = datetime.now(KST)
    out, seen = [], set()
    for cat, name, ctype in CATS:
        n0 = len(out)
        for page in range(MAX_PAGES):
            body = fetch(f"{BASE}/category.php", params={"start": page * PAGE, "category": cat},
                         headers={"Referer": f"{BASE}/"}).decode("utf-8", "replace")
            polite_sleep(1.0)
            opened = 0
            for blk in body.split('<div class="over_row">')[1:]:
                pid = _NUM.search(blk)
                if not pid or pid.group(1) in seen:
                    continue
                it = parse(blk, cat, ctype, today)
                if it:
                    seen.add(pid.group(1))
                    out.append(it)
                    opened += 1
            if not opened:
                break  # 이 페이지부터는 마감 공고뿐
        print(f"  어디야 {name}: {len(out) - n0}건")
    return out
