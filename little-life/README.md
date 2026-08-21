# LITTLE LIFE v0.1

> 내 하루가 곧 캐릭터의 모험이 된다.

현실에서 작은 퀘스트를 완료하면 EXP를 얻고 캐릭터가 자라는 생활 RPG.
개인용 모바일 웹앱이고, v0.1은 백엔드·로그인 없이 localStorage만 쓴다.

## 실행

```bash
cd little-life
npm install
npm run dev      # http://localhost:5174
```

아이폰에서 볼 때는 같은 Wi-Fi에서 터미널에 찍히는 Network 주소로 접속하면 된다.
Safari에서 열고 "홈 화면에 추가"하면 앱처럼 전체화면으로 쓸 수 있다.

```bash
npm run build      # 타입 체크 + 프로덕션 빌드
npm run preview    # 빌드 결과 확인
npm run typecheck  # 타입만 확인
npm test           # 단위 테스트 (분류기 · 반복 · 레벨 · 보상 · 전투 · 마이그레이션)
```

아이폰 홈 화면에 앱처럼 올리는 순서는 [DEPLOY.md](./DEPLOY.md) 에 있다.
오프라인에서도 열리고 퀘스트 완료까지 된다.

## 구조

```
src/
├── types/          User, Quest, Routine, CategoryStats, DailyLog, AppState
│   └── rpg.ts          Area, Class, Stat, Item, Battle, Bonuses
├── lib/            순수 로직 — 화면과 무관
│   ├── rpg/
│   │   ├── content.ts  지역·직업·아이템·몬스터·보스   ← 밸런스 값은 전부 여기
│   │   ├── rewards.ts  보너스 합산 → EXP / Coin / Drop
│   │   ├── battle.ts   몬스터·보스 진행과 되돌리기
│   │   └── time.ts     시간대 구분과 화면 색조
│   ├── level.ts        requiredExp / applyExp   ← 밸런스는 여기만 수정
│   ├── difficulty.ts   난이도별 EXP (10 / 20 / 40)
│   ├── titles.ts       레벨 구간별 칭호
│   ├── categories.ts   카테고리 색 매핑
│   ├── stats.ts        오늘·이번 주 집계, 정렬, 필터
│   ├── insights.ts     이번 주 한 줄 (규칙 기반)
│   ├── suggest.ts      퀘스트 추천 · 자동 분류 · 자동 난이도
│   ├── routines.ts     반복 퀘스트 규칙과 하루치 생성
│   └── date.ts         시간대 인사, 날짜 키
├── store/          저장소 — Supabase 교체 지점
│   ├── repository.ts     StateRepository 인터페이스 (async)
│   ├── localStorage.ts   현재 구현 + 손상 데이터 방어
│   ├── migrate.ts        버전 올리기 · 빈 필드 채우기 · Welcome Gift
│   └── defaultState.ts   첫 실행 샘플 퀘스트
├── hooks/          useGameState · useFeedback · useCountUp
├── components/
│   ├── character/  CharacterAvatar, RoomBackground, CharacterRoomCard,
│   │               LevelBadge, ExpProgress
│   ├── home/       GreetingHeader, TodayQuestSection, CompactQuestCard, DailySummary
│   ├── quest/      FullQuestCard, CategoryFilter, QuestCreationSheet, QuestMenu,
│   │               QuestModeTabs
│   ├── rpg/        RarityBadge, BattleCard, BattleSheet
│   ├── profile/    ProfileHeader, StatCard, StatGrid, ClassCard, EquipSlotGrid,
│   │               CategoryGrowthBar, WeeklyInsightCard
│   ├── feedback/   ExpToastLayer, LevelUpOverlay, BattleClearOverlay, DropRevealOverlay
│   ├── navigation/ BottomNavigation
│   └── ui/         Card, Button, ProgressBar, BottomSheet, ConfirmDialog, Toast …
└── screens/        HomeScreen · QuestScreen · MapScreen · BagScreen · MeScreen
```

### 나중에 손댈 자리

- **밸런스** — `lib/level.ts`의 `BASE_EXP` / `STEP`, `lib/difficulty.ts`의 EXP 표
- **Supabase 연결** — `StateRepository`를 구현한 클래스를 하나 더 만들고
  `store/localStorage.ts` 마지막의 `repository` export만 교체한다.
  인터페이스가 이미 async라서 화면 코드는 건드릴 필요 없다.
- **캐릭터** — `CharacterAvatar`만 갈아끼우면 된다. 헤어/의상/액세서리/펫은
  `character/types.ts`의 `CharacterLook`에 필드를 늘리고,
  방 오브젝트는 `RoomBackground`, 배치는 `CharacterRoomCard`에서 다룬다.
- **데이터 확장** — `AppState`에 필드를 추가하고 `STATE_VERSION`을 올린 뒤
  `localStorage.ts`의 `sanitizeState`에서 기본값을 채운다.

## 설계 메모

- **통계는 퀘스트에서 유도하지 않고 따로 쌓는다.**
  `categoryStats`(누적)와 `dailyLog`(날짜별)를 별도로 두기 때문에,
  완료한 퀘스트를 지워도 이미 받은 EXP와 기록이 사라지지 않는다.
- **EXP는 생성 시점에 굳혀 저장한다.** 난이도 밸런스를 바꿔도 과거 기록이 흔들리지 않는다.
- **사용자를 혼내지 않는다.** 연속 기록, 경고, 캐릭터가 시무룩해지는 연출은 넣지 않았다.
  미완료 퀘스트는 날짜가 지나도 남아 있어서, 며칠 쉬었다 돌아와도 바로 이어서 할 수 있다.
- **`prefers-reduced-motion`** 을 켠 기기에서는 애니메이션이 거의 사라진다.
- 카피는 짧은 라벨(Today's Quest, Complete, Growth by Category)은 영문,
  말을 거는 문장은 한국어로 통일했다.

## 에셋

`public/assets` 아래 WebP 38장 (합계 약 800 KB). 첨부받은 스프라이트 시트에서
알파 채널 기준으로 조각을 잘라내 이름을 붙였다.

```
public/assets/
├── character/  idle · quest-clear · celebrate · resting + 얼굴 4종
├── room/       window · rug · beanbag · plant · shelf · desk · lamp · frame …
├── badges/     카테고리 6종 · 난이도 3종 · exp · level-up · quest-clear · check
└── effects/    sparkle · hearts · star · pop
```

경로는 `lib/assets.ts` 한 곳에만 적어둔다. 화면 컴포넌트는 파일명을 모르고,
나중에 옷·펫이 늘어나도 이 표만 고치면 된다.

배지 그림이 촘촘해서 20px 아래로 줄이면 뭉개진다.
그래서 섹션 제목 옆 같은 작은 자리에는 그림을 쓰지 않고,
28px 이상 확보되는 곳(카테고리 썸네일, 통계 칸, 난이도 선택)에만 쓴다.

### 캐릭터 포즈가 바뀌는 지점

| 상황 | 그림 |
|---|---|
| 오늘 할 퀘스트가 남아 있음 | 서 있기 (`idle`) |
| 오늘 할 퀘스트를 다 끝냄 | 빈백에 앉아 쉬기 (`resting`) |
| 퀘스트 완료 직후 약 1초 | 폴짝 (`questClear`) |
| 레벨업 | 만세 (`levelUp`) |

`resting` 은 "할 일이 없어서 쉬는 중" 이지 "못 해서 처진 상태" 가 아니다.
앉은 그림에는 빈백이 들어 있어서, 그때는 방에 놓인 빈백을 숨긴다.

빈 화면에는 얼굴을 띄운다. 아직 아무것도 없으면 차분한 얼굴,
오늘 몫을 다 했으면 웃는 얼굴, 필터 결과가 없으면 갸웃하는 얼굴.

### 아직 쓰지 않은 에셋

`lib/assets.ts` 의 `CHARACTER_EXTRA` 에 남겨뒀다.

- 팔 들고 윙크하는 포즈 — 업적 같은 게 생기면 쓸 자리
- 삐친 얼굴 — 캐릭터가 사용자를 탓하지 않기로 해서 화면에서는 쓰지 않는다
- 시트에 있던 깃발 / 자물쇠 / 달력·설정 버튼은 아직 해당 기능이 없어서 내보내지 않았다.
  BOSS 배지와 체력바는 CITY RPG 에서 필요해졌지만, 20px 아래로 뭉개지는 그림 대신
  글자 배지(`BossBadge`)와 `ProgressBar` 로 그렸다

## 퀘스트 입력 줄이기

타이핑이 귀찮아서 앱을 안 열게 되는 게 가장 큰 이탈 요인이라, `lib/suggest.ts` 에 세 가지를 뒀다.
AI 는 쓰지 않는다 — 규칙과 내 기록만 본다. 즉시 뜨고, 오프라인에서도 되고, 쓸수록 내 말투에 맞아간다.

**추천** — 시트 맨 위 한 줄. 누르면 제목·카테고리·난이도가 한꺼번에 채워진다.
전에 완료한 적 있는 것을 많이 한 순서로 먼저 보여주고, 기록이 없으면 시간대별 기본 추천을 쓴다.
아직 안 끝낸 퀘스트는 추천하지 않는다 — 눌러봤자 같은 게 두 개가 될 뿐이다.

**자동 분류** — 제목을 치는 동안 카테고리를 고른다.
예전에 같은 제목으로 만든 적이 있으면 그때 고른 값을 그대로 쓴다 (사전보다 내 기록이 늘 정확하다).
없으면 한국어 키워드 사전을 쓰고, 긴 단어에 가중치를 준다 —
"생각 정리" 가 "정리" 를 이겨야 LIFE 가 아니라 MIND 로 간다.
짚이는 게 없으면 비워둔다. 아무거나 찍지 않는다.

**자동 난이도** — "30분", "1시간 30분" 같은 표현을 분으로 읽어 25분 미만은 Easy,
60분 이상은 Hard 로 잡는다. 시간 표현이 없으면 "가볍게 / 잠깐" · "대청소 / 밀린" 같은 힌트를 본다.

**직접 고르면 자동은 멈춘다.** 골라놓은 걸 타이핑할 때마다 되돌려버리면 그것만큼 짜증나는 게 없다.
값 옆의 `자동` · `기억해둔 것` 표시는 앱이 대신 골랐다는 뜻이고, 누르면 바로 바뀐다.

규칙이 많아 눈으로는 놓치기 쉬워서 `src/lib/__tests__/suggest.test.ts` 에 48개를 두고 돌린다.

## 반복 퀘스트

매일 같은 걸 다시 입력하는 게 가장 큰 마찰이라, 아예 안 치게 만들었다.
퀘스트를 만들 때 **매일 / 평일 / 요일 선택** 중 하나를 켜두면 해당하는 날 아침에 알아서 생긴다.

`Routine` 은 조리법이고 `Quest` 는 거기서 나온 오늘 몫이다. 둘을 한 타입에 섞으면
"이게 원본인가 오늘 것인가" 가 늘 헷갈려서 나눴다. 오늘 몫에는 `routineId` 가 붙는다.

**밀린 걸 몰아서 만들지 않는다.** 3일 만에 열었다고 퀘스트 3개가 쌓여 있으면
그것만으로 앱을 닫게 된다. 언제 열든 오늘 것 하나만 만든다.

같은 제목이 이미 오늘 목록에 있거나 오늘 이미 완료했으면 또 만들지 않는다.
직접 만들어 둔 것과 겹치지 않게 하려는 것이다.

앱을 열 때와, 켜둔 채 날짜가 바뀌었다가 다시 볼 때 (`visibilitychange`) 검사한다.
홈 화면에 추가해두면 며칠씩 안 닫는 경우가 많아서 후자가 필요하다.

QUEST 화면 아래 **Repeat** 목록에서 잠시 멈추거나 그만둘 수 있다.
그만둬도 오늘 이미 만들어진 퀘스트는 남는다 — 이미 내 오늘 몫이다.

## 고치기 · 미루기 · 되돌리기

퀘스트 메뉴(⋯)에서:

- **고치기** — 제목·카테고리·난이도를 바꾼다. 아직 안 끝낸 것만 고칠 수 있다.
  이미 완료한 걸 고치면 지난 통계와 어긋나서, 그건 되돌린 뒤에 고치게 했다.
  난이도를 바꾸면 아직 안 받은 EXP 라 값도 같이 따라간다.
- **내일로 미루기** — 오늘 목록에서만 감춘다 (`snoozedUntil`). 지우는 게 아니라 미루는 것이다.
- **완료 되돌리기** — 완료 직후 토스트에서도, 나중에 완료 목록 메뉴에서도 된다.

되돌리기는 `totalExp` 에서 빼고 `levelFromTotalExp` 로 레벨을 다시 계산한다.
되돌리다 레벨이 내려가는 경우까지 정확히 맞는다 — 그 함수가 `applyExp` 를 처음부터
쌓은 결과와 늘 같기 때문이고, 그걸 테스트로 묶어뒀다 (`level.test.ts`).
카테고리 통계와 그날 기록에서도 함께 빠진다. 어제 완료한 걸 오늘 되돌려도 어제 칸에서 빠진다.

## CITY RPG

현실을 게임으로 한 겹 더 읽는 층. 검·갑옷·성 대신 머그컵·헤드폰·운동화·카페·공원으로 만든다.

| 현실 | 게임 |
| --- | --- |
| 오늘 할 일 | Daily Quest |
| 미뤄둔 일 | Monster |
| 크고 오래 걸리는 일 | Boss |
| 있는 장소 | Area |
| 늘 쓰는 물건 | Equipment |

- **MAP** — 지역 6곳. 지금 있는 곳의 버프가 보상에 붙는다. Night Town 은 21시부터 열리고,
  밤이 지나면 조용히 Home Base 로 돌아온다. 닫힌 곳의 버프를 계속 받게 두면 지도의 규칙이 거짓말이 된다.
- **BAG** — 인벤토리와 6칸 장비(HEAD / TOP / BOTTOM / SHOES / ACCESSORY / CHARM).
- **QUEST** — DAILY / MONSTER / BOSS 세 갈래. 몬스터·보스는 큰 일을 작은 행동으로 쪼갠 목록이고,
  하나 누를 때마다 HP 가 깎인다. **시간 제한이 없고 HP 가 도로 차지 않는다.**
  며칠 쉬어도 진행도가 사라지지 않고, 잘못 눌렀으면 UNDO 로 되돌린다.
- **ME** — 직업 5종과 스탯 6종, 장비 슬롯. 직업은 언제든 바꿀 수 있고 바꿔도 잃는 게 없다.

### 보상 한 줄기

퀘스트 완료 → EXP · Coin · Stat · Drop 이 전부 `lib/rpg/rewards.ts` 한 곳을 지난다.
직업·장비·지역이 모두 같은 모양(`Bonuses`)으로 보너스를 내놓기 때문에, 계산하는 쪽은 출처를 모른다.

**퍼센트는 곱하지 않고 모두 더한 뒤 한 번에 적용한다.** 곱하면 장비를 몇 개 꼈는지에 따라
값이 튀어서 예측이 안 된다 (`rewards.test.ts` 가 HARD 난이도에서 이 둘이 다르다는 걸 잡아둔다).

받은 값은 `quest.reward` 에 그대로 적어둔다. 되돌리기가 정확히 반대로 돌려면
그때 무엇을 받았는지 알아야 하고, 떨어졌던 아이템도 같이 회수한다 —
안 그러면 완료·되돌리기를 반복해서 계속 주울 수 있다.

`EXPLORER` 의 패시브는 명세의 "Random Quest reward +10%" 를 지금 구조에 맞춰
**모든 퀘스트 Coin +10%** 로 옮겼다. 무작위로 어떤 퀘스트에만 붙으면 왜 값이 달라졌는지
화면에서 설명할 방법이 없다.

### 기존 데이터

`STATE_VERSION = 3`. 올릴 때 **기존 기록은 하나도 지우지 않는다.**
없는 항목만 기본값으로 채우고 있는 값은 손대지 않는다 (`store/migrate.ts`).
없어진 아이템이 슬롯에 남아 있거나 정의가 사라진 몬스터가 저장돼 있으면 조용히 비운다.

업데이트하고 처음 열면 Welcome Gift(Favorite Mug + 50 Coin)를 한 번 준다.
`welcomeGiftGiven` 플래그로 막아서 다시 열어도 또 주지 않는다.
