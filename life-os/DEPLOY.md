# 배포하기

Supabase(저장소 + 로그인)와 Vercel(호스팅)에 올려서 아이폰에서 매일 쓰는 상태로 만드는 순서다.
소요 시간은 15분 정도.

---

## 1. Supabase 프로젝트 만들기

1. https://supabase.com 에 가입하고 **New project** 를 만든다. (Region 은 `Northeast Asia (Seoul)` 권장)
2. 프로젝트가 만들어지면 왼쪽 메뉴 **SQL Editor** → **New query** 로 들어간다.
3. 이 저장소의 [`supabase/schema.sql`](./supabase/schema.sql) 내용을 통째로 붙여 넣고 **Run**.
   - 테이블, 인덱스, `updated_at` 트리거, 그리고 **RLS 정책**이 한 번에 만들어진다.
   - 여러 번 실행해도 안전하다.

> **왜 RLS 가 중요한가**
> 앱이 쓰는 `anon key` 는 브라우저 번들에 그대로 들어가는 공개 값이다.
> 데이터를 지키는 건 키가 아니라 RLS 정책(`auth.uid() = user_id`)이다.
> 그래서 스키마를 반드시 그대로 적용해야 하고, 정책을 끄면 안 된다.

---

## 2. 로그인(매직 링크) 설정

Supabase 대시보드에서:

1. **Authentication → Providers → Email** 이 켜져 있는지 확인한다 (기본값 On).
   비밀번호를 쓰지 않으므로 `Confirm email` 옵션은 그대로 둬도 된다.
2. **Authentication → URL Configuration** 에서
   - **Site URL**: 배포 후 받은 주소 (예: `https://life-os.vercel.app`)
   - **Redirect URLs**: 아래 두 개를 추가
     ```
     http://localhost:5173
     https://<내-도메인>.vercel.app
     ```
   아직 Vercel 주소가 없다면 `http://localhost:5173` 만 넣고, 4단계 후에 다시 와서 추가한다.

무료 플랜의 기본 메일 발송은 시간당 통수 제한이 있다. 개인용으로는 충분하다.

---

## 3. 로컬에서 먼저 연결 확인

**두 값을 복사한다.** 가장 쉬운 길은 프로젝트 화면 위쪽의 **Connect** 버튼이다.
App Frameworks 탭에서 React / Vite 를 고르면 우리가 쓰는 이름 그대로 두 줄이 나온다.

Connect 버튼이 없는 버전이라면 **⚙️ Project Settings** 에서:

- 메뉴에 **API** 가 있으면 → 맨 위 `Project URL`, 아래 `Project API keys` 의 **anon · public**
- 메뉴에 **API Keys** 가 있으면 → URL 은 `Data API`, 키는 **Publishable key**(`sb_publishable_…`)
  또는 **Legacy API keys** 탭의 **anon**(`eyJ…`). 둘 다 동작한다.

`service_role` / `secret` 키는 절대 쓰지 않는다. RLS 를 통째로 무시하는 키다.

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

```bash
npm install
npm run dev
```

- 로그인 화면이 뜨면 연결된 것이다. (환경변수가 없으면 로그인 없이 로컬 저장소 모드로 뜬다)
- 메일 주소를 넣고 **Send magic link** → 메일의 링크를 열면 앱으로 들어온다.
- 체크인을 저장한 뒤 Supabase 대시보드의 **Table Editor → daily_checkins** 에 행이 생기면 성공.

---

## 4. Vercel 배포

1. https://vercel.com 에서 이 저장소를 **Import** 한다.
2. **Root Directory 를 `life-os` 로 지정한다.** (저장소 루트가 아니라 이 폴더가 앱이다)
   - Import 화면의 Edit 버튼은 **기본 브랜치의 폴더 목록**을 보여준다. 목록에 `life-os` 가 없다면
     그 브랜치에 아직 앱이 없다는 뜻이다.
   - 목록이 안 뜨면 그냥 Deploy 한 뒤 **Settings → Build and Deployment → Root Directory** 에
     `life-os` 를 직접 입력해도 된다 (여기는 글자 입력칸이다).
3. **Install / Build Command 의 Override 스위치는 모두 꺼 둔다.** 켜 두면 저장소의
   `life-os/vercel.json` 대신 그 값이 쓰여서, 코드를 고쳐도 계속 같은 오류가 난다.
4. **Framework Preset 이 `Vite` 인지 반드시 확인한다.**
   `Other` 로 남아 있으면 Vercel 이 빌드를 아예 돌리지 않고 폴더를 그대로 올려서,
   배포 주소가 `404: NOT_FOUND` 가 된다. Build Command / Output Directory 는 건드리지 않는다
   (`vercel.json` 에 이미 들어 있다).
5. **Environment Variables** 에 3단계의 두 값을 그대로 넣는다. 나중에
   **Settings → Environment Variables** 에서 추가해도 된다.
   ```
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
   ```
   Production / Preview 둘 다 체크. 환경변수는 **빌드할 때 코드에 박히므로**, 나중에 추가했다면
   반드시 재배포해야 반영된다.
6. **Deploy**.
7. 배포된 주소를 2단계의 **Site URL / Redirect URLs** 에 추가하고 저장한다.
   (이걸 빼먹으면 메일 링크를 눌렀을 때 로그인 화면으로 되돌아온다)

이후 `claude/...` 브랜치에 푸시하면 Preview 배포가, 기본 브랜치에 머지하면 Production 배포가 자동으로 나간다.

---

## 5. 아이폰 홈 화면에 올리기

1. Safari 로 배포 주소를 연다. (Chrome 이 아니라 **Safari** 여야 한다)
2. 공유 버튼 → **홈 화면에 추가**.
3. 홈 화면 아이콘으로 열면 주소창 없이 앱처럼 뜬다.

로그인은 기기별로 한 번만 하면 세션이 유지된다.

---

## 문제가 생기면

| 증상 | 원인과 해결 |
| --- | --- |
| 메일 링크를 눌렀는데 다시 로그인 화면 | Supabase **Redirect URLs** 에 그 도메인이 없다. 2단계로 돌아가 추가 |
| 저장할 때 `new row violates row-level security policy` | 로그인이 풀렸거나 스키마의 RLS 정책이 적용되지 않았다. `supabase/schema.sql` 을 다시 실행 |
| 기록이 하나도 안 보임 | 다른 메일 주소로 로그인했을 가능성. Stats 화면 맨 아래에 현재 계정이 표시된다 |
| 메일이 안 온다 | 스팸함 확인. 무료 플랜의 시간당 발송 제한에 걸렸다면 잠시 뒤 재시도 |
| 로컬에서 로그인 화면이 안 뜨고 `Local Save` 라고 표시됨 | `.env` 가 없거나 값이 비어 있다. `npm run dev` 를 다시 시작 |
| 배포 주소가 `404: NOT_FOUND` | 빌드가 돌지 않은 것. Framework Preset 이 `Vite` 인지, Root Directory 가 `life-os` 인지 확인하고 재배포 |
| 배포 주소에 예전 lookbook 페이지가 뜸 | Root Directory 가 `./` 인 채로 배포됐다. `life-os` 로 바꾸고 재배포 |
| 환경변수를 넣었는데 그대로임 | 저장만으로는 반영되지 않는다. Deployments → `⋯` → Redeploy (Build Cache 체크 해제) |
| 코드를 고쳤는데 같은 오류가 계속 남 | **Redeploy 는 그 배포가 썼던 커밋을 그대로 다시 빌드한다.** 최신 코드로 배포하려면 새 커밋을 푸시하거나, 목록에서 최신 커밋의 배포를 확인해야 한다 |
| 지운 명령이 계속 실행됨 | Settings → Build and Deployment 의 **Install / Build Command 에 Override 스위치가 켜져** 있는지 확인. 켜져 있으면 저장소의 설정 대신 그 값이 쓰인다. Root Directory 만 지정하고 나머지 Override 는 모두 끈 상태가 정답 |

---

## 재배포하는 법

설정을 바꾼 뒤에는 반드시 다시 배포해야 반영된다. 셋 중 편한 것으로:

- **Deployments** 탭 → 맨 위 배포 오른쪽 `⋯` → **Redeploy** → *Use existing Build Cache* 체크 해제
- 배포를 클릭해 들어간 뒤 오른쪽 위 `⋯` → **Redeploy**
- **기본 브랜치에 커밋을 하나 푸시한다** — Vercel 이 자동으로 새 배포를 시작한다

---

## 부록: Supabase 없이 연결 경로만 확인하기

실제 프로젝트를 만들기 전에 앱의 인증·저장 경로만 확인하고 싶을 때 쓰는 개발용 스텁이다.

```bash
node scripts/supabase-stub.mjs 54321      # 터미널 1
```

```bash
# 터미널 2 — .env.local
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=stub-anon-key
npm run dev
```

로그인 메일은 실제로 가지 않으므로, 브라우저에서 아래 주소로 직접 들어가면 로그인된 상태가 된다.

```
http://localhost:5173/#access_token=stub-access-token&refresh_token=stub-refresh-token&expires_in=3600&token_type=bearer&type=magiclink
```

스텁은 데이터를 메모리에만 들고 있고, 운영에는 쓰지 않는다.

## Supabase 확장 마이그레이션 (Life OS 확장)

체중 · Mounjaro · D-Day · 타임라인 · 설정 화면을 쓰려면 SQL 을 한 번 더 실행해야 한다.

1. Supabase 대시보드 → 왼쪽 **SQL Editor** → **New query**
2. `life-os/supabase/migrations/001_life_os_expansion.sql` 내용을 통째로 붙여 넣기
3. **Run** (초록색 실행 버튼)
4. `Success. No rows returned` 이 나오면 정상이다 — 테이블을 만드는 문장은 원래 결과 행이 없다

여러 번 실행해도 안전하고, 이미 저장된 기록은 지워지지 않는다.
자세한 순서는 `life-os/supabase/README.md` 참고.
