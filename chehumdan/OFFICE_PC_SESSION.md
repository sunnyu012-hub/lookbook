# 사무실 PC 세션 인수인계 — 수집기(self-hosted runner) 설치

사무실 PC(Windows, 24시간 켜 둠)에서 Claude를 직접 실행해, 그 PC를 GitHub 수집기로 등록한다.
클라우드 세션은 사무실 PC에 접속할 수 없어서 이 작업만 따로 한다.

## 사용자가 먼저 할 것
1. 사무실 PC에 **Claude Code**를 설치한다. 둘 중 편한 쪽:
   - Claude 데스크톱 앱(Windows) — https://claude.ai/download → 앱의 **Code** 탭에서 로컬 세션
   - 또는 터미널용 Claude Code — https://code.claude.com/docs 의 Windows 설치 안내
2. **관리자 권한**으로 연다. 프로그램 설치와 Windows 서비스 등록에 관리자 권한이 필요하다.
   - 터미널용: 시작 메뉴 → PowerShell → 마우스 오른쪽 → **관리자 권한으로 실행** → `claude`
   - 데스크톱 앱: 앱 아이콘 → 마우스 오른쪽 → 관리자 권한으로 실행
   (관리자로 못 열면, 마지막 등록 명령만 사용자가 관리자 PowerShell에 붙여넣으면 된다)
3. 폴더는 아무 데나 괜찮다(예: `C:\chehumdan`). 저장소를 내려받을 필요는 없다.
4. 아래 **새 세션에 붙여넣을 지시문**을 그대로 붙여넣는다.
5. 중간에 Claude가 **등록 토큰**을 달라고 하면:
   https://github.com/sunnyu012-hub/lookbook/settings/actions/runners/new?arch=x64&os=win
   화면의 `./config.cmd --url … --token AAAA…` 에서 `--token` 뒤의 값만 복사해 준다(1시간 유효).

## 새 세션에 붙여넣을 지시문

```
이 Windows PC를 GitHub Actions self-hosted runner로 설정해줘. 명령은 하나씩 내 승인을 받아서 실행해.

배경
- 프로젝트: "체험단 다모아" (저장소 sunnyu012-hub/lookbook, 브랜치 claude/clever-dijkstra-0mvpvv, 폴더 chehumdan/)
- 이 PC는 24시간 켜 두는 사무실 PC. 한국 IP가 필요한 수집(레뷰 부계정 로그인, 강남맛집)을 하루 두 번 여기서 돌린다.
- 워크플로 .github/workflows/chehumdan-collect-kr.yml 이 이 러너에서 돈다:
  runs-on [self-hosted, chehumdan-kr], shell: powershell, `python` 명령을 바로 부르고,
  actions/checkout 이 git 으로 받아 와서 결과를 git push 한다.
  매번 `python -m pip install playwright` 와 `python -m playwright install chromium` 을 한다.

할 일
1. 현재 PowerShell이 관리자 권한인지 확인. 아니면 나에게 알려줘(마지막 등록 단계만 내가 관리자 창에서 해도 됨).
2. Git for Windows 가 없으면 설치: winget install --id Git.Git -e --silent --scope machine
   (winget 이 없으면 git-for-windows GitHub 릴리스의 64-bit 설치 파일을 /VERYSILENT /NORESTART 로)
3. Python 3.10 이상이 '모든 사용자'용으로 PATH 에 없으면 Python 3.12 설치:
   python.org 의 python-3.12.x-amd64.exe 를 /quiet InstallAllUsers=1 PrependPath=1 Include_test=0 로.
   러너가 Windows 서비스(NETWORK SERVICE 계정)로 돌기 때문에 반드시 모든 사용자 + 시스템 PATH 여야 한다.
   설치 뒤 새 PATH 를 반영하고 `git --version`, `python --version` 확인.
4. actions/runner 최신 릴리스의 actions-runner-win-x64-*.zip 을 C:\actions-runner 에 내려받아 압축 해제.
5. 나에게 등록 토큰을 달라고 해. (https://github.com/sunnyu012-hub/lookbook/settings/actions/runners/new?arch=x64&os=win 의 --token 값)
6. C:\actions-runner 에서 등록 + 서비스 실행:
   .\config.cmd --unattended --url https://github.com/sunnyu012-hub/lookbook --token <토큰> --labels chehumdan-kr --name "$env:COMPUTERNAME-chehumdan" --runasservice --replace
7. 서비스(actions.runner.*)가 Running 인지 확인하고, GitHub Runners 화면에 초록 점(Idle)이 보이는지 나에게 확인해 달라고 해.
8. 서비스 계정(NETWORK SERVICE)으로도 python 이 잡히는지 확인: C:\actions-runner\.path 파일에 Python·Git 경로가 들어 있는지 본다.
   빠져 있으면 PATH 를 고친 뒤 서비스 재시작.

하지 말 것
- 레뷰 아이디/비밀번호를 묻거나 파일에 쓰지 마. (내가 GitHub Settings → Secrets 에 REVU_ID, REVU_PW 로 직접 넣는다)
- 저장소 코드를 고치거나 push 하지 마. 이 세션은 PC 설정만 한다.

끝나면 한 줄로 요약해줘: Git·Python 버전, 러너 이름, 서비스 상태.
```

## 끝난 뒤 (사용자)
- GitHub → Settings → Secrets and variables → Actions 에 `REVU_ID`, `REVU_PW` (레뷰 이메일 부계정)
- GitHub → Settings → Actions → General → Fork pull request workflows from outside collaborators
  → **Require approval for all outside collaborators**
- 원래 클라우드 세션에 "러너 등록 끝"이라고 알려 준다 → 강남맛집 구조 확인과 레뷰 첫 수집을 거기서 돌린다.
