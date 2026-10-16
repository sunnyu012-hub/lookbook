"""사무실 PC(Windows self-hosted runner) 수집 작업 — chehumdan-collect-kr 워크플로가 부른다.

PC의 PowerShell 실행 정책(Restricted)과 상관없이 돌도록 단계 로직을 파이썬으로 둔다(워크플로는 shell: cmd).
1) 할 일 정하기  2) 지난 데이터 받기·playwright 준비  3) 수집(run.py) 또는 구조 확인(probe2.py)
4) 결과를 chehumdan-data 브랜치에 올리기(data_sync.py — main 에는 커밋하지 않는다)
환경 변수: EVENT(github.event_name), IN_TASK, IN_SITES
"""
from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path

import data_sync

ROOT = Path(__file__).resolve().parents[2]
CH = ROOT / "chehumdan"
PY = sys.executable


def sh(*args, cwd=ROOT) -> int:
    print("+", " ".join(map(str, args)), flush=True)
    return subprocess.run(list(map(str, args)), cwd=cwd).returncode


def decide() -> tuple[str, list[str]]:
    task = os.environ.get("IN_TASK") or "collect"
    sites = os.environ.get("IN_SITES") or "revu gangnam remin fourblog cloudreview"
    if os.environ.get("EVENT") == "push":
        lines = (CH / "scripts" / "kr-task.txt").read_text(encoding="utf-8-sig").splitlines()
        task = lines[0].strip()
        if len(lines) > 1 and lines[1].strip():
            sites = lines[1].strip()
    if task not in ("collect", "probe"):
        raise SystemExit(f"모르는 작업: {task}")
    return task, re.sub(r"[^a-z ]", "", sites).split()


def prepare() -> None:
    sh(PY, "--version")
    if sh(PY, "-m", "pip", "install", "-q", "--upgrade", "pip", "playwright") \
            or sh(PY, "-m", "playwright", "install", "chromium"):
        raise SystemExit("준비 실패")


def probe() -> int:
    out = CH / "_probe2"
    if out.exists():
        for p in out.iterdir():
            p.unlink()
    rc = sh(PY, CH / "scripts" / "probe2.py", CH / "scripts" / "probe-kr-urls.txt")
    summary = out / "_summary.txt"
    if summary.exists():
        print(summary.read_text(encoding="utf-8", errors="replace"))
    return rc


def collect(sites: list[str]) -> int:
    """run.py 를 돌리고, 출력을 _debug/kr_job.log 에도 남긴다(Actions 기록을 못 볼 때 확인용, 계정 정보는 가림)."""
    print("+ run.py", *sites, flush=True)
    p = subprocess.run([PY, "run.py", *sites], cwd=CH / "collect", capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    log = p.stdout + p.stderr
    print(log, flush=True)
    for secret in (os.environ.get("REVU_PW"), os.environ.get("REVU_ID")):
        if secret:
            log = log.replace(secret, "[REDACTED]")
    (CH / "_debug").mkdir(exist_ok=True)
    (CH / "_debug" / "kr_job.log").write_text(log, encoding="utf-8")
    return p.returncode


def main() -> int:
    task, sites = decide()
    print(f"작업: {task} / 사이트: {' '.join(sites)}", flush=True)
    data_sync.pull()
    rc = 1
    try:
        prepare()
        rc = collect(sites) if task == "collect" else probe()
    finally:
        rc = data_sync.push(sites if task == "collect" else []) or rc
    return rc


if __name__ == "__main__":
    sys.exit(main())
