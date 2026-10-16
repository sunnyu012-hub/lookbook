# 체험단 다모아 by. 유니니 (chehumdan)

여러 체험단 사이트의 공고를 한곳에 모아 검색·분류해서 보는 공유용 웹페이지.

## 정해진 것
- 처음부터 공유용. 로그인·찜·개인 기록 없음 — 링크만 있으면 누구나 본다. 필터 상태는 주소 뒤 `#`에 담겨서 그대로 공유된다.
- 신청은 원래 사이트에서. 카드를 누르면 원문으로 이동.
- 로그인해야 보이는 정보는 수집하지 않는다. robots.txt 가 막은 곳도 읽지 않는다(약관·계정 정지 위험).
- 이미지·상세 본문은 복사하지 않고 제목·핵심 정보·원문 링크만 보여준다.

## 핵심 차별점 — 검색이 아니라 분류로 찾기
- 지역: 시/도 › 시/군/구 2단계. 배송형·재택·기자단은 "전국·배송"으로 분리.
- 목적: 맛집 / 카페·디저트 / 여행·숙박 / 뷰티·미용 / 운동·건강 / 교육·체험 / 반려동물 / 생활·제품 / 기타 서비스
- 유형(방문형·배송형·기자단·포장·구매평), 채널(블로그·인스타·릴스·클립…)
- 오늘 새로(처음 발견된 날 기준), 마감 임박(D-2 이내), 경쟁 낮은 순(신청÷모집)
- 사이트 카테고리 + 제목 + 제공내역 키워드를 같이 보고 자체 기준으로 재분류 → `collect/common.py` 의 `classify()`

## 구조
```
chehumdan/
  index.html, style.css, app.js   정적 페이지 (GitHub Pages: /lookbook/chehumdan/)
  data/sites/<사이트>.json        수집 결과(git 에 안 올림) — 실제는 chehumdan-data 브랜치의 sites/<사이트>.json
  collect/
    common.py                     HTTP, 날짜, 지역 정규화, 목적 분류, 공통 스키마
    site_*.py                     사이트별 수집기 (reviewnote, popomon, revu, gangnam)
    kr_job.py                     한국 PC 작업(할 일 정하기→준비→수집/probe→저장). 워크플로는 shell: cmd 에서 이것만 부른다
    data_sync.py                  chehumdan-data 브랜치 받기(pull)·올리기(push). 부모 없는 커밋 1개로 덮어써 기록이 안 쌓인다
    run.py                        전체 실행 + first_seen 유지 + 마감 지난 공고 제거
    test_common.py                분류기 테스트 (python -m unittest test_common)
.github/workflows/chehumdan-collect.yml      GitHub 서버: 리뷰노트·포포몬·디너의여왕·놀러와·체험뷰·똑똑, 하루 2번(KST 07:10·19:10)
.github/workflows/chehumdan-collect-kr.yml   한국 PC: 레뷰·강남맛집·리뷰의민족·포블로그·클라우드리뷰, 하루 2번(KST 08:40·18:40)
```
- 사이트 하나가 실패해도 나머지는 계속 돌고, 실패한 사이트는 지난번 데이터를 유지한다.
- 데이터 위치(10-16): main 에 커밋하면 지난 버전이 쌓여 저장소가 커져서 `chehumdan-data` 브랜치를 매번 덮어쓴다.
  화면은 `raw.githubusercontent.com/sunnyu012-hub/lookbook/chehumdan-data/sites/` 를 읽는다(캐시 5분). 이 PC 미리보기(localhost)는 `python collect/data_sync.py pull` 로 받은 data/sites/.
- 수집 횟수(10-16 사용자 결정): 서버·한국 PC 모두 하루 2번. 사이트 부담을 줄이고, 공고가 며칠씩 열려 있어 충분하다.
- 화면: PC는 왼쪽 필터 사이드바 + 교환권 모양 카드 격자. 모바일(860px 이하)은 지역·목적 빠른 분류 띠 + 한 줄 목록 + 아래에서 올라오는 필터 시트.

## 공고 레코드 (data/sites/*.json → items[])
`id, site, url, title, offer, type, channel, sido, sigungu, purpose, cat(사이트 원래 분류), end(신청 마감 KST), recruit, applicants, first_seen`

## 사이트별 조사 결과 (2026-10-15, GitHub Actions에서 직접 접속해 확인)
| 사이트 | 어디서 | 내용 |
|---|---|---|
| 리뷰노트 | GitHub 서버, 하루 2번 | `/api/v2/campaigns?page=N&limit=16&city=시도` 공개 API. 전체 목록이 약 800페이지에서 끊겨 `/api/v2/sidos` 의 시/도별로 나눠 받음. 모집 중 = status SELECT/PROGRESS |
| 포포몬 | GitHub 서버, 하루 2번 | `/api_p/campaign/fetch_getcampaignlist` 공개 API(한 페이지 12건). robots.txt 는 목록 수집을 금지하지만 사용자 결정으로 수집(10-15). 지역은 제목 앞 `[충남/태안군]` |
| 레뷰 | 사무실 PC, 하루 2번 | 부계정(이메일) 로그인 필요. 사용자 결정(10-15): **부계정 + 한국 PC + 하루 1~2번**. 화면 없는 크롬으로 `www.revu.net/login` → 토큰 → 카테고리 화면과 같은 `v1/campaigns?cat=지역·제품·서비스·기자단&type=play`(모집 중, 30건씩). 10-15 3,281건 |
| 강남맛집 | 사무실 PC, 하루 2번 | 해외 IP 차단. `/theme/go/_list_cmp_tpl.php?rpage=N` 목록 조각(28건씩). 10-15 7,003건 |

### 10-15 추가 (사용자가 알려 준 사이트) — 모두 로그인 없음·robots 허용, 건수는 한국 PC 기준
GitHub 서버 시험(10-15 18:57): 디너의여왕·체험뷰·놀러와·똑똑은 해외에서도 됨. 리뷰의민족·포블로그는 접속 실패, 클라우드리뷰는 0건 → 한국 PC로 옮김(18:59 성공).
사이트마다 수집 상한 25분(`run.py SITE_TIMEOUT`, 리뷰노트만 45분) — 한 곳이 막혀도 나머지는 저장된다. 리뷰노트는 서버에서 25분 넘게 걸린다(요청 1,100여 번).
| 사이트 | 목록 출처 | 건수 |
|---|---|---|
| 디너의여왕 dinnerqueen.net | `POST /taste/taste_list?page=N` (카드 HTML 30건) | 8,470 |
| 체험뷰 chvu.co.kr | `/v2/campaigns?category=search&services=…&sort=+close` JSON (robots 는 상세 `/campaign/` 만 금지) | 817 |
| 포블로그 4blog.net | `/loadMoreDataCategoryV2?category1=local·deliv·reporter` JSON | 763 |
| 놀러와체험단 cometoplay.kr | `item_list.php?category_id=…&page=N` HTML | 317 |
| 리뷰의민족 remin.co.kr | `/category/searchlist?p_cateType=A·B·D·E` HTML 조각 (robots.txt 없음) | 178 |
| 클라우드리뷰 cloudreview.co.kr | `/campaign/blog·instagram·short·buy` 화면 하나에 전체 | 1,295 |
| 똑똑리워드 ddok.it | `/api/campaigns?limit=50&cursor=` JSON (옛 ddok.co.kr 은 07-31 종료) | 125 |

보류 — 사용자 결정 대기 (10-15)
- robots.txt 가 목록을 막음: 서울오빠(전체 금지), 링블(`/category.php`), 클립뷰(검색엔진만 허용), 구구다스(`/amz/list/`), 리뷰플레이스(`/pr`·`/theme`)
- 로그인해야 목록이 보임: 미블(mrblog.net)
- 애매: 어디야(odiya.kr) — robots 가 `/category/` 처럼 폴더만 막아 실제 주소 `/category.php` 는 허용이지만 막으려던 의도로 보임. `site_odiya.py` 는 만들어 두었지만 커밋 안 함


- 사무실 PC(Windows) 설정 방법: `KR_PC.md`(손으로) 또는 `OFFICE_PC_SESSION.md`(사무실 PC에서 Claude 세션을 열어 진행). 브랜치에서 시험할 때는 `scripts/kr-task.txt`(1줄 collect|probe, 2줄 사이트)를 바꿔 올린다.
- 레뷰는 로그인해야 보이는 정보인데 사이트가 공개라 누구나 보게 된다는 점은 사용자에게 알렸음.
- 참고: 인플렉서는 자기 수집 서버(inflexer.net:5000)에 40여 개 플랫폼을 모아 두고 화면은 그 API만 읽는다.

## 다음 할 일
1. 보류 사이트 결정(사용자)
2. 이 브랜치를 main 에 병합 → Pages 공개 + 정기 수집 시작(정기 실행은 기본 브랜치에서만 돈다)
3. 분류 규칙은 실제 데이터를 보며 `test_common.py` 에 사례를 추가하면서 다듬는다
