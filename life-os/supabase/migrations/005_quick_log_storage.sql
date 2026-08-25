-- Life OS 2.0 — Quick Log 사진 저장소 (005)
--
-- 004 의 quick_logs.photo_path 가 가리킬 실제 파일이 사는 곳.
-- 사진은 개인 데이터라 public 으로 열지 않는다. 읽을 때도 signed URL 을 발급받는다.
--
-- 실행 순서: … → 003 → 004 → 이 파일
-- 기존 migration 을 고치지 않고 새로 추가한다.

-- ─────────────────────────────────────────────
-- 1. Bucket
--
-- public = false 가 핵심이다. 켜 두면 경로만 알면 누구나 열 수 있다.
-- 경로 규칙: {user_id}/{YYYY}/{MM}/{log_id}.jpg
--   맨 앞이 user_id 여야 아래 정책이 폴더 단위로 막을 수 있다.
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quick-log-photos',
  'quick-log-photos',
  false,
  5242880, -- 5MB. 앱에서 이미 줄여서 올리지만 서버에서 한 번 더 막는다
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ─────────────────────────────────────────────
-- 2. Policy
--
-- storage.foldername(name)[1] 이 경로의 첫 폴더 = user_id 다.
-- 자기 폴더 안에서만 읽고 쓰고 지울 수 있다. 남의 사진은 목록에도 안 뜬다.
-- ─────────────────────────────────────────────
drop policy if exists "own quick log photos: read" on storage.objects;
create policy "own quick log photos: read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'quick-log-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "own quick log photos: insert" on storage.objects;
create policy "own quick log photos: insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'quick-log-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "own quick log photos: update" on storage.objects;
create policy "own quick log photos: update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'quick-log-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'quick-log-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "own quick log photos: delete" on storage.objects;
create policy "own quick log photos: delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'quick-log-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
