"""분류기·지역 정규화 테스트: python -m unittest test_common"""
import unittest

from common import classify, make_item, norm_sido, split_address, to_kst_date


class Region(unittest.TestCase):
    def test_sido(self):
        self.assertEqual(norm_sido("서울특별시"), "서울")
        self.assertEqual(norm_sido("경기도"), "경기")
        self.assertEqual(norm_sido("재택"), "전국")
        self.assertEqual(norm_sido("강원특별자치도"), "강원")
        self.assertIsNone(norm_sido("어딘가"))

    def test_address(self):
        self.assertEqual(split_address("서울 강남구 역삼동 123"), ("서울", "강남구"))
        self.assertEqual(split_address("경기도 수원시 팔달구 인계동"), ("경기", "수원시"))
        self.assertEqual(split_address("세종특별자치시 한누리대로"), ("세종", None))

    def test_delivery_is_nationwide(self):
        it = make_item(site="x", sid=1, url="u", title="에어팟", ctype="delivery", sido="서울", sigungu="강남구")
        self.assertEqual((it["sido"], it["sigungu"]), ("전국", None))


class Purpose(unittest.TestCase):
    cases = [
        ("하하호호프렌드애견동반펜션", "1박 2인 숙박", "여행", "visit", "travel"),
        ("순수네일 DMC수색점", "자석젤 네일", "뷰티", "visit", "beauty"),
        ("스포니스 삼성본점", "1:1 pt 1회 제공", "기타", "visit", "health"),
        ("오색한우", "한우모둠구이", "맛집", "visit", "food"),
        ("튤리 주문제작 케이크", "생화쌀케이크", "맛집", "visit", "cafe"),
        ("오토스테이 화정점", "맥스 세차 1회권", "기타", "visit", "service"),
        ("바비야기 진주점", "저염 유아식", "맛집", "etc", "food"),
        ("더플레이스", "소파쿠션(솜포함)", "기타", "visit", "service"),
        ("엠투실용음악학원", "보컬 레슨", "기타", "visit", "edu"),
        ("헤이콜드브루 블랙 1.5L", "콜드브루 1병", "식품", "purchase", "product"),
        ("무드그라운드", "강아지 겨울 보들조끼", "반려동물", "takeout", "pet"),
        ("봉대미곱창", "곱창전골 소", "식품", "takeout", "food"),
        ("갈비집 디저트세트", "케이크 증정", "맛집", "visit", "food"),
        # 강남맛집: 사이트 분류가 '방문형'뿐이고 가게 이름만 있는 식당 체험권
        ("언덕집", "3만원 체험권 (2인 기준)", "방문형", "visit", "food"),
        ("KING돈가스", "3만원 체험권", "방문형", "visit", "food"),
        ("천궁대신", "신점 상담 1회(1인 기준) 체험권", "방문형", "visit", "service"),
        ("쑥뜸천하", "전신돔뜸 1시간 체험권 (1인 기준)", "방문형", "visit", "service"),
    ]

    def test_cases(self):
        for title, offer, cat, ctype, want in self.cases:
            with self.subTest(title=title):
                self.assertEqual(classify(title, offer, cat, ctype), want)


class Dates(unittest.TestCase):
    def test_iso_utc_to_kst(self):
        self.assertEqual(to_kst_date("2026-10-30T14:59:59.999Z"), "2026-10-30")
        self.assertEqual(to_kst_date("2026-10-30T15:00:00Z"), "2026-10-31")
        self.assertEqual(to_kst_date("2026.11.02"), "2026-11-02")


if __name__ == "__main__":
    unittest.main()
