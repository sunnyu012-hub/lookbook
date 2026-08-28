# LITTLE LIFE — Master Context

## 한 줄 설명

**현실의 작은 행동을 퀘스트·탐험·수집·성장으로 바꾸는 현대 생활 판타지 RPG.**

## 기본 게임 루프

현실 행동
→ Quest 완료
→ EXP / Coin / Drop / Stat / Collection
→ Character / Room / Area / Story 성장
→ 새로운 발견
→ 다시 현실 행동

## 이미 존재하는 주요 시스템

대표적으로:
- Quest
- EXP / Level
- Coin
- Inventory / BAG
- Equipment
- Class
- Stats
- Skills
- Area / Map
- Area Buff
- Monster
- Boss
- NPC
- Friendship
- Story
- Shop
- Reputation
- Event
- Collection
- Room Decoration
- Crafting
- Trophy
- Routine
- Quest Pack
- Smart Quest Recommendation

이후 업데이트는 가능한 한 기존 시스템을 재사용한다.

## Quest UX 방향

Quest 추가는:
1. Smart Recommendation
2. Quick Add
3. Quest Packs
4. Routine
5. Custom

순서를 지향한다.

Smart Recommendation은 로컬 기록 기반:
- 추가 빈도
- 완료 빈도
- 요일
- 시간대
- 최근성
- 즐겨찾기
- 완료율
- 추천 무시 신호

를 활용한다.

## 기존 지역

- Home Base
- Cafe Street
- Green Park
- Creative District
- Training Zone
- Night Town

Old Quarry는 Green Park 바깥쪽 돌이 많은 길과 연결된다.

## Adventure Expansion 철학

Adventure는 별개의 하드코어 RPG가 아니다.

도시 생활 속에서:
- 이상한 길
- 오래된 공간
- 작은 생명체
- 정체 모를 물건
- 조용한 이야기

를 발견하는 방향이다.

전투보다 탐험과 발견을 우선한다.

## Garden / Kitchen / Workshop

### Little Garden
작물을 기르고 수확한다. 도감/재료 카드용 이미지는 **거둔 결과물 한 줌**으로 표현한다.

### Tiny Kitchen
수확한 재료로 작은 요리를 만든다. 한 접시 / 한 잔 단위.

### Workshop
정원/부엌 재료로 방에 놓는 가구와 소품을 만든다.

## Adventure Energy

기존 `adventureEnergy`를 사용한다.

원칙:
- 새 방 최초 방문: 소비 가능
- 새로운 조사: 소비 가능
- 이미 방문한 방 이동: 0
- 기록/도감 확인: 0
- Energy 0이어도 던전 입장/둘러보기 가능

새 Adventure 스태미나는 추가하지 않는다.

## Discovery Architecture

가능한 한 기존 발견 사슬을 사용한다.

```txt
addItem
→ applyCollectionDerived
→ applyDiscovery
→ DiscoveryNote / DiscoveryCards
```

## Save 철학

- 업데이트마다 migration
- 신규 필드는 기본값
- 알 수 없는 id는 sanitize
- 기존 저장 유지
- 파생 가능한 boolean은 저장하지 않음

UPDATE E 완료 시점 저장 버전은 `v16`.

## 현재 Adventure Story

```txt
Old Quarry
↓
이상한 돌조각
↓
HARU_5
↓
오래된 열쇠
↓
막힌 길
↓
잠든 돌문
↓
First Dungeon
↓
작은 흔적
↓
문 너머에서 아주 작은 소리
```

다음은 Creature Collection.

## 캐릭터 비주얼

- 큰 짙은 갈색 눈
- 작은 코/입
- 복숭아빛 볼
- 둥근 치비 얼굴
- 작은 몸
- 부드러운 파스텔
- 따뜻한 수채화 느낌

캐릭터 스킨은 레이어 방식이 아니라 완성형 PNG 전체 교체 방식으로 확장한다.

## Room / Collection 우선순위

의상 레이어보다:
- 방 꾸미기
- 수집
- 가구
- 작은 물건
- 트로피
- 발견

의 재미를 우선한다.
