# 사무실 PC 수집기 설정 (Windows · 레뷰·강남맛집)

레뷰는 부계정 로그인, 강남맛집은 한국 IP가 있어야 해서 GitHub 서버가 아닌 **사무실 PC(24시간 켜 둠)**에서 돈다.
PC를 GitHub의 "self-hosted runner"로 등록하면, 하루 두 번(오전 8:40, 오후 6:40) GitHub가 그 PC에 수집을 시킨다.
PC 쪽에서 열어 둘 포트는 없다. PC가 GitHub에 먼저 접속해서 일을 받아 가는 방식이다.

준비에 15분 정도 걸린다. 1~4는 한 번만 하면 된다.

## 1. 프로그램 두 개 설치
1. **Git for Windows** — https://git-scm.com/download/win
   설치 화면은 전부 기본값으로 `Next`.
2. **Python 3.12** — https://www.python.org/downloads/windows/ 에서 "Windows installer (64-bit)"
   - 첫 화면 아래 **`Add python.exe to PATH`** 체크
   - **`Customize installation`** → 다음 화면에서 **`Install Python 3.12 for all users`** 체크 → Install
   - (수집기가 Windows 서비스로 돌아서, '모든 사용자'로 설치해야 찾을 수 있다)

## 2. 레뷰 부계정 정보 넣기
1. 체험단 활동에 쓰지 않는 레뷰 계정을 하나 만든다(이메일 가입).
2. GitHub 저장소 → **Settings → Secrets and variables → Actions → New repository secret**
   - Name `REVU_ID`, Secret: 부계정 이메일 → Add secret
   - Name `REVU_PW`, Secret: 부계정 비밀번호 → Add secret
3. 비밀번호는 채팅이나 파일에 적지 않는다. Secrets 값은 수집할 때만 꺼내 쓰이고 기록에는 가려진다.

## 3. 사무실 PC를 수집기로 등록
1. GitHub 저장소 → **Settings → Actions → Runners → New self-hosted runner**
2. Runner image: **Windows**, Architecture: **x64** 선택. 아래에 명령어가 나온다.
3. 시작 메뉴에서 **PowerShell을 마우스 오른쪽 → 관리자 권한으로 실행**
4. 화면의 **Download** 칸 명령을 위에서부터 한 줄씩 붙여넣는다.
   - 첫 줄 `mkdir actions-runner; cd actions-runner` 대신 `mkdir C:\actions-runner; cd C:\actions-runner` 를 쓴다(짧은 경로가 안전).
5. **Configure** 칸의 `./config.cmd --url … --token …` 을 붙여넣는다. 질문이 나오면:
   | 질문 | 입력 |
   |---|---|
   | Enter the name of the runner group | 그냥 Enter |
   | Enter the name of runner | 그냥 Enter |
   | Enter any additional labels | **`chehumdan-kr`** ← 꼭 이 이름 |
   | Enter name of work folder | 그냥 Enter |
   | Would you like to run the runner as service? | **`Y`** |
   | User account to use for the service | 그냥 Enter |
6. 화면의 `./run.cmd` 는 실행하지 않는다(서비스로 이미 돌고 있다).
7. GitHub의 Runners 목록에 초록 점과 **Idle** 이 보이면 끝.

## 4. 안전 설정
공개 저장소에 수집기를 달면, 남이 보낸 Pull Request가 사무실 PC에서 코드를 돌리려 할 수 있다.
- **Settings → Actions → General → Fork pull request workflows from outside collaborators**
  → **Require approval for all outside collaborators** → Save
- 모르는 사람의 Pull Request는 승인하지 않는다.

## 확인
- 등록이 끝나면 대기 중이던 "chehumdan-collect-kr" 작업이 PC에서 바로 돈다(강남맛집 구조 확인).
- 저장소 **Actions** 탭에서 진행 상황을 볼 수 있다.

## 알아 둘 것
- 회사 네트워크가 외부 사이트를 막거나 프록시를 쓰면 수집이 실패할 수 있다. 그때는 Actions 기록에 오류가 남는다.
- PC를 재부팅해도 서비스라 자동으로 다시 켜진다.
- 수집기를 없애려면: Settings → Actions → Runners 에서 Remove, PC에서는 `C:\actions-runner` 에서 `./config.cmd remove`.
