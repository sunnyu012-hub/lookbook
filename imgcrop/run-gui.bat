@echo off
REM 윈도우에서 더블클릭으로 실행
cd /d "%~dp0"
python -m imgcrop
if errorlevel 1 pause
