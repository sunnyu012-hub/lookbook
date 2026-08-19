# Life OS

현실의 내 상태를 작은 픽셀 캐릭터로 보여주는 개인용 컨디션 기록 앱.

매일 10초 만에 상태를 저장하면 캐릭터가 그에 맞게 자고, 쉬고, 뛴다.
건강을 진단하지 않는다. 기록을 남기고, 그 기록을 눈에 보이게 만드는 것이 전부다.

## 디자인 콘셉트

Cozy Pixel RPG × 타마고치 × 라이프 트래커.
90년대 게임을 그대로 복제한 레트로가 아니라, 요즘 감성으로 다시 그린 귀여운 픽셀 RPG를 목표로 한다.

- 배경은 따뜻한 크림, 강조색은 sage / lavender / butter / blush / sky 다섯 가지. 각 색에 역할이 있다.
- 픽셀 폰트(Silkscreen)는 타이틀·숫자·라틴 라벨에만. 한글 본문은 읽기 편한 산세리프.
- 모서리는 2~8px, 그림자는 blur 없는 `2px 2px` 하드 섀도우, 테두리는 2px.
- 애니메이션은 전부 짧고 작다. `prefers-reduced-motion` 을 켜면 모두 멈춘다.

## 스택

React 18 · TypeScript · Vite · Tailwind CSS · Supabase · Vercel · PWA

외부 라이브러리는 React / Supabase 클라이언트뿐이다. 라우터·차트·애니메이션·상태관리 라이브러리는
직접 구현했다 (탭 전환, 세그먼트 HP 바, 스프라이트 애니메이션, 바텀시트, 카운트업).

## 픽셀 아트 파이프라인

에셋은 손으로 찍은 도트를 코드로 정리해 `public/sprites/` 에 굽는다.

```bash
python3 tools/pixel_art.py    # icons.png · character.png · room.png · 앱 아이콘 · TS 매니페스트
```

| 파일 | 규격 | 쓰임 |
| --- | --- | --- |
| `public/sprites/icons.png` | 16px 격자, 8열 | 모든 UI 아이콘 (`PixelIcon`) |
| `public/sprites/character.png` | 32px, 2프레임 × 4상태 | 캐릭터 idle 애니메이션 |
| `public/sprites/room.png` | 160×112 | 코지 픽셀 방 배경 |

`tools/pixel_art.py` 는 `src/lib/sprites.generated.ts` 도 함께 만든다. 아이콘 순서와 코드가
어긋날 일이 없다. **직접 그린 PNG로 교체할 때**는 같은 격자 규격만 지키면 되고, 아이콘 순서가
달라지면 매니페스트의 `ICON_NAMES` 만 맞춰주면 된다. 스프라이트 시트를 통째로 바꿔도 컴포넌트
코드는 손대지 않는다.

브라우저에서 도트가 뭉개지지 않도록 모든 스프라이트에 `image-rendering: pixelated` 를 건다
(`.pixel-img`).

## 시작하기

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # 타입체크 + 프로덕션 빌드
npm run preview
```

`.env` 가 없으면 앱은 **로컬 저장소 모드**로 동작한다 (localStorage). Supabase 없이 모든 화면을
그대로 쓸 수 있고, Insights 화면 하단의 `Seed sample` 버튼으로 34일치 샘플 데이터를 채워 검증할 수 있다.

## Supabase 연결

1. Supabase 프로젝트를 만들고 SQL Editor 에서 [`supabase/schema.sql`](./supabase/schema.sql) 을 실행한다.
2. `.env.example` 을 `.env` 로 복사하고 값을 채운다.

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_DEFAULT_USER_ID=00000000-0000-0000-0000-000000000001   # 인증 붙이기 전 고정 ID
```

환경변수가 채워지면 `lib/repository.ts` 가 자동으로 Supabase 를 쓴다. 화면 코드는 바뀌지 않는다.

> 스키마에는 임시 `anon` 정책이 들어 있다. 개인용으로 혼자 쓸 때를 위한 것이며,
> 공개 배포 전에는 반드시 `own rows only` (auth.uid() 기반) 정책만 남겨야 한다.

### 인증을 붙일 때

`lib/repository.ts` 의 `currentUserId()` 하나만 세션 기반으로 바꾸면 된다. 나머지 코드는 이미
`user_id` 를 기준으로 읽고 쓴다.

## Vercel 배포

프레임워크 프리셋 `Vite`, 빌드 `npm run build`, 출력 `dist`. `vercel.json` 에 SPA rewrite 가 들어 있다.
Vercel 프로젝트 환경변수에 위 `VITE_*` 값을 넣으면 된다.

## PWA (iPhone 홈 화면)

`public/manifest.webmanifest` + `public/sw.js` + iOS 메타 태그가 들어 있다.
배포된 주소를 Safari 로 열고 공유 → **홈 화면에 추가** 하면 상태바까지 앱처럼 뜬다.
앱 아이콘도 같은 캐릭터 도트로 만들어 둔다. 서비스워커는 프로덕션 빌드에서만 등록된다.

## Energy Score

`src/lib/energy.ts` 한 곳에서만 계산한다. 100점 만점의 단순 가중 평균이다.

| 항목 | 가중치 | 정규화 |
| --- | --- | --- |
| 수면 시간 | 30% | 7~9시간 = 100점, 부족할수록 가파르게 감점 |
| 피로도 | 25% | 1(안 피곤) → 100, 5(탈진) → 0 |
| 몸 상태(통증) | 15% | 0(없음) → 100, 5(심함) → 0 |
| 집중력 | 15% | 1 → 0, 5 → 100 |
| 기분 | 10% | 1 → 0, 5 → 100 |
| 수면 질 | 5% | 1 → 0, 5 → 100 |

점수 → 모드: `0–39 RECOVERY` / `40–59 EASY` / `60–79 NORMAL` / `80–100 POWER`

가중치·정규화 함수·모드 문구가 전부 이 파일에 있으므로, 알고리즘을 바꿔도 화면은 건드릴 필요가 없다.
**의료적 판단이나 진단을 위한 점수가 아니다.**

## 구조

```
src/
  components/
    layout/      AppShell, TabBar
    pixel/       PixelIcon, PixelPanel, PixelButton, PixelToast, EnergyBar, PipRow,
                 IconPicker, CharacterScene, CalendarGrid, DaySheet
    DevTools.tsx 로컬 모드 전용 샘플 데이터 도구
  hooks/         useCheckins, useCheckinForm, useQuests, useCountUp, useHaptic
  lib/           energy(점수) · effects(버프/디버프) · quests · patterns · insights(통계)
                 repository(데이터 접근) · localStore · supabase · mappers · date · mock · env · cn
                 sprites.generated.ts (tools/pixel_art.py 가 생성)
  pages/         TodayPage, CheckinPage, HistoryPage, InsightsPage
  types/         도메인 타입 + DB 행 타입
tools/pixel_art.py   픽셀 에셋 생성기
supabase/schema.sql
```

## 화면

- **Today (🏠)** — 캐릭터 상태 화면. 코지 픽셀 방 안의 캐릭터가 오늘 모드에 따라 눕고(RECOVERY),
  앉고(EASY), 서고(NORMAL), 두 팔을 든다(POWER). 아래로 PLAYER STATUS(HP 바 + MOOD/FOCUS/BODY),
  TODAY'S MODE, CURRENT EFFECTS, DAILY QUEST.
- **Check-in (💾 Daily Save)** — 설문이 아니라 저장 화면. 수면은 −/+ 스테퍼, 피로는 표정 5종,
  기분은 날씨 5종, 나머지는 하트·다이아·별 핍으로 고른다. 고르는 동안 우상단 점수가 즉시 반응한다.
- **History (📖 Adventure Log)** — 월간 픽셀 캘린더. 날짜마다 모드 아이콘과 점수. 날짜를 누르면
  게임 일지 같은 상세 창이 열리고 거기서 수정·삭제한다. 아래에 최근 메모 세 줄.
- **Insights (⭐ Player Stats)** — 최근 7일/30일 평균, 평균 수면·기분, 모드별 일수, 평균 피로도,
  그리고 **DISCOVERED** 패턴(잘 잔 날 버프, 운동 버프, 늦은 카페인 디버프).
  표본이 부족한 분석은 계산하지 않고 화면에서도 감춘다 (`lib/insights.ts` · `lib/patterns.ts`).

### Buff / Debuff

`lib/effects.ts` 는 Energy Score 를 다시 계산하지 않는다. `energy.ts` 가 만든 항목별 점수를
중간값(55) 기준으로 풀어 `SLEEP DEBT −12` 처럼 보여줄 뿐이다. 즉 게임처럼 보이지만 실제로는
점수의 근거를 설명하는 화면이다.

### Daily Quest

오늘 모드에 맞는 아주 작은 행동 목록. **XP 시스템은 아직 없다** — 완료 체크만 기기 로컬에
저장한다(`hooks/useQuests.ts`). 나중에 XP/레벨을 붙일 때 questId 를 그대로 쓰면 된다.

AI·챗봇·의료 조언 기능은 들어 있지 않다.
