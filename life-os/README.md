# Life OS

현실의 내 상태를 작은 픽셀 캐릭터로 보여주는 개인용 컨디션 기록 앱.

매일 10초 만에 상태를 저장하면 캐릭터가 그에 맞게 자고, 쉬고, 뛴다.
건강을 진단하지 않는다. 기록을 남기고, 그 기록을 눈에 보이게 만드는 것이 전부다.

## 디자인 콘셉트

Cozy Pixel RPG × 타마고치 × 라이프 트래커.
앱을 열면 대시보드가 아니라 **내 캐릭터가 사는 작은 방**이 먼저 보인다.

- 배경은 따뜻한 크림, 주조색은 스트로베리 핑크, 보조색은 피치 / 버터 / 민트 / 베이비블루.
  라벤더·퍼플은 Sleep·Recovery 상태에만 쓴다.
- 검정 외곽선을 쓰지 않는다. 글자·테두리 모두 따뜻한 갈색(`ink` `border`) 계열.
- 픽셀 폰트(Silkscreen)는 타이틀·숫자·라틴 라벨에만. 한글 본문은 읽기 편한 산세리프.
- 모서리는 2~14px, 그림자는 blur 없는 `2px 2px` 하드 섀도우, 테두리는 1.5px.
- Room 은 물건이 많아도 되지만 UI 는 단순하게 — 이 대비를 유지한다.
- 애니메이션은 1~3px 범위로만. `prefers-reduced-motion` 을 켜면 모두 멈춘다.

## 스택

React 18 · TypeScript · Vite · Tailwind CSS · Supabase · Vercel · PWA

외부 라이브러리는 React / Supabase 클라이언트뿐이다. 라우터·차트·애니메이션·상태관리 라이브러리는
직접 구현했다 (탭 전환, 세그먼트 HP 바, 스프라이트 애니메이션, 바텀시트, 카운트업).

## 픽셀 에셋 파이프라인

에셋은 전부 `assets-source/asset-sheet.png` (알파가 있는 원본 스프라이트 시트) 한 장에서 나온다.

```bash
python3 scripts/process-pixel-assets.py
```

이 스크립트가 하는 일:

1. 알파 채널 기준으로 연결 요소를 찾아 스프라이트를 자동 분리한다 (`scripts/detect_components.py`).
2. 각 스프라이트를 여백까지 잘라 `public/assets/pixel/<카테고리>/<이름>.png` 로 저장한다.
3. `public/assets/pixel/manifest.json` 과 타입이 붙은 레지스트리
   `src/lib/pixelAssets.generated.ts` 를 생성한다.
4. 캐릭터 스프라이트로 PWA 앱 아이콘(180·192·512)까지 만든다.

현재 자동 추출된 에셋은 **103개**다.

| 카테고리 | 개수 | 내용 |
| --- | --- | --- |
| `characters` | 7 | idle · recovery · easy · normal · power · 뒷모습 2종 |
| `pets` | 7 | 고양이 포즈 |
| `icons` | 22 | sleep · fatigue · mood · body · focus · appetite · caffeine · exercise · climbing · water · shower · food · clean · outfit · work · camera · music · save · energy · xp · home · log |
| `items` | 14 | 커피 · 빵 · 과일 · 우유 등 |
| `furniture` | 21 | 침대 · 러그 · 책상 · 행거 · 거울 · 책장 · 창문 4종 · 포스터 등 |
| `fashion` | 10 | 티셔츠 · 청바지 · 토트백 · 백팩 · 캡 등 |
| `gear` | 5 | 클라이밍화 · 덤벨 · 요가매트 · 러닝화 · 헤드폰 |
| `effects` | 9 | sparkle 2종 · 하트 · Zzz · 구름 · 무지개 · 전구줄 등 |
| `ui` | 8 | 로고 배너 · 모드 배지(pill) 5종 · save 버튼 · 마스코트 |

**에셋 경로를 컴포넌트에 직접 쓰지 않는다.** 전부 레지스트리를 통해 쓴다.

```ts
import { icons, MODE_CHARACTER } from '@/lib/pixelAssets'

<PixelImage asset={icons.climbing} height={20} />
<PixelImage asset={MODE_CHARACTER.RECOVERY} height={80} />
```

시트를 새로 그려 교체할 때는 파일만 덮어쓰고 스크립트를 다시 돌리면 된다.
스프라이트 순서가 바뀌면 `scripts/process-pixel-assets.py` 의 `MAP` 인덱스만 맞춰주면 되고,
확인용 대조표는 `python3 scripts/contact_sheet.py` 로 만든다.

### 아직 에셋이 없어 코드로 그린 것

시스템 이모지로 대체하지 않고, 순수 UI 도형으로만 처리한 부분이다.

- 방의 **벽/바닥 면** — CSS 단색 레이어 (그 위의 물건은 전부 실제 스프라이트)
- 퀘스트 **체크 표시** — CSS 도형 (시트에 체크 아이콘이 없음)

### 추출은 했지만 아직 화면에 안 쓰는 것

`characters/back-bag` `characters/back-coat` `ui/mascot` `furniture/window-morning|sunset|night`
`fashion/*` 대부분 — 방 확장이나 옷 기록 기능을 붙일 때 쓰라고 남겨 뒀다.
시트에 있던 **표정 6종**은 서로 차이가 거의 없어 5단계 척도로 쓰기 어렵다고 판단해 추출하지 않았다.

## Supabase 연결과 배포

**전체 순서는 [DEPLOY.md](./DEPLOY.md) 에 있다.** 요약하면:

1. Supabase 프로젝트를 만들고 SQL Editor 에서 [`supabase/schema.sql`](./supabase/schema.sql) 을 실행한다.
2. `.env.example` 을 `.env` 로 복사하고 API 키 두 개를 채운다.
3. Vercel 에서 이 저장소를 import 하되 **Root Directory 를 `life-os`** 로 지정하고, 같은 환경변수를 넣는다.

환경변수가 채워지면 `lib/repository.ts` 가 자동으로 Supabase 를 쓴다. 화면 코드는 바뀌지 않는다.

### 로그인

비밀번호 없이 **메일 매직 링크**만 쓴다 (`components/AuthGate.tsx`).
기록은 `auth.uid()` 기준 RLS 로 보호되므로, anon key 가 노출돼도 남의 기록에는 접근할 수 없다.
환경변수가 없으면 로그인 화면 자체가 뜨지 않고 로컬 저장소 모드로 동작한다.

실제 Supabase 프로젝트 없이 연결 경로만 확인하려면 `node scripts/supabase-stub.mjs` 로
개발용 스텁 서버를 띄울 수 있다 (DEPLOY.md 부록).

## PWA (iPhone 홈 화면)

`public/manifest.webmanifest` + `public/sw.js` + iOS 메타 태그가 들어 있다.
배포된 주소를 Safari 로 열고 공유 → **홈 화면에 추가** 하면 상태바까지 앱처럼 뜬다.
앱 아이콘은 캐릭터 스프라이트로 자동 생성된다. 서비스워커는 프로덕션 빌드에서만 등록된다.

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
assets-source/         원본 스프라이트 시트 (에셋의 단일 소스)
scripts/               에셋 분리 파이프라인 (pixelsheet · detect_components · process-pixel-assets · contact_sheet)
public/assets/pixel/   잘린 PNG + manifest.json
src/
  components/
    layout/      AppShell, TabBar
    pixel/       PixelImage, PixelSparkle, PixelPanel, PixelButton, PixelToast,
                 EnergyBar, PipRow, RoomScene, CalendarGrid, DaySheet
    DevTools.tsx 로컬 모드 전용 샘플 데이터 도구
  hooks/         useCheckins, useCheckinForm, useQuests, useCountUp, useHaptic
  lib/           energy(점수) · effects(버프/디버프) · quests · patterns · insights(통계)
                 roomLayout(방 배치) · pixelAssets(에셋 레지스트리)
                 repository(데이터 접근) · localStore · supabase · mappers · date · mock · env · cn
  pages/         TodayPage, CheckinPage, HistoryPage, InsightsPage
  types/         도메인 타입 + DB 행 타입
supabase/schema.sql
```

## 화면

- **Today (🏠)** — 화면의 주인공은 캐릭터가 사는 방이다. 침대·러그·책상·행거·거울·책장·창문·
  화분·클라이밍화·토트백이 놓인 cute maximalist 방에서, 캐릭터가 모드에 따라 다르게 지낸다
  (RECOVERY는 쿠션에 파묻혀 Zzz, EASY는 빈백에서 컵을 들고, NORMAL은 책상에서 노트북,
  POWER는 러그 위에서 점프 + sparkle). 고양이도 모드마다 다른 자리에 있다.
  그 아래로 ENERGY 바 + TODAY'S MODE → PLAYER STATUS → CURRENT EFFECTS → TODAY'S QUEST 순으로 스크롤한다.
- **Check-in (💾)** — 설문이 아니라 저장 화면. 항목마다 시트의 픽셀 아이콘이 붙고,
  1~5 척도는 그 아이콘을 5칸 늘어놓아 채운 만큼만 또렷하게 보여준다. 고르면 2px 떠오른다.
  상단의 캐릭터와 점수는 입력하는 동안 실시간으로 바뀐다.
- **History (📖 Adventure Log)** — 월간 캘린더에 날짜별 모드 아이콘과 점수. 날짜를 누르면
  그날의 캐릭터와 함께 작은 RPG 일지가 열린다. 아래에 최근 메모 세 줄.
- **Insights (⭐ Player Stats)** — 평균 에너지/수면/기분, 모드별 일수, 평균 피로도, 그리고
  **DISCOVERED** 패턴. 표본이 부족하면 계산하지 않고 화면에서도 감춘다.

### 방을 바꾸고 싶다면

`src/lib/roomLayout.ts` 하나만 고치면 된다. 방을 100×100 좌표로 보고
`{ asset, x, bottom, width, layer }` 를 나열하는 구조라서 물건을 더 놓거나 빼기 쉽고,
`CHARACTER_PLACEMENT` / `PET_PLACEMENT` / `MODE_EFFECTS` 로 모드별 연출을 바꾼다.
레이어는 wall → furniture → props → character → pet → effects 순으로 쌓인다.

### Buff / Debuff

`lib/effects.ts` 는 Energy Score 를 다시 계산하지 않는다. `energy.ts` 가 만든 항목별 점수를
중간값(55) 기준으로 풀어 `SLEEP DEBT −12` 처럼 보여줄 뿐이다. 즉 게임처럼 보이지만 실제로는
점수의 근거를 설명하는 화면이다.

### Daily Quest

오늘 모드에 맞는 아주 작은 행동 목록. **XP 시스템은 아직 없다** — 완료 체크만 기기 로컬에
저장한다(`hooks/useQuests.ts`). 나중에 XP/레벨을 붙일 때 questId 를 그대로 쓰면 된다.

AI·챗봇·의료 조언 기능은 들어 있지 않다.
