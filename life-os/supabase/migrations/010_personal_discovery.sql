-- Life OS 2.0 — 나만의 발견 (Personal Discovery, 010)
--
-- 48개 DNA 는 미리 정해 둔 목록이라 def_id 하나로 가리킬 수 있다.
-- 나만의 발견에는 그런 id 가 없다. 조합 자체가 정체다.
-- 그래서 지문(fingerprint)을 열쇠로 쓴다 — 같은 조합이면 언제나 같은 지문이다.
--
-- 지우는 것은 없다. 앞선 migration 을 고치지도 않는다.
-- 실행 순서: … → 007 → 008 → 009 → 이 파일

-- ─────────────────────────────────────────────
-- 1. personal_discoveries — 결론
-- ─────────────────────────────────────────────
create table if not exists public.personal_discoveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- metric + 방향 + 정렬된 조각들 + 규칙 판. 순서가 달라도 같은 지문이다
  fingerprint text not null,

  metric text not null,
  -- 1 = 높게 나타난 쪽, -1 = 낮게 나타난 쪽
  direction smallint not null check (direction in (1, -1)),
  -- [{kind:'tag'|'myTag'|'dayPart', key, label}]
  contexts jsonb not null default '[]'::jsonb,

  state text not null,
  peak_state text,
  novelty numeric,

  -- AI 가 붙인 이름. 없으면 앱이 만든 문장을 쓴다
  generated_title text,
  generated_description text,
  -- 사용자가 고친 이름은 언제나 이긴다
  user_title text,
  naming_status text not null default 'pending'
    check (naming_status in ('pending', 'named', 'fallback', 'skipped')),
  naming_note text,

  -- 사용자가 숨긴 것. 지우지는 않는다
  hidden boolean not null default false,
  user_perception text
    check (user_perception is null
           or user_perception in ('agree', 'somewhat', 'unsure', 'disagree')),

  -- [{label, effect}] — 조각 하나만 봤을 때의 차이
  component_effects jsonb not null default '[]'::jsonb,

  first_found_at timestamptz,
  state_changed_at timestamptz,
  last_evaluated_at timestamptz,

  personal_rule_version smallint not null default 1,
  discovery_rule_version smallint,
  schema_version smallint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, fingerprint)
);

create index if not exists personal_discoveries_user_state_idx
  on public.personal_discoveries (user_id, state);

alter table public.personal_discoveries enable row level security;
drop policy if exists "own personal discoveries only" on public.personal_discoveries;
create policy "own personal discoveries only" on public.personal_discoveries
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists personal_discoveries_set_updated_at on public.personal_discoveries;
create trigger personal_discoveries_set_updated_at
  before update on public.personal_discoveries
  for each row execute function public.set_updated_at();

comment on table public.personal_discoveries is
  '이 사람의 기록에서만 나온 조합. 48개 DNA 와 세는 자리가 다르다';
comment on column public.personal_discoveries.fingerprint is
  '조합의 정체. 같은 조합이면 앱을 다시 켜도 같은 값이라 AI 를 두 번 부르지 않는다';

-- ─────────────────────────────────────────────
-- 2. personal_discovery_evidence — 근거
--
-- discovery_evidence 와 같은 규칙이다. 덮어쓰지 않고 쌓기만 한다.
-- 결론이 바뀌어도 "그때 왜 열렸는가" 는 남아야 한다.
-- ─────────────────────────────────────────────
create table if not exists public.personal_discovery_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  personal_discovery_id uuid references public.personal_discoveries (id) on delete cascade,
  fingerprint text not null,

  child_label text,
  metric text not null,
  state text not null,

  period_from date not null,
  period_to date not null,

  sample_count integer not null default 0,
  comparison_sample_count integer not null default 0,
  distinct_days integer not null default 0,
  duration_days integer not null default 0,

  baseline numeric,
  observed_value numeric,
  effect_size numeric,
  adjusted_observed numeric,
  adjusted_difference numeric,
  adjusted_on text,
  mean_value numeric,
  median_value numeric,
  consistency numeric,

  life_tag_ids text[] not null default '{}',
  weighting text,

  analysis_version smallint,
  taxonomy_version smallint,
  rule_version smallint,
  discovery_rule_version smallint,
  personal_rule_version smallint,
  schema_version smallint not null default 1,
  calculated_at timestamptz not null default now()
);

create index if not exists personal_discovery_evidence_user_idx
  on public.personal_discovery_evidence (user_id, fingerprint, calculated_at);

alter table public.personal_discovery_evidence enable row level security;
drop policy if exists "own personal evidence only" on public.personal_discovery_evidence;
create policy "own personal evidence only" on public.personal_discovery_evidence
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

comment on table public.personal_discovery_evidence is
  '나만의 발견이 열린 순간의 근거. 절대 덮어쓰지 않는다';

-- ─────────────────────────────────────────────
-- 3. personal_naming_usage — 이번 달에 몇 번 불렀나
--
-- AI 호출은 비용이다. 상한이 없으면 언젠가 사고가 난다.
-- 앱 안에도 상한이 있지만, 사용자를 넘나드는 상한은 여기에 있어야 한다.
-- ─────────────────────────────────────────────
create table if not exists public.personal_naming_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- YYYY-MM
  month text not null,
  used integer not null default 0,
  updated_at timestamptz not null default now(),

  primary key (user_id, month)
);

alter table public.personal_naming_usage enable row level security;
drop policy if exists "own naming usage only" on public.personal_naming_usage;
create policy "own naming usage only" on public.personal_naming_usage
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

comment on table public.personal_naming_usage is
  '한 달에 몇 번 이름을 지었는지. 상한에 걸리면 앱이 만든 문장을 쓴다';
