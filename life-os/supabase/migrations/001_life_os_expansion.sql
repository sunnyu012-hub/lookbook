-- Life OS — Personal Life OS 확장 마이그레이션 (001)
--
-- 원칙
--   · 이 파일은 데이터를 지우지 않는다. 컬럼 추가 / NOT NULL 완화 / 테이블 생성만 한다.
--   · 여러 번 실행해도 안전하다 (전부 if not exists / drop policy 후 재생성).
--   · 모든 테이블은 RLS 로 auth.uid() = user_id 인 행만 열어 준다.
--     anon key 는 브라우저 번들에 그대로 들어가는 공개 값이라, 보호는 전적으로 이 정책이 담당한다.
--
-- 실행 순서: schema.sql → quests.sql → 이 파일

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- 1. daily_checkins 확장
--
-- Quick 체크인(3개만 입력)도 저장할 수 있어야 하므로 기존 필수 컬럼의 NOT NULL 을 푼다.
-- 이미 저장된 행은 값이 그대로 남는다.
-- ─────────────────────────────────────────────
alter table public.daily_checkins alter column sleep_hours   drop not null;
alter table public.daily_checkins alter column sleep_quality drop not null;
alter table public.daily_checkins alter column fatigue       drop not null;
alter table public.daily_checkins alter column body_pain     drop not null;
alter table public.daily_checkins alter column mood          drop not null;
alter table public.daily_checkins alter column focus         drop not null;
alter table public.daily_checkins alter column appetite      drop not null;
alter table public.daily_checkins alter column energy_score  drop not null;
alter table public.daily_checkins alter column mode          drop not null;
alter table public.daily_checkins alter column caffeine_consumed drop not null;
alter table public.daily_checkins alter column exercise          drop not null;

-- 마음
alter table public.daily_checkins add column if not exists stress        smallint check (stress between 1 and 5);
alter table public.daily_checkins add column if not exists anxiety       smallint check (anxiety between 1 and 5);
alter table public.daily_checkins add column if not exists motivation    smallint check (motivation between 1 and 5);
alter table public.daily_checkins add column if not exists social_energy smallint check (social_energy between 1 and 5);

-- 몸
alter table public.daily_checkins add column if not exists headache  smallint check (headache between 0 and 5);
alter table public.daily_checkins add column if not exists nausea    smallint check (nausea between 0 and 5);
alter table public.daily_checkins add column if not exists bloating  smallint check (bloating between 0 and 5);
alter table public.daily_checkins add column if not exists digestion smallint check (digestion between 1 and 5);

-- 연료 (식사 / 수분)
alter table public.daily_checkins add column if not exists meals_count     smallint check (meals_count between 0 and 10);
alter table public.daily_checkins add column if not exists meal_quality    smallint check (meal_quality between 1 and 5);
alter table public.daily_checkins add column if not exists water_ml        integer  check (water_ml between 0 and 10000);
alter table public.daily_checkins add column if not exists caffeine_mg     integer  check (caffeine_mg between 0 and 2000);
alter table public.daily_checkins add column if not exists alcohol         boolean;
alter table public.daily_checkins add column if not exists alcohol_units   numeric(4,1) check (alcohol_units >= 0);

-- 활동
alter table public.daily_checkins add column if not exists steps              integer check (steps between 0 and 200000);
alter table public.daily_checkins add column if not exists exercise_minutes   integer check (exercise_minutes between 0 and 1440);
alter table public.daily_checkins add column if not exists exercise_intensity smallint check (exercise_intensity between 1 and 5);
alter table public.daily_checkins add column if not exists work_hours         numeric(4,1) check (work_hours between 0 and 24);
alter table public.daily_checkins add column if not exists screen_minutes     integer check (screen_minutes between 0 and 1440);
alter table public.daily_checkins add column if not exists outdoor            boolean;

-- 맥락
alter table public.daily_checkins add column if not exists tags       text[] not null default '{}';
alter table public.daily_checkins add column if not exists highlight  text;
alter table public.daily_checkins add column if not exists entry_mode text not null default 'detailed'
  check (entry_mode in ('quick', 'detailed'));

-- 계산 결과 캐시 (표시는 항상 다시 계산하지만, 정렬·통계용으로 저장해 둔다)
alter table public.daily_checkins add column if not exists recovery_score smallint check (recovery_score between 0 and 100);
alter table public.daily_checkins add column if not exists body_score     smallint check (body_score between 0 and 100);
alter table public.daily_checkins add column if not exists mind_score     smallint check (mind_score between 0 and 100);
alter table public.daily_checkins add column if not exists fuel_score     smallint check (fuel_score between 0 and 100);
alter table public.daily_checkins add column if not exists confidence     numeric(4,3) check (confidence between 0 and 1);

-- ─────────────────────────────────────────────
-- 2. 공통 트리거 함수 (이미 schema.sql 에 있지만 단독 실행도 되게)
-- ─────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────
-- 3. weight_logs — 체중 기록
-- ─────────────────────────────────────────────
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  weight_kg numeric(5, 2) not null check (weight_kg > 0 and weight_kg < 400),
  body_fat_pct numeric(4, 1) check (body_fat_pct between 0 and 80),
  muscle_kg numeric(5, 2) check (muscle_kg >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists weight_logs_user_date_idx on public.weight_logs (user_id, date desc);

alter table public.weight_logs enable row level security;
drop policy if exists "own weight rows only" on public.weight_logs;
create policy "own weight rows only" on public.weight_logs
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists weight_logs_set_updated_at on public.weight_logs;
create trigger weight_logs_set_updated_at
  before update on public.weight_logs
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- 4. mounjaro_logs — 투약 기록
--
-- 이 앱은 의료 앱이 아니다. 이 테이블은 "언제 맞았는지" 를 사용자가 직접 적어 두는 기록일 뿐,
-- 용량을 계산하거나 추천하는 데 쓰지 않는다.
-- ─────────────────────────────────────────────
create table if not exists public.mounjaro_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  dose_mg numeric(4, 2) not null check (dose_mg > 0 and dose_mg <= 100),
  injection_site text,
  taken_at time,
  side_effects text[] not null default '{}',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists mounjaro_logs_user_date_idx on public.mounjaro_logs (user_id, date desc);

alter table public.mounjaro_logs enable row level security;
drop policy if exists "own mounjaro rows only" on public.mounjaro_logs;
create policy "own mounjaro rows only" on public.mounjaro_logs
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists mounjaro_logs_set_updated_at on public.mounjaro_logs;
create trigger mounjaro_logs_set_updated_at
  before update on public.mounjaro_logs
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- 5. dday_events — D-Day
-- ─────────────────────────────────────────────
create table if not exists public.dday_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  start_date date not null,
  kind text not null default 'life' check (kind in ('love', 'health', 'life', 'goal')),
  count_mode text not null default 'since' check (count_mode in ('since', 'until')),
  pinned boolean not null default false,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dday_events_user_idx on public.dday_events (user_id, sort_order);

alter table public.dday_events enable row level security;
drop policy if exists "own dday rows only" on public.dday_events;
create policy "own dday rows only" on public.dday_events
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists dday_events_set_updated_at on public.dday_events;
create trigger dday_events_set_updated_at
  before update on public.dday_events
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- 6. life_events — 타임라인에 직접 적는 사건
-- ─────────────────────────────────────────────
create table if not exists public.life_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  title text not null,
  category text not null default 'note'
    check (category in ('note', 'love', 'health', 'work', 'play', 'travel', 'milestone')),
  detail text,
  mood smallint check (mood between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists life_events_user_date_idx on public.life_events (user_id, date desc);

alter table public.life_events enable row level security;
drop policy if exists "own life event rows only" on public.life_events;
create policy "own life event rows only" on public.life_events
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists life_events_set_updated_at on public.life_events;
create trigger life_events_set_updated_at
  before update on public.life_events
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- 7. user_preferences — 개인 설정
--
-- 목표 체중, Mounjaro 시작일 / 용량 / 주기, 연애 시작일 같은 개인 값은
-- 전부 여기에만 존재한다. 코드에는 어떤 것도 하드코딩하지 않는다.
-- ─────────────────────────────────────────────
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,

  display_name text,
  life_os_start_date date,

  height_cm numeric(4, 1) check (height_cm between 50 and 260),
  starting_weight_kg numeric(5, 2) check (starting_weight_kg > 0 and starting_weight_kg < 400),
  goal_weight_kg numeric(5, 2) check (goal_weight_kg > 0 and goal_weight_kg < 400),

  mounjaro_enabled boolean not null default false,
  mounjaro_start_date date,
  mounjaro_dose_mg numeric(4, 2) check (mounjaro_dose_mg > 0 and mounjaro_dose_mg <= 100),
  mounjaro_interval_days smallint not null default 7 check (mounjaro_interval_days between 1 and 60),

  relationship_enabled boolean not null default false,
  relationship_start_date date,
  partner_name text,

  water_goal_ml integer not null default 2000 check (water_goal_ml between 0 and 10000),
  sleep_goal_hours numeric(3, 1) not null default 8 check (sleep_goal_hours between 0 and 24),
  step_goal integer not null default 6000 check (step_goal between 0 and 200000),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;
drop policy if exists "own preferences only" on public.user_preferences;
create policy "own preferences only" on public.user_preferences
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();
