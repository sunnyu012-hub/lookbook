"""포블로그 (4blog.net)

로그인 없이 목록 화면(/list/all/local·deliv·reporter)이 무한 스크롤로 부르는 JSON(/loadMoreDataCategoryV2)을 읽는다.
category1 을 주면 사이트가 개수 제한(400~600건) 없이 끝까지 준다. 목록에는 모집 중 공고만 나온다.
robots.txt 는 /temp/·/admin/ 만 막고 나머지는 허용(2026-10-15 확인). 상세 페이지(/campaign/{CID}/)는 읽지 않는다.
- 지역: 제목·LOCATION_NM 앞 `[서울/마곡동]`, `[부천시/중동]`, `[창원/진해]` → 아래 시군구표로 맞춘다. 동 이름만 있으면 시/도까지만.
- 마감: REMAINDATE(D-N) → 오늘 + N일. 사이트 화면의 D-day와 같다.
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta

from common import KST, fetch_json, make_item, norm_sido, polite_sleep

SITE = "fourblog"
BASE = "https://4blog.net"
MAX_PAGES = 200  # 30건씩 (10-15 기준 방문형 25페이지)
PAGE_SIZE = 30

# (category1, 공통 유형, 화면 표시)
KINDS = [("local", "visit", "방문형"), ("deliv", "delivery", "배송형"), ("reporter", "reporter", "기자단")]
_CHANNEL = {"blog": "blog", "instar21": "insta", "reels": "reels", "youtube21": "youtube",
            "shorts": "shorts", "tiktok": "tiktok", "naverclip": "clip"}  # ncafe·threads·danggeun·xtwitter → etc

# 시/도 → 시·군·구 (2026 기준)
_REG = {s: n.split() for s, n in {
    "서울": "종로구 중구 용산구 성동구 광진구 동대문구 중랑구 성북구 강북구 도봉구 노원구 은평구 서대문구 마포구 양천구 강서구 "
           "구로구 금천구 영등포구 동작구 관악구 서초구 강남구 송파구 강동구",
    "부산": "중구 서구 동구 영도구 부산진구 동래구 남구 북구 강서구 해운대구 사하구 금정구 연제구 수영구 사상구 기장군",
    "인천": "중구 동구 미추홀구 연수구 남동구 부평구 계양구 서구 강화군 옹진군",
    "대구": "중구 동구 서구 남구 북구 수성구 달서구 달성군 군위군",
    "광주": "동구 서구 남구 북구 광산구",
    "대전": "동구 중구 서구 유성구 대덕구",
    "울산": "중구 남구 동구 북구 울주군",
    "경기": "가평군 고양시 과천시 광명시 광주시 구리시 군포시 김포시 남양주시 동두천시 부천시 성남시 수원시 시흥시 안산시 안성시 "
           "안양시 양주시 양평군 여주시 연천군 오산시 용인시 의왕시 의정부시 이천시 파주시 평택시 포천시 하남시 화성시",
    "강원": "원주시 춘천시 강릉시 동해시 속초시 삼척시 홍천군 태백시 철원군 횡성군 평창군 영월군 정선군 인제군 고성군 양양군 화천군 양구군",
    "충북": "청주시 충주시 제천시 보은군 옥천군 영동군 증평군 진천군 괴산군 음성군 단양군",
    "충남": "천안시 공주시 보령시 아산시 서산시 논산시 계룡시 당진시 금산군 부여군 서천군 청양군 홍성군 예산군 태안군",
    "경북": "포항시 경주시 김천시 안동시 구미시 영주시 영천시 상주시 문경시 경산시 의성군 청송군 영양군 영덕군 청도군 고령군 "
           "성주군 칠곡군 예천군 봉화군 울진군 울릉군",
    "경남": "창원시 김해시 진주시 양산시 거제시 통영시 사천시 밀양시 함안군 거창군 창녕군 고성군 하동군 합천군 남해군 함양군 산청군 의령군",
    "전북": "전주시 익산시 군산시 정읍시 완주군 김제시 남원시 고창군 부안군 임실군 순창군 진안군 장수군 무주군",
    "전남": "여수시 순천시 목포시 광양시 나주시 무안군 해남군 고흥군 화순군 영암군 영광군 완도군 담양군 장성군 보성군 신안군 "
           "장흥군 강진군 함평군 진도군 곡성군 구례군",
    "제주": "제주시 서귀포시",
}.items()}
# 시군구 이름이 아닌 동네 이름만 단 꼬리표 중 자주 보이는 것
# ponytail: 손으로 적은 몇 개뿐. 동 이름([서울/역삼동])은 시/도까지만 — 동→구 표가 필요해지면 그때 추가.
_ALIAS = {"신촌": ("서울", "서대문구"), "홍대": ("서울", "마포구"), "남대문": ("서울", "중구"), "신림": ("서울", "관악구"),
          "잠실": ("서울", "송파구"), "가로수길": ("서울", "강남구"), "분당": ("경기", "성남시"), "판교": ("경기", "성남시"),
          "동탄": ("경기", "화성시"), "일산": ("경기", "고양시"), "마산": ("경남", "창원시"), "진해": ("경남", "창원시")}
_TAG = re.compile(r"^\s*\[([^\]]{1,30})\]\s*")


def _lookup(tok: str, sido: str | None, full: bool) -> tuple[str, str] | None:
    """시군구표에서 tok(전체 이름 또는 '강남'처럼 끝 글자 뺀 이름)을 찾는다. 하나로 정해질 때만."""
    hits = [(s, n) for s, names in _REG.items() if sido in (None, s)
            for n in names if n == tok or (not full and n[:-1] == tok)]
    return hits[0] if len(hits) == 1 else None


def region(tag: str) -> tuple[str | None, str | None]:
    """'서울/마곡동' → ('서울', None), '부천시/중동' → ('경기','부천시'), '창원/진해' → ('경남','창원시')."""
    sido = sgg = None
    for tok in re.split(r"[/\s]+", tag.strip()):
        if not tok:
            continue
        if tok in _ALIAS:
            hit = _ALIAS[tok]
        else:
            hit = _lookup(tok, sido, full=True)  # '광주시'(경기)·'부산진구' 같은 전체 이름이 먼저
            if not hit and sido is None and norm_sido(tok):
                sido = norm_sido(tok)
                continue
            hit = hit or _lookup(tok, sido, full=False)
        if hit and sido in (None, hit[0]):
            sido = hit[0]
            sgg = sgg or hit[1]
    return sido, sgg


def parse(o: dict, ctype: str, label: str, today: datetime) -> dict | None:
    if o.get("TYPECODE") == "COUPON":  # 할인 쿠폰 판매라 체험단이 아님
        return None
    remain = o.get("REMAINDATE")
    if remain is None or remain < 0:
        return None
    raw = re.sub(r"\s+", " ", o.get("CAMPAIGN_NM") or "").strip()
    tags = []
    m = _TAG.match(o.get("LOCATION_NM") or "")
    if m:
        tags.append(m.group(1))
    title = raw
    while (m := _TAG.match(title)):
        tags.append(m.group(1))
        title = title[m.end():]
    if ctype == "delivery" and any("페이백" in t for t in tags):
        ctype = "purchase"  # 결제 후 환급받는 구매평형
    sido = sgg = None
    for t in tags:
        sido, sgg = region(t)
        if sido:
            break
    offer = next((ln.strip() for ln in (o.get("REVIEWER_BENEFIT") or "").splitlines() if ln.strip()), "")
    recruit = o.get("REVIEWER_CNT")
    return make_item(
        site=SITE, sid=o["CID"], url=f"{BASE}/campaign/{o['CID']}/",
        title=title.strip() or raw, offer=offer,
        ctype=ctype, channel=_CHANNEL.get(o.get("CATEGORY") or "", "etc"),
        sido=sido, sigungu=sgg, site_category=label,
        apply_end=(today + timedelta(days=remain)).strftime("%Y-%m-%d"),
        recruit=recruit if isinstance(recruit, int) else None,
        applicants=None,  # 목록 API의 REVIEWER_REQ_CNT 는 늘 0 이라 신청자 수를 알 수 없다
    )


def collect() -> list[dict]:
    today = datetime.now(KST)
    out, seen = [], set()
    for c1, ctype, label in KINDS:
        n0 = len(out)
        for page in range(MAX_PAGES):
            rows = fetch_json(f"{BASE}/loadMoreDataCategoryV2",
                              params={"offset": page * PAGE_SIZE, "limit": PAGE_SIZE, "maxLoadCount": 600,
                                      "category": "", "sort": "latest", "category1": c1, "location": "",
                                      "location1": "", "search": "", "search2": "", "bid": ""},
                              headers={"Referer": f"{BASE}/list/all/{c1}", "X-Requested-With": "XMLHttpRequest"})
            new = [o for o in rows if o.get("CID") not in seen]
            for o in new:
                seen.add(o["CID"])
                it = parse(o, ctype, label, today)
                if it:
                    out.append(it)
            if len(rows) < PAGE_SIZE or not new:
                break
            polite_sleep(1.0)
        print(f"  포블로그 {label}: {len(out) - n0}건")
        polite_sleep(1.0)
    return out


if __name__ == "__main__":
    assert region("서울/마곡동") == ("서울", None)
    assert region("부천시/중동") == ("경기", "부천시")
    assert region("창원/진해") == ("경남", "창원시")
    assert region("광주/쌍촌동") == ("광주", None)
    assert region("광주시/중대동") == ("경기", "광주시")
    assert region("서울/영등포") == ("서울", "영등포구")
    assert region("강남/삼성") == ("서울", "강남구")
    assert region("부산진구") == ("부산", "부산진구")
    assert region("인천/중구") == ("인천", "중구")
    assert region("경기/분당") == ("경기", "성남시")
    assert region("대구/칠곡") == ("대구", None)
    print("ok")
