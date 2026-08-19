-- Life OS — daily_checkins
--
-- Supabase 대시보드 > SQL Editor 에 그대로 붙여 넣고 실행하면 된다.
-- 여러 번 실행해도 안전하다.

create extension if not exists "pgcrypto";

create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  -- auth.users 의 사용자. 로그인한 본인 행만 읽고 쓸 수 있다 (아래 RLS).
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,

  sleep_hours numeric(3, 1) not null check (sleep_hours >= 0 and sleep_hours <= 24),
  sleep_quality smallint not null check (sleep_quality between 1 and 5),
  fatigue smallint not null check (fatigue between 1 and 5),
  body_pain smallint not null check (body_pain between 0 and 5),
  mood smallint not null check (mood between 1 and 5),
  focus smallint not null check (focus between 1 and 5),
  appetite smallint not null check (appetite between 1 and 5),

  caffeine_consumed boolean not null default false,
  caffeine_time time,
  exercise boolean not null default false,
  exercise_type text,
  memo text,

  energy_score smallint not null check (energy_score between 0 and 100),
  mode text not null check (mode in ('RECOVERY', 'EASY', 'NORMAL', 'POWER')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- 하루 한 건 (upsert 의 onConflict 대상)
  unique (user_id, date)
);

create index if not exists daily_checkins_user_date_idx
  on public.daily_checkins (user_id, date desc);

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists daily_checkins_set_updated_at on public.daily_checkins;
create trigger daily_checkins_set_updated_at
  before update on public.daily_checkins
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- RLS
--
-- anon key 는 브라우저 번들에 그대로 들어가는 공개 값이다.
-- 따라서 데이터 보호는 전적으로 아래 정책이 담당한다:
-- 로그인한 사용자가 자기 user_id 의 행에만 접근할 수 있다.
-- ─────────────────────────────────────────────
alter table public.daily_checkins enable row level security;

-- 예전 버전에서 쓰던 임시 공개 정책이 남아 있으면 제거한다
drop policy if exists "personal anon access" on public.daily_checkins;

drop policy if exists "own rows only" on public.daily_checkins;
create policy "own rows only"
  on public.daily_checkins
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
