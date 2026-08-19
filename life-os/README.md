# Life OS

매일의 컨디션을 10초 만에 기록하고, 그날의 에너지 상태를 보여주는 개인용 웹앱.

건강을 진단하지 않는다. 기록을 남기고, 그 기록을 눈에 보이게 만드는 것이 전부다.

## 스택

React 18 · TypeScript · Vite · Tailwind CSS · Supabase · Vercel · PWA

외부 라이브러리는 React / Supabase 클라이언트뿐이다. 라우터·차트·애니메이션·상태관리 라이브러리는
직접 구현했다 (탭 전환, SVG 링/스파크라인, 바텀시트, 카운트업).

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
서비스워커는 프로덕션 빌드에서만 등록된다.

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
    layout/      AppShell, TabBar, PageHeader
    ui/          Button, Card, Slider, Stepper, Toggle, ChipGroup, ScoreRing, Sparkline, Toast, EmptyState
    today/       MetricStrip, ModeBlock, DetailList
    history/     CalendarGrid, DaySheet, ModeLegend
    insights/    StatRow, ModeDaysBar, ExerciseCompare
    DevTools.tsx 로컬 모드 전용 샘플 데이터 도구
  hooks/         useCheckins, useCheckinForm, useCountUp, useHaptic
  lib/           energy(점수), insights(통계), repository(데이터 접근), localStore, supabase, mappers, date, mock, env, cn
  pages/         TodayPage, CheckinPage, HistoryPage, InsightsPage
  types/         도메인 타입 + DB 행 타입
supabase/schema.sql
```

## 화면

- **Today** — 오늘의 Energy Score(큰 숫자 + 링), 모드와 한 줄 코멘트, 오늘 기록 요약. 기록이 없으면 CTA 하나만.
- **Check-in** — 한 화면에서 슬라이더/버튼으로 입력. 입력하는 동안 우상단 점수가 즉시 반응한다.
- **History** — 월간 캘린더. 날짜마다 점수와 모드 색. 날짜를 누르면 상세 시트, 거기서 수정·삭제.
- **Insights** — 최근 7일/30일 평균, 평균 수면·피로·기분, 모드별 일수, 운동한 날 vs 안 한 날 비교.
  표본이 부족한 분석은 계산하지 않고 화면에서도 감춘다 (`lib/insights.ts` 의 `MIN_SAMPLES`).

AI·챗봇·의료 조언 기능은 들어 있지 않다.
