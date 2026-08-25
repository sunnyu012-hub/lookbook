-- Life OS 2.0 — Phase 1 기반 (004)
--
-- 원칙 (001~003 과 같다)
--   · 데이터를 지우지 않는다. 테이블 생성 / 컬럼 추가만 한다.
--   · 여러 번 실행해도 안전하다.
--   · 모든 테이블에 RLS 를 걸어 auth.uid() = user_id 인 행만 열어 준다.
--
-- 이 파일은 Phase 2~7 이 쓸 그릇만 만든다. 여기서 채우는 데이터는 없다.
--
-- 실행 순서: schema.sql → quests.sql → 001 → 002 → 003 → 이 파일

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- 0. Quest 는 legacy 로 남긴다
--
-- Life OS 2.0 에서 Quest UI 는 사라지지만 daily_quests · custom_quests 는
-- 지우지 않는다. 이유:
--   · 이미 쌓인 완료 기록이 Life Balance · Life Tree · XP 의 과거 값을 만든다.
--     지우면 사용자가 보던 숫자가 소급해서 줄어든다. 그건 손실로 느껴진다.
--   · 나중에 Archive 나 분석에 다시 쓸 수 있는 행동 기록이다.
-- 앱은 이 테이블을 읽기만 하고 더 쓰지 않는다.
-- ─────────────────────────────────────────────
comment on table public.daily_quests is
  'LEGACY (Life OS 1.x). 읽기 전용으로 보존한다. 새 기록은 쓰지 않는다.';
comment on table public.custom_quests is
  'LEGACY (Life OS 1.x). 읽기 전용으로 보존한다. 새 기록은 쓰지 않는다.';

-- ─────────────────────────────────────────────
-- 1. quick_logs — 하루 중 여러 번 남기는 순간 기록
--
-- daily_checkins 와 합치지 않는다.
--   daily_checkins  하루 한 행. 구조화된 컨디션.
--   quick_logs      하루 여러 행. 순간의 기분.
-- 나중에 함께 분석하지만 저장은 끝까지 따로 둔다.
--
-- mood 를 제외한 모든 값이 nullable 이다 — 최소 입력이 이모지 하나이기 때문이다.
-- ─────────────────────────────────────────────
create table if not exists public.quick_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  mood smallint not null check (mood between 1 and 5),

  text text,
  energy smallint check (energy between 1 and 5),
  focus smallint check (focus between 1 and 5),
  fatigue smallint check (fatigue between 1 and 5),
  photo_path text,

  my_tag_ids uuid[] not null default '{}',
  -- 붙은 LIFE TAG 들. [{tagId, source, confidence, userVerified, ...}]
  life_tags jsonb not null default '[]'::jsonb,

  -- 기준 시각. 사용자가 나중에 고칠 수 있다
  logged_at timestamptz not null default now(),
  -- logged_at 에서 뽑은 값들. 매번 다시 계산하지 않으려고 같이 저장한다
  date date not null,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  day_part text not null check (day_part in ('dawn', 'morning', 'afternoon', 'evening', 'night')),

  schema_version smallint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 분석은 거의 항상 "이 사람의, 이 기간" 이다
create index if not exists quick_logs_user_logged_idx
  on public.quick_logs (user_id, logged_at desc);
create index if not exists quick_logs_user_date_idx
  on public.quick_logs (user_id, date desc);
-- 시간대·요일별 집계용
create index if not exists quick_logs_user_daypart_idx
  on public.quick_logs (user_id, day_part);
-- 태그로 거를 때
create index if not exists quick_logs_my_tags_idx
  on public.quick_logs using gin (my_tag_ids);
create index if not exists quick_logs_life_tags_idx
  on public.quick_logs using gin (life_tags);

alter table public.quick_logs enable row level security;
drop policy if exists "own quick logs only" on public.quick_logs;
create policy "own quick logs only" on public.quick_logs
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists quick_logs_set_updated_at on public.quick_logs;
create trigger quick_logs_set_updated_at
  before update on public.quick_logs
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- 2. my_tags — 사용자가 직접 만들고 보는 태그
--
-- merged_into_id: 태그를 합쳐도 과거 기록의 태그 id 는 바꾸지 않는다.
-- 대신 "이건 저기로 합쳐졌다" 만 남겨서 읽을 때 따라간다. 기록을 고쳐 쓰지 않기 위해서다.
-- ─────────────────────────────────────────────
create table if not exists public.my_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  name text not null,
  color text,
  emoji text,
  is_favorite boolean not null default false,

  use_count integer not null default 0,
  last_used_at timestamptz,

  merged_into_id uuid references public.my_tags (id) on delete set null,
  archived_at timestamptz,

  schema_version smallint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 같은 이름을 두 번 만들지 않게 (합쳐진 것과 보관한 것은 제외)
create unique index if not exists my_tags_user_name_idx
  on public.my_tags (user_id, lower(name))
  where merged_into_id is null and archived_at is null;

create index if not exists my_tags_user_used_idx
  on public.my_tags (user_id, use_count desc, last_used_at desc);

alter table public.my_tags enable row level security;
drop policy if exists "own my tags only" on public.my_tags;
create policy "own my tags only" on public.my_tags
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists my_tags_set_updated_at on public.my_tags;
create trigger my_tags_set_updated_at
  before update on public.my_tags
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- 3. user_tag_rules — 사용자 교정에서 배운 개인 규칙
--
-- Phase 4 에서 채운다. 여기서는 그릇만.
-- 사용자 교정은 언제나 시스템·AI 추론보다 우선한다.
-- ─────────────────────────────────────────────
create table if not exists public.user_tag_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- 무엇을 봤을 때 (보통 본문에 나온 말)
  trigger text not null,
  -- 어떤 맥락에서만 (my_tag_ids / life_tag_ids / day_part / day_of_week)
  context jsonb not null default '{}'::jsonb,
  -- 그래서 무슨 태그를 붙일 것인가
  resulting_tag_id text not null,

  correction_count integer not null default 1,
  confidence numeric not null default 0.5 check (confidence between 0 and 1),
  last_used_at timestamptz,
  enabled boolean not null default true,

  schema_version smallint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_tag_rules_lookup_idx
  on public.user_tag_rules (user_id, enabled, trigger);

alter table public.user_tag_rules enable row level security;
drop policy if exists "own tag rules only" on public.user_tag_rules;
create policy "own tag rules only" on public.user_tag_rules
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists user_tag_rules_set_updated_at on public.user_tag_rules;
create trigger user_tag_rules_set_updated_at
  before update on public.user_tag_rules
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- 4. analysis_snapshots — 통계 결과 캐시
--
-- 기록이 수천 개가 되면 매번 전부 다시 계산할 수 없다.
-- analysis_version 을 같이 저장해서, 계산 방식이 바뀌었을 때만 다시 돌린다.
-- ─────────────────────────────────────────────
create table if not exists public.analysis_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  metric text not null,
  comparison text,

  period_from date not null,
  period_to date not null,
  sample_count integer not null default 0,
  comparison_sample_count integer,

  baseline numeric,
  observed_value numeric,
  effect_size numeric,
  confidence numeric check (confidence between 0 and 1),

  analysis_version smallint not null default 1,
  schema_version smallint not null default 1,
  calculated_at timestamptz not null default now()
);

create index if not exists analysis_snapshots_lookup_idx
  on public.analysis_snapshots (user_id, metric, calculated_at desc);

alter table public.analysis_snapshots enable row level security;
drop policy if exists "own snapshots only" on public.analysis_snapshots;
create policy "own snapshots only" on public.analysis_snapshots
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 5. discoveries — MY DNA
--
-- def_id 가 null 이면 사전에 없던 개인 특이 패턴(PERSONAL)이다.
-- ─────────────────────────────────────────────
create table if not exists public.discoveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  def_id text,
  kind text not null check (kind in ('BASIC', 'HIDDEN', 'RARE', 'COMPOUND', 'PERSONAL')),
  family text not null,

  display_name text not null,
  description text,

  state text not null default 'LOCKED'
    check (state in ('LOCKED', 'EMERGING', 'GROWING', 'ESTABLISHED', 'CHANGING')),

  first_found_at timestamptz,
  last_checked_at timestamptz,

  schema_version smallint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 사전에 있는 Discovery 는 사람당 하나만
create unique index if not exists discoveries_user_def_idx
  on public.discoveries (user_id, def_id)
  where def_id is not null;

create index if not exists discoveries_user_state_idx
  on public.discoveries (user_id, state);

alter table public.discoveries enable row level security;
drop policy if exists "own discoveries only" on public.discoveries;
create policy "own discoveries only" on public.discoveries
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists discoveries_set_updated_at on public.discoveries;
create trigger discoveries_set_updated_at
  before update on public.discoveries
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- 6. discovery_evidence — "왜 이렇게 분석했어요?"
--
-- Discovery 와 분리해서 저장한다. Discovery 는 결론이고 이건 근거다.
-- 결론이 바뀌어도 그때의 근거는 남아 있어야 한다. 그래서 덮어쓰지 않고 쌓는다.
-- ─────────────────────────────────────────────
create table if not exists public.discovery_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  discovery_id uuid not null references public.discoveries (id) on delete cascade,

  period_from date not null,
  period_to date not null,
  sample_count integer not null default 0,
  comparison_sample_count integer,

  baseline numeric,
  observed_value numeric,
  effect_size numeric,
  consistency numeric,

  life_tag_ids text[] not null default '{}',
  -- [{factor, explains, note}] — 교란 요인을 확인했다는 사실 자체가 근거다
  confounders jsonb not null default '[]'::jsonb,

  confidence numeric check (confidence between 0 and 1),
  analysis_version smallint not null default 1,
  schema_version smallint not null default 1,
  calculated_at timestamptz not null default now()
);

create index if not exists discovery_evidence_lookup_idx
  on public.discovery_evidence (user_id, discovery_id, calculated_at desc);

alter table public.discovery_evidence enable row level security;
drop policy if exists "own evidence only" on public.discovery_evidence;
create policy "own evidence only" on public.discovery_evidence
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 7. dna_shifts — 패턴이 바뀐 순간
--
-- Discovery 를 덮어쓰지 않고 따로 남긴다. 변화 자체가 기록이기 때문이다.
-- "예전엔 아침형이었는데 요즘은 저녁에 더 좋네요" 같은 것.
-- ─────────────────────────────────────────────
create table if not exists public.dna_shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  discovery_id uuid not null references public.discoveries (id) on delete cascade,

  from_state text not null,
  to_state text not null,
  summary text not null,

  observed_at timestamptz not null default now(),
  schema_version smallint not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists dna_shifts_user_idx
  on public.dna_shifts (user_id, observed_at desc);

alter table public.dna_shifts enable row level security;
drop policy if exists "own dna shifts only" on public.dna_shifts;
create policy "own dna shifts only" on public.dna_shifts
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
