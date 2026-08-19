-- Life OS — daily_checkins
-- 지금은 사용자 1명이지만, user_id 를 처음부터 두어 나중에 Supabase Auth 를 그대로 붙일 수 있게 한다.

create extension if not exists "pgcrypto";

create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
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
-- 인증을 붙이기 전(anon 키 + 고정 user_id)에는 아래 "개인용" 정책을 쓴다.
-- 인증을 붙인 뒤에는 개인용 정책을 삭제하고 "인증 사용자" 정책만 남기면 된다.
-- ─────────────────────────────────────────────
alter table public.daily_checkins enable row level security;

-- 개인용(임시): anon 키로 접근 허용. 공개 배포 시에는 반드시 아래 인증 정책으로 교체할 것.
drop policy if exists "personal anon access" on public.daily_checkins;
create policy "personal anon access"
  on public.daily_checkins
  for all
  to anon
  using (true)
  with check (true);

-- 인증 도입 후 사용할 정책
drop policy if exists "own rows only" on public.daily_checkins;
create policy "own rows only"
  on public.daily_checkins
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
