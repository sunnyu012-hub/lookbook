# 아이폰에 올리기

Vercel 에 배포해서 아이폰 홈 화면에 앱처럼 두는 순서다. 10분 정도 걸린다.
백엔드도 로그인도 없어서 준비할 게 거의 없다.

---

## 1. Vercel 에 올리기

1. https://vercel.com 에 GitHub 계정으로 로그인한다.
2. **Add New… → Project** 에서 `sunnyu012-hub/lookbook` 을 고른다.
3. 설정에서 **Root Directory** 를 `little-life` 로 바꾼다. ← 이거 하나가 제일 중요하다.
   저장소 루트에는 다른 프로젝트도 같이 있어서, 그대로 두면 엉뚱한 걸 빌드한다.
4. Framework Preset 은 **Vite** 로 잡히면 그대로 두고, 나머지는 건드리지 않는다.
   빌드 명령과 출력 폴더는 `vercel.json` 에 이미 적혀 있다.
5. **Deploy**.

주소를 하나 받는다 (예: `https://little-life.vercel.app`).

> 브랜치를 아직 `main` 에 합치지 않았다면, Vercel 에서 배포할 브랜치를
> `claude/little-life-rpg-mvp-m68989` 로 지정하거나 먼저 main 에 머지한다.

## 2. 홈 화면에 추가

아이폰 **Safari** 로 그 주소를 연다. (크롬 말고 Safari 여야 한다)

1. 아래쪽 공유 버튼 → **홈 화면에 추가**
2. 이름은 `Little Life` 로 채워져 있다. **추가**

이제 홈 화면에 캐릭터 얼굴 아이콘이 생기고, 눌러서 열면
주소창 없이 전체화면으로 뜬다.

## 3. 확인할 것

- 비행기 모드로 바꾸고 앱을 열어도 화면이 그대로 뜬다 (오프라인 대응이 들어 있다)
- 퀘스트 완료도 오프라인에서 된다. 데이터는 기기에 저장된다

## 4. 서버 붙이기 (백업 · 의견함)

**Supabase 프로젝트를 새로 만들지 않는다. life-os 것을 같이 쓴다.**
무료 플랜이 둘까지라 자리가 없었고, 계정이 하나로 합쳐지는 게 원래
하고 싶던 것이기도 했다. 어느 프로젝트인지 헷갈리면 Table Editor 에
`daily_checkins` 가 있는 쪽이다.

1. 그 프로젝트의 **Project URL** 과 **anon public** 키를 복사한다.
   (위쪽 `Connect` 버튼 › App Frameworks 에 둘이 같이 나온다.)
2. Vercel › little-life › Settings › Environment Variables 에
   `VITE_SUPABASE_URL` · `VITE_SUPABASE_ANON_KEY` 로 넣는다.
   Production · Preview · Development 셋 다 체크.
3. **재배포한다.** 환경변수는 빌드할 때 번들에 박혀서, 넣기만 하고
   재배포를 안 하면 아무 일도 안 일어난다.
4. Supabase › SQL Editor 에서 **두 파일을 다 실행**한다.
   - `supabase/schema.sql` — 백업 표
   - `supabase/feedback.sql` — 의견함. 붙여넣은 뒤 맨 아래
     `REPLACE_WITH_YOUR_EMAIL` 을 **네 로그인 이메일**로 바꾸고 Run.
     (이 파일은 공개 저장소에 있어서 실제 주소를 적어두지 않았다.
      안 바꾸면 보내는 건 되고 읽는 것만 막힌다.)
5. Authentication › URL Configuration › **Redirect URLs** 에
   `https://<이 앱 주소>/**` 를 더한다. **Site URL 은 건드리지 않는다** —
   life-os 주소가 들어 있어서 바꾸면 그쪽 로그인이 깨진다.

되면 설정에 "백업" 칸과 "의견" 칸이 생긴다. 백업만 있고 의견이 없으면
4번의 `feedback.sql` 을 안 돌린 것이다.

받은 건 두 군데서 본다.

- **Supabase › SQL Editor** — 로그인이 필요 없다. 대시보드는 RLS 를
  건너뛰고 본다. 이쪽이 원본이다.

  ```sql
  select to_char(created_at at time zone 'Asia/Seoul', 'MM-DD HH24:MI') as 시각,
         nickname, level, body, build_id, ua
  from public.little_life_feedback
  order by created_at desc;
  ```

- **`배포주소/?dev=feedback`** — 폰에서 편하게 보려고 만든 창.
  읽기 정책에 적은 그 계정으로 **앱에 로그인한 상태**여야 한다.
  빈 목록이 나오면 정말 안 온 것이거나, 로그인이 안 됐거나, 이메일이
  정책과 다른 것이다 — 서버가 못 읽는 줄을 없는 것처럼 다뤄서 셋을
  구분해 알려주지 못한다.

베타가 끝나면 보내는 길을 닫는다:

```sql
drop policy "누구나 보낼 수 있다" on public.little_life_feedback;
```

---

## 새로 배포하면

브랜치에 푸시하면 Vercel 이 알아서 다시 빌드한다.
폰에서는 앱을 **닫았다 다시 열면** 새 버전이 적용된다.

빌드할 때마다 서비스 워커 캐시 이름에 시각을 박아 넣기 때문에
(`vite.config.ts` 의 `stampServiceWorker`), 예전 화면이 남아 있는 일은 없다.

---

## 알아둘 것

**데이터는 이 기기에만 있다.**
localStorage 에 저장하므로 기기를 바꾸거나 Safari 데이터를 지우면 사라진다.
기록이 쌓여서 아까워지면 그때 Supabase 를 붙이면 된다.
`store/repository.ts` 인터페이스만 새로 구현하면 되고 화면 코드는 안 건드려도 된다.

**iOS 는 오래 안 쓴 사이트의 저장 데이터를 지울 수 있다.**
홈 화면에 추가한 앱은 잘 지워지지 않는 편이지만, 보장은 없다.
매일 쓰는 동안에는 문제되지 않는다.

**글꼴은 인터넷에서 받아온다.**
Pretendard 와 DM Mono 를 CDN 에서 가져오는데, 오프라인이면 기기 기본 글꼴로 나온다.
글자가 안 보이는 건 아니고 모양만 조금 달라진다.
