"""체험단 다모아 수집기 공통: 스키마, HTTP, 지역 정규화, 목적 분류."""
from __future__ import annotations

import json
import re
import ssl
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

KST = timezone(timedelta(hours=9))
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/129.0 Safari/537.36")

# ── HTTP ───────────────────────────────────────────────
def fetch(url: str, *, params: dict | None = None, headers: dict | None = None,
          data: bytes | None = None, timeout: int = 30, retries: int = 2) -> bytes:
    if params:
        url += ("&" if "?" in url else "?") + urllib.parse.urlencode(params)
    h = {"User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9", "Accept": "*/*"}
    if headers:
        h.update(headers)
    last = None
    for i in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers=h, data=data)
            with urllib.request.urlopen(req, timeout=timeout, context=ssl.create_default_context()) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(2 * (i + 1))
    raise RuntimeError(f"fetch failed: {url}: {last!r}")


def fetch_json(url: str, **kw):
    kw.setdefault("headers", {}).setdefault("Accept", "application/json, text/plain, */*")
    return json.loads(fetch(url, **kw))


def polite_sleep(sec: float = 1.0):
    """사이트에 부담을 주지 않도록 요청 사이에 쉰다."""
    time.sleep(sec)


# ── 날짜 ───────────────────────────────────────────────
def to_kst_date(value) -> str | None:
    """ISO 문자열/epoch(ms)/'2026-10-30'/'10.30' 등을 KST 'YYYY-MM-DD' 로."""
    if value in (None, ""):
        return None
    if isinstance(value, (int, float)):
        v = value / 1000 if value > 1e11 else value
        return datetime.fromtimestamp(v, KST).strftime("%Y-%m-%d")
    s = str(value).strip()
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=KST)
        return dt.astimezone(KST).strftime("%Y-%m-%d")
    except ValueError:
        pass
    m = re.search(r"(\d{4})[.\-/년 ]\s*(\d{1,2})[.\-/월 ]\s*(\d{1,2})", s)
    if m:
        return f"{int(m[1]):04d}-{int(m[2]):02d}-{int(m[3]):02d}"
    m = re.search(r"(\d{1,2})[.\-/월]\s*(\d{1,2})", s)
    if m:
        today = datetime.now(KST)
        y = today.year
        mo, d = int(m[1]), int(m[2])
        if mo < today.month - 6:  # 12월에 1월 마감이 보이는 경우
            y += 1
        return f"{y:04d}-{mo:02d}-{d:02d}"
    return None


def today_kst() -> str:
    return datetime.now(KST).strftime("%Y-%m-%d")


# ── 지역 ───────────────────────────────────────────────
SIDO = ["서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "세종",
        "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"]
NATIONWIDE = "전국"  # 배송형·재택·기자단

_SIDO_ALIAS = {
    "서울특별시": "서울", "서울시": "서울",
    "경기도": "경기",
    "인천광역시": "인천", "인천시": "인천",
    "부산광역시": "부산", "부산시": "부산",
    "대구광역시": "대구", "대구시": "대구",
    "광주광역시": "광주",
    "대전광역시": "대전", "대전시": "대전",
    "울산광역시": "울산", "울산시": "울산",
    "세종특별자치시": "세종", "세종시": "세종",
    "강원도": "강원", "강원특별자치도": "강원",
    "충청북도": "충북", "충청남도": "충남",
    "전라북도": "전북", "전북특별자치도": "전북", "전라남도": "전남",
    "경상북도": "경북", "경상남도": "경남",
    "제주특별자치도": "제주", "제주도": "제주",
}
_NATION_WORDS = ("재택", "전국", "배송", "온라인", "기자단")


def norm_sido(raw: str | None) -> str | None:
    if not raw:
        return None
    s = raw.strip()
    if any(w in s for w in _NATION_WORDS):
        return NATIONWIDE
    if s in SIDO:
        return s
    if s in _SIDO_ALIAS:
        return _SIDO_ALIAS[s]
    for k, v in _SIDO_ALIAS.items():
        if s.startswith(k):
            return v
    for v in SIDO:
        if s.startswith(v):
            return v
    return None


_SIGUNGU_RE = re.compile(r"^([가-힣]{1,6}(?:시|군|구))(?:\s|$)")


def split_address(addr: str | None) -> tuple[str | None, str | None]:
    """'서울 강남구 역삼동 …' / '경기도 수원시 팔달구' → ('서울','강남구') / ('경기','수원시')."""
    if not addr:
        return None, None
    parts = addr.replace(",", " ").split()
    if not parts:
        return None, None
    sido = norm_sido(parts[0])
    sgg = None
    if len(parts) > 1:
        m = _SIGUNGU_RE.match(parts[1])
        if m:
            sgg = m.group(1)
    if sido == "세종":
        sgg = None
    return sido, sgg


# 시/군/구 전체 이름 (2026-07 인천 개편 전후 이름 모두)
SIGUNGU: dict[str, list[str]] = {k: v.split() for k, v in {
    "서울": "종로구 중구 용산구 성동구 광진구 동대문구 중랑구 성북구 강북구 도봉구 노원구 은평구 서대문구 마포구 양천구 "
            "강서구 구로구 금천구 영등포구 동작구 관악구 서초구 강남구 송파구 강동구",
    "부산": "중구 서구 동구 영도구 부산진구 동래구 남구 북구 해운대구 사하구 금정구 강서구 연제구 수영구 사상구 기장군",
    "대구": "중구 동구 서구 남구 북구 수성구 달서구 달성군 군위군",
    "인천": "중구 동구 미추홀구 연수구 남동구 부평구 계양구 서구 제물포구 영종구 서해구 검단구 강화군 옹진군",
    "광주": "동구 서구 남구 북구 광산구",
    "대전": "동구 중구 서구 유성구 대덕구",
    "울산": "중구 남구 동구 북구 울주군",
    "경기": "수원시 성남시 의정부시 안양시 부천시 광명시 평택시 동두천시 안산시 고양시 과천시 구리시 남양주시 오산시 시흥시 "
            "군포시 의왕시 하남시 용인시 파주시 이천시 안성시 김포시 화성시 광주시 양주시 포천시 여주시 연천군 가평군 양평군",
    "강원": "춘천시 원주시 강릉시 동해시 태백시 속초시 삼척시 홍천군 횡성군 영월군 평창군 정선군 철원군 화천군 양구군 인제군 고성군 양양군",
    "충북": "청주시 충주시 제천시 보은군 옥천군 영동군 증평군 진천군 괴산군 음성군 단양군",
    "충남": "천안시 공주시 보령시 아산시 서산시 논산시 계룡시 당진시 금산군 부여군 서천군 청양군 홍성군 예산군 태안군",
    "전북": "전주시 군산시 익산시 정읍시 남원시 김제시 완주군 진안군 무주군 장수군 임실군 순창군 고창군 부안군",
    "전남": "목포시 여수시 순천시 나주시 광양시 담양군 곡성군 구례군 고흥군 보성군 화순군 장흥군 강진군 해남군 영암군 무안군 "
            "함평군 영광군 장성군 완도군 진도군 신안군",
    "경북": "포항시 경주시 김천시 안동시 구미시 영주시 영천시 상주시 문경시 경산시 의성군 청송군 영양군 영덕군 청도군 고령군 "
            "성주군 칠곡군 예천군 봉화군 울진군 울릉군",
    "경남": "창원시 진주시 통영시 사천시 김해시 밀양시 거제시 양산시 의령군 함안군 창녕군 고성군 남해군 하동군 산청군 함양군 거창군 합천군",
    "제주": "제주시 서귀포시",
}.items()}


def full_sigungu(sido: str | None, short: str | None) -> str | None:
    """'은평' → '은평구', '파주' → '파주시' (SIGUNGU 기준). 표에 없으면 None."""
    for name in SIGUNGU.get(sido or "", []):
        if short and short in (name, name[:-1]):
            return name
    return None

# ── 유형·채널 ──────────────────────────────────────────
TYPES = {"visit": "방문형", "delivery": "배송형", "reporter": "기자단", "takeout": "포장", "purchase": "구매평", "etc": "기타"}
CHANNELS = {"blog": "블로그", "insta": "인스타그램", "reels": "릴스", "youtube": "유튜브",
            "shorts": "쇼츠", "tiktok": "틱톡", "clip": "클립", "etc": "기타"}


# ── 목적 분류 ──────────────────────────────────────────
PURPOSES = {
    "food": "맛집",
    "cafe": "카페·디저트",
    "travel": "여행·숙박",
    "beauty": "뷰티·미용",
    "health": "운동·건강",
    "edu": "교육·체험",
    "pet": "반려동물",
    "product": "생활·제품",
    "service": "기타 서비스",
}

# 위에서부터 먼저 맞는 규칙이 이긴다. (패턴, 목적)
_RULES: list[tuple[re.Pattern, str]] = [(re.compile(p, re.I), k) for p, k in [
    (r"펜션|호텔|리조트|모텔|글램핑|캠핑장|풀빌라|한옥스테이|게스트하우스|숙소|숙박|객실|민박|한옥스테이|1박", "travel"),
    (r"애견|반려|펫|강아지|고양이|댕댕|멍멍|캣|동물병원", "pet"),
    (r"네일|헤어|미용실|살롱|펌|염색|클리닉|피부|왁싱|속눈썹|래쉬|눈썹|반영구|에스테틱|에스테|두피|"
     r"마사지|스파|슬리밍|체형|태닝|메이크업|화장품|스킨케어|앰플|세럼|선크림|바버|"
     r"사진관|프로필\s*촬영|스튜디오|퍼스널\s*컬러|안경|렌즈", "beauty"),
    (r"필라테스|요가|헬스|피티|\bPT\b|퍼스널\s*트레이닝|크로스핏|복싱|주짓수|골프|테니스|수영|클라이밍|"
     r"도수|한의원|치과|의원|병원|정형외과|재활|교정|다이어트|스트레칭|피트니스|휘트니스", "health"),
    (r"카페|커피|디저트|베이커리|빵|케이크|케익|마카롱|도넛|와플|크로플|젤라또|아이스크림|빙수|티룸|찻집|브런치", "cafe"),
    (r"교육|클래스|원데이|공방|학원|과외|수업|강의|체험학습|키즈카페|레슨|코딩|미술|"
     r"방탈출|보드게임|볼링|VR|오락실", "edu"),
]]

_FOOD_WORDS = re.compile(
    r"식당|맛집|고기|삼겹|갈비|한우|소고기|돼지|곱창|막창|국밥|찌개|해장국|감자탕|갈비탕|매운탕|전골|"
    r"횟집|생선회|물회|초밥|스시|오마카세|이자카야|술집|호프|포차|주점|혼술|칵테일|와인|펍|막걸리|"
    r"파스타|피자|버거|치킨|족발|보쌈|분식|떡볶이|라멘|우동|쌀국수|마라|중식|짜장|짬뽕|양꼬치|샤브|"
    r"뷔페|레스토랑|비스트로|다이닝|식사|정식|백반|한식|일식|양식|도시락|닭갈비|찜닭|오리|장어|"
    r"해산물|해물|조개|대게|홍게|꽃게|게장|킹크랩|음식|시식|밀면|국수|냉면|칼국수|만두|돈까스|카츠|스테이크|순대|쭈꾸미|주꾸미|곰탕|유아식|"
    r"추어탕|돈가스|참치|방어|아구|닭|라면|김밥|수육|두부|숯불|돌솥|면옥|카레|강정|밥상|정육|요리|모듬회|숙성회", re.I)
# 약한 단서: 가게 이름만 있는 식당 체험권('3만원 체험권 (2인 기준)', 강남맛집에 많음). 이용권·게임장은 빼고 본다.
_MEAL_HINT = re.compile(r"메뉴|\d\s*인분|[2-9]\s*인\s*기준")
_NOT_MEAL = re.compile(r"이용|게임|노래|당구|탁구|파티|참가|사주|타로|신점|상담|안마|낚시")

_SITE_CAT = {
    # 사이트 카테고리 원문 → 목적 힌트
    "맛집": "food", "음식": "food", "푸드": "food", "식당": "food",
    "카페": "cafe",
    "여행": "travel", "숙박": "travel", "여행/숙박": "travel", "숙소": "travel",
    "뷰티": "beauty", "미용": "beauty", "패션": "product",
    "반려동물": "pet", "펫": "pet",
    "식품": "product", "생활": "product", "디지털": "product", "제품": "product",
    "유아동": "product", "도서": "product", "출산/육아": "product",
    "문화": "edu", "교육": "edu", "체험": "edu",
    "건강": "health", "운동": "health",
}


def classify(title: str, offer: str = "", site_category: str = "", ctype: str = "visit") -> str:
    """제목·제공내역·사이트 카테고리·유형을 같이 보고 자체 목적 분류를 정한다."""
    text = f"{title} {offer}"
    hint = None
    for k, v in _SITE_CAT.items():
        if k and k in (site_category or ""):
            hint = v
            break
    # 배송·구매평·(음식이 아닌) 포장 수령은 장소가 아니라 물건 리뷰다.
    is_goods = ctype in ("delivery", "purchase") or (ctype == "takeout" and not _FOOD_WORDS.search(text))
    if is_goods:
        if hint in ("beauty", "pet"):
            return hint
        for pat, key in _RULES:
            if key in ("beauty", "pet") and pat.search(text):
                return key
        return "product"
    for pat, key in _RULES:
        if pat.search(text):
            if key == "edu" and hint == "food":
                continue  # '탄탄면공방'처럼 가게 이름의 '공방'·'클래스' — 사이트가 맛집이라 했으면 교육이 아니다
            # '케이크'가 들어간 고깃집 같은 오탐을 줄이기: 사이트가 맛집이라 했고 음식 단어가 더 뚜렷하면 맛집
            if key == "cafe" and hint == "food" and _FOOD_WORDS.search(title) and not re.search(r"카페|커피|베이커리", title):
                return "food"
            return key
    if hint:
        if hint == "product" and ctype in ("visit", "takeout"):
            return "food" if _FOOD_WORDS.search(text) else "service"
        return hint
    if _FOOD_WORDS.search(text) or (_MEAL_HINT.search(text) and not _NOT_MEAL.search(text)):
        return "food"
    return "service" if ctype in ("visit", "takeout", "reporter") else "product"


# ── 레코드 ─────────────────────────────────────────────
def make_item(*, site: str, sid, url: str, title: str, offer: str = "",
              ctype: str = "visit", channel: str = "blog",
              sido: str | None = None, sigungu: str | None = None,
              site_category: str = "", apply_end: str | None = None,
              recruit: int | None = None, applicants: int | None = None) -> dict:
    title = re.sub(r"\s+", " ", (title or "")).strip()
    offer = re.sub(r"\s+", " ", (offer or "")).strip()
    if ctype in ("delivery", "reporter", "purchase"):
        sido, sigungu = NATIONWIDE, None
    if sido == NATIONWIDE:
        sigungu = None
    return {
        "id": f"{site}:{sid}",
        "site": site,
        "url": url,
        "title": title,
        "offer": offer[:120],
        "type": ctype if ctype in TYPES else "etc",
        "channel": channel if channel in CHANNELS else "etc",
        "sido": sido,
        "sigungu": sigungu,
        "purpose": classify(title, offer, site_category, ctype),
        "cat": site_category or None,
        "end": apply_end,
        "recruit": recruit,
        "applicants": applicants,
    }
