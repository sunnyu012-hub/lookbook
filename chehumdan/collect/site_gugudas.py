"""구구다스 (99das.com)

robots.txt 가 목록 API(/amz/list/)를 막지만 사용자 결정(10-16)으로 알고도 수집. 요청 사이 1초 이상, 하루 2번.
로그인 없이 목록 화면(/amz/cmpn/amzCmpnList.do, Mustache 껍데기)이 부르는 POST /amz/list/cmpnList.do JSON 만 읽는다.
상세 페이지·이미지·본문은 읽지 않는다.
- cmpnDcd: AMZ027.001 지역(방문) / .002 제품(배송·구매평) / .003 서비스 / .004 기자단,
  프리미엄(.005·.006)은 type=primeCmpnList 로 따로. 이벤트(.008, 고정 노출)는 모든 목록에 끼어 나와 id 로 중복 제거.
- pageSize=100 을 받아준다(화면은 10). 돌려준 건수가 pageSize 보다 적으면 끝.
- 마감: recrtEnDy('20261023', 모집 마감일). 지역: 제목 앞 `[부산 수영]` 꼬리표.
- 미디어 cmpnKindDcd: AMZ021.001 블로그 .002 인스타 .005 구매평 .006 방문 지원금 .007 숏폼 .008 이벤트.
"""
from __future__ import annotations

import json
import re
import urllib.parse

from common import NATIONWIDE, fetch, make_item, norm_sido, polite_sleep, today_kst
from site_cometoplay import region  # '[서울 은평]' → ('서울','은평구')

SITE = "gugudas"
BASE = "https://99das.com"
PAGE_SIZE = 100
MAX_PAGES = 30  # 목록당 (10-16 기준 제품 90건이 가장 많음)

# (cmpnDcd, type) — 프리미엄은 cmpnDcd 를 비우고 type 만 바꾼다
LISTS = [("AMZ027.001", "cmpnList"), ("AMZ027.002", "cmpnList"), ("AMZ027.003", "cmpnList"),
         ("AMZ027.004", "cmpnList"), ("", "primeCmpnList")]
_CTYPE = {"AMZ027.001": "visit", "AMZ027.002": "delivery", "AMZ027.003": "etc", "AMZ027.004": "reporter",
          "AMZ027.008": "etc"}
_KIND = {"AMZ021.001": "blog", "AMZ021.002": "insta", "AMZ021.006": "blog"}
_TAG = re.compile(r"^\s*\[([^\]]{1,20})\]\s*")
_TAGS = re.compile(r'<div class="item_tag">(.*?)</div>', re.S)


def _int(v):
    try:
        return int(str(v).replace(",", ""))
    except (TypeError, ValueError):
        return None


def _date(s) -> str | None:
    s = str(s or "")
    return f"{s[:4]}-{s[4:6]}-{s[6:8]}" if re.fullmatch(r"\d{8}", s) else None


def _channel(kind: str, text: str) -> str:
    if kind == "AMZ021.007" or (kind == "AMZ021.002" and "릴스" in text):  # 숏폼 / 인스타 릴스
        for w, ch in (("쇼츠", "shorts"), ("클립", "clip"), ("틱톡", "tiktok")):
            if w in text:
                return ch
        return "reels"
    return _KIND.get(kind, "etc")  # 구매평·이벤트는 SNS 채널이 아니다


def split_title(raw: str) -> tuple[str, str | None]:
    """'[부산 수영] 탑지압' → ('탑지압', '부산 수영'). 꼬리표가 여럿이면 다 떼고 첫 꼬리표를 돌려준다."""
    title, first = raw, None
    while (m := _TAG.match(title)):
        first = first or m.group(1).strip()
        title = title[m.end():]
    return title.strip() or raw, first


def parse(o: dict) -> dict | None:
    end = _date(o.get("recrtEnDy"))
    if not end or end < today_kst():
        return None
    dcd, kind = o.get("cmpnDcd") or "", o.get("cmpnKindDcd") or ""
    ctype = _CTYPE.get(dcd) or ("visit" if o.get("cmpnAreaDcd") else "delivery")  # 프리미엄(.005·.006)
    if kind == "AMZ021.005":
        ctype = "purchase"
    title, tag = split_title(o.get("cmpnNm") or "")
    tags = " ".join(t.strip() for t in _TAGS.findall(o.get("cmpnTagDcd") or ""))
    sido = sgg = None
    if ctype == "visit":
        sido, sgg = region(tag) if tag else (None, None)
        area = o.get("cmpnAreaDcdNm") or ""
        if not sido and "/" not in area:  # '경기/인천'처럼 묶인 권역은 시/도를 못 정한다
            sido = norm_sido(area)
    elif ctype == "etc":
        sido = NATIONWIDE
    offer = o.get("oferBrekdn") or ""
    if o.get("basePointTxt"):
        offer = f"{offer} ({o['basePointTxt']})"
    if o.get("amtViewYn") and o.get("realAmtTxt") not in (None, "", "0"):
        offer = f"{offer} · 실결제 {o['realAmtTxt']}원"
    cid = o["cmpnId"]
    return make_item(
        site=SITE, sid=cid, url=f"{BASE}/amz/cmpn/amzCmpnDtl.do?cmpnId={cid}",
        title=title, offer=offer, ctype=ctype, channel=_channel(kind, f"{title} {tags}"),
        sido=sido, sigungu=sgg, site_category=o.get("cmpnDcdNm") or "",
        apply_end=end, recruit=_int(o.get("recrtCnt")), applicants=_int(o.get("aplyCnt")),
    )


def collect() -> list[dict]:
    out, seen, first = [], set(), True
    for dcd, typ in LISTS:
        n0 = len(out)
        for page in range(1, MAX_PAGES + 1):
            if not first:
                polite_sleep(1.2)
            first = False
            form = {"cmpnDcd": dcd, "cmpnKindDcd": "", "type": typ, "area": "", "cate": "", "sns": "", "prime": "",
                    "orderby": "new", "pageSize": PAGE_SIZE, "pageNum": page, "tagId": "cmpnList"}
            res = json.loads(fetch(f"{BASE}/amz/list/cmpnList.do", data=urllib.parse.urlencode(form).encode(), headers={
                "Accept": "application/json, text/javascript, */*; q=0.01", "X-Requested-With": "XMLHttpRequest",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Referer": f"{BASE}/amz/cmpn/amzCmpnList.do"}))
            rows = res.get("list") or []
            new = 0
            for o in rows:
                if not o.get("cmpnId") or o["cmpnId"] in seen:
                    continue
                seen.add(o["cmpnId"])
                new += 1
                it = parse(o)
                if it:
                    out.append(it)
            if len(rows) < PAGE_SIZE or not new:
                break
        print(f"  구구다스 {dcd or typ}: {len(out) - n0}건")
    return out


if __name__ == "__main__":
    assert split_title("[부산 수영] 탑지압테라피안마원") == ("탑지압테라피안마원", "부산 수영")
    assert split_title("[구매평] [도서] 책") == ("책", "구매평")
    assert _date("20261023") == "2026-10-23" and _date("") is None
    assert _channel("AMZ021.002", "누리프렌즈 팝업(릴스)") == "reels" and _channel("AMZ021.007", "쇼츠") == "shorts"
    assert _channel("AMZ021.005", "") == "etc"
    o = {"cmpnId": "CMPN_1", "cmpnNm": "[대구 수성구] 범미가", "cmpnDcd": "AMZ027.001", "cmpnKindDcd": "AMZ021.001",
         "cmpnAreaDcd": "AMZ006.004", "cmpnAreaDcdNm": "대구/경북", "recrtEnDy": "29991231", "recrtCnt": 10,
         "aplyCnt": 3, "oferBrekdn": "한식뷔페 2인이용권", "cmpnDcdNm": "지역"}
    it = parse(o)
    assert (it["sido"], it["sigungu"], it["type"], it["channel"], it["recruit"]) == ("대구", "수성구", "visit", "blog", 10)
    assert parse({**o, "cmpnNm": "[제주] 누이밥집", "cmpnAreaDcdNm": "제주"})["sido"] == "제주"
    assert parse({**o, "cmpnDcd": "AMZ027.002", "cmpnKindDcd": "AMZ021.005"})["sido"] == "전국"
    assert parse({**o, "recrtEnDy": "20000101"}) is None
    print("ok")
