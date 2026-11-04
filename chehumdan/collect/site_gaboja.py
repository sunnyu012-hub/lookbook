"""가보자체험단 (가보자체험단.com = xn--o39a04kpnjo4k9hgflp.com)

robots.txt 가 /cmp·/ajax 를 막지만 사용자 결정(11-04)으로 알고도 수집. 요청 사이 1초 이상, 하루 2번.
목록 화면의 무한 스크롤이 부르는 POST /main/ajax/_ajax.cmpSubList.php (ct1, page=0부터, list=건수) HTML 조각만 읽는다.
"""
from __future__ import annotations

import html
import re
import urllib.parse
from datetime import datetime, timedelta

from common import KST, fetch, make_item, polite_sleep
from site_cometoplay import region

SITE = "gaboja"
BASE = "https://www.xn--o39a04kpnjo4k9hgflp.com"
LIST = 100
MAX_PAGES = 60
CATS = [("11", "지역"), ("10", "제품"), ("14", "기자단"), ("", "")]
_CARD = re.compile(r'/cmp/\?id=(\d+)".*?<i class="(\w+)[^"]*"></i>\s*<span>([^<]*)</span>\s*</li>\s*<li>([^<]*)</li>'
                   r'.*?<dt>(.*?)</dt>\s*<dd>(.*?)</dd>.*?신청\s*([\d,]+).*?모집\s*([\d,]+)', re.S)
_TAG = re.compile(r"^\s*\[([^\]]{1,20})\]\s*")
_TYPE = {"방문형": "visit", "배송형": "delivery", "기자단": "reporter", "포장": "takeout", "구매평": "purchase"}
_CHANNEL = {"blog": "blog", "insta": "insta", "reels": "reels", "youtube": "youtube", "shorts": "shorts",
            "clip": "clip", "tiktok": "tiktok"}


def _text(s: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def parse(m: re.Match, cat: str, today: datetime) -> dict | None:
    left = m[4].strip()
    d = re.search(r"\d+", left)
    if not d and "오늘" not in left:
        return None
    raw, ctype = _text(m[5]), _TYPE.get(m[3].strip(), "etc")
    title, sido, sgg = raw, None, None
    tag = _TAG.match(raw)
    if tag:
        title = raw[tag.end():]
        if ctype == "visit":
            sido, sgg = region(tag[1].replace("/", " "))
    return make_item(
        site=SITE, sid=m[1], url=f"{BASE}/cmp/?id={m[1]}", title=title.strip() or raw, offer=_text(m[6]),
        ctype=ctype, channel=_CHANNEL.get(m[2], "etc"), sido=sido, sigungu=sgg, site_category=cat,
        apply_end=(today + timedelta(days=int(d[0]) if d else 0)).strftime("%Y-%m-%d"),
        recruit=int(m[8].replace(",", "")), applicants=int(m[7].replace(",", "")),
    )


def collect() -> list[dict]:
    today = datetime.now(KST)
    out, seen = [], set()
    for ct1, cat in CATS:
        n0 = len(out)
        for page in range(MAX_PAGES):
            data = urllib.parse.urlencode({"ct1": ct1, "page": page, "list": LIST}).encode()
            body = fetch(f"{BASE}/main/ajax/_ajax.cmpSubList.php", data=data, headers={
                "X-Requested-With": "XMLHttpRequest", "Referer": f"{BASE}/cmp/?ct1={ct1}",
                "Content-Type": "application/x-www-form-urlencoded"}).decode("utf-8", "replace")
            polite_sleep(1.0)
            new = 0
            for card in body.split('class="list_item"')[1:]:
                m = _CARD.search(card)
                if not m or m[1] in seen:
                    continue
                seen.add(m[1])
                new += 1
                it = parse(m, cat, today)
                if it:
                    out.append(it)
            if not new:
                break
        print(f"  가보자 {cat or '전체'}: {len(out) - n0}건")
    return out
