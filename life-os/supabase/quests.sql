-- Life OS — daily_quests (레벨 / EXP 용)
--
-- Supabase 대시보드 > SQL Editor 에 붙여 넣고 Run.
-- 여러 번 실행해도 안전하다. 이미 daily_checkins 를 만들었다면 이것만 추가로 실행하면 된다.

create table if not exists public.daily_quests (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  -- 그날 완료한 퀘스트 id 목록
  quest_ids text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.daily_quests enable row level security;

drop policy if exists "own quest rows only" on public.daily_quests;
create policy "own quest rows only"
  on public.daily_quests
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
