-- LITTLE LIFE — 클라우드 백업 스키마
--
-- Supabase 대시보드 › SQL Editor 에 그대로 붙여넣고 한 번 실행하면 된다.
-- 여러 번 실행해도 안전하다 (전부 if not exists / drop-create).
--
-- ── 무엇을 저장하는가 ──────────────────────────────────
--
-- 사람 한 명당 줄 하나. 게임 상태 전체를 jsonb 한 덩어리로 넣는다.
-- 퀘스트·도감·발견을 표로 쪼개지 않은 이유는 두 가지다.
--   1. 앱 안에서는 이미 한 덩어리로 다루고, 쪼개면 저장할 때마다
--      수십 번 왕복하게 된다.
--   2. 앱 저장 구조가 바뀔 때마다 서버 스키마까지 같이 고쳐야 한다.
--      jsonb 로 두면 앱의 sanitize 가 예전 판본을 알아서 끌어올린다.
--
-- ── rev 가 있는 이유 ───────────────────────────────────
--
-- 폰과 노트북에서 각각 뭔가를 하면 나중에 올린 쪽이 앞선 걸 덮어쓴다.
-- 그걸 막으려고 판본 번호를 둔다. 올릴 때 "내가 알던 판본이 아직
-- 그대로일 때만" 이라는 조건을 걸어서, 그 사이 다른 기기가 올렸으면
-- 업데이트가 0줄로 끝난다. 앱은 그걸 보고 사용자에게 어느 쪽을
-- 남길지 물어본다 — 조용히 지우지 않는다.

create table if not exists public.little_life_states (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  rev        integer     not null default 1,
  state      jsonb       not null,
  device_id  text,
  updated_at timestamptz not null default now()
);

comment on table  public.little_life_states is 'LITTLE LIFE 게임 상태 백업 (사람당 한 줄)';
comment on column public.little_life_states.rev is '판본 번호. 올릴 때마다 1 씩 오른다. 낙관적 잠금에 쓴다.';
comment on column public.little_life_states.device_id is '마지막으로 올린 기기. 어느 기기가 덮었는지 알려주려고 둔다.';

-- 올릴 때마다 시각을 갱신한다. 앱이 보내주는 값을 믿지 않는다 —
-- 기기 시계가 틀어져 있어도 "마지막 백업" 이 미래로 가버리면 안 된다.
create or replace function public.little_life_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists little_life_touch on public.little_life_states;
create trigger little_life_touch
  before insert or update on public.little_life_states
  for each row execute function public.little_life_touch();

-- ── 남의 기록은 아예 보이지 않는다 ─────────────────────
--
-- RLS 를 켜지 않으면 anon 키만 있으면 남의 줄도 읽힌다.
-- anon 키는 앱 번들 안에 들어가 있으니 반드시 켜야 한다.

alter table public.little_life_states enable row level security;

drop policy if exists "자기 것만 읽기"   on public.little_life_states;
drop policy if exists "자기 것만 넣기"   on public.little_life_states;
drop policy if exists "자기 것만 고치기" on public.little_life_states;
drop policy if exists "자기 것만 지우기" on public.little_life_states;

create policy "자기 것만 읽기"
  on public.little_life_states for select
  using (auth.uid() = user_id);

create policy "자기 것만 넣기"
  on public.little_life_states for insert
  with check (auth.uid() = user_id);

create policy "자기 것만 고치기"
  on public.little_life_states for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "자기 것만 지우기"
  on public.little_life_states for delete
  using (auth.uid() = user_id);
