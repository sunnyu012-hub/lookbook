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

# F 이후 — 다이어트 로드맵

> 2026-08-28 방향 재정리.
>
> LITTLE LIFE의 본체는 거대한 RPG가 아니라 **현실 행동을 조금 더 재미있게 만드는 TODO RPG**다.
>
> 앞으로의 Core는 다음 세 축을 우선한다.
>
> 1. **TODO** — 현실에서 움직이는 이유
> 2. **LIVING CITY** — 다시 들어와 보고 싶은 이유
> 3. **DISCOVERY & COLLECTION** — 계속 쌓아가고 싶은 이유
>
> 장기 아이디어는 삭제하지 않는다.
> 다만 Core 구현 의무에서 내려 `EXPANSION` / `DREAM`으로 보관한다.

## Core North Star

> 현실에서 움직이면 작은 세계가 열린다.
>
> 내가 현실을 사는 동안에도 그 세계는 조금씩 살아간다.

기능을 추가할 때 우선 확인한다.

- 이 기능이 현실 행동을 하나 더 하게 만드는가?
- 게임을 오래 붙잡게 하기보다 현실로 자연스럽게 돌아가게 하는가?
- 다시 접속했을 때 작은 변화나 발견을 기대하게 만드는가?
- 관리 부담이나 반복 노가다를 늘리지 않는가?

---

# CORE ROADMAP

## UPDATE F — Creature Collection + Dungeon Boss

**기존 명세 유지.**

현재 다음 구현이다.

Creature 방향:

```txt
발견 → 관찰 → 이해 → 도움 → 친해짐
```

Boss도 HP를 깎는 전투가 아니라
막혀 있거나 불안한 큰 생명체를 이해하고 돕는 방향을 유지한다.

F에서는 Living City를 구현하지 않는다.

---

## UPDATE G — Living City 1: Real Time + NPC Routine

### 목표

> 게임을 켰을 때 NPC가 항상 같은 자리에 있지 않는다.

Living City의 최소 1차 버전.

### 핵심 경험

아침에 본 NPC가 오후나 밤에는 다른 장소에서 생활하고 있다.

플레이어가 현실에서 일을 하고 돌아왔을 때
도시에도 시간이 흘렀다는 느낌을 만든다.

### 우선 재사용

구현 전 반드시 기존 코드를 조사한다.

- `timeBand`
- 날짜 처리
- seeded RNG
- 기존 Map / Area 진입 구조
- NPC 타입 / Friendship
- Shop / 장소 구조
- Save / sanitize / migration

### 포함

- 현실 날짜 / 시간 반영
- 기존 `timeBand` 우선 재사용
- Business Hours
- NPC별 최소 Routine Profile
  - WORK
  - HOME
  - FAVORITE
- 평일 / 주말 또는 기존 날짜 구조에서 가능한 최소 차이
- `date + timeBand + npcId` 기반 deterministic 위치 결정
- 같은 Time Band에서 재진입해도 NPC 위치 유지
- 가게가 닫히면 NPC가 사라지는 대신 생활 장소로 이동
- 현재 장소의 영업 여부 표현
- 필요한 범위의 지도 / 장소 UX 조정

### Routine 원칙

분 단위 AI 스케줄을 만들지 않는다.

예:

```txt
정시우 / SATURDAY MORNING
Cafe          40
Home          35
Climbing Gym  25
```

하루의 위치를 seed로 결정하면
같은 날짜 / Time Band 동안 결과를 유지한다.

### 파생 우선

저장하지 않는 것을 우선 검토:

- currentNpcLocation
- isShopOpen
- currentTimeBand
- dayType

기존 데이터에서 계산할 수 있으면 derive한다.

### 이번에 만들지 않을 것

- Living Dialogue 확장
- Living Scene
- Social Pull
- 날씨 Routine
- Relationship Simulation
- Personal Story
- Romance
- Chemistry
- Gossip
- NPC 간 자동 정보 전파
- 복잡한 AI
- 24시간 분 단위 Schedule
- NPC가 플레이어 부재 중 Story를 자동 진행하는 구조

### 완료 기준

- 시간대가 바뀌면 일부 NPC 생활 위치가 자연스럽게 달라진다.
- 같은 Time Band에서는 재접속해도 위치가 흔들리지 않는다.
- 영업시간 전후가 자연스럽게 보인다.
- 기존 NPC / Map / Shop / Story에 회귀가 없다.
- 플레이어가 특정 현실시간 접속을 놓쳐도 중요한 콘텐츠 손실이 없다.

---

## UPDATE H — Living City 2: Context Dialogue

### 목표

> NPC가 어디에 있느냐뿐 아니라, 어디서 언제 만났느냐에 따라 조금 다르게 말한다.

### 최소 Dialogue Context 후보

- WORK
- OFF_WORK
- MORNING
- EVENING
- NIGHT
- WEEKEND
- HOME_NEARBY
- FAVORITE_LOCATION

실제 구조는 기존 Dialogue / NPC 코드를 먼저 조사한다.

### 예시

정시우 / Takoyaki Truck:

> 조금만 기다려요. 지금 뒤집고 있어서.

정시우 / Cafe:

> 저도 오전에는 그냥 사람이에요.

정시우 / 집 근처 늦은 밤:

> 이 시간까지 뭐 해요?

### 포함

- NPC별 소수 Context Dialogue Pool
- 장소 / 시간대 Context
- 최근 같은 대사의 과도한 반복 방지
- 기존 Dialogue 구조 재사용

### 이번에 만들지 않을 것

- Personal Story
- 대형 Branching Dialogue
- Relationship State Machine
- AI 대화 생성
- NPC × NPC Living Scene

---

## UPDATE I — Gift & Preference

### 목표

> 선물을 호감도 파밍이 아니라 사람의 취향을 알아가는 Discovery로 만든다.

현재 존재하는 선물 기능을 새로 만들지 않고 확장한다.

### 기본 호감도

```txt
DISLIKE  +0.5
NORMAL   +1
LIKE     +2
LOVE     +3
```

선물을 싫어해도 기본적으로 호감도를 깎지 않는다.

### 핵심 원칙

- NPC마다 여러 개의 LIKE / LOVE / DISLIKE 취향을 가진다.
- 가격이 비싸다고 더 높은 호감도를 주지 않는다.
- 취향은 처음부터 전부 공개하지 않는다.
- 직접 선물하거나 대화 / Story 힌트로 알아간다.
- 발견한 취향은 Character Note / 기존 적절한 기록 구조에 남길 수 있다.
- 같은 LOVE 아이템 반복 선물만 하는 파밍을 막는다.
- 매일 강제 선물을 요구하지 않는다.
- 선물을 안 줘도 Friendship이 감소하지 않는다.

### 예시

소라에게 디카페인 커피:

> ……디카페인이네요.
>
> 고마워요.
>
> …근데 다음엔 그냥 커피로 주세요.

`DISLIKE +0.5`

### Story 연동 Hook

향후 Story 이후 취향이 변할 가능성은 열어둘 수 있다.

단, UPDATE I에서는 필요한 최소 범위만 구현한다.

### 이번에 만들지 않을 것

- 복잡한 선물 경제
- 매일 선물 보너스
- 선물 Streak
- 선물 실패
- 호감도 감소
- 대규모 신규 아이템 제작
- Romance 전용 선물

---

## UPDATE J — Living Scene

### 목표

> NPC가 자기 삶을 살다 보니 가끔 둘 이상이 같은 장소에 있고, 한 번뿐인 작은 장면을 발견한다.

### 예시

- 하루 + 시우 / Cafe
- 은채 + 시우 / Flower Shop
- 민지 + 지호 / Record Shop
- 소라 + 정원 / Cinema 근처

### 원칙

- 기존 `StoryChapter` / Story 구조 우선 조사
- 중요한 Scene은 1회
- 특정 현실시각을 놓쳤다고 영구 소멸하지 않음
- 다음 유효 조건에서 다시 기다려줌
- 플레이어가 모든 상황의 해결사가 될 필요 없음
- 짧고 생활적인 장면 우선

### Scene Aftermath 후보

필요한 경우에만:

- Dialogue Pool unlock
- Relationship Discovery
- 작은 Routine Modifier
- Journal / Character Note
- 다음 Scene eligibility

### 이번에 만들지 않을 것

- Personal Story 대량 제작
- Romance
- Gossip Engine
- NPC 자율 Story Simulation
- 플레이어 부재 중 중요한 Scene 자동 완료

---

## UPDATE K — Personal Story Pilot

### 목표

Living City와 Living Scene을 실제 캐릭터 Story에 연결해
NPC를 “기능”이 아니라 “사람”으로 느끼게 한다.

### 범위

처음부터 25명 전부 만들지 않는다.

핵심 NPC 약 3명으로 Pilot.

초기 후보:

- 정시우
- 임소라
- 박준

후보는 구현 직전 NPC Bible / 최신 상태를 다시 확인한다.

### 테스트하려는 것

정시우:
관계망 + 과거 + 취미 변화.

임소라:
평소 밝은 얼굴과 가까워진 뒤 보이는 다른 감정.

박준:
현실 / 온라인 정체 차이.

### 성공 기준

- Friendship만으로도 충분히 이야기를 볼 수 있다.
- Story를 위해 현실 퀘스트 횟수를 강제하지 않는다.
- Story 이후 Dialogue / Routine / Character Note 중 하나 이상에 작은 흔적이 남는다.
- 플레이어가 다음 장면을 궁금해하지만 게임 안에서 장시간 대기할 필요는 없다.

---

# LITTLE LIFE CORE 1.0 CHECKPOINT

UPDATE K까지 완료한 뒤
다음 대형 Update로 자동 진행하지 않는다.

실제 플레이를 먼저 한다.

확인:

- TODO를 실제로 더 하게 되는가?
- NPC가 움직이는 것이 재밌는가?
- 다시 접속하고 싶은 이유가 생기는가?
- 선물 취향 발견이 노가다가 아닌가?
- Living Scene이 적당히 드문가?
- Personal Story가 앱 체류시간만 늘리고 있지는 않은가?
- Discovery / Collection과 현실 행동 연결이 유지되는가?

여기서 재미가 검증된 축만 확장한다.

---

# EXPANSION POOL

> 있으면 세계가 풍부해지지만 LITTLE LIFE Core 완성에 필수는 아니다.
>
> Core 1.0 이후 실제 사용 결과를 보고 하나씩 선택한다.

## Companion Expedition
Creature와 함께 짧게 탐험. F의 Creature 관계가 실제로 재미있을 때만 확장한다.

## Additional Dungeons
첫 Dungeon과 F 경험이 충분히 재미있을 때 추가한다.

## Character / Trophy Rewards
Adventure 결과가 방 / Collection / Character에 작은 흔적으로 남는 방식.

## Beyond the City / Near-City Region
도시 주변 한 지역을 소규모로 연다.

## Forest
도시 밖 자연 지역. 산책, 작은 발견, Creature, 식물, 계절감 중심.

## Forest Gathering
기존 Collection / Discovery 재사용. 도구 내구도 / 실패 / 별도 Energy를 추가하지 않는다.

## Lake & Fishing
차분한 발견 / Collection 콘텐츠. 복잡한 반사신경 미니게임보다 생활형 탐험을 우선한다.

## Relationship Discovery Expansion
NPC 관계망을 Character Note / Discovery로 더 깊게 확장.

## Close Friendship
Personal Story Pilot이 실제로 재미있을 때 확장.

## Romance 1 — Crush & Dating
NPC 자체가 충분히 좋아진 뒤 선택적으로 추가한다. Friendship / Personal Story를 Romance에 종속시키지 않는다. 성별 제한 없음.

---

# DREAM POOL

> 삭제한 기능이 아니다.
>
> “반드시 구현해야 하는 로드맵”에서 제외한 장기 아이디어다.
> LITTLE LIFE를 오래 플레이한 뒤 정말 필요할 때만 꺼낸다.

- Dynamic Romance
- Chemistry 고도화
- DISTANT
- EX
- 재결합
- 질투
- Gossip / 정보 전파
- 대형 Relationship Simulation
- Magic Society
- Mage Lineage 심화
- Creature Lineage 대형 Story
- Hidden Magic 대형 Arc
- Unicorn
- Dragon
- 대규모 Regional Expansion
- 지역별 NPC 대량 추가
- Long-Term Relationship
- 동거
- 결혼 / 가족

---

# 명시적으로 만들지 않는 방향

- 완전 자율 NPC AI Simulation
- 분 단위 24시간 Schedule
- 모든 NPC 정보 자동 전파
- 플레이어 부재 중 중요한 Story 자동 진행
- 현실 행동 횟수 = Story Ticket
- Friendship 유지 관리
- 매일 선물하기 강제
- 미접속 호감도 감소
- Streak

핵심 문장:

> 생활은 계속된다.
> 이야기는 기다려준다.

---

# F 이후 권장 개발 흐름

```txt
UPDATE F
Creature Collection + Dungeon Boss
        ↓
UPDATE G
Living City 1 — Real Time + NPC Routine
        ↓
UPDATE H
Living City 2 — Context Dialogue
        ↓
UPDATE I
Gift & Preference
        ↓
UPDATE J
Living Scene
        ↓
UPDATE K
Personal Story Pilot
        ↓
CORE 1.0 PLAYTEST
        ↓
재미가 검증된 Expansion만 선택
```

각 Update 완료 후 실제 코드와 플레이 경험을 보고
다음 하나만 결정한다.

---

# 최종 기준

LITTLE LIFE가 성공한 상태는
플레이어가 게임 안에서 몇 시간을 보낸 상태가 아니다.

```txt
설거지를 미뤄둠
↓
Little Life를 잠깐 켬
↓
오늘 시우가 클라이밍짐에 있다는 걸 봄
↓
현실 Quest 하나 완료
↓
다시 들어감
↓
시우와 도윤의 짧은 Scene 발견
↓
시우가 클라이밍 테이프를 좋아한다는 힌트를 얻음
↓
다음에 선물해봐야겠다고 생각함
↓
앱을 닫음
```

게임 플레이는 짧아도 된다.

현실에서 하나를 움직였고,
세계에 다시 돌아오고 싶은 작은 이유가 남았다면 성공이다.

> LITTLE LIFE는 현실을 대신하는 세계가 아니다.
>
> 현실에서 조금 움직이고 싶게 만드는 작은 세계다.
