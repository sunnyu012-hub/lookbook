"""오늘도리뷰 (reviewtoday.co.kr) — robots 허용(category.php 는 막지 않음), 로그인 없음.

어디야·링블과 비슷한 happyCGI 계열. category.php?category=…&start=N (1부터, 25건씩) 서버 렌더링 HTML.
카드: 제목 `[부산/수영구] …`, 제공내역, `신청/모집`, `방문/맛집` 분류, `D-14`. 위쪽 프리미엄 칸과 겹치니 번호로 한 번만 담는다.
"""
from __future__ import annotations

import html
import re
from datetime import datetime, timedelta

from common import KST, fetch, make_item, polite_sleep
from site_cometoplay import region

SITE = "reviewtoday"
BASE = "https://reviewtoday.co.kr"
CATS = [829, 832, 1019, 1020, 1200, 1300]  # 방문·제품·기자단·페이백·릴스·클립
MAX_PAGES = 40
_TITLE = re.compile(r'common_rows_title[^>]*href="detail\.php\?number=(\d+)[^"]*">([^<]*)<')
_OFFER = re.compile(r'common_rows_hongbo[^>]*>([^<]*)<')
_PEOPLE = re.compile(r'common_rows_people.*?</span>\s*(?:<span>)?(\d+)(?:</span>)?\s*/\s*(\d+)', re.S)
_CATE = re.compile(r'rows_cate">([^<]+)<')
_DDAY = re.compile(r'common_rows_dday">\s*([^<]+?)\s*<')
_ICON = re.compile(r'common_rows_sns">(.*?)</span>', re.S)
_TAG = re.compile(r"^\s*\[([^\]]{1,20})\]\s*")
_TYPE = {"방문": "visit", "제품": "delivery", "기자단": "reporter", "페이백": "purchase"}


def channel(icons: str) -> str:
    for word, ch in (("blog", "blog"), ("reels", "reels"), ("insta", "insta"), ("clip", "clip"),
                     ("short", "shorts"), ("youtube", "youtube"), ("tiktok", "tiktok")):
        if word in icons:
            return ch
    return "etc"


def parse(card: str, today: datetime) -> dict | None:
    t, dd = _TITLE.search(card), _DDAY.search(card)
    if not t or not dd:
        return None
    m = re.fullmatch(r"D-(\d+|day)", dd[1], re.I)
    if not m:  # 마감·예정
        return None
    left = int(m[1]) if m[1].isdigit() else 0
    cate = _CATE.search(card)
    big, _, small = (cate[1] if cate else "").partition("/")
    ctype = _TYPE.get(big.strip(), "visit")
    raw = html.unescape(t[2]).strip()
    title, sido, sgg = raw, None, None
    tag = _TAG.match(raw)
    if tag:
        title = raw[tag.end():]
        if ctype == "visit":
            sido, sgg = region(tag[1].replace("/", " "))
    offer, ppl, icon = _OFFER.search(card), _PEOPLE.search(card), _ICON.search(card)
    return make_item(
        site=SITE, sid=t[1], url=f"{BASE}/detail.php?number={t[1]}", title=title.strip() or raw,
        offer=html.unescape(offer[1]) if offer else "", ctype=ctype, channel=channel(icon[1] if icon else ""),
        sido=sido, sigungu=sgg, site_category=small.strip() or big.strip(),
        apply_end=(today + timedelta(days=left)).strftime("%Y-%m-%d"),
        recruit=int(ppl[2]) if ppl else None, applicants=int(ppl[1]) if ppl else None,
    )


def collect() -> list[dict]:
    today = datetime.now(KST)
    out, seen = [], set()
    for cat in CATS:
        n0 = len(out)
        for page in range(1, MAX_PAGES + 1):
            body = fetch(f"{BASE}/category.php", params={"category": cat, "start": page}).decode("utf-8", "replace")
            polite_sleep(1.0)
            new = 0
            for card in body.split('class="list_graph_rows"')[1:]:
                t = _TITLE.search(card)
                if not t or t[1] in seen:
                    continue
                seen.add(t[1])
                new += 1
                it = parse(card, today)
                if it:
                    out.append(it)
            if not new:
                break
        print(f"  오늘도리뷰 {cat}: {len(out) - n0}건")
    return out
