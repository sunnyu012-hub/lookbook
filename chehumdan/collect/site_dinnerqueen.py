"""디너의여왕 (dinnerqueen.net)

로그인 없이 보이는 체험단 목록(/taste)이 무한 스크롤할 때 부르는 POST /taste/taste_list?page=N 을 읽는다.
응답은 {"layout": 카드 HTML 30건, "has_next": bool}, 끝나면 [] 를 준다. 목록에는 모집 중(N일 남음)인 공고만 나온다.
robots.txt: User-agent * 는 Allow: / (Yeti·NaverBot 만 /search·쿼리 URL 금지) — 2026-10-15 확인. 상세 페이지는 읽지 않는다.
- 지역: 제목 앞 `[서울 동작]` → ('서울', '동작구'). 사이트 지역표가 '강남/논현' 같은 묶음이라 시/군/구 이름은 규칙으로 맞춘다.
- 마감: 'N일 남음' → 오늘 + N일.
"""
from __future__ import annotations

import html
import json
import re
from datetime import datetime, timedelta

from common import KST, fetch, make_item, norm_sido, polite_sleep

SITE = "dinnerqueen"
BASE = "https://dinnerqueen.net"
MAX_PAGES = 800  # 30건씩 (10-15 기준 약 283페이지, 8,474건)

_CARD = re.compile(r'href="/taste/(\d+)" title="(.*?) 신청하기"(.*?)(?=<div class="qz-dq-card campaign|\Z)', re.S)
_TAG = re.compile(r"^\s*\[([^\]]*)\]\s*")
_SEOUL_GU = set("종로 중 용산 성동 광진 동대문 중랑 성북 강북 도봉 노원 은평 서대문 마포 양천 강서 구로 금천 "
                "영등포 동작 관악 서초 강남 송파 강동".split())
_METRO = {"서울", "부산", "대구", "인천", "광주", "대전", "울산"}
_GUN = set("강화 옹진 기장 달성 군위 울주 가평 양평 연천 고성 양구 양양 영월 인제 정선 철원 평창 홍천 화천 횡성 "
           "괴산 단양 보은 영동 옥천 음성 증평 진천 금산 부여 서천 예산 청양 태안 홍성 고창 무주 부안 순창 완주 "
           "임실 장수 진안 강진 고흥 곡성 구례 담양 무안 보성 신안 영광 영암 완도 장성 장흥 진도 함평 해남 화순 "
           "고령 봉화 성주 영덕 영양 예천 울릉 울진 의성 청도 청송 칠곡 거창 남해 산청 의령 창녕 하동 함안 함양 합천".split())
_GWANGJU = {"광주", "광산", "남구", "동구", "북구", "서구"}  # '[전남 광산]'처럼 광주광역시를 전남으로 단 공고


def _text(s: str) -> str:
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s or ""))).strip()


def region(tag: str) -> tuple[str | None, str | None]:
    """'서울 동작' → ('서울','동작구'), '경기 수원' → ('경기','수원시'), '부산 전지역' → ('부산', None)."""
    first, _, short = tag.strip().partition(" ")
    sido = norm_sido(first)
    short = short.strip()
    if sido == "전남" and short in _GWANGJU:
        sido, short = "광주", ("" if short == "광주" else short)
    if not sido or sido in ("세종", "전국") or not re.fullmatch(r"[가-힣]{1,5}", short):
        return sido, None
    if short in ("북부", "남부", "동부", "서부", "전지역", "전체"):
        return sido, None
    if re.search(r"[시군구]$", short) and len(short) > 1:
        return sido, "부산진구" if (sido, short) == ("부산", "진구") else short
    if sido == "서울":
        return sido, short + "구" if short in _SEOUL_GU else None
    if short in _GUN:
        return sido, short + "군"
    if sido in _METRO:
        return sido, short + "구"
    return sido, short + "시"


def parse(pid: str, raw_title: str, card: str, today: datetime) -> dict | None:
    dm = re.search(r'class="dday[^"]*">(.*?)</p>', card, re.S)
    dday = _text(dm.group(1)) if dm else ""
    d = re.search(r"(\d+)\s*일\s*남음", dday)
    if d:
        end = today + timedelta(days=int(d.group(1)))
    elif "오늘" in dday:
        end = today
    else:
        return None  # 마감 표시가 없으면 모집 중이 아니다
    title, tags = html.unescape(raw_title), []
    while (m := _TAG.match(title)):
        tags.append(m.group(1).strip())
        title = title[m.end():]
    sido = sgg = None
    for t in tags:
        if norm_sido(t.split(" ")[0]):
            sido, sgg = region(t)
            break
    # 지역·채널 태그는 따로 필드로 가니 빼고, 나머지([구매평][브랜드] 등)는 제목에 남긴다.
    keep = [t for t in tags if t not in ("릴스", "클립") and not norm_sido(t.split(" ")[0])]
    title = "".join(f"[{t}]" for t in keep) + (" " if keep else "") + title.strip()
    cats = [c for c in re.findall(r'<strong style="letter-spacing: -0.2px">([^<]+)</strong>', card) if c != "포인트"]
    cat = cats[0].strip() if cats else ""
    badge = set(re.findall(r'<strong class="opa-8">([^<]+)</strong>', card))
    if "구매평" in tags or "페이백" in tags:
        ctype = "purchase"
    elif cat == "기자단" or "포인트" in tags:
        ctype = "reporter"
    elif cat == "배송":
        ctype = "delivery"
    elif cat == "배달" or "포장" in tags or "테이크아웃" in badge:
        ctype = "takeout"
    else:
        ctype = "visit"
    channel = "reels" if "qz_b_reels" in card or "릴스" in tags else "clip" if "qz_b_clip" in card or "클립" in tags else "blog"
    offer = re.search(r'<p class="qz-caption-kr color-placeholder ellipsis[^"]*">(.*?)</p>', card, re.S)
    num = re.search(r"신청\s*([\d,]+)\s*/\s*([\d,]+)", _text(card))
    return make_item(
        site=SITE, sid=pid, url=f"{BASE}/taste/{pid}",
        title=title, offer=_text(offer.group(1)) if offer else "",
        ctype=ctype, channel=channel, sido=sido, sigungu=sgg, site_category=cat,
        apply_end=end.strftime("%Y-%m-%d"),
        recruit=int(num.group(2).replace(",", "")) if num else None,
        applicants=int(num.group(1).replace(",", "")) if num else None,
    )


def _pages(ct: str, seen: set, out: list, today: datetime):
    for page in range(1, MAX_PAGES + 1):
        try:
            data = json.loads(fetch(f"{BASE}/taste/taste_list",
                                    params={"ct": ct, "area1": "전국", "area2": "전체", "page": page, "ctype": "", "query": ""},
                                    data=b"", headers={"Referer": f"{BASE}/taste", "X-Requested-With": "XMLHttpRequest"}))
        except RuntimeError:
            if page == 1:
                return  # 빈 카테고리는 404를 준다
            raise
        if not isinstance(data, dict) or not isinstance(data.get("layout"), str):
            return  # 끝나면 []
        for pid, raw, card in _CARD.findall(data["layout"]):
            if pid in seen:
                continue
            seen.add(pid)
            it = parse(pid, raw, card, today)
            if it:
                out.append(it)
        if not data.get("has_next"):
            return
        polite_sleep(1.0)


def collect() -> list[dict]:
    today = datetime.now(KST)
    out, seen = [], set()
    _pages("", seen, out, today)  # 기자단·페이백·배송 카테고리를 따로 훑어도 새 공고 0건(10-15 확인)
    return out


if __name__ == "__main__":
    assert region("서울 동작") == ("서울", "동작구")
    assert region("경기 수원") == ("경기", "수원시")
    assert region("강원 홍천") == ("강원", "홍천군")
    assert region("부산 기장") == ("부산", "기장군")
    assert region("인천 미추홀") == ("인천", "미추홀구")
    assert region("서울 역삼") == ("서울", None)
    assert region("부산 전지역") == ("부산", None)
    assert region("전남 광산") == ("광주", "광산구")
    assert region("제주 제주시") == ("제주", "제주시")
    assert region("세종 나성") == ("세종", None)
    assert region("부산 진구") == ("부산", "부산진구")
    print("ok")
