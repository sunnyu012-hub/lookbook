# LITTLE LIFE — Update History & Roadmap

## 전체 개발 순서

### UPDATE A
Adventure Foundation + Little Garden

### UPDATE B
Tiny Kitchen + Recipe Collection

### UPDATE C
Garden Expansion + Workshop

### UPDATE D
Old Quarry + Minerals

### UPDATE E
Old Key Story + First Dungeon

### UPDATE F
Creature Collection + Dungeon Boss

### UPDATE G
Companion Expedition

### UPDATE H
추가 Dungeon 2종

### UPDATE I
Character / Trophy Rewards

### UPDATE J
Beyond the City Map

---

# UPDATE D — 완료

## Old Quarry + Minerals

PR #24.

### 재사용한 시스템
- `lib/city/seed.ts` seededRandom
- `lib/date.ts` todayKey
- `lib/rpg/time.ts` timeBand
- `addItem → applyCollectionDerived → applyDiscovery`
- DiscoveryNote / DiscoveryCards
- Garden 지역 진입 패턴
- 제작 `spendItems → addItem`
- sanitize 패턴

### 해금
- 정원 수확 10회
또는
- 만들기 3가지

기존 기록 기반.

### 위치
Map → Green Park → 공원 바깥쪽 돌이 많은 길 → Old Quarry

### 조사 자리
- 바위 틈
- 낮은 절벽
- 돌무더기
- 오래된 작업장 근처
- 안쪽 길

### 하루 탐색
하루 3번. 별도 스태미나 없음. 안 써도 손해 없음.

### 광물
기존 `m_stone` 재사용.

신규 11종:
- mineral_spark_stone
- mineral_red_shard
- mineral_blue_stone
- mineral_quartz
- mineral_amethyst
- mineral_moss_stone
- mineral_moon_ore
- mineral_star_vein
- mineral_rose_crystal
- mineral_old_metal
- mineral_strange_fragment

`mineral_strange_fragment`는 안쪽 길 SECRET 6%.

### 돌등불
해금: `MINERALS_FOUND 3`

재료:
- m_stone ×3
- mineral_spark_stone ×1
- mineral_old_metal ×1

### Story Hook
```ts
oldKeyStoryHintFound(state)
strangeFragmentFound(state)
blockedPathSeen(state)
isQuarryUnlocked(state)
```

### QA
- unit 808
- browser 49
- save v14 migration
- 하루 3번 / 날짜 리셋
- 도감
- 돌등불 제작
- 회귀 없음

---

# UPDATE E — 완료

커밋 `ab59208`.

## Old Key Story + First Dungeon

### 재사용
- StoryChapterDef
- SecretCondition
- applyDiscovery
- addItem
- 도감 discovery
- seededRandom
- BottomSheet
- Portal
- useOverlay
- Button
- QuarryScreen / QuarryTutorial 구조
- adventureEnergy
- sanitize 패턴

### 신규
```txt
types/dungeon.ts
lib/dungeon/rooms.ts
lib/dungeon/items.ts
lib/dungeon/derive.ts
lib/dungeon/dev.ts
components/dungeon/DungeonScreen.tsx
components/dungeon/DungeonTutorial.tsx
components/dungeon/FoundOverlay.tsx
components/dungeon/DungeonLab.tsx
```

도감에 “탐험” 영역 추가.

### Old Key Story

```txt
mineral_strange_fragment 발견
↓
HARU_5
↓
단서 충족
↓
Old Key 자동 획득
↓
막힌 길 → 돌문
↓
Dungeon 입장
```

열쇠 조건:
1. 이상한 돌조각 발견
2. mineral_old_metal 도감 등록
3. HARU_5 읽음

모두 파생.

### First Dungeon

```txt
돌문 앞
↓
조용한 입구
↓
무너진 복도
↓
작은 방
↓
안쪽 닫힌 문
```

갈림길 없음. 조사 자리 7개.

### adventureEnergy
- 입장 0
- 가본 방 이동 0
- 기록 열람 0
- 처음 가는 구역 1
- 처음 보는 자리 조사 1
- Energy 0이어도 입장/둘러보기 가능

### 발견물
- 벽화 조각
- 낡은 동전
- 희미한 수정
- 부드러운 동굴 이끼
- 작은 흔적
- 오래된 열쇠

곁가지:
- m_stone
- mineral_moss_stone

재사용.

### UPDATE F Hook
안쪽 문 아래 `작은 흔적`.

> 문 너머에서 아주 작은 소리가 났다.

핵심:
```ts
traceFound(state)
```

### Save
`v15 → v16`

Dungeon:
- discoveredRoomIds
- searchedSpotIds
- tutorialSeenAt

### QA
- typecheck 통과
- vitest 856
- dungeon 신규 48
- browser 38
- JS error 0

---

# UPDATE F — 다음 구현

## Creature Collection + Dungeon Boss

현재 합의 방향:

### Creature
포획이 아니라:
```txt
발견 → 관찰 → 이해 → 도움 → 친해짐
```

첫 후보:
- 돌콩이
- 이끼몽
- 반딧돌

### 잠든 돌문
세 Creature와 친해지면 안쪽 돌문이 깨어나는 방향.

### Boss
HP를 깎아 쓰러뜨리는 적이 아니다.

처음엔 위협적으로 보이지만 실제로는 막혀 있거나 불안한 큰 생명체.

원인을 조사하고 도움을 주면 해결.

Boss 이름 후보: **돌잠이**

### 이번에 만들지 않을 것
- 포획
- Creature 레벨
- 가챠
- 턴제 전투
- HP
- 공격력
- 패배
- Companion Expedition
- Dungeon 2/3
- World Map Expansion

---

# 이후

## UPDATE G
Companion Expedition

## UPDATE H
추가 Dungeon 2종

## UPDATE I
Character / Trophy Rewards

## UPDATE J
Beyond the City Map
