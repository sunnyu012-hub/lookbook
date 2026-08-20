# Supabase 실행 순서

Supabase 대시보드 → **SQL Editor** 에 파일 내용을 붙여 넣고 **Run** 하면 된다.
전부 여러 번 실행해도 안전하다 (기존 데이터를 지우지 않는다).

| 순서 | 파일 | 언제 |
|---|---|---|
| 1 | `schema.sql` | 처음 한 번 (daily_checkins) |
| 2 | `quests.sql` | 처음 한 번 (daily_quests) |
| 3 | `migrations/001_life_os_expansion.sql` | **Life OS 확장을 쓰려면 반드시** |
| — | `set-password.sql` | 이메일 대신 비밀번호로 로그인하고 싶을 때만 |

## 3번이 하는 일

- `daily_checkins` 에 컬럼을 **추가**하고, Quick 체크인이 가능하도록 기존 필수 컬럼의
  `NOT NULL` 을 푼다. 이미 저장된 값은 그대로 남는다.
- 새 테이블을 만든다: `weight_logs`, `mounjaro_logs`, `dday_events`, `life_events`,
  `user_preferences`.
- 모든 테이블에 RLS 를 켜고 `auth.uid() = user_id` 정책을 건다.

> `anon` key 는 브라우저 번들에 그대로 들어가는 **공개 값**이다.
> 데이터 보호는 전적으로 위 RLS 정책이 담당한다.
> `service_role` / `secret` 키는 절대 프런트엔드에 넣지 않는다.

## 3번을 실행하지 않으면

앱은 열리지만, 체크인을 저장할 때 새 컬럼이 없다는 오류가 나고
체중 · 투약 · D-Day · 타임라인 · 설정 화면이 데이터를 읽지 못한다.
