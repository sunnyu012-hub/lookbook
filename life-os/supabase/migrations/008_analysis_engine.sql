-- Life OS 2.0 — 분석 캐시 (008)
--
-- analysis_snapshots 는 004 에서 그릇만 만들어 뒀다. Phase 5 에서 실제로 쓴다.
-- 004 를 고치지 않고 여기서 컬럼을 더한다. 지우는 것은 없다.
--
-- 실행 순서: … → 005 → 006 → 007 → 이 파일

alter table public.analysis_snapshots
  -- 무슨 분석인가 (rhythm / context / sleep …)
  add column if not exists kind text,
  -- 같은 분석을 다시 찾을 때 쓰는 열쇠. 판 번호가 전부 들어 있다
  add column if not exists cache_key text,
  -- 태그 id 처럼 분석 대상을 좁히는 값
  add column if not exists scope text,
  -- 결과 전체. 화면이 그대로 읽는다
  add column if not exists result jsonb,
  add column if not exists distinct_days integer not null default 0,
  add column if not exists taxonomy_version smallint,
  add column if not exists rule_version smallint,
  -- 기록이 바뀌어서 다시 계산해야 하는가
  add column if not exists stale boolean not null default false;

-- 같은 열쇠는 하나만 둔다. 계산할 때마다 행이 쌓이면 캐시가 아니라 쓰레기가 된다
create unique index if not exists analysis_snapshots_cache_key_idx
  on public.analysis_snapshots (user_id, cache_key)
  where cache_key is not null;

-- 기록이 바뀌었을 때 "그 날짜를 품은 것" 만 골라 버리려고
create index if not exists analysis_snapshots_period_idx
  on public.analysis_snapshots (user_id, period_from, period_to);

comment on column public.analysis_snapshots.cache_key is
  'analysis/taxonomy/rule 판 번호 + 분석 종류 + 기간. 판이 바뀌면 열쇠도 바뀐다';
comment on column public.analysis_snapshots.stale is
  '기록이 바뀌어서 다시 계산해야 하는 상태. 지우지 않고 표시만 한다';
