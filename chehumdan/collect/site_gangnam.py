"""강남맛집 (강남맛집.net) — 해외 IP를 막아서 한국 PC(self-hosted runner)에서만 돈다.

로그인 없이 공고 목록 화면(/cp/)이 스크롤할 때 부르는 HTML 조각(/theme/go/_list_cmp_tpl.php?rpage=N, 28건씩)을 읽는다.
목록에는 모집 중인 공고만 나온다. robots.txt 는 /adm·/biz·/review 등만 막고 목록은 허용(2026-10-15 확인).
- 지역: 제목 앞 `[서울 동작]` → 시/군/구 이름은 사이트 지역표(/_data/_data_loca.php)로 '동작구'처럼 맞춘다.
- 마감: 'N일 남음' → 오늘 + N일.
"""
from __future__ import annotations

import html
import json
import re
from datetime import datetime, timedelta

from common import KST, fetch, make_item, norm_sido, polite_sleep

SITE = "gangnam"
BASE = "https://xn--939au0g4vj8sq.net"
MAX_PAGES = 500  # 28건씩 (10-15 기준 약 250페이지)

_TYPE = {"방문형": "visit", "배송형": "delivery", "기자단": "reporter", "포장": "takeout", "포장형": "takeout",
         "구매평": "purchase", "구매형": "purchase"}
_CHANNEL = {"blog": "blog", "insta": "insta", "instagram": "insta", "reels": "reels", "youtube": "youtube",
            "shorts": "shorts", "tiktok": "tiktok", "clip": "clip"}
_ITEM = re.compile(r"<li class='list_item[^>]*data-product='(\d+)'.*?</li>", re.S)
_REGION = re.compile(r"^\s*\[([가-힣]{2,7})\s+([가-힣]{1,8})\]\s*")


def _text(s: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"<br\s*/?>", " ", s or "", flags=re.I))).strip()


def _int(s: str | None):
    return int(s.replace(",", "")) if s else None


def load_regions() -> dict[str, list[str]]:
    """{'서울': ['종로구', …], '경기': ['수원시', …]} — 사이트 지역표."""
    raw = json.loads(fetch(f"{BASE}/_data/_data_loca.php", data=b""))
    out: dict[str, list[str]] = {}
    for full, names in raw.items():
        sido = norm_sido(full)
        if sido:
            out[sido] = [n.split()[0] for n in names if n]
    return out


def sigungu(sido: str | None, short: str, regions: dict[str, list[str]]) -> str | None:
    """'동작' → '동작구', '수원' → '수원시' (사이트 지역표 기준)."""
    if not sido or sido == "세종":
        return None
    for name in regions.get(sido, []):
        if name == short or (name.startswith(short) and name[len(short):] in ("시", "군", "구")):
            return name
    return short if re.search(r"(시|군|구)$", short) else None


def parse(li: str, pid: str, regions: dict[str, list[str]], today: datetime) -> dict | None:
    ems = re.findall(r"<em class='([^']+)'>([^<]*)</em>", li)
    tit = re.search(r"<dt class='tit'><a[^>]*>(.*?)</a>", li, re.S)
    if not tit:
        return None
    raw = _text(tit.group(1))
    sido = sgg = None
    m = _REGION.match(raw)
    if m:
        sido = norm_sido(m.group(1))
        sgg = sigungu(sido, m.group(2), regions)
        title = raw[m.end():]
    else:
        title = raw
    kind = next((v for c, v in ems if c == "type"), "")
    channel = next((_CHANNEL[c.lower()] for c, _ in ems if c.lower() in _CHANNEL), "etc")
    dday = next((v for c, v in ems if "day_c" in c.split()), "")  # 'N일 남음' 또는 class='last_d day_c' '오늘마감'
    d = re.search(r"(\d+)\s*일", dday)
    end = (today + timedelta(days=int(d.group(1)))) if d else (today if "오늘" in dday else None)
    sub = re.search(r"<dd class='sub_tit'>(.*?)</dd>", li, re.S)
    num = re.search(r"신청\s*([\d,]+)\s*/\s*모집\s*([\d,]+)", _text(li))
    return make_item(
        site=SITE, sid=pid, url=f"{BASE}/cp/?id={pid}",
        title=title.strip() or raw, offer=_text(sub.group(1)) if sub else "",
        ctype=_TYPE.get(kind, "visit" if sido else "delivery"), channel=channel,
        sido=sido, sigungu=sgg, site_category=kind,
        apply_end=end.strftime("%Y-%m-%d") if end else None,
        recruit=_int(num.group(2)) if num else None, applicants=_int(num.group(1)) if num else None,
    )


def collect() -> list[dict]:
    regions = load_regions()
    today = datetime.now(KST)
    out, seen = [], set()
    for page in range(MAX_PAGES):
        body = fetch(f"{BASE}/theme/go/_list_cmp_tpl.php", params={"rpage": page, "row_num": 28},
                     headers={"Referer": f"{BASE}/cp/", "X-Requested-With": "XMLHttpRequest"}).decode("utf-8", "replace")
        new = [(m.group(1), m.group(0)) for m in _ITEM.finditer(body) if m.group(1) not in seen]
        if not new:
            break
        for pid, li in new:
            seen.add(pid)
            it = parse(li, pid, regions, today)
            if it:
                out.append(it)
        polite_sleep(1.0)  # 천천히
    return out
