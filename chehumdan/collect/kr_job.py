"""사무실 PC(Windows self-hosted runner) 수집 작업 — chehumdan-collect-kr 워크플로가 부른다.

PC의 PowerShell 실행 정책(Restricted)과 상관없이 돌도록 단계 로직을 파이썬으로 둔다(워크플로는 shell: cmd).
1) 할 일 정하기  2) playwright 준비  3) 수집(run.py) 또는 구조 확인(probe2.py)  4) 결과 커밋·push
환경 변수: EVENT(github.event_name), IN_TASK, IN_SITES, GITHUB_REF_NAME
"""
from __future__ import annotations

import os
import re
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CH = ROOT / "chehumdan"
PY = sys.executable


def sh(*args, cwd=ROOT) -> int:
    print("+", " ".join(map(str, args)), flush=True)
    return subprocess.run(list(map(str, args)), cwd=cwd).returncode


def decide() -> tuple[str, list[str]]:
    task = os.environ.get("IN_TASK") or "collect"
    sites = os.environ.get("IN_SITES") or "revu gangnam"
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


def save() -> int:
    """바뀐 결과를 커밋해 지금 브랜치에 올린다. 화면 캡처(png)는 계정이 보일 수 있어 올리지 않는다."""
    git = lambda *a: sh("git", *a)  # noqa: E731
    git("config", "user.name", "github-actions[bot]")
    git("config", "user.email", "41898+github-actions[bot]@users.noreply.github.com")
    git("add", "chehumdan/data/sites")
    for d in ("_debug", "_probe2"):
        if (CH / d).exists():
            git("add", "-f", f"chehumdan/{d}")
    git("rm", "--cached", "-q", "-r", "--ignore-unmatch", "--", "chehumdan/_debug/*.png")
    if git("diff", "--cached", "--quiet") == 0:
        print("바뀐 것 없음")
        return 0
    kst = datetime.now(timezone(timedelta(hours=9))).strftime("%m-%d %H:%M")
    git("commit", "-q", "-m", f"체험단 다모아: 한국 PC 수집 {kst}")
    ref = os.environ["GITHUB_REF_NAME"]
    for i in range(1, 4):
        if git("pull", "--rebase", "-q", "origin", ref) == 0 and git("push", "-q", "origin", f"HEAD:{ref}") == 0:
            return 0
        time.sleep(5 * i)
    print("저장 실패")
    return 1


def main() -> int:
    task, sites = decide()
    print(f"작업: {task} / 사이트: {' '.join(sites)}", flush=True)
    rc = 1
    try:
        prepare()
        rc = collect(sites) if task == "collect" else probe()
    finally:
        rc = save() or rc
    return rc


if __name__ == "__main__":
    sys.exit(main())
