# 체험단 다모아 — 레뷰 로그인 도우미 (사무실 PC에서 한 번 실행)
# PowerShell(관리자 아님)에 아래 한 줄을 붙여넣으면 된다:
#   irm https://raw.githubusercontent.com/sunnyu012-hub/lookbook/claude/clever-dijkstra-0mvpvv/chehumdan/tools/revu-login.ps1 | iex
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:PYTHONUTF8 = "1"
$branch = if ($env:CHEHUMDAN_BRANCH) { $env:CHEHUMDAN_BRANCH } else { "claude/clever-dijkstra-0mvpvv" }
$dir = "C:\chehumdan"

Write-Host "1/4 폴더 준비 ($dir)"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
# 수집기(서비스 계정 NETWORK SERVICE)가 로그인 상태 파일을 읽고 갱신할 수 있게 권한을 준다
icacls $dir /grant "*S-1-5-20:(OI)(CI)M" | Out-Null

Write-Host "2/4 Playwright 설치 (처음 한 번은 몇 분 걸려요)"
python -m pip install -q --upgrade playwright
python -m playwright install chromium

Write-Host "3/4 도우미 내려받기"
$py = Join-Path $dir "revu_login.py"
Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/sunnyu012-hub/lookbook/$branch/chehumdan/collect/revu_login.py" -OutFile $py

Write-Host "4/4 크롬 창에서 레뷰에 로그인해 주세요"
python $py
icacls $dir /grant "*S-1-5-20:(OI)(CI)M" /T | Out-Null
