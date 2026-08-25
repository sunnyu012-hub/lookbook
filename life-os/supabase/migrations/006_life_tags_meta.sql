-- Life OS 2.0 — 자동 태깅 흔적 (006)
--
-- life_tags 자체는 004 에서 이미 만들었다. 여기서 더하는 건 "언제, 어느 규칙으로 붙였나" 다.
--
-- 왜 필요한가:
--   태그 사전과 규칙은 앞으로 계속 고쳐진다.
--   그때 이미 저장된 기록을 다시 태깅할지 판단하려면, 그 기록이 몇 판으로 붙었는지 알아야 한다.
--   태그가 하나도 안 붙은 기록은 life_tags 가 비어 있어서 판 번호를 알 길이 없다 —
--   그래서 기록 쪽에 따로 남긴다.
--
-- 기존 행은 전부 null 로 남는다. 지우거나 덮어쓰지 않는다.
-- null 은 "아직 자동 태깅을 돌린 적 없음" 이라는 뜻이고, 그것도 정확한 정보다.
--
-- 실행 순서: … → 004 → 005 → 이 파일

alter table public.quick_logs
  add column if not exists tagged_rule_version smallint,
  add column if not exists tagged_taxonomy_version smallint,
  add column if not exists tagged_at timestamptz;

comment on column public.quick_logs.tagged_rule_version is
  '자동 태깅 규칙 판 번호. null = 아직 안 돌림';
comment on column public.quick_logs.tagged_taxonomy_version is
  'LIFE TAG 사전 판 번호. null = 아직 안 돌림';

-- 다시 태깅할 대상을 찾을 때 쓴다.
-- 화면을 열 때마다 전부 훑지 않고, 판이 낡은 것만 필요할 때 가져온다.
create index if not exists quick_logs_tagged_version_idx
  on public.quick_logs (user_id, tagged_rule_version);
