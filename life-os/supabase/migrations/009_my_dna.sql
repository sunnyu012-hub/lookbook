-- Life OS 2.0 — MY DNA (009)
--
-- 004 에서 discoveries / discovery_evidence / dna_shifts 를 그릇만 만들어 뒀다.
-- Phase 6 에서 실제로 쓰면서 모자란 칸을 더한다. 지우는 것은 없다.
--
-- 실행 순서: … → 006 → 007 → 008 → 이 파일

-- ─────────────────────────────────────────────
-- 1. discoveries — 결론
-- ─────────────────────────────────────────────
alter table public.discoveries
  -- 지금까지 올라간 가장 높은 단계. 약해져도 여기는 안 내려간다
  add column if not exists peak_state text,
  -- 사용자가 이 발견을 어떻게 느끼는가. 통계를 바꾸지 않는다
  add column if not exists user_perception text,
  add column if not exists state_changed_at timestamptz,
  add column if not exists last_evaluated_at timestamptz,
  -- 여러 자식을 담는 DNA 의 자식 이름들 (Joy Trigger 등)
  add column if not exists children text[] not null default '{}',
  add column if not exists discovery_rule_version smallint;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'discoveries_perception_check') then
    alter table public.discoveries
      add constraint discoveries_perception_check
      check (user_perception is null
             or user_perception in ('agree', 'somewhat', 'unsure', 'disagree'));
  end if;
end $$;

comment on column public.discoveries.peak_state is
  '지금까지 도달한 가장 높은 단계. CHANGING 이 돼도 이 값은 남는다';
comment on column public.discoveries.user_perception is
  '사용자의 자기 인식. "아닌 것 같아요" 를 눌러도 통계는 지우지 않는다';

-- ─────────────────────────────────────────────
-- 2. discovery_evidence — 근거
--
-- 이 표는 덮어쓰지 않는다. 단계가 바뀔 때마다 행이 쌓인다.
-- Analysis Snapshot 은 캐시라 다시 계산하면 그만이지만, 이건 역사다.
-- ─────────────────────────────────────────────
alter table public.discovery_evidence
  add column if not exists def_id text,
  add column if not exists child_label text,
  add column if not exists metric text,
  add column if not exists state text,
  add column if not exists distinct_days integer not null default 0,
  add column if not exists duration_days integer not null default 0,
  add column if not exists adjusted_observed numeric,
  add column if not exists adjusted_difference numeric,
  add column if not exists adjusted_on text,
  add column if not exists mean_value numeric,
  add column if not exists median_value numeric,
  add column if not exists weighting text,
  add column if not exists taxonomy_version smallint,
  add column if not exists rule_version smallint,
  add column if not exists discovery_rule_version smallint;

comment on table public.discovery_evidence is
  '발견 당시의 근거. 결론이 바뀌어도 남는다. 절대 덮어쓰지 않는다';

-- ─────────────────────────────────────────────
-- 3. dna_shifts — 무엇이 무엇으로 바뀌었나
--
-- 004 의 dna_shifts 는 한 Discovery 안의 단계 변화를 담는 모양이다.
-- Phase 6 에서는 "저녁형 → 낮형" 처럼 서로 다른 두 DNA 사이의 이동도 남긴다.
-- 기존 컬럼은 그대로 두고 칸만 더한다.
-- ─────────────────────────────────────────────
alter table public.dna_shifts
  add column if not exists from_def_id text,
  add column if not exists to_def_id text,
  add column if not exists previous_period daterange,
  add column if not exists recent_period daterange,
  add column if not exists previous_effect numeric,
  add column if not exists recent_effect numeric;

-- from_state / to_state 는 004 에서 not null 이었다.
-- DNA 사이의 이동에는 단계가 없으므로 비울 수 있어야 한다
alter table public.dna_shifts
  alter column from_state drop not null,
  alter column to_state drop not null;

comment on column public.dna_shifts.from_def_id is
  '무엇에서 무엇으로 바뀌었나. 같은 DNA 안의 단계 변화면 둘 다 null';
