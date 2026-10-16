"""네이버 통합검색 첫 화면에서 우리 블로그가 어디에 나오는지 본다 (광고 제외).

결과 한 건: {"ai": 브리핑 있음, "cited": 우리 글이 브리핑 출처, "post": 일반 블록에 글, "image": 이미지 블록에만,
            "blocks": 우리가 나온 블록 이름, "sources": 브리핑 출처 상위}
블록은 화면의 제목(h2·headline) 기준으로 나눈다. 첫 제목 앞과 '관련 광고'·'네이버플러스' 블록은 광고라 뺀다.
"""
from __future__ import annotations

import html
import re
import time
import urllib.error
import urllib.parse
import urllib.request

UA = {
    "pc": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141 Safari/537.36",
    "mobile": "Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 Chrome/141 Mobile Safari/537.36",
}
HOST = {"pc": "https://search.naver.com", "mobile": "https://m.search.naver.com"}
HEAD = re.compile(r'<h2[^>]*>([\s\S]*?)</h2>|class="[^"]*headline[^"]*"[^>]*>([\s\S]{0,200}?)</')
BLOG_OR_CAFE = re.compile(r"blog\.naver\.com/([A-Za-z0-9_-]+)/\d{9,}|cafe\.naver\.com/([A-Za-z0-9_-]+)/\d+")
DOMAIN = re.compile(r"https?://(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})/")
SKIP_HOST = ("naver.com", "naver.net", "pstatic.net", "navercorp.com", "w3.org", "realityripple.com")


def fetch(query: str, device: str, blog_tab: bool = False) -> str:
    url = f"{HOST[device]}/search.naver?{'ssc=tab.blog.all&' if blog_tab else ''}query={urllib.parse.quote(query)}"
    req = urllib.request.Request(url, headers={"User-Agent": UA[device]})
    for wait in (60, 180, 0):  # 짧은 시간에 많이 물으면 네이버가 403을 준다 → 쉬었다가 다시
        try:
            return urllib.request.urlopen(req, timeout=20).read().decode("utf-8", "ignore")
        except urllib.error.HTTPError as e:
            if e.code != 403 or not wait:
                raise
            time.sleep(wait)
    raise RuntimeError("unreachable")


def heads(page: str) -> list[tuple[int, str]]:
    out = set()
    for m in HEAD.finditer(page):
        t = html.unescape(re.sub(r"<[^>]+>", "", m.group(1) or m.group(2) or "")).strip()
        if t:
            out.add((m.start(), t))
    return sorted(out)


def block_at(hs: list[tuple[int, str]], pos: int) -> str | None:
    """pos 가 속한 블록 이름. 첫 제목 앞(광고 자리)은 None."""
    name = None
    for p, t in hs:
        if p >= pos:
            break
        name = t
    return name


def is_ad(name: str | None) -> bool:
    return name is None or "관련 광고" in name or "네이버플러스" in name


def mine(page: str, blog: str, site: str | None) -> list[int]:
    pat = rf"blog\.naver\.com/{re.escape(blog)}/\d{{9,}}|blogId={re.escape(blog)}"
    if site:
        pat += "|" + re.escape(site)
    return [m.start() for m in re.finditer(pat, page)]


def briefing(page: str, hs: list[tuple[int, str]]) -> tuple[int, int] | None:
    for i, (p, t) in enumerate(hs):
        if t == "AI 브리핑":
            end = hs[i + 1][0] if i + 1 < len(hs) else p + 60000
            return p, end
    return None


def sources(seg: str, n: int = 6) -> list[str]:
    """브리핑 안 출처를 나온 순서대로: 블로그 아이디, cafe:카페, 외부 도메인."""
    seg = seg.replace("\\/", "/")
    found: list[tuple[int, str]] = []
    for m in BLOG_OR_CAFE.finditer(seg):
        found.append((m.start(), m.group(1) or "cafe:" + m.group(2)))
    for m in DOMAIN.finditer(seg):
        if not m.group(1).endswith(SKIP_HOST):
            found.append((m.start(), m.group(1)))
    seen: list[str] = []
    for _, s in sorted(found):
        if s not in seen:
            seen.append(s)
    return seen[:n]


def analyze(page: str, blog: str, site: str | None = None) -> dict:
    hs = heads(page)
    br = briefing(page, hs)
    blocks: list[str] = []
    cited = False
    for pos in mine(page, blog, site):
        name = block_at(hs, pos)
        if is_ad(name):
            continue
        if br and br[0] <= pos < br[1]:
            cited = True
            continue
        if name not in blocks:
            blocks.append(name)
    post = [b for b in blocks if b != "이미지"]
    return {
        "ai": bool(br), "cited": cited, "post": bool(post), "image": bool(blocks) and not post,
        "blocks": blocks[:4], "sources": sources(page[br[0]:br[1]]) if br else [],
    }


TAB_DEPTH = 30  # 블로그 탭 첫 화면(HTML)에 실리는 글 수. 그 뒤는 스크롤해야 나와서 '30위 밖'으로 둔다


def blog_rank(page: str, blog: str) -> int:
    """블로그 탭 순위(글 단위). 첫 화면 30개 안에 없으면 0."""
    posts: list[str] = []
    for m in re.finditer(r"blog\.naver\.com/([A-Za-z0-9_-]+)/(\d{9,})", page):
        key = m.group(1) + "/" + m.group(2)
        if key not in posts:
            posts.append(key)
    for i, key in enumerate(posts[:TAB_DEPTH], 1):
        if key.split("/")[0] == blog:
            return i
    return 0


def label(r: dict) -> str:
    if r["cited"]:
        return "AI 브리핑 인용"
    if r["post"]:
        return "첫 화면 노출"
    if r["image"]:
        return "이미지만"
    return "없음"


if __name__ == "__main__":  # 자체 점검: 블록·광고·브리핑 판정
    demo = ('<a href="https://blog.naver.com/kcost77/224000000001">ad</a>'
            '<h2>속기사 관련 광고</h2><a href="https://blog.naver.com/kcost77/224000000002">ad2</a>'
            '<h2>AI 브리핑</h2><a href="https://blog.naver.com/kcost77/224000000003">src</a>'
            '<a href="https://blog.naver.com/other1/224000000004">src</a>'
            '<h2>속기사</h2><a href="https://blog.naver.com/kcost77/224000000005">post</a>'
            '<h2>이미지</h2><a href="https://blog.naver.com/kcost77/224000000006">img</a>')
    r = analyze(demo, "kcost77")
    assert r["ai"] and r["cited"] and r["post"] and not r["image"], r
    assert r["blocks"] == ["속기사", "이미지"], r
    assert r["sources"] == ["kcost77", "other1"], r
    assert label(r) == "AI 브리핑 인용"
    r2 = analyze('<h2>속기사 관련 광고</h2><a href="https://blog.naver.com/kcost77/224000000002">', "kcost77")
    assert label(r2) == "없음", r2
    r3 = analyze('<h2>이미지</h2><a href="https://blog.naver.com/kcost77/224000000006">', "kcost77")
    assert label(r3) == "이미지만", r3
    tab = ('<a href="https://blog.naver.com/a/224000000001"></a><a href="https://blog.naver.com/a/224000000001"></a>'
           '<a href="https://blog.naver.com/b/224000000002"></a><a href="https://blog.naver.com/kcost77/224000000003"></a>')
    assert blog_rank(tab, "kcost77") == 3 and blog_rank(tab, "zzz") == 0
    print("ok")
