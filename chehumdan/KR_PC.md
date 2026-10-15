# 한국 PC 수집기 설정 (레뷰·강남맛집)

레뷰는 부계정 로그인, 강남맛집은 한국 IP가 있어야 해서 GitHub 서버가 아닌 **집 PC**에서 돈다.
PC를 GitHub의 "self-hosted runner"로 등록해 두면, 하루 두 번(오전 8:40, 오후 6:40) GitHub가 그 PC에 수집을 시킨다.
PC가 꺼져 있으면 그 회차는 건너뛰고, 사이트에는 지난번 데이터가 그대로 보인다.

## 1. 레뷰 부계정 정보 넣기 (한 번)
1. 체험단 활동에 쓰지 않는 레뷰 계정을 하나 만든다(이메일 가입).
2. GitHub 저장소 → **Settings → Secrets and variables → Actions → New repository secret**
   - `REVU_ID` : 부계정 이메일
   - `REVU_PW` : 부계정 비밀번호
3. 비밀번호는 채팅이나 파일에 적지 않는다. Secrets에 넣은 값은 수집할 때만 꺼내 쓰이고 로그에도 가려진다.

## 2. PC를 수집기로 등록 (한 번)
1. GitHub 저장소 → **Settings → Actions → Runners → New self-hosted runner**
2. PC 운영체제(Windows / macOS)를 고르면 화면에 명령어가 나온다. 그대로 따라 한다.
   - Windows: PowerShell을 **관리자 권한**으로 열어서 실행
   - macOS: 터미널에서 실행
3. `./config` 단계에서 묻는 것
   - runner group: 그냥 Enter
   - name: 그냥 Enter
   - **labels: `chehumdan-kr`** ← 꼭 이 이름
   - work folder: 그냥 Enter
4. 항상 켜져 있게(서비스로) 등록
   - Windows: config 중 "run as service?" 에 `Y`
   - macOS: `./svc.sh install` 다음 `./svc.sh start`
5. Runners 목록에 초록 점(Idle)으로 보이면 끝.

PC에는 Git이 설치돼 있어야 한다(Windows는 [Git for Windows](https://git-scm.com/download/win)).
파이썬과 크롬(Playwright)은 수집할 때 자동으로 설치된다.

## 3. 안전 설정 (한 번)
공개 저장소에 self-hosted runner를 달면, 남이 보낸 Pull Request가 내 PC에서 코드를 돌리려 할 수 있다.
- **Settings → Actions → General → Fork pull request workflows from outside collaborators**
  → **Require approval for all outside collaborators** 선택
- 모르는 사람의 Pull Request는 승인하지 않는다.

## 확인
- 등록이 끝나면 대기 중이던 "chehumdan-collect-kr" 작업이 PC에서 바로 돈다(강남맛집 구조 확인).
- 결과는 저장소 **Actions** 탭에서 볼 수 있다.
