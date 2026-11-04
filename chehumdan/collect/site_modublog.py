"""모블 (modublog.co.kr)

robots.txt 가 첫 화면 외 전체를 막지만 사용자 결정(11-04)으로 알고도 수집. 요청 사이 1초 이상, 하루 2번.
목록 화면의 무한 스크롤이 부르는 POST /product_skin_ajax/ajax_list.php (list=시작 위치, list_num=건수) HTML 조각만 읽는다.
배송(deli=1)을 먼저 돌아 유형을 붙이고, 전체 목록으로 나머지를 줍는다.
"""
from __future__ import annotations

import html
import re
import urllib.parse
from datetime import datetime, timedelta

from common import KST, fetch, make_item, polite_sleep
from site_cometoplay import region

SITE = "modublog"
BASE = "https://www.modublog.co.kr"
NUM = 32
MAX_PAGES = 100
WALKS = [({"deli": 1}, "delivery"), ({"tht": "all"}, "visit"), ({"short": 1}, None), ({}, None)]
_ID = re.compile(r'/product/(\d+)"')
_TITLE = re.compile(r'<p class="c_title">\s*<a[^>]*>(.*?)</a>', re.S)
_OFFER = re.compile(r'class="(?:pr_subject_sub|bn_text)">(.*?)</p>', re.S)
_COUNT = re.compile(r'class="recruit">\s*신청\s*<strong>([\d,]+)</strong>.*?/\s*(?:</\w+>)?\s*([\d,]+)', re.S)
_LEFT = re.compile(r'class="deadline">(.*?)</span>', re.S)
_ICONS = re.compile(r'class="btn_ca[^"]*"[^>]*>([^<]+)<')
_TAG = re.compile(r"^\s*\[([^\]]{1,20})\]\s*")
_CHANNEL = {"블로그": "blog", "인스타": "insta", "릴스": "reels", "유튜브": "youtube", "쇼츠": "shorts",
            "클립": "clip", "틱톡": "tiktok"}


def _text(s: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def parse(sid: str, card: str, kind: str | None, today: datetime) -> dict | None:
    t, left = _TITLE.search(card), _LEFT.search(card)
    if not t or not left:
        return None
    when = _text(left[1])
    d = re.search(r"\d+", when)
    if "종료" in when:
        return None
    left_days = int(d[0]) if d else 1 if "내일" in when else 0 if "오늘" in when else None  # '바로체험' = 상시
    end = (today + timedelta(days=left_days)).strftime("%Y-%m-%d") if left_days is not None else None
    raw = _text(t[1])
    tag = _TAG.match(raw)
    title, sido, sgg = raw, None, None
    if tag:
        s, g = region(tag[1].replace("/", " "))
        if s:
            title, sido, sgg = raw[tag.end():], s, g
    icons = _ICONS.findall(card)
    ctype = kind or ("visit" if sido else "delivery")
    if tag and tag[1] == "서포터":
        ctype = "reporter"
    offer, count = _OFFER.search(card), _COUNT.search(card)
    return make_item(
        site=SITE, sid=sid, url=f"{BASE}/product/{sid}", title=title.strip() or raw,
        offer=_text(offer[1]) if offer else "", ctype=ctype,
        channel=next((_CHANNEL[i] for i in icons if i in _CHANNEL), "etc"),
        sido=sido, sigungu=sgg, apply_end=end,
        recruit=int(count[2].replace(",", "")) if count else None,
        applicants=int(count[1].replace(",", "")) if count else None,
    )


def collect() -> list[dict]:
    today = datetime.now(KST)
    out, seen = [], set()
    for extra, kind in WALKS:
        n0 = len(out)
        for page in range(MAX_PAGES):
            data = urllib.parse.urlencode({"list": page * NUM, "list_num": NUM, **extra}).encode()
            body = fetch(f"{BASE}/product_skin_ajax/ajax_list.php", data=data, headers={
                "X-Requested-With": "XMLHttpRequest", "Referer": f"{BASE}/product/",
                "Content-Type": "application/x-www-form-urlencoded"}).decode("utf-8", "replace")
            polite_sleep(1.0)
            new = 0
            for card in body.split('class="c_box"')[1:]:
                m = _ID.search(card)
                if not m or m[1] in seen:
                    continue
                seen.add(m[1])
                new += 1
                it = parse(m[1], card, kind, today)
                if it:
                    out.append(it)
            if not new:
                break
        print(f"  모블 {extra or '전체'}: {len(out) - n0}건")
    return out
