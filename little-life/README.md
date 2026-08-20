# LITTLE LIFE

> 내 하루가 곧 캐릭터의 모험이 된다.

현실에서 작은 퀘스트를 완료하면 EXP를 얻고 캐릭터가 자라는 생활 RPG.
개인용 모바일 웹앱이고, MVP는 백엔드·로그인 없이 localStorage만 쓴다.

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
├── types/          데이터 모델 (User, Quest, AppState)
├── lib/            순수 로직 — 화면과 무관
│   ├── level.ts        레벨 곡선 / EXP 적용   ← 밸런스는 여기만 수정
│   ├── difficulty.ts   난이도별 EXP
│   ├── categories.ts   카테고리 정의 + 색
│   ├── stats.ts        집계 / 정렬
│   └── date.ts         오늘·이번 주 판정
├── store/          저장소 — Supabase 교체 지점
│   ├── repository.ts     인터페이스 (async)
│   ├── localStorage.ts   현재 구현 + 손상된 데이터 방어
│   └── defaultState.ts
├── hooks/
│   ├── useGameState.ts  상태 변경 로직 전부
│   ├── useFeedback.ts   +EXP / LEVEL UP 연출
│   └── useCountUp.ts
├── components/
│   ├── ui/          Card, Button, Chip, ProgressBar, BottomSheet …
│   ├── character/   CharacterAvatar(SVG), CharacterStage, LevelMeter
│   ├── quest/       QuestCard, AddQuestSheet
│   ├── feedback/    ExpToastLayer, LevelUpOverlay
│   └── layout/      AppShell, TabBar
└── screens/         HomeScreen, QuestScreen, MeScreen
```

### 나중에 손댈 자리

- **밸런스** — `lib/level.ts`의 `BASE_EXP`, `GROWTH`, `lib/difficulty.ts`의 EXP 표
- **Supabase 연결** — `StateRepository`를 구현한 클래스를 하나 더 만들고
  `store/localStorage.ts` 마지막 줄의 `repository` export만 교체한다.
  인터페이스가 이미 async라서 화면 코드는 건드릴 필요 없다.
- **캐릭터** — `CharacterAvatar`만 갈아끼우면 된다. 옷/헤어/아이템/펫은
  `character/types.ts`의 `CharacterLook`에 필드를 늘리고,
  배경·소품은 `CharacterStage`에 붙인다.
- **데이터 확장** — `AppState`에 필드를 추가하고 `STATE_VERSION`을 올린 뒤
  `localStorage.ts`의 `sanitizeState`에서 기본값을 채운다.

## 설계 메모

- **사용자를 혼내지 않는다.** 연속 기록, 경고, 캐릭터가 시무룩해지는 연출은 넣지 않았다.
  며칠 쉬었다 돌아와도 미완료 퀘스트가 그대로 남아 있어 바로 이어서 할 수 있다.
- **퀘스트를 지워도 이미 받은 EXP는 회수하지 않는다.** 한 번 한 일을 나중에 빼앗지 않는다.
- **EXP는 생성 시점에 굳혀 저장한다.** 난이도 밸런스를 바꿔도 과거 기록이 흔들리지 않는다.
