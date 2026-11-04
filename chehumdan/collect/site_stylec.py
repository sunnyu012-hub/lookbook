"""스타일씨 (stylec.co.kr) — robots 허용(/adm·/cs·검색만 막음), 로그인 없음.

목록 화면이 쓰는 공개 API GET api2.stylec.co.kr:6439/v1/trial?order=default&page=N&count=100&include_finish=false.
목록에 주소가 없어 지역은 제목 앞 '[순천]' 꼬리표로만 알 수 있다(없으면 지역 미상).
"""
from __future__ import annotations

import re

from common import fetch_json, make_item, polite_sleep
from site_cometoplay import region

SITE = "stylec"
BASE = "https://www.stylec.co.kr"
API = "https://api2.stylec.co.kr:6439/v1/trial"
COUNT = 100
_CHANNEL = {"naverblog": "blog", "instagram": "insta", "instagramreels": "reels", "youtube": "youtube",
            "youtubeshorts": "shorts", "naverclip": "clip", "tiktok": "tiktok"}
_TAG = re.compile(r"^\s*\[([^\]]{1,12})\]\s*")


def kind(x: dict) -> str:
    wr, ca = x.get("wr_type"), x.get("ca_name")
    if wr == "기자단":
        return "reporter"
    if wr in ("구매평", "페이백"):
        return "purchase"
    return {"방문": "visit", "배달": "takeout"}.get(ca, "delivery")


def parse(x: dict) -> dict:
    ctype, title = kind(x), x.get("wr_subject") or ""
    sido = sgg = None
    m = _TAG.match(title)
    if ctype == "visit" and m:
        sido, sgg = region(m[1])
    cash = int(x.get("tr_cashback_amt") or 0)
    return make_item(
        site=SITE, sid=x["wr_id"], url=f"{BASE}{x.get('link')}", title=title,
        offer=f"{cash:,}원 페이백" if cash else "", ctype=ctype, channel=_CHANNEL.get(x.get("sns_type"), "etc"),
        sido=sido, sigungu=sgg, site_category=x.get("ca_name") or "",
        apply_end=(x.get("finday") or "")[:10] or None,
        recruit=x.get("tr_recruit_max"), applicants=x.get("tr_enroll_cnt"),
    )


def collect() -> list[dict]:
    out, seen, page, total = [], set(), 1, 1
    while len(seen) < total and page <= 60:
        d = fetch_json(API, params={"order": "default", "page": page, "count": COUNT, "include_finish": "false"},
                       headers={"Referer": f"{BASE}/"})["data"]
        total = int(d.get("Total") or 0)
        new = [x for x in d.get("data") or [] if x.get("wr_id") not in seen]
        if not new:
            break
        seen.update(x["wr_id"] for x in new)
        out += [parse(x) for x in new]
        page += 1
        polite_sleep(1.0)
    print(f"  스타일씨: {len(out)}건 / 전체 {total}건")
    return out
