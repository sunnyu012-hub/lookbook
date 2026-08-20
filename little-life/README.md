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
```

## 구조

```
src/
├── types/          User, Quest, CategoryStats, DailyLog, AppState
├── lib/            순수 로직 — 화면과 무관
│   ├── level.ts        requiredExp / applyExp   ← 밸런스는 여기만 수정
│   ├── difficulty.ts   난이도별 EXP (10 / 20 / 40)
│   ├── titles.ts       레벨 구간별 칭호
│   ├── categories.ts   카테고리 색 매핑
│   ├── stats.ts        오늘·이번 주 집계, 정렬, 필터
│   ├── insights.ts     이번 주 한 줄 (규칙 기반)
│   └── date.ts         시간대 인사, 날짜 키
├── store/          저장소 — Supabase 교체 지점
│   ├── repository.ts     StateRepository 인터페이스 (async)
│   ├── localStorage.ts   현재 구현 + 손상 데이터 방어
│   └── defaultState.ts   첫 실행 샘플 퀘스트
├── hooks/          useGameState · useFeedback · useCountUp
├── components/
│   ├── character/  CharacterAvatar, RoomBackground, CharacterRoomCard,
│   │               LevelBadge, ExpProgress
│   ├── home/       GreetingHeader, TodayQuestSection, CompactQuestCard, DailySummary
│   ├── quest/      FullQuestCard, CategoryFilter, QuestCreationSheet, QuestMenu
│   ├── profile/    ProfileHeader, StatCard, CategoryGrowthBar, WeeklyInsightCard
│   ├── feedback/   ExpToastLayer, LevelUpOverlay
│   ├── navigation/ BottomNavigation
│   └── ui/         Card, Button, ProgressBar, BottomSheet, ConfirmDialog, Toast …
└── screens/        HomeScreen · QuestScreen · MeScreen
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
- 시트에 있던 BOSS 배지 / 깃발 / 자물쇠 / 체력바 / 달력·설정 버튼은
  v0.1 에 해당 기능이 없어서 내보내지 않았다 (보스 퀘스트, 잠금, 설정 등)
