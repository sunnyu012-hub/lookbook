-- Life OS — Life Balance / Life Tree / Archive / Weekly Reset 마이그레이션 (003)
--
-- 원칙 (001·002 와 같다)
--   · 데이터를 지우지 않는다. 컬럼 추가 / 테이블 생성만 한다.
--   · 여러 번 실행해도 안전하다.
--   · 모든 테이블에 RLS 를 걸어 auth.uid() = user_id 인 행만 열어 준다.
--
-- 실행 순서: schema.sql → quests.sql → 001 → 002 → 이 파일

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- 1. daily_checkins — CONTEXT NOTE
--
-- "오늘 컨디션에 영향을 준 것 같다고 느끼는 게 있나요?"
-- memo(자유 메모)와 따로 둔다. 이건 Archive 검색과 나중의 텍스트 패턴 분석 대상이다.
-- ─────────────────────────────────────────────
alter table public.daily_checkins
  add column if not exists context_note text;

-- ─────────────────────────────────────────────
-- 2. weekly_resets — 주간 돌아보기
--
-- 한 주에 한 행. week_start(월요일)를 키로 잡아서 여러 번 만들어 XP 를 긁을 수 없게 한다.
-- avg_* 는 저장 시점의 요약이다. 나중에 계산이 바뀌어도 그때 본 숫자가 남는다.
-- ─────────────────────────────────────────────
create table if not exists public.weekly_resets (
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  week_end date not null,

  avg_energy numeric,
  avg_sleep numeric,

  good_text text,
  hard_text text,
  more_text text,

  -- 다음 주에 조금 더 챙기고 싶은 영역 (최대 2개, 앱에서 제한한다)
  focus_domains text[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

create index if not exists weekly_resets_user_idx
  on public.weekly_resets (user_id, week_start desc);

alter table public.weekly_resets enable row level security;
drop policy if exists "own weekly resets only" on public.weekly_resets;
create policy "own weekly resets only" on public.weekly_resets
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists weekly_resets_set_updated_at on public.weekly_resets;
create trigger weekly_resets_set_updated_at
  before update on public.weekly_resets
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- 3. custom_quests — Life Domain
--
-- 사용자가 만든 퀘스트도 영역에 쌓여야 한다.
-- 비워 두면 앱이 category 기본 매핑을 쓴다 (lib/quests/domains.ts).
-- 기본 퀘스트 207개의 매핑은 DB 가 아니라 코드에 둔다 — 마이그레이션 없이 고칠 수 있고,
-- 오프라인에서도 그대로 계산되기 때문이다.
-- ─────────────────────────────────────────────
alter table public.custom_quests
  add column if not exists primary_domain text;
alter table public.custom_quests
  add column if not exists secondary_domain text;

-- ─────────────────────────────────────────────
-- 4. user_life_tree_nodes — 발견한 Node 를 언제 발견했는지
--
-- 상태와 진행도는 기록에서 매번 다시 계산한다 (저장하면 기록과 어긋난다).
-- 여기에는 "언제 처음 열렸는지" 만 남긴다 — Archive 에 남기기 위해서다.
-- ─────────────────────────────────────────────
create table if not exists public.user_life_tree_nodes (
  user_id uuid not null references auth.users (id) on delete cascade,
  node_key text not null,
  discovered_at timestamptz not null default now(),
  primary key (user_id, node_key)
);

alter table public.user_life_tree_nodes enable row level security;
drop policy if exists "own tree nodes only" on public.user_life_tree_nodes;
create policy "own tree nodes only" on public.user_life_tree_nodes
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
