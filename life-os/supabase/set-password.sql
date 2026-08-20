-- 비밀번호를 직접 정하기 (메일을 못 받을 때)
--
-- Supabase 대시보드 > SQL Editor 에 붙여 넣고, 아래 두 값을 본인 것으로 바꾼 뒤 Run.
-- 메일 발송 제한에 걸렸거나 링크를 기다리기 싫을 때 쓴다.
--
--   1) 'you@example.com'  → 로그인에 쓰는 메일 주소
--   2) 'change-this-password' → 새 비밀번호 (6자 이상)

update auth.users
set
  encrypted_password = extensions.crypt('change-this-password', extensions.gen_salt('bf')),
  updated_at = now()
where email = 'you@example.com';

-- 결과가 "Success. 1 row" 이면 성공.
-- 0 row 라면 메일 주소가 다르다. 아래로 확인:
--   select email, created_at from auth.users;
--
-- extensions.crypt 에서 오류가 나면 스키마 없이 crypt(...) / gen_salt(...) 로 바꿔 실행한다.
