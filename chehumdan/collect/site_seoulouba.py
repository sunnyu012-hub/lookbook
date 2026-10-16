"""서울오빠 (www.seoulouba.co.kr) — 그누보드5 테마 souba3.

robots.txt 가 첫 화면 외 전체를 막지만 사용자 결정(10-16)으로 알고도 수집. 요청 사이 1초 이상, 하루 2번.
목록만 읽는다: 캠페인 목록 화면(/campaign/?cat=…)의 '더보기'가 부르는 HTML 조각
POST /campaign/ajax/list.ajax.php (cat, sort="", page=N, more=(N-1)*36, rows=36). 로그인·세션 쿠키 없이 된다(10-16 확인).
상세 페이지·이미지·본문은 읽지 않는다.
- 하위 카테고리별로 돌아서 사이트 카테고리를 붙인다. 목록은 모집 중(D-N) → 마감 순이라, 모집 중이 하나도 없는 페이지가 나오면 그 카테고리는 끝.
- 마감: 'D-N' → 오늘 + N일, 'D-day' → 오늘. '마감'은 뺀다.
- 지역: 제목 앞 `[강남]`, `[대구/중구]`, `[릴스][인천/연수]` → 시/도·시/군/구. 동네 이름은 _ALIAS 로 맞추고, 모르면 비운다.
"""
from __future__ import annotations

import html
import re
from datetime import datetime, timedelta

from common import SIGUNGU, KST, fetch, full_sigungu, make_item, norm_sido, polite_sleep

SITE = "seoulouba"
BASE = "https://www.seoulouba.co.kr"
ROWS = 36
MAX_PAGES = 60  # 카테고리당 36건씩 (10-16 기준 맛집이 가장 많아 9페이지)

# (cat, 사이트 카테고리, 기본 유형) — 내용 카테고리를 먼저, 채널별 묶음(인스타·스레드·클립)은 뒤에 돌아 남은 것만 받는다.
CATS = [
    ("378", "맛집", "visit"), ("379", "여행/숙박", "visit"), ("380", "뷰티/패션", "visit"), ("510", "스포츠/레저", "visit"),
    ("381", "문화/생활", "visit"), ("382", "테이크아웃", "takeout"), ("446", "기타", "visit"),
    ("384", "식품", "delivery"), ("385", "뷰티", "delivery"), ("386", "디지털", "delivery"), ("387", "패션", "delivery"),
    ("388", "생활", "delivery"), ("389", "유아동", "delivery"), ("390", "도서", "delivery"), ("391", "펫", "delivery"),
    ("447", "기타", "delivery"),
    ("505", "방문형", "visit"), ("520", "방문형", "visit"), ("523", "방문형", "visit"),
    ("506", "배송형", "delivery"), ("522", "배송형", "delivery"), ("524", "배송형", "delivery"),
    ("507", "기자단", "reporter"), ("508", "기자단", "reporter"), ("521", "기자단", "reporter"),
    ("449", "구매평", "purchase"), ("450", "서비스", "visit"),
]
_TYPE = {"방문형": "visit", "배송형": "delivery", "기자단": "reporter", "구매평": "purchase"}
_CHANNEL = {"blog": "blog", "ins": "insta", "reels": "reels", "clip": "clip", "youtube": "youtube",
            "shorts": "shorts", "tiktok": "tiktok"}
# 제목 앞 [..] 중 지역이 아닌 것
_NOT_REGION = re.compile(r"블로그|클립|릴스|인스타|배송|기자단|구매|쇼츠|유튜브|스레드|틱톡|재택|전국|온라인")
# 시/군/구 대신 쓰는 동네 이름 (ponytail: 10-16 목록에 보인 것만, 새로 나오면 추가)
_ALIAS = {
    "신사": ("서울", "강남구"), "역삼": ("서울", "강남구"), "논현": ("서울", "강남구"), "압구정": ("서울", "강남구"),
    "청담": ("서울", "강남구"), "선릉": ("서울", "강남구"), "삼성": ("서울", "강남구"), "도산": ("서울", "강남구"),
    "방이": ("서울", "송파구"), "잠실": ("서울", "송파구"), "문정": ("서울", "송파구"), "천호": ("서울", "강동구"),
    "고덕": ("서울", "강동구"), "연남": ("서울", "마포구"), "홍대": ("서울", "마포구"), "합정": ("서울", "마포구"),
    "망원": ("서울", "마포구"), "상수": ("서울", "마포구"), "신촌": ("서울", "서대문구"), "이대": ("서울", "서대문구"),
    "사당": ("서울", "동작구"), "왕십리": ("서울", "성동구"), "성수": ("서울", "성동구"), "수유": ("서울", "강북구"),
    "광화문": ("서울", "종로구"), "익선": ("서울", "종로구"), "건대": ("서울", "광진구"), "이태원": ("서울", "용산구"),
    "여의도": ("서울", "영등포구"), "문래": ("서울", "영등포구"), "목동": ("서울", "양천구"), "신림": ("서울", "관악구"),
    "을지로": ("서울", "중구"), "명동": ("서울", "중구"), "대학로": ("서울", "종로구"), "혜화": ("서울", "종로구"),
    "동탄": ("경기", "화성시"), "일산": ("경기", "고양시"), "분당": ("경기", "성남시"), "판교": ("경기", "성남시"),
    "다산": ("경기", "남양주시"), "별내": ("경기", "남양주시"), "운정": ("경기", "파주시"), "광교": ("경기", "수원시"),
    "청라": ("인천", None), "송도": ("인천", "연수구"), "서면": ("부산", "부산진구"), "광안리": ("부산", "수영구"),
    "마곡": ("서울", "강서구"), "성신여대": ("서울", "성북구"), "중곡": ("서울", "광진구"), "충정로": ("서울", "서대문구"),
    "한남": ("서울", "용산구"), "이수": ("서울", "동작구"), "상봉": ("서울", "중랑구"), "뚝섬": ("서울", "성동구"),
    "세종": ("세종", None),
}


def _text(s: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", " ", s or "")).strip()


def _sgg_anywhere(name: str) -> tuple[str | None, str | None]:
    """'부천' → ('경기','부천시'), 여러 시/도에 같은 이름('중구')이면 모른다."""
    hits = [(s, n) for s, names in SIGUNGU.items() for n in names if name in (n, n[:-1])]
    return hits[0] if len(hits) == 1 else (None, None)


def region(tag: str) -> tuple[str | None, str | None]:
    """'강남' → ('서울','강남구'), '대구/중구' → ('대구','중구'), '경기/광주' → ('경기','광주시'), '신촌/홍대' → ('서울','서대문구')."""
    parts = [p.strip() for p in re.split(r"[/,·\s]+", tag) if p.strip()]
    if not parts:
        return None, None
    sido = norm_sido(parts[0])
    if sido:
        for p in parts[1:]:
            if (g := full_sigungu(sido, p)) or (p in _ALIAS and _ALIAS[p][0] == sido and (g := _ALIAS[p][1])):
                return sido, g
        return sido, None
    for p in parts:
        if p in _ALIAS:
            return _ALIAS[p]
        s, g = _sgg_anywhere(p)
        if s:
            return s, g
    return None, None


def split_title(raw: str) -> tuple[str, str | None, str | None]:
    """'[릴스][인천/연수] 언니네필라테스' → ('언니네필라테스', '인천', '연수구')."""
    sido = sgg = None
    while m := re.match(r"\s*\[([^\]]{1,30})\]\s*", raw):
        tag, raw = m.group(1), raw[m.end():]
        if sido is None and not _NOT_REGION.search(tag):
            sido, sgg = region(tag)
    if sido is None:  # '[인스타방문형] 얼땅쟈꼬챙이훠궈 김포점'처럼 지역 태그가 없으면 지점 이름으로
        for w in re.findall(r"([가-힣]{2,5}?)(?:본)?점(?![가-힣])", raw):
            if (hit := region(w))[0]:
                sido, sgg = hit
                break
    return raw.strip(), sido, sgg


def end_date(dday: str, today: datetime) -> str | None:
    """'D-3' → 오늘+3, 'D-day'·'오늘' → 오늘, '마감' → None."""
    d = re.search(r"D\s*-\s*(\d+)", dday)
    if d:
        return (today + timedelta(days=int(d.group(1)))).strftime("%Y-%m-%d")
    if re.search(r"D\s*-\s*day|오늘", dday, re.I):
        return today.strftime("%Y-%m-%d")
    return None


def parse(li: str, cat: str, ctype: str, today: datetime) -> dict | None:
    pid = re.search(r"campaign/\?c=(\d+)", li)
    tit = re.search(r'class="s_campaign_title">(.*?)</strong>', li, re.S)
    dday = re.search(r'class="d_day"><span>(.*?)</span>', li, re.S)
    if not pid or not tit or not dday:
        return None
    end = end_date(_text(dday.group(1)), today)
    if not end:
        return None  # 마감
    raw = _text(tit.group(1))
    title, sido, sgg = split_title(raw)
    tags = re.findall(r"<span>([^<]*)</span>", (re.search(r'class="icon_tag">(.*?)</div>', li, re.S) or [""])[0])
    if ctype != "takeout":
        ctype = next((_TYPE[t] for t in tags if t in _TYPE), ctype)
    if ctype == "visit" and re.match(r"\s*(\[[^\]]*\]\s*)*\[배송형\]", raw):
        ctype = "delivery"
    icons = re.findall(r"thum_ch_(\w+)\.png", li)
    offer = re.search(r'class="basic_blue">(.*?)</span>', li, re.S)
    num = re.search(r"신청\s*([\d,]+)\s*/\s*모집\s*([\d,]+)", _text(li))
    return make_item(
        site=SITE, sid=pid.group(1), url=f"{BASE}/campaign/?c={pid.group(1)}",
        title=title or raw, offer=_text(offer.group(1)) if offer else "",
        ctype=ctype, channel=_CHANNEL.get(icons[0], "etc") if icons else "blog",
        sido=sido, sigungu=sgg, site_category=cat, apply_end=end,
        recruit=int(num.group(2).replace(",", "")) if num else None,
        applicants=int(num.group(1).replace(",", "")) if num else None,
    )


def collect() -> list[dict]:
    today = datetime.now(KST)
    out, seen = [], set()
    for cid, cat, ctype in CATS:
        n0 = len(out)
        for page in range(1, MAX_PAGES + 1):
            form = {"cat": cid, "qq": "", "q": "", "q1": "", "q2": "", "ar1": "", "ar2": "", "sort": "", "pt": "",
                    "page": page, "more": (page - 1) * ROWS, "rows": ROWS}
            body = fetch(f"{BASE}/campaign/ajax/list.ajax.php", data="&".join(f"{k}={v}" for k, v in form.items()).encode(),
                         headers={"Referer": f"{BASE}/campaign/?cat={cid}", "X-Requested-With": "XMLHttpRequest",
                                  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"}).decode("utf-8", "replace")
            polite_sleep(1.0)
            lis = body.split('<li class="campaign_content">')[1:]
            live = 0
            for li in lis:
                it = parse(li, cat, ctype, today)
                if not it:
                    continue
                live += 1
                if it["id"] not in seen:
                    seen.add(it["id"])
                    out.append(it)
            if not lis or not live:
                break
        print(f"  서울오빠 {cat}({cid}): {len(out) - n0}건")
    return out


if __name__ == "__main__":  # 파싱 자체 점검
    for tag, want in [("강남", ("서울", "강남구")), ("대구/중구", ("대구", "중구")), ("경기/광주", ("경기", "광주시")),
                      ("광주/서구", ("광주", "서구")), ("신촌/홍대", ("서울", "서대문구")), ("다산/남양주", ("경기", "남양주시")),
                      ("부천", ("경기", "부천시")), ("인천/부평", ("인천", "부평구")), ("강동구/고덕", ("서울", "강동구")),
                      ("중구", (None, None)), ("광주", ("광주", None))]:
        assert region(tag) == want, (tag, region(tag))
    assert split_title("[릴스][인천/연수] 언니네필라테스") == ("언니네필라테스", "인천", "연수구")
    assert split_title("[인스타방문형] 얼땅쟈꼬챙이훠궈 김포점") == ("얼땅쟈꼬챙이훠궈 김포점", "경기", "김포시")
    assert split_title("[인스타방문형] 하얼빈양꼬치 잠실본점")[1:] == ("서울", "송파구")
    assert split_title("[블로그+클립] 멜킨 바이크") == ("멜킨 바이크", None, None)
    t = datetime(2026, 10, 16, tzinfo=KST)
    assert end_date("D-3", t) == "2026-10-19" and end_date("D-day", t) == "2026-10-16" and end_date("마감", t) is None
    print("ok")
