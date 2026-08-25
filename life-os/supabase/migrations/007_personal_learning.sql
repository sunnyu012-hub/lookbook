-- Life OS 2.0 — 개인 학습 (007)
--
-- Phase 1 에서 user_tag_rules 를 그릇만 만들어 뒀다. Phase 4 에서 그 그릇을 실제로 쓴다.
-- 004 를 고치지 않고 여기서 컬럼을 더한다. 기존 행은 그대로 살아 있고,
-- 새 컬럼은 기존 값에서 채워 넣는다 (아래 update 참고 — 지우는 게 아니라 옮기는 것이다).
--
-- 실행 순서: … → 004 → 005 → 006 → 이 파일

-- ─────────────────────────────────────────────
-- 1. user_tag_rules 확장
-- ─────────────────────────────────────────────
alter table public.user_tag_rules
  add column if not exists rule_type text not null default 'positive',
  add column if not exists status text not null default 'candidate',
  add column if not exists normalized_trigger text,
  add column if not exists suppressed_tag_id text,
  add column if not exists positive_count integer not null default 0,
  add column if not exists negative_count integer not null default 0,
  add column if not exists distinct_days integer not null default 1,
  add column if not exists conflict_count integer not null default 0,
  add column if not exists specificity smallint not null default 1,
  add column if not exists user_defined boolean not null default false,
  add column if not exists last_matched_at timestamptz,
  add column if not exists last_corrected_at timestamptz,
  add column if not exists taxonomy_version smallint,
  add column if not exists rule_version smallint;

-- resulting_tag_id 는 004 에서 not null 이었다.
-- 막는 규칙(suppress)에는 붙일 태그가 없으므로 비울 수 있어야 한다.
alter table public.user_tag_rules
  alter column resulting_tag_id drop not null;

-- 기존 행이 있다면 새 컬럼을 채운다. 값을 지우지 않는다
update public.user_tag_rules
   set normalized_trigger = coalesce(normalized_trigger, lower(trigger)),
       status = case when enabled then 'active' else 'paused' end,
       positive_count = coalesce(nullif(positive_count, 0), correction_count)
 where normalized_trigger is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_tag_rules_type_check'
  ) then
    alter table public.user_tag_rules
      add constraint user_tag_rules_type_check
      check (rule_type in ('positive', 'suppress', 'alias'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'user_tag_rules_status_check'
  ) then
    alter table public.user_tag_rules
      add constraint user_tag_rules_status_check
      check (status in ('candidate', 'active', 'paused', 'deprecated'));
  end if;
end $$;

-- 새 로그를 태깅할 때마다 "이 사람의 살아 있는 규칙" 을 찾는다
create index if not exists user_tag_rules_active_idx
  on public.user_tag_rules (user_id, status, normalized_trigger);

comment on column public.user_tag_rules.rule_type is
  'positive=붙인다 / suppress=막는다 / alias=표현 매핑';
comment on column public.user_tag_rules.status is
  'candidate=근거 부족 / active=적용 중 / paused=충돌로 멈춤 / deprecated=물러남';
comment on column public.user_tag_rules.user_defined is
  '사용자가 직접 만들었거나 직접 승격시킨 규칙. 시스템이 함부로 끄지 않는다';

-- ─────────────────────────────────────────────
-- 2. tag_corrections — 규칙이 왜 생겼는지 남긴다
--
-- 규칙만 저장하고 근거를 버리면, 잘못 배운 규칙을 나중에 추적할 수 없다.
-- 사용자가 Inspector 에서 누른 순간을 그대로 남긴다.
-- ─────────────────────────────────────────────
create table if not exists public.tag_corrections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  quick_log_id uuid references public.quick_logs (id) on delete cascade,

  -- verified=맞아요 / rejected=이 태그 제외 / added=직접 넣음
  kind text not null check (kind in ('verified', 'rejected', 'added')),
  tag_id text not null,

  text text,
  normalized_text text not null,
  matched_text text,
  source_rule_id text,

  -- {myTagIds, myTagNames, lifeTagIds, dayPart, dayOfWeek, temporalContext}
  context jsonb not null default '{}'::jsonb,

  date date not null,
  schema_version smallint not null default 1,
  created_at timestamptz not null default now()
);

-- 같은 말을 몇 번 고쳤는지 세는 게 이 테이블의 주된 일이다
create index if not exists tag_corrections_user_tag_idx
  on public.tag_corrections (user_id, tag_id, date desc);
create index if not exists tag_corrections_text_idx
  on public.tag_corrections (user_id, normalized_text);

alter table public.tag_corrections enable row level security;
drop policy if exists "own corrections only" on public.tag_corrections;
create policy "own corrections only" on public.tag_corrections
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 3. exact_tag_memories — 똑같은 문장 기억
--
-- 한 번의 수정도 버리지 않기 위한 자리.
-- 다듬은 본문이 글자 하나까지 같을 때만 꺼낸다.
-- ─────────────────────────────────────────────
create table if not exists public.exact_tag_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  normalized_text text not null,
  add_tag_ids text[] not null default '{}',
  suppress_tag_ids text[] not null default '{}',

  use_count integer not null default 0,
  last_used_at timestamptz,

  schema_version smallint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, normalized_text)
);

alter table public.exact_tag_memories enable row level security;
drop policy if exists "own memories only" on public.exact_tag_memories;
create policy "own memories only" on public.exact_tag_memories
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists exact_tag_memories_set_updated_at on public.exact_tag_memories;
create trigger exact_tag_memories_set_updated_at
  before update on public.exact_tag_memories
  for each row execute function public.set_updated_at();
