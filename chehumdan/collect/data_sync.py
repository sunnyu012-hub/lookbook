"""수집 결과를 git 기록이 쌓이지 않는 chehumdan-data 브랜치에 둔다 (커밋 1개를 매번 새로 만들어 덮어씀).

수집 결과(전부 합쳐 15MB 안팎)를 main 에 하루 몇 번씩 커밋하면 지난 버전이 기록에 쌓여 저장소가 계속 커진다(10-16 결정).
- 화면은 raw.githubusercontent.com/sunnyu012-hub/lookbook/chehumdan-data/sites/<사이트>.json 을 읽는다.
- GitHub 서버 수집과 한국 PC 수집이 같은 브랜치에 쓴다. 각자 자기 사이트 파일만 바꾸고,
  올리기 직전에 원격 브랜치를 다시 받아 그 위에 얹는다(--force-with-lease, 겹치면 다시 시도).
사용: python data_sync.py pull                    원격 데이터를 chehumdan/data/sites/ 로 (run.py 가 지난 데이터로 씀)
      python data_sync.py push 사이트 [사이트 ...]  그 사이트 파일 + _debug/·_probe2/(있으면)를 올린다
"""
from __future__ import annotations

import os
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SITES = ROOT / "chehumdan" / "data" / "sites"
EXTRA = {"debug": ROOT / "chehumdan" / "_debug", "probe": ROOT / "chehumdan" / "_probe2"}
BRANCH = "chehumdan-data"
REF = f"refs/remotes/origin/{BRANCH}"
BOT = {"GIT_AUTHOR_NAME": "github-actions[bot]", "GIT_AUTHOR_EMAIL": "41898+github-actions[bot]@users.noreply.github.com",
       "GIT_COMMITTER_NAME": "github-actions[bot]", "GIT_COMMITTER_EMAIL": "41898+github-actions[bot]@users.noreply.github.com"}


def git(*args: str, env: dict | None = None) -> str:
    p = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, encoding="utf-8", env=env)
    if p.returncode:
        raise RuntimeError(f"git {' '.join(args)}: {p.stderr.strip()}")
    return p.stdout.strip()


def fetch() -> str | None:
    """원격 데이터 브랜치의 커밋 (아직 없으면 None)."""
    p = subprocess.run(["git", "fetch", "-q", "origin", f"+{BRANCH}:{REF}"], cwd=ROOT, capture_output=True)
    return git("rev-parse", REF) if p.returncode == 0 else None


def pull() -> int:
    sha = fetch()
    if not sha:
        print(f"{BRANCH} 브랜치 없음 — 지난 데이터 없이 시작")
        return 0
    SITES.mkdir(parents=True, exist_ok=True)
    names = git("ls-tree", "--name-only", f"{sha}:sites").splitlines()
    for name in names:
        blob = subprocess.run(["git", "cat-file", "blob", f"{sha}:sites/{name}"], cwd=ROOT,
                              capture_output=True, check=True).stdout
        (SITES / name).write_bytes(blob)
    print(f"지난 데이터 {len(names)}개 받음 ({sha[:7]})")
    return 0


def push(sites: list[str]) -> int:
    files = {f"sites/{s}.json": SITES / f"{s}.json" for s in sites if (SITES / f"{s}.json").exists()}
    for prefix, d in EXTRA.items():
        if d.exists():  # 화면 캡처(png)는 계정이 보일 수 있어 올리지 않는다
            files.update({f"{prefix}/{p.name}": p for p in d.iterdir() if p.is_file() and p.suffix != ".png"})
    if not files:
        print("올릴 파일 없음")
        return 0
    kst = datetime.now(timezone(timedelta(hours=9))).strftime("%m-%d %H:%M")
    msg = f"체험단 다모아 데이터 {kst}: {' '.join(sites)}"
    index = Path(git("rev-parse", "--absolute-git-dir")) / "chehumdan-data.index"
    env = {**os.environ, **BOT, "GIT_INDEX_FILE": str(index)}
    for i in range(1, 4):
        old = fetch()
        index.unlink(missing_ok=True)
        if old:
            git("read-tree", old, env=env)  # 다른 쪽(서버/한국 PC)이 올린 사이트 파일은 그대로 둔다
        for path, f in files.items():
            blob = git("hash-object", "-w", str(f))
            git("update-index", "--add", "--cacheinfo", f"100644,{blob},{path}", env=env)
        commit = git("commit-tree", git("write-tree", env=env), "-m", msg, env=env)  # 부모 없음 = 기록 안 쌓임
        p = subprocess.run(["git", "push", "-q", f"--force-with-lease=refs/heads/{BRANCH}:{old or ''}",
                            "origin", f"{commit}:refs/heads/{BRANCH}"], cwd=ROOT)
        if p.returncode == 0:
            print(f"{BRANCH} 에 올림: {', '.join(files)}")
            index.unlink(missing_ok=True)
            return 0
        time.sleep(5 * i)
    print("데이터 올리기 실패")
    return 1


if __name__ == "__main__":
    if sys.argv[1:2] == ["pull"]:
        sys.exit(pull())
    if sys.argv[1:2] == ["push"] and len(sys.argv) > 2:
        sys.exit(push(sys.argv[2:]))
    print(__doc__)
    sys.exit(2)
