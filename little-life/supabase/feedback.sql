-- LITTLE LIFE — 베타 의견함
--
-- Supabase 대시보드 › SQL Editor 에 붙여넣고 한 번 실행한다.
-- 여러 번 실행해도 안전하다 (전부 if not exists / drop-create).
--
-- ⚠️ 실행 전에 아래 "만든 사람만 읽는다" 정책의 이메일 자리를
--    네 로그인 이메일로 바꿔야 한다. 안 바꾸면 아무도 못 읽는다.
--
-- ── 왜 표를 따로 두는가 ────────────────────────────────
--
-- 게임 상태(little_life_states)는 사람당 한 줄이고 자기 것만 읽고 쓴다.
-- 의견은 반대다 — 여러 줄이 쌓이고, 쓰는 사람은 많고, 읽는 사람은 하나다.
-- 권한 모양이 정반대라 같은 표에 얹을 수 없다.
--
-- ── 로그인 안 한 사람도 보낼 수 있다 ───────────────────
--
-- 베타 테스터에게 "의견을 보내려면 먼저 가입하세요" 라고 하면
-- 아무도 안 보낸다. 제보는 마찰이 하나만 있어도 사라진다.
-- 그래서 insert 는 anon 에게도 연다.
--
-- 대신 select · update · delete 정책은 만들지 않는다. 정책이 없으면
-- RLS 가 전부 막는다 — 남이 보낸 걸 읽거나 고치거나 지울 길이 없다.
-- (읽기는 아래에서 만든 사람에게만 연다.)
--
-- ⚠️ anon 키는 앱 번들에 들어 있어서, 마음먹으면 이 표에 아무 글이나
--    넣을 수 있다. 베타 동안엔 감수하고, 끝나면 아래 한 줄로 닫는다:
--      drop policy "누구나 보낼 수 있다" on public.little_life_feedback;

create table if not exists public.little_life_feedback (
  id         uuid        primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- 사람이 쓴 것. 이것만 필수다.
  body       text        not null check (char_length(body) between 1 and 2000),

  -- 보낼 때 앱이 같이 붙이는 것. 없어도 되지만 있으면 되묻지 않아도 된다.
  nickname   text        check (nickname is null or char_length(nickname) <= 40),
  -- 어느 판에서 났는지. 이거 하나로 "이미 고친 버그" 를 다시 쫓지 않는다.
  build_id   text        check (build_id is null or char_length(build_id) <= 32),
  level      integer,
  days       integer,
  -- iOS 사파리에서만 나는 문제가 있다. 기기를 되묻지 않으려고 둔다.
  ua         text        check (ua is null or char_length(ua) <= 400),

  -- 로그인한 사람이면 누구인지. 안 했으면 null 이고, 그래도 받는다.
  user_id    uuid        references auth.users (id) on delete set null
);

comment on table  public.little_life_feedback is 'LITTLE LIFE 베타 의견함 (읽기는 만든 사람만)';
comment on column public.little_life_feedback.build_id is '보낸 시점의 빌드 id. 설정 맨 아래에 뜨는 그 값.';
comment on column public.little_life_feedback.user_id is '로그인한 사람이면 채워진다. 안 한 사람도 보낼 수 있어서 null 이 정상이다.';

-- 최근 것부터 본다. 줄이 쌓여도 목록이 느려지지 않게.
create index if not exists little_life_feedback_recent
  on public.little_life_feedback (created_at desc);

alter table public.little_life_feedback enable row level security;

drop policy if exists "누구나 보낼 수 있다"   on public.little_life_feedback;
drop policy if exists "만든 사람만 읽는다"     on public.little_life_feedback;

-- 보내기 — 로그인 여부와 상관없이.
--
-- with check (true) 지만 update · delete 정책이 없어서 한 번 넣은 건
-- 본인도 못 고친다. 보내는 것만 되고 나머지는 다 막힌 상태다.
create policy "누구나 보낼 수 있다"
  on public.little_life_feedback for insert
  to anon, authenticated
  with check (true);

-- 읽기 — 만든 사람만.
--
-- ⚠️ 아래 이메일을 네 로그인 이메일로 바꾸고 실행할 것.
--    (이 파일은 공개 저장소에 있어서 실제 주소를 적어두지 않는다.)
--
-- 이메일로 판단하는 이유는, uuid 를 먼저 찾아와야 하는 것보다
-- 손이 덜 가서다. 앱에서 이 계정으로 로그인하고 ?dev=feedback 을 열면
-- 목록이 보이고, 다른 계정으로 열면 빈 목록이 보인다 — 오류가 아니라
-- 정말 한 줄도 안 보이는 것이다 (RLS 는 못 읽는 줄을 없는 것처럼 다룬다).
create policy "만든 사람만 읽는다"
  on public.little_life_feedback for select
  to authenticated
  using (auth.jwt() ->> 'email' = 'REPLACE_WITH_YOUR_EMAIL');
