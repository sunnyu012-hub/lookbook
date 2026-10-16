"""링블 체험단 (ringble.co.kr)

로그인 없이 보이는 카테고리 목록 화면(/category.php?category=…&start=N, N은 1부터 페이지 번호, 72건씩, 서버 렌더링 HTML)을 읽는다.
어디야와 같은 happyCGI 계열. JSON API는 없다. 상세 페이지·이미지·본문은 읽지 않는다.
robots.txt 가 /category.php 를 막지만 사용자 결정(10-16)으로 알고도 수집. 요청 사이 1초 이상, 하루 2번.
- 목록에는 모집 중 공고만 나온다(10-16 확인, 카드마다 'N일 남음'). 그래도 'N일 남음'이 없는 카드(마감)는 뺀다.
- 마감: 'N일 남음' → 오늘 + N일.
- 카드 꼬리표: 블로그 / 인스타 / 릴스 / 인스타 + 릴스 / 블로그 + 클립 / 유튜브 / 구매평(쿠팡 등 구매 후 리뷰, 채널 꼬리표와 같이 붙기도 함).
- 지역: 제목 앞 `[서울/송파구]` → ('서울','송파구'). `[인스타]`·`[기자단]` 같은 중복 꼬리표도 제목에서 뗀다.
- 방문(832)과 인스타(1015)가 일부 겹친다 → 번호로 한 번만 담는다(앞 카테고리 우선).
- 목록 제목·제공내역은 사이트가 '...'로 자른다. 자른 그대로 둔다.
"""
from __future__ import annotations

import html
import re
from datetime import datetime, timedelta

from common import KST, fetch, full_sigungu, make_item, norm_sido, polite_sleep
from site_cometoplay import region  # ponytail: 시군구표를 common.py 로 옮기면 거기서 import

SITE = "ringble"
BASE = "https://www.ringble.co.kr"
MAX_PAGES = 10  # 카테고리당 (10-16 기준 방문 4페이지, 제품 3페이지)

# (category, 사이트 카테고리, 유형) — None 이면 지역 꼬리표가 있으면 방문형, 없으면 배송형
CATS = [("832", "방문", "visit"), ("829", "제품", "delivery"), ("1015", "인스타", None),
        ("833", "유튜브", None), ("834", "기자단", "reporter")]
_CHANNEL = {"블로그": "blog", "블로그 + 클립": "blog", "인스타": "insta", "인스타 + 릴스": "reels",
            "릴스": "reels", "유튜브": "youtube", "쇼츠": "shorts", "클립": "clip", "틱톡": "tiktok"}
_DUP_TAGS = {"인스타", "릴스", "유튜브", "블로그", "기자단"}

_NUM = re.compile(r"number=(\d+)&")
_BADGE = re.compile(r'border-radius: 4px; font-size: 12px;[^>]*>([^<]+)</div>')
_LEFT = re.compile(r'font-size:12px;">\s*(?:(\d+)일 남음|(오늘))')
_TITLE = re.compile(r'font-size:14px;">(.*?)</a>', re.S)
_OFFER = re.compile(r'line-height:15px;">(.*?)</td>', re.S)
_COUNT = re.compile(r"신청\s*([\d,]+)\s*/\s*모집\s*([\d,]+)")
_TAG = re.compile(r"^\s*\[([^\]]{1,20})\]\s*")


def _text(s: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s or "")).replace("\xa0", " ")).strip()


def _cut(s: str) -> str:
    return re.sub(r"\s*\.{2,}$", "", s).strip()


def split_title(raw: str) -> tuple[str, str | None, str | None]:
    """'[인스타] [부산/부산진구] 스위브' → ('스위브','부산','부산진구'). 모르는 꼬리표('[프리미엄]')는 제목에 남긴다."""
    rest, keep, sido, sgg = raw, [], None, None
    while m := _TAG.match(rest):
        tag, rest = m.group(1).strip(), rest[m.end():]
        if tag in _DUP_TAGS:
            continue
        parts = tag.replace("/", " ").split()
        if parts and parts[0] == "전남광주":  # 통합 이름 '[전남광주/동구]' — 광주 5개 구면 광주, 아니면 전남
            parts[0] = "광주" if len(parts) > 1 and full_sigungu("광주", parts[1]) else "전남"
        s, g = region(" ".join(parts))
        if not g and len(parts) > 1 and norm_sido(parts[-1]):
            s, g = region(parts[-1])  # '[전라도/광주]'·'[전남/광주]' → 광주(광역시)
        if s and not sido:
            sido, sgg = s, g
            if s == "부산" and not g and "진구" in parts:
                sgg = "부산진구"  # 사이트가 '[부산/진구]'로 줄여 쓴다
        else:
            keep.append(f"[{tag}]")
    title = " ".join(keep + [rest.strip()]).strip()
    return title or raw, sido, sgg


def parse(blk: str, cat: str, ctype: str | None, today: datetime) -> dict | None:
    pid, left, t = _NUM.search(blk), _LEFT.search(blk), _TITLE.search(blk)
    if not pid or not left or not t:
        return None  # 마감 또는 공고 아닌 칸
    raw = _cut(_text(t.group(1)))
    o = _OFFER.search(blk)
    offer = _cut(_text(o.group(1))) if o else ""
    title, sido, sgg = split_title(raw)
    if ctype is None:
        ctype = "visit" if sido and sido != "전국" else "delivery"
    badges = [b.strip() for b in _BADGE.findall(blk)]
    if "구매평" in badges:
        ctype = "purchase"
    elif ctype == "visit" and offer.startswith("[포장]"):
        ctype = "takeout"
    chans = [b for b in badges if b != "구매평"]
    num = _COUNT.search(_text(blk))
    return make_item(
        site=SITE, sid=pid.group(1), url=f"{BASE}/detail.php?number={pid.group(1)}",
        title=title, offer=offer, ctype=ctype,
        channel=_CHANNEL.get(chans[0], "etc") if chans else "etc",
        sido=sido, sigungu=sgg, site_category=dict((c, n) for c, n, _ in CATS)[cat],
        apply_end=(today + timedelta(days=int(left.group(1) or 0))).strftime("%Y-%m-%d"),
        recruit=int(num.group(2).replace(",", "")) if num else None,
        applicants=int(num.group(1).replace(",", "")) if num else None,
    )


def collect() -> list[dict]:
    today = datetime.now(KST)
    out, seen = [], set()
    for cat, name, ctype in CATS:
        n0 = len(out)
        for page in range(1, MAX_PAGES + 1):
            body = fetch(f"{BASE}/category.php", params={"start": page, "category": cat},
                         headers={"Referer": f"{BASE}/"}).decode("utf-8", "replace")
            polite_sleep(1.0)
            cards = body.split("id='page'")[0].split("class='store_list_wrap'")[1:]
            for blk in cards:
                pid = _NUM.search(blk)
                if not pid or pid.group(1) in seen:
                    continue
                it = parse(blk, cat, ctype, today)
                if it:
                    seen.add(pid.group(1))
                    out.append(it)
            if not cards or f"start={page + 1}&" not in body:
                break
        print(f"  링블 {name}: {len(out) - n0}건")
    return out


if __name__ == "__main__":  # 제목 꼬리표 파싱 자체 점검
    for raw, want in [("[서울/송파구] 김효승 보컬레슨", ("김효승 보컬레슨", "서울", "송파구")),
                      ("[인스타] [부산/부산진구] 스위브", ("스위브", "부산", "부산진구")),
                      ("[경기/양평군] 동의쑥뜸원", ("동의쑥뜸원", "경기", "양평군")),
                      ("[기자단] 올루프", ("올루프", None, None)),
                      ("[프리미엄] [서울/마포구] 피오레 염색", ("[프리미엄] 피오레 염색", "서울", "마포구")),
                      ("[전라도/광주] 미뇽프로포즈 광주점", ("미뇽프로포즈 광주점", "광주", None)),
                      ("[전남/광주] 감성헤어", ("감성헤어", "광주", None)),
                      ("[전남광주/동구] 감성헤어", ("감성헤어", "광주", "동구")),
                      ("[전남광주/여수시] 횟집", ("횟집", "전남", "여수시")),
                      ("[경기/광주] 카페", ("카페", "경기", "광주시")),
                      ("[부산/진구] 메이트헤어", ("메이트헤어", "부산", "부산진구")),
                      ("[부산] 미뇽프로포즈 부산점", ("미뇽프로포즈 부산점", "부산", None)),
                      ("[사진촬영체험단] 고쟁이바지", ("[사진촬영체험단] 고쟁이바지", None, None)),
                      ("호호바 오일 (쿠팡)", ("호호바 오일 (쿠팡)", None, None))]:
        assert split_title(raw) == want, (raw, split_title(raw))
    print("ok")
