-- Life OS — Gameplay & Personal Intelligence 마이그레이션 (002)
--
-- 원칙 (001 과 같다)
--   · 데이터를 지우지 않는다. 컬럼 추가 / 테이블 생성만 한다.
--   · 여러 번 실행해도 안전하다.
--   · 모든 테이블에 RLS 를 걸어 auth.uid() = user_id 인 행만 열어 준다.
--
-- 실행 순서: schema.sql → quests.sql → 001_life_os_expansion.sql → 이 파일

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- 1. daily_checkins — 아침에 묻는 항목 하나 추가
-- ─────────────────────────────────────────────
alter table public.daily_checkins
  add column if not exists wake_freshness smallint check (wake_freshness between 1 and 5);

-- 아침 기록을 언제 남겼는지 (없으면 예전 기록)
alter table public.daily_checkins
  add column if not exists morning_at timestamptz;

-- ─────────────────────────────────────────────
-- 2. night_checkouts — 하루를 닫는 기록
--
-- 아침에 "예상한 하루" 와 밤에 "실제로 어땠던 하루" 를 따로 둔다.
-- 둘을 비교한 값이 나중에 My Manual 과 패턴 발견의 재료가 된다.
-- ─────────────────────────────────────────────
create table if not exists public.night_checkouts (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,

  actual_energy smallint check (actual_energy between 1 and 5),
  day_satisfaction smallint check (day_satisfaction between 1 and 5),
  actual_mood smallint check (actual_mood between 1 and 5),
  actual_body smallint check (actual_body between 1 and 5),
  actual_stress smallint check (actual_stress between 1 and 5),

  best_thing text,
  hardest_thing text,
  diary text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.night_checkouts enable row level security;
drop policy if exists "own night rows only" on public.night_checkouts;
create policy "own night rows only" on public.night_checkouts
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists night_checkouts_set_updated_at on public.night_checkouts;
create trigger night_checkouts_set_updated_at
  before update on public.night_checkouts
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- 3. daily_events — 오늘 있었던 일 태그
--
-- 하루에 한 행. 태그는 문자열 배열로 둔다 (예: '야근', '클라이밍', '데이트').
-- 별도 마스터 테이블을 두지 않는 이유: 기본 태그 목록은 앱 코드에 있고,
-- 사용자가 만든 태그는 그냥 문자열로 여기에 쌓이면 되기 때문이다.
-- ─────────────────────────────────────────────
create table if not exists public.daily_events (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  tags text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create index if not exists daily_events_user_date_idx on public.daily_events (user_id, date desc);

alter table public.daily_events enable row level security;
drop policy if exists "own event rows only" on public.daily_events;
create policy "own event rows only" on public.daily_events
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 4. daily_quests 확장
--
--   picks       그날 골라 둔 퀘스트 id 목록
--   completions 퀘스트별 완료 횟수 {"water": 3, "tidy-desk": 1}
--               반복 가능한 퀘스트 때문에 횟수가 필요하다.
--   quest_ids   예전 컬럼 — 그대로 두고 계속 채운다 (되돌릴 수 있게)
-- ─────────────────────────────────────────────
alter table public.daily_quests add column if not exists picks text[] not null default '{}';
alter table public.daily_quests add column if not exists completions jsonb not null default '{}'::jsonb;

-- ─────────────────────────────────────────────
-- 5. custom_quests — 사용자가 직접 만든 퀘스트
--
-- XP 는 저장하지 않는다. 난이도에서 앱이 계산한다 (+999 XP 같은 값 방지).
-- ─────────────────────────────────────────────
create table if not exists public.custom_quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  category text not null,
  difficulty text not null default 'easy' check (difficulty in ('tiny', 'easy', 'normal', 'big')),
  is_repeatable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists custom_quests_user_idx on public.custom_quests (user_id, created_at desc);

alter table public.custom_quests enable row level security;
drop policy if exists "own custom quests only" on public.custom_quests;
create policy "own custom quests only" on public.custom_quests
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists custom_quests_set_updated_at on public.custom_quests;
create trigger custom_quests_set_updated_at
  before update on public.custom_quests
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- 6. user_preferences — 즐겨찾는 퀘스트
-- ─────────────────────────────────────────────
alter table public.user_preferences
  add column if not exists favorite_quests text[] not null default '{}';
