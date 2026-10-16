"""클립뷰 (클립뷰.kr = xn--5y2bw0fi0u.kr)

robots.txt 가 검색엔진 외 전체를 막지만 사용자 결정(10-16)으로 알고도 수집. 요청 사이 1초 이상, 하루 2번.
목록 화면(cv_campaign_list.php)의 무한 스크롤이 부르는 JSON
(/cv_campaign_list.php?json=list&category_id=…&orderby=cp_id&page=N&rows=100) 만 읽는다. 상세·이미지는 읽지 않는다.
- 기본 15건이지만 rows=100 이 먹는다. 응답의 last_page == 1 이면 끝.
- 방문형(001A)은 테마 카테고리(맛집 079A·뷰티 081A·여행 082A·문화 083A)를 먼저 돌아 사이트 카테고리를 붙이고,
  001A 전체로 나머지를 줍는다. 배송형(002A)은 하위 7개 합이 002A 전체와 같아(10-16 확인) 하위별로만 돈다.
- cp_day: 남은 일수(0 = 오늘 마감) → 오늘 + N일, '상시 모집 중' → 마감일 없음, '모집마감' → 뺀다.
- 제목 앞 꼬리표: 방문형 `[서울/강서]` → 지역, 배송형 `[더라/블로그]` → (업체 약칭/채널) 이라 채널로만 쓴다.
"""
from __future__ import annotations

import html
import re
from datetime import datetime, timedelta

from common import KST, fetch_json, make_item, polite_sleep
from site_cometoplay import region  # ponytail: 시군구표를 common.py 로 옮기면 거기서 import

SITE = "clipview"
BASE = "https://xn--5y2bw0fi0u.kr"
ROWS = 100
MAX_PAGES = 60  # 카테고리당 (10-16 기준 가장 큰 '기타' 2332건 = 24페이지)

# (category_id, 사이트 카테고리, 유형) — 앞에서 먼저 잡힌 cp_id 가 이긴다
CATS = [
    ("079A", "맛집", "visit"), ("081A", "뷰티", "visit"), ("082A", "여행", "visit"), ("083A", "문화", "visit"),
    ("001A", "", "visit"),
    ("002A031A", "생활", "delivery"), ("002A032A", "디지털", "delivery"), ("002A033A", "패션", "delivery"),
    ("002A034A", "뷰티", "delivery"), ("002A035A", "식품", "delivery"), ("002A036A", "기타", "delivery"),
    ("002A050A", "온라인 비대면", "delivery"),
    ("003A", "구매평", "purchase"), ("004A", "기자단", "reporter"),
]
_TAG = re.compile(r"^\s*\[([^\]/]{1,12})/([^\]]{1,12})\]\s*")
_CHANNEL = {"블로그": "blog", "인스타": "insta", "인스타그램": "insta", "릴스": "reels", "유튜브": "youtube",
            "쇼츠": "shorts", "클립": "clip", "틱톡": "tiktok"}


def _text(s) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", str(s or "")))).strip()


def split_title(raw: str, ctype: str) -> tuple[str, str | None, str | None, str | None]:
    """→ (제목, 시도, 시군구, 꼬리표 채널). '[서울/강서] 중식당…' → ('중식당…','서울','강서구',None)."""
    m = _TAG.match(raw)
    if not m:
        return raw, None, None, None
    a, b = m.group(1).strip(), m.group(2).strip()
    title = raw[m.end():].strip() or raw
    if b in _CHANNEL:
        return title, None, None, _CHANNEL[b]
    if ctype == "visit":
        sido, sgg = region(f"{a} {b}")
        if sido:
            return title, sido, sgg, None
    return raw, None, None, None


def end_date(day, today: datetime) -> str | None | bool:
    """cp_day → 'YYYY-MM-DD' / None(상시) / False(마감)."""
    s = str(day).strip()
    if re.fullmatch(r"-?\d+", s):
        return (today + timedelta(days=int(s))).strftime("%Y-%m-%d") if int(s) >= 0 else False
    return None if "상시" in s else False


def parse(x: dict, cat: str, ctype: str, today: datetime) -> dict | None:
    end = end_date(x.get("cp_day"), today)
    if end is False:
        return None
    raw = _text(x.get("cp_subject"))
    title, sido, sgg, tag_ch = split_title(raw, ctype)
    if tag_ch:
        channel = tag_ch
    elif str(x.get("cp_media_blog")) not in ("", "0"):
        channel = "blog"
    elif str(x.get("cp_media_instagram")) not in ("", "0"):
        channel = "insta"  # 화면엔 릴스 아이콘으로 나온다
    elif str(x.get("cp_media_youtube")) not in ("", "0"):
        channel = "clip"  # 화면엔 클립 아이콘, 필터 이름은 '유튜브'
    else:
        channel = "etc"
    offer = _text(x.get("cp_description"))
    num = lambda k: int(x[k]) if str(x.get(k, "")).isdigit() else None  # noqa: E731
    return make_item(
        site=SITE, sid=x["cp_id"], url=f"{BASE}/cv_campaign.php?cp_id={x['cp_id']}",
        title=title, offer="" if offer == title else offer, ctype=ctype, channel=channel,
        sido=sido, sigungu=sgg, site_category=cat, apply_end=end,
        recruit=num("cp_recruit"), applicants=num("cp_order"),
    )


def collect() -> list[dict]:
    today = datetime.now(KST)
    out, seen = [], set()
    for cid, cat, ctype in CATS:
        n0, mine, total = len(out), set(), 0
        # 10-16 첫 실행에서 '기타' 2332건 중 307건이 페이지 사이에서 빠졌다(순서가 도중에 바뀐 듯).
        # 받은 수가 total_count 보다 적으면 한 번 더 돌아 빠진 것만 줍는다.
        for _ in range(2):
            for page in range(1, MAX_PAGES + 1):
                d = fetch_json(f"{BASE}/cv_campaign_list.php",
                               params={"json": "list", "category_id": cid, "keyword": "", "cp_media": "",
                                       "orderby": "cp_id", "page": page, "rows": ROWS},
                               headers={"Referer": f"{BASE}/cv_campaign_list.php?category_id={cid}",
                                        "X-Requested-With": "XMLHttpRequest"})
                polite_sleep(1.0)
                total = int(d.get("total_count") or 0)
                for x in d.get("list") or []:
                    mine.add(x.get("cp_id"))
                    if x.get("cp_id") in seen:
                        continue
                    seen.add(x.get("cp_id"))
                    it = parse(x, cat, ctype, today)
                    if it:
                        out.append(it)
                if str(d.get("last_page")) == "1" or not d.get("list"):
                    break
            if len(mine) >= total:
                break
        print(f"  클립뷰 {cat or '방문형'}({cid}): {len(out) - n0}건 (목록 {len(mine)}/{total})")
    return out


if __name__ == "__main__":  # 파싱 자체 점검
    t = datetime(2026, 10, 16, tzinfo=KST)
    assert split_title("[서울/강서] 중식당 방문해 보세요!", "visit") == ("중식당 방문해 보세요!", "서울", "강서구", None)
    assert split_title("[인천/서해] 모공 피부 관리", "visit")[1:3] == ("인천", "서해구")
    assert split_title("[제주/서귀포] 숙소", "visit")[1:3] == ("제주", "서귀포시")
    assert split_title("[더라/블로그] 천연펄프 티슈", "delivery") == ("천연펄프 티슈", None, None, "blog")
    assert end_date(5, t) == "2026-10-21" and end_date(0, t) == "2026-10-16"
    assert end_date("상시 모집 중", t) is None and end_date("모집마감", t) is False and end_date(-1, t) is False
    print("ok")
