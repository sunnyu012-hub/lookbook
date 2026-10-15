"""리뷰의민족 (remin.co.kr)

로그인 없이 공고 목록 화면(/category/campaignlist?p_cateType=X)이 '더보기'로 부르는 HTML 조각
(/category/searchlist?p_cateType=X&p_pageNum=N, 1부터, 20건씩)을 읽는다. 목록에는 모집 중인 공고만 나온다.
robots.txt 없음(404) — 막힌 경로 없음(2026-10-15 확인).
- 분류: A=방문, B=제품(배송), D=기자단, E=서비스. 유튜브 메뉴는 위 목록과 겹친다.
- 지역: 제목 앞 `[서울 강남] [논현동]` / `[충북] [청주 흥덕구]` → 시/군/구는 '강남구'·'청주시'처럼 맞춘다.
- 마감: 'N일남음' 은 신청 마감 다음 날(발표일)까지 센 값 → 신청 마감 = 오늘 + N - 1.
"""
from __future__ import annotations

import html
import re
from datetime import datetime, timedelta

from common import KST, fetch, make_item, norm_sido, polite_sleep

SITE = "remin"
BASE = "https://remin.co.kr"
MAX_PAGES = 100  # 한 분류 20건씩 (10-15 기준 방문 8페이지)
PAGE_SIZE = 20

CATES = {"A": ("visit", "방문"), "B": ("delivery", "제품"), "D": ("reporter", "기자단"), "E": ("etc", "서비스")}
_CHANNEL = {"naver": "blog", "insta": "insta", "youtube": "youtube"}

_ITEM = re.compile(r'<li class="item_li"[^>]*data-appSeq="(\d+)".*?</li>', re.S)
_TAG = re.compile(r"^\s*\[?([^\[\]]{1,20})\]\s*")  # '[충북] 청주 흥덕구]' 처럼 여는 괄호가 빠진 것도
_METRO = {"서울", "부산", "대구", "인천", "광주", "대전", "울산"}
_METRO_GUN = {"기장", "달성", "군위", "강화", "옹진", "울주"}
_GG_GUN = {"가평", "양평", "연천"}
_DO_GUN = set("""홍천 횡성 영월 평창 정선 철원 화천 양구 인제 고성 양양 보은 옥천 영동 증평 진천 괴산 음성 단양
금산 부여 서천 청양 홍성 예산 태안 완주 진안 무주 장수 임실 순창 고창 부안 담양 곡성 구례 고흥 보성 화순 장흥 강진
해남 영암 무안 함평 영광 장성 완도 진도 신안 의성 청송 영양 영덕 청도 고령 성주 칠곡 예천 봉화 울진 울릉
의령 함안 창녕 남해 하동 산청 함양 거창 합천""".split())


def _text(s: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", " ", s or "")).strip()


def _int(s: str | None):
    return int(s.replace(",", "")) if s else None


def sigungu(sido: str | None, token: str | None, strict: bool = False) -> str | None:
    """'강남' → '강남구', '청주' → '청주시', '증평' → '증평군'.
    strict(둘째 꼬리표): 읍·면·동·리로 끝나면 None ('종로'·'성동'처럼 첫 꼬리표에 오는 이름은 그대로 둔다)."""
    if not sido or sido in ("세종", "전국") or not token:
        return None
    t = re.sub(r"\(.*?\)", "", token).strip()  # '중구(인천)'
    if not re.fullmatch(r"[가-힣]{1,5}", t):
        return None
    if re.search(r"[시군구]$", t) and len(t) >= 2:
        return t
    if strict and re.search(r"[읍면동리가로길]$", t):
        return None
    if sido in _METRO:
        return t + ("군" if t in _METRO_GUN else "구")
    if sido == "경기":
        return t + ("군" if t in _GG_GUN else "시")
    if sido == "제주":
        return t + "시" if t in ("제주", "서귀포") else None
    return t + ("군" if t in _DO_GUN else "시")


def parse(li: str, pid: str, cate: str, today: datetime) -> dict | None:
    tit = re.search(r'<span class="item_title">(.*?)</span>', li, re.S)
    if not tit:
        return None
    raw = _text(tit.group(1))
    ctype, cat_name = CATES[cate]
    title, sido, sgg = raw, None, None
    m = _TAG.match(title)
    if m:
        title = title[m.end():]  # 첫 꼬리표: 지역 또는 '[배송]'·'[기자단모집]'
        if cate == "A":
            parts = m.group(1).split()
            sido = norm_sido(parts[0])
            sgg = sigungu(sido, parts[1] if len(parts) > 1 else None)
            m2 = _TAG.match(title)  # 둘째 꼬리표: '[논현동]' / '[청주 흥덕구]'
            if m2:
                title = title[m2.end():]
                if not sgg:
                    sgg = sigungu(sido, m2.group(1).split()[0], strict=True)
    mark = re.search(r"images/main/item_([a-z]+)\.", li)
    dday = re.search(r'd_day_txt"><span>(\d+)</span>', li)
    if not dday:
        return None
    n = int(dday.group(1))
    if n < 1:
        return None  # 신청 마감 지남
    end = today + timedelta(days=n - 1)
    sub = re.search(r'<span class="item_explain">(.*?)</span>', li, re.S)
    app = re.search(r'item_applied">\s*신청\s*([\d,]+)', li)
    lim = re.search(r'item_limit">\s*/\s*([\d,]+)', li)
    return make_item(
        site=SITE, sid=pid, url=f"{BASE}/category/information?cam_seq={pid}",
        title=title.strip() or raw, offer=_text(sub.group(1)) if sub else "",
        ctype=ctype, channel=_CHANNEL.get(mark.group(1), "etc") if mark else "etc",
        sido=sido, sigungu=sgg, site_category=cat_name,
        apply_end=end.strftime("%Y-%m-%d"),
        recruit=_int(lim.group(1)) if lim else None, applicants=_int(app.group(1)) if app else None,
    )


def collect() -> list[dict]:
    today = datetime.now(KST)
    out, seen = [], set()
    for cate in CATES:
        for page in range(1, MAX_PAGES + 1):
            body = fetch(f"{BASE}/category/searchlist",
                         params={"p_cateType": cate, "p_country": "", "p_app_snsType": "", "p_pageNum": page,
                                 "orderBy": "", "searchText": "", "isBackDataLoad": "false"},
                         headers={"Referer": f"{BASE}/category/campaignlist?p_cateType={cate}",
                                  "X-Requested-With": "XMLHttpRequest"}).decode("utf-8", "replace")
            rows = [(m.group(1), m.group(0)) for m in _ITEM.finditer(body)]
            new = [(pid, li) for pid, li in rows if pid not in seen]
            for pid, li in new:
                seen.add(pid)
                it = parse(li, pid, cate, today)
                if it:
                    out.append(it)
            polite_sleep(1.0)
            if len(rows) < PAGE_SIZE or not new:
                break
    return out


if __name__ == "__main__":
    assert sigungu("서울", "강남") == "강남구" and sigungu("경기", "수원") == "수원시"
    assert sigungu("충북", "증평") == "증평군" and sigungu("충북", "청주") == "청주시"
    assert sigungu("인천", "중구(인천)") == "중구" and sigungu("제주", "애월읍", strict=True) is None
    assert sigungu("서울", "종로") == "종로구" and sigungu("서울", "성동") == "성동구"
    assert sigungu("부산", "연제구") == "연제구" and sigungu("세종", "조치원읍") is None
    print("ok")
