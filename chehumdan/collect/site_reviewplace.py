"""리뷰플레이스 (www.reviewplace.co.kr)

robots.txt 가 /pr·/theme 를 막지만 사용자 결정(10-16)으로 알고도 수집. 요청 사이 1초 이상, 하루 2번.
로그인 없이 목록 화면(/pr/?ct1=…&ct2=…)이 스크롤할 때 부르는 HTML 조각
GET /theme/rp/_ajax_cmp_list_tpl.php?ct1=…&ct2=…&device=pc&rpage=N (0부터, 30건씩)을 읽는다. 빈 응답이면 끝.
목록에는 모집 중인 공고만 나온다. 상세 페이지·이미지·본문은 읽지 않는다.
- 하위 카테고리(ct2)별로 돌아서 사이트 카테고리를 붙이고, 여러 카테고리에 겹치는 공고는 먼저 본 것만 쓴다
  (구매평을 제품보다 먼저 → '스마트스토어 당일구매'는 구매평, 프리미엄은 맨 뒤).
- 지역: 제목 앞 `[경기/고양]`·`[부산/연제/릴스]`·`[방문형기자단/서대문구]` → 시/도·시/군/구 전체 이름.
  `[김포구래역점]`처럼 지점 이름이면 앞부분(김포)으로 맞춰 보고, 태그는 제목에 남긴다.
- 채널: 제목 태그(릴스·쇼츠·클립·인스타·유튜브) 먼저, 없으면 아이콘 색.
- 마감: 'D - N' → 오늘 + N일.
"""
from __future__ import annotations

import html
import re
from datetime import datetime, timedelta

from common import KST, NATIONWIDE, SIDO, SIGUNGU, fetch, full_sigungu, make_item, norm_sido, polite_sleep

SITE = "reviewplace"
BASE = "https://www.reviewplace.co.kr"
MAX_PAGES = 150  # 목록 하나당, 30건씩 (10-16 기준 지역 전체가 100페이지 남짓)

# (ct1, ct2, 유형) — 위에서부터 먼저 본 공고가 이긴다
LISTS = (
    [("지역", c, "visit") for c in ("맛집", "카페/베이커리", "뷰티/건강", "운동/스포츠", "숙박", "문화/체험",
                                  "생활/편의", "시크릿쇼퍼", "기타")]
    + [("기자단", "방문형", "visit")] + [("기자단", c, "reporter") for c in ("원고형", "참여형", "회수형")]
    + [("구매평", "", "purchase")]
    + [("제품", c, "delivery") for c in ("식품", "생활", "뷰티", "유아동", "운동/건강", "디지털", "패션/잡화",
                                       "반려동물", "도서/교육", "서비스", "기타")]
    + [("프리미엄", "지역", "visit"), ("프리미엄", "기자단", "reporter"), ("프리미엄", "제품", "delivery"),
       ("프리미엄", "", None)]  # 나머지(릴스·쇼츠·클립·N인플루언서)는 제목으로 유형을 정한다
)
# 상위 분류 전체를 한 번 더 도는 것은 뺐다: 요청 40번에 새로 잡히는 건 3건뿐이라(10-16) 사이트 부담만 커진다

_ICON = {"#00DF43": "blog", "#18AB7F": "blog", "#92FF37": "clip", "#ED3286": "insta", "#732ADE": "reels",
         "#E70000": "youtube", "#00DDD2": "tiktok"}  # #FF7300 은 쇼핑몰(스마트스토어·쿠팡) 표시라 채널이 아니다
_TAG_CH = [("릴스", "reels"), ("쇼츠", "shorts"), ("클립", "clip"), ("유튜브", "youtube"), ("인스타", "insta"), ("틱톡", "tiktok"),
           ("블로그", "blog")]
_ITEM = re.compile(r"<div class='item'><a href='/pr/\?id=(\d+)[^']*'>(.*?)</a></div>", re.S)
_TAG = re.compile(r"^\s*(?:\[([^\]]{1,40})\]|\(([^)]{1,40})\))\s*")
_DDAY = re.compile(r"D\s*-\s*(\d+)")
_NUM = re.compile(r"신청\s*([\d,]+)\s*/\s*([\d,]+)\s*명")
# 시/군/구 대신 쓰는 동네 이름 (ponytail: 10-16 목록에 보인 것만, 새로 나오면 추가)
_ALIAS = {k: (v.split()[0], v.split()[1] if " " in v else None) for k, v in {
    "일산": "경기 고양시", "동탄": "경기 화성시", "분당": "경기 성남시", "판교": "경기 성남시", "광교": "경기 수원시",
    "여의도": "서울 영등포구", "문래": "서울 영등포구", "당산": "서울 영등포구", "압구정": "서울 강남구", "청담": "서울 강남구",
    "논현": "서울 강남구", "성수": "서울 성동구", "홍대": "서울 마포구", "공덕": "서울 마포구", "상암": "서울 마포구",
    "청량리": "서울 동대문구", "목동": "서울 양천구", "사당": "서울 동작구", "을지로": "서울 중구", "이태원": "서울 용산구",
    "발산마곡": "서울 강서구", "마곡": "서울 강서구", "방학역": "서울 도봉구", "샤로수길": "서울 관악구",
    "서면": "부산 부산진구", "양정": "부산 부산진구", "삼산": "울산 남구", "궁동": "대전 유성구", "서대전": "대전 중구",
    "연동": "제주 제주시", "세종": "세종",
}.items()}


def _text(s: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()


def _sgg_anywhere(word: str) -> tuple[str, str] | None:
    """'서대문구'·'고양' → 표에서 하나로만 맞는 (시/도, 시/군/구). '중구'처럼 여러 곳이면 None."""
    hits = [(s, n) for s, names in SIGUNGU.items() for n in names if word in (n, n[:-1]) and len(n) > 2]
    return hits[0] if len(hits) == 1 else None


def _branch(word: str, sido: str | None = None) -> tuple[str | None, str | None] | None:
    """지점·동네 이름 '김포구래역점'·'강릉유천점'·'동대문점' → 별칭, 아니면 앞 2~3글자가 시/군/구 이름인지.
    ponytail: 앞글자 맞추기라 오탐이 날 수 있어 별칭을 먼저 본다('남동탄…'→남동구 X). 틀리면 _ALIAS 에 추가."""
    w0 = re.sub(r"(역)?점$", "", word)
    for k, v in _ALIAS.items():
        if k in w0 and sido in (None, v[0]):
            return v
    for w in dict.fromkeys((w0, w0[:3], w0[:2])):
        if sido:
            if sgg := full_sigungu(sido, w):
                return sido, sgg
        elif w in SIDO:
            return w, None
        elif hit := _sgg_anywhere(w):
            return hit
    return None


def region(tag: str) -> tuple[str | None, str | None]:
    """'경기/고양' → ('경기','고양시'), '클립/경기/고양/방문형기자단' → ('경기','고양시'),
    '방문형기자단/서대문구' → ('서울','서대문구'), '김포구래역점' → ('경기','김포시'), '전국/올리브영' → ('전국', None)."""
    parts = [re.sub(r"지역$", "", p) for p in re.split(r"[/,\s]+", tag) if p]
    for i, p in enumerate(parts):
        if p.startswith("전국"):
            return NATIONWIDE, None
        if p in _ALIAS:
            return _ALIAS[p]
        sido = p if p in SIDO else norm_sido(p) if p.endswith(("도", "시")) else None
        if sido in SIDO:
            nxt = parts[i + 1] if i + 1 < len(parts) else ""
            return sido, (None if sido == "세종" or not nxt else (_branch(nxt, sido) or (0, None))[1])
        if hit := _sgg_anywhere(p):
            return hit
    if len(parts) == 1 and parts[0].endswith("점"):
        return _branch(parts[0]) or (None, None)
    return None, None


def channel(tag: str, li: str) -> str:
    for word, ch in _TAG_CH:
        if word in tag:
            return ch
    for svg in re.findall(r"<div class='blog_icon'>(<svg.*?</svg>)", li, re.S):
        for color in re.findall(r'fill="(#[0-9A-Fa-f]{6})"', svg):
            if color.upper() in _ICON:
                return _ICON[color.upper()]
    return "etc"


def guess_type(tag: str, title: str, sido: str | None) -> str:
    """프리미엄 나머지처럼 유형을 모를 때 제목으로."""
    if "방문" in tag or (sido and "기자단" not in tag):
        return "visit"
    if "기자단" in tag:
        return "reporter"
    if re.search(r"구매|스마트스토어|스스|쿠팡", tag):
        return "purchase"
    return "delivery"


def parse(pid: str, li: str, cat: str, ctype: str | None, today: datetime) -> dict | None:
    tit = re.search(r"<p class='tit'>(.*?)</p>", li, re.S)
    d = _DDAY.search(_text(re.search(r"<p class='date'>(.*?)</p>", li, re.S).group(1))) if "class='date'" in li else None
    if not tit or not d:
        return None
    raw = _text(tit.group(1))
    m = _TAG.match(raw)
    tag = (m.group(1) or m.group(2)) if m else ""
    sido, sgg = region(tag) if tag else (None, None)
    title = raw if (not m or tag.endswith("점")) else raw[m.end():]
    ctype = ctype or guess_type(tag, title, sido)
    if ctype == "visit" and re.search(r"포장|배달|쿠팡이츠|배민|요기요", tag):
        ctype = "takeout"
    if ctype == "reporter" and sido and "방문" in tag:
        ctype = "visit"  # 방문형 기자단은 그 동네에 가야 한다
    sub = re.search(r"<p class='txt'>(.*?)</p>", li, re.S)
    num = _NUM.search(_text(li))
    return make_item(
        site=SITE, sid=pid, url=f"{BASE}/pr/?id={pid}",
        title=title.strip() or raw, offer=_text(sub.group(1)) if sub else "",
        ctype=ctype, channel=channel(tag, li), sido=sido, sigungu=sgg, site_category=cat,
        apply_end=(today + timedelta(days=int(d.group(1)))).strftime("%Y-%m-%d"),
        recruit=int(num.group(2).replace(",", "")) if num else None,
        applicants=int(num.group(1).replace(",", "")) if num else None,
    )


def collect() -> list[dict]:
    today = datetime.now(KST)
    out, seen = [], set()
    for ct1, ct2, ctype in LISTS:
        n0 = len(out)
        params = {"ct1": ct1, **({"ct2": ct2} if ct2 else {}), "device": "pc"}
        for page in range(MAX_PAGES):
            body = fetch(f"{BASE}/theme/rp/_ajax_cmp_list_tpl.php", params={**params, "rpage": page},
                         headers={"Referer": f"{BASE}/pr/", "X-Requested-With": "XMLHttpRequest"}).decode("utf-8", "replace")
            polite_sleep(1.0)
            items = _ITEM.findall(body)
            if not items:
                break
            for pid, li in items:
                if pid in seen:
                    continue
                seen.add(pid)
                it = parse(pid, li, ct2 or ct1, ctype, today)
                if it:
                    out.append(it)
        print(f"  리뷰플레이스 {ct1}/{ct2 or '전체'}: {len(out) - n0}건 ({page}페이지)")
    return out


if __name__ == "__main__":  # 파싱 자체 점검
    for tag, want in [("경기/고양", ("경기", "고양시")), ("부산/연제/릴스", ("부산", "연제구")),
                      ("클립/경기/고양/방문형기자단", ("경기", "고양시")), ("방문형기자단/서대문구", ("서울", "서대문구")),
                      ("부산진구/방문형기자단", ("부산", "부산진구")), ("김포구래역점", ("경기", "김포시")),
                      ("미아사거리점", (None, None)), ("남동탄호수공원점", ("경기", "화성시")), ("광주수완점", ("광주", None)),
                      ("서울/거여점", ("서울", None)), ("서울/동대문점", ("서울", "동대문구")), ("강원/강릉유천점", ("강원", "강릉시")),
                      ("청량리/10.24(토)방문", ("서울", "동대문구")), ("서울지역/블로그", ("서울", None)), ("인천/삼산", ("인천", None)),
                      ("릴스/전국/올리브영/10.25까지방문", ("전국", None)), ("베트남/다낭/릴스", (None, None)), ("방문형기자단/여의도", ("서울", "영등포구")),
                      ("블로그", (None, None)), ("스마트스토어/블로그/당일구매", (None, None)), ("세종", ("세종", None)),
                      ("충남/공주/클립", ("충남", "공주시")), ("경기/광주", ("경기", "광주시"))]:
        assert region(tag) == want, (tag, region(tag))
    li = ("<div class='blog_icon'><svg><path fill=\"#ED3286\"/></svg></div><p class='tit'>[서울/강남/릴스] 고기집</p>"
          "<p class='txt'>4만원 식사권</p><p class='date'><em class='d_ico'>D</em> - 6</p>"
          "<div class='num'><p>신청 12<span> / 5명</span></p></div>")
    it = parse("1", li, "맛집", "visit", datetime(2026, 10, 16, tzinfo=KST))
    assert (it["title"], it["sido"], it["sigungu"], it["channel"], it["end"], it["recruit"], it["applicants"]) == \
        ("고기집", "서울", "강남구", "reels", "2026-10-22", 5, 12), it
    assert channel("", li) == "insta"
    print("ok")
