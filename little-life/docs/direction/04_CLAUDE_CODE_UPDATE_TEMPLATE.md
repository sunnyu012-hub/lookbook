# LITTLE LIFE — Claude Code Update Template

아래 틀은 이후 UPDATE G/H/I/J 또는 보강 업데이트를 만들 때 재사용한다.

```text
당신은 현재 LITTLE LIFE 프로젝트의 기존 구조를 최대한 유지하면서
[UPDATE 이름]
을 구현한다.

가장 중요한 원칙:

1. 새 시스템을 만들기 전에 기존 코드를 먼저 조사한다.
2. 기존 타입/저장/발견/제작/알림/UI를 최대한 재사용한다.
3. 한 업데이트의 범위를 넘지 않는다.
4. 다음 업데이트 기능은 Hook만 남긴다.
5. 플레이어에게 숙제감·실패·벌칙을 추가하지 않는다.
6. 파생 가능한 boolean은 저장하지 않는다.
7. 별도 에너지/화폐/호감도 시스템을 쉽게 추가하지 않는다.
8. 에셋이 없으면 placeholder를 쓰고 Missing Asset으로 기록한다.
9. 색 필터로 새 아이템처럼 보이게 만들지 않는다.
10. 기존 save migration을 안전하게 유지한다.

────────────────────
0. 기존 코드 조사
────────────────────

이번 업데이트와 연결된:
- type
- derive
- save
- sanitize
- migration
- discovery
- collection
- inventory
- crafting
- story
- map
- overlay
- tutorial
- energy
- RNG/date
- tests

를 먼저 조사한다.

조사 후:
1. 그대로 재사용
2. 작은 확장 필요
3. 정말 신규 필요

로 나눈 뒤 구현한다.

────────────────────
1. 이번 업데이트 목표
────────────────────

[핵심 목표 3~5개]

플레이 흐름:
[flow]

────────────────────
2. 해금 조건
────────────────────

가능하면 기존 플레이 기록을 사용하고 derive한다.

────────────────────
3. 핵심 콘텐츠
────────────────────

[지역 / 캐릭터 / 제작 / 탐험 / 보상]

복잡성을 최소화한다.

────────────────────
4. Interaction / UX
────────────────────

클릭과 관리 단계를 최소화한다.
반복 수행, 랜덤 실패, 놓친 날 벌칙을 만들지 않는다.

────────────────────
5. Economy / Energy
────────────────────

기존 자원을 먼저 사용한다.

새 에너지 금지.

Energy 0이어도:
- 기존 화면 열람
- 기록 확인
- 이미 열린 지역 이동

은 가능하게 한다.

────────────────────
6. Discovery / Collection
────────────────────

가능하면 기존:

addItem
→ applyCollectionDerived
→ applyDiscovery

흐름 사용.

────────────────────
7. Story Hook
────────────────────

이번 이야기는 마무리하되 다음 업데이트는 Hook만 남긴다.

────────────────────
8. Save Migration
────────────────────

기존 save version → 신규 version.

- 기존 저장 유지
- 신규 필드 기본값
- unknown id 제거
- 파생 상태 저장 금지

────────────────────
9. Assets
────────────────────

필요 에셋을 docs/asset-request.md에 추가.

에셋이 없으면 placeholder.

기존 이미지 색 필터 금지.

────────────────────
10. QA
────────────────────

검증:
- migration
- unlock
- core flow
- duplicate prevention
- zero resource state
- refresh/reload
- discovery
- collection
- existing screen regression
- typecheck
- unit
- browser
- JS errors
- asset audit

────────────────────
11. 이번에 만들지 않을 것
────────────────────

[NOT IN THIS UPDATE]

────────────────────
12. 완료 후 보고
────────────────────

1. 기존 시스템에서 재사용한 것
2. 새로 만든 파일
3. 핵심 데이터 구조
4. 해금 조건
5. 플레이 흐름
6. 자원/에너지 규칙
7. Story
8. Collection / Discovery
9. Save migration
10. Missing Assets
11. QA
12. 다음 업데이트 전에 결정할 것
13. 의도적으로 만들지 않은 것
```

## 구현 보고 검토 체크리스트

Architecture:
- 같은 기능이 중복 구현되지 않았는가
- 기존 시스템이 있는데 신규 시스템을 만들지 않았는가
- derive 가능한 상태가 저장되고 있지 않은가

Save:
- migration
- sanitize
- unknown id
- 기존 진행도 유지

Economy:
- 새 화폐/에너지가 생기지 않았는가
- 반복 파밍을 강요하지 않는가
- 희귀 재료 요구가 과하지 않은가

UX:
- 오늘 안 하면 손해인가
- 하루 제한이 숙제처럼 느껴지는가
- 실패가 있는가
- 같은 클릭을 반복해야 하는가

Story:
- 다음 업데이트 기능을 미리 구현하지 않았는가
- Hook만 남겼는가
- 문체가 과하지 않은가

Assets:
- Missing Asset 기록
- 색 필터 재활용 금지
- 경로 규칙 확인

QA:
- typecheck
- unit
- browser
- JS error
- regression
