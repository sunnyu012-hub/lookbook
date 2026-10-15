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
  data/campaigns.json             수집 결과 — 페이지가 이걸 읽는다
  collect/
    common.py                     HTTP, 날짜, 지역 정규화, 목적 분류, 공통 스키마
    site_reviewnote.py            사이트별 수집기
    run.py                        전체 실행 + first_seen 유지 + 마감 지난 공고 제거
    test_common.py                분류기 테스트 (python -m unittest test_common)
.github/workflows/chehumdan-collect.yml   하루 4번(KST 07·11·16·21시) 수집 → JSON 커밋
```
- 사이트 하나가 실패해도 나머지는 계속 돌고, 실패한 사이트는 지난번 데이터를 유지한다.
- 화면: PC는 왼쪽 필터 사이드바 + 교환권 모양 카드 격자. 모바일(860px 이하)은 지역·목적 빠른 분류 띠 + 한 줄 목록 + 아래에서 올라오는 필터 시트.

## 공고 레코드 (data/campaigns.json → items[])
`id, site, url, title, offer, type, channel, sido, sigungu, purpose, cat(사이트 원래 분류), end(신청 마감 KST), recruit, applicants, first_seen`

## 사이트별 조사 결과 (2026-10-15, GitHub Actions에서 직접 접속해 확인)
| 사이트 | 상태 | 내용 |
|---|---|---|
| 리뷰노트 | ✅ 수집 중 | `/api/v2/campaigns?page=N&limit=16` 공개 API(로그인 불필요). 한 페이지 최대 16건, `has_more` 로 끝 판단. robots.txt 는 상세(`/campaigns/`)만 막음 |
| 강남맛집 | ⛔ 접속 불가 | GitHub Actions(해외 서버)에서 http/https/www 모두 접속 시간 초과 → 해외 IP 차단으로 보임. 한국 IP에서 도는 수집기(집 PC의 self-hosted runner 등)가 있어야 함 |
| 레뷰 | ⛔ 로그인 필요 | 목록 API `api.weble.net/v1/campaigns` 가 토큰 없이 401. 로그인해야 보이는 정보라 원칙상 제외 |
| 포포몬 | ⛔ robots.txt 금지 | 모든 봇에 `/campaign`, `/next/campaign`, `/next/search` 를 막아 둠. 원칙상 제외 |

## 다음 할 일
1. 이 브랜치를 main 에 병합 → Pages 에 공개되고 정기 수집이 시작된다(정기 실행은 기본 브랜치에서만 돈다).
2. 빠진 세 곳 대신 넣을 사이트 정하기 — 공개 목록을 주는 곳(예: 디너의여왕, 서울오빠, 미블, 링블 등)을 같은 방식으로 조사.
3. 강남맛집을 꼭 넣으려면 한국 IP 수집 경로 마련.
4. 분류 규칙은 실제 데이터를 보며 `test_common.py` 에 사례를 추가하면서 다듬는다.
