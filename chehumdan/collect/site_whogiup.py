"""후기업 (whogiup.com) — robots 허용, 로그인 없음.

목록 화면이 쓰는 POST /api/list {type: region|product, …} 를 읽는다. 전체가 한 번에 온다.
세션 쿠키와 CSRF 토큰이 필요해 목록 화면을 먼저 한 번 연다. 응답의 전화번호·주소 원문·본문은 저장하지 않는다.
"""
from __future__ import annotations

import http.cookiejar
import json
import re
import urllib.request

from common import UA, make_item, polite_sleep, split_address
from site_cometoplay import region

SITE = "whogiup"
BASE = "https://www.whogiup.com"
_TAG = re.compile(r"^\s*\[([^\]]{1,20})\]\s*")


def parse(x: dict) -> dict | None:
    if x.get("ended") or str(x.get("is_ended")) == "1":
        return None
    title, tag = x.get("title") or "", ""
    m = _TAG.match(title)
    if m:
        title, tag = title[m.end():], m[1]
    sub = x.get("subcategory") or ""
    if sub == "기자단":
        ctype = "reporter"
    else:
        ctype = "delivery" if str(x.get("delivery_kind")) == "1" else "visit"
    addr = x.get("address")
    sido, sgg = split_address(None if addr == "null" else addr)
    if not sido and ctype == "visit":
        sido, sgg = region(tag.replace("/", " "))
    return make_item(
        site=SITE, sid=x["campaign_id"], url=f"{BASE}/details?idx={x['campaign_id']}",
        title=title.strip() or x.get("title") or "", offer=x.get("product") or "", ctype=ctype,
        channel="insta" if str(x.get("ad_kind")) == "0" else "blog",
        sido=sido, sigungu=sgg, site_category=sub, apply_end=x.get("re"),
        recruit=x.get("required_num"), applicants=x.get("applied_num"),
    )


def collect() -> list[dict]:
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    first = urllib.request.Request(f"{BASE}/list?cate=0", headers={"User-Agent": UA})
    page = op.open(first, timeout=30).read().decode("utf-8", "replace")
    token = re.search(r'csrf-token" content="([^"]+)', page)[1]
    out = []
    for kind in ("region", "product"):
        polite_sleep(1.0)
        body = {"type": kind, "subcategory": "전체", "region": "전체", "place": 0, "sort": 0}
        req = urllib.request.Request(f"{BASE}/api/list", data=json.dumps(body, ensure_ascii=False).encode(), headers={
            "User-Agent": UA, "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest",
            "X-CSRF-TOKEN": token, "Referer": f"{BASE}/list?cate=0"})
        rows = json.load(op.open(req, timeout=60)).get("data") or []
        out += [it for it in map(parse, rows) if it]
        print(f"  후기업 {kind}: {len(rows)}건")
    return out
