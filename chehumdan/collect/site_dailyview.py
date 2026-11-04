"""데일리뷰 (dailyview.kr) — robots 허용, 로그인 없음. 목록 구조는 tanz_list.py"""
from tanz_list import collect_site

BASE = "https://dailyview.kr"
CATS = [("001A012A", "맛집"), ("001A013A", "뷰티"), ("001A014A", "숙박"), ("001A015A", "문화"), ("001A016A", "배달"),
        ("001A017A", "기타"), ("001A", ""), ("002A006A", "생활"), ("002A007A", "디지털"), ("002A008A", "패션"),
        ("002A009A", "뷰티"), ("002A010A", "식품"), ("002A324A", "육아"), ("002A011A", "기타"), ("002A", ""),
        ("373A", ""), ("396A", ""), ("399A", "")]


def collect() -> list[dict]:
    return collect_site("dailyview", "데일리뷰", BASE, CATS)
