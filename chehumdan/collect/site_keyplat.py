"""키플랫 (keyplat.net) — robots 허용, 로그인 없음. 목록 구조는 tanz_list.py"""
from tanz_list import collect_site

BASE = "https://keyplat.net"
CATS = [("001A004A", "식품"), ("001A005A", "뷰티"), ("001A006A", "디지털"), ("001A007A", "문화"), ("001A008A", "패션"),
        ("001A009A", "생활"), ("001A038A", "도서"), ("001A039A", "유아동"), ("001A056A", "반려동물"), ("001A", ""),
        ("002A010A", "맛집"), ("002A011A", "숙박"), ("002A012A", "뷰티"), ("002A049A", "문화"), ("002A051A", "마트"),
        ("002A050A", "기타"), ("002A", ""), ("003A", "공동구매"), ("020A", "구매평"), ("055A", "기자단")]


def collect() -> list[dict]:
    return collect_site("keyplat", "키플랫", BASE, CATS)
