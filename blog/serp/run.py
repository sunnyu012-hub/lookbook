"""블로그 작업대 '추세' 키워드를 매일 한 번 네이버에서 확인해 blog-data 브랜치(serp.json)에 올린다.

키워드: 작업대 서버 저장소(BLOG_PROXY + BLOG_SYNC_KEY 시크릿)에서 발행 글 메인키워드 + 직접 추가 키워드를 읽는다.
       시크릿이 없으면 keywords.json(직접 관리) 을 쓴다.
한 키워드마다: 블로그 탭 순위(첫 화면 30개 안) · PC/모바일 통합검색 노출(serp.py) · AI 브리핑 출처 상위 3.
결과는 키워드별 최근 120일만 남긴다. 작업대는 raw.githubusercontent.com/sunnyu012-hub/lookbook/blog-data/serp.json 을 읽는다.
사용: python blog/serp/run.py            확인하고 올림
      python blog/serp/run.py --dry      확인만 하고 blog/data/serp.json 에 저장 (올리지 않음)
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import serp  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "blog" / "data" / "serp.json"
BRANCH = "blog-data"
KEEP_DAYS = 120
BUDGET_MIN = 35  # 워크플로 timeout-minutes(45) 안에 올리기까지 끝나도록
SKIP = set(filter(None, os.environ.get("SKIP_CHANNELS", "드리밍").split(",")))  # 드리밍: 10/16 운영 종료
SITE: dict[str, str] = {}  # 블로그 글만 센다 (홈페이지 kcost.org 노출은 넣지 않음, 10/16 결정)
KST = timezone(timedelta(hours=9))
BOT = {"GIT_AUTHOR_NAME": "github-actions[bot]", "GIT_AUTHOR_EMAIL": "41898+github-actions[bot]@users.noreply.github.com",
       "GIT_COMMITTER_NAME": "github-actions[bot]", "GIT_COMMITTER_EMAIL": "41898+github-actions[bot]@users.noreply.github.com"}


def blog_id(url: str) -> str:
    return url.rstrip("/").split("/")[-1] if url else ""


def targets() -> list[dict]:
    proxy, key = os.environ.get("BLOG_PROXY", "").rstrip("/"), os.environ.get("BLOG_SYNC_KEY", "")
    if proxy and key:
        if not proxy.startswith("http"):
            proxy = "https://" + proxy
        with urllib.request.urlopen(f"{proxy}/data?key={urllib.parse.quote(key)}", timeout=30) as r:
            data = json.load(r).get("data") or {}
        blogs = data.get("blogs") or {}
        pairs = {(p["ch"], p["kw"]) for p in data.get("posts", []) if p.get("kw") and p.get("status") == "발행"}
        pairs |= {(t["ch"], t["kw"]) for t in data.get("tracked", []) if t.get("kw")}
        print(f"작업대에서 키워드 {len(pairs)}개")
    else:
        cfg = json.loads((Path(__file__).parent / "keywords.json").read_text(encoding="utf-8"))
        blogs, pairs = cfg["blogs"], {(x["ch"], x["kw"]) for x in cfg["keywords"]}
        print(f"keywords.json 에서 키워드 {len(pairs)}개 (시크릿 없음)")
    out = [{"ch": ch, "kw": kw, "blog": blog_id(blogs.get(ch, ""))} for ch, kw in sorted(pairs)]
    return [t for t in out if t["blog"] and t["ch"] not in SKIP]


def previous() -> dict:
    p = subprocess.run(["git", "fetch", "-q", "origin", f"+{BRANCH}:refs/remotes/origin/{BRANCH}"], cwd=ROOT, capture_output=True)
    if p.returncode:
        return {}
    s = subprocess.run(["git", "show", f"origin/{BRANCH}:serp.json"], cwd=ROOT, capture_output=True)
    return json.loads(s.stdout.decode("utf-8")) if s.returncode == 0 else {}


def check(ts: list[dict]) -> dict[str, dict]:
    pages: dict[tuple, str] = {}

    def page(kw: str, dev: str, tab: bool = False) -> str:
        k = (kw, dev, tab)
        if k not in pages:
            time.sleep(5)  # 네이버 부담을 줄인다. 3초로 75개(요청 225번)를 물으니 중간부터 403 (10/22)
            pages[k] = serp.fetch(kw, dev, tab)
        return pages[k]

    # 네이버가 막으면 요청마다 4분씩 재시도하다 잡 시간(45분)을 넘겨 확인분까지 다 잃었다 (10/22).
    # 연속으로 막히거나 35분이 지나면 멈추고, 그때까지 확인한 것만 올린다.
    deadline, fails = time.monotonic() + BUDGET_MIN * 60, 0
    res = {}
    for i, t in enumerate(ts):
        if fails >= 2 or time.monotonic() > deadline:
            print(f"중단: {'네이버가 막음' if fails >= 2 else f'{BUDGET_MIN}분 초과'} — {i}/{len(ts)}개까지만 확인")
            break
        kw, blog, site = t["kw"], t["blog"], SITE.get(t["ch"])
        try:
            pc, mo = (serp.analyze(page(kw, d), blog, site) for d in ("pc", "mobile"))
            res[json.dumps([t["ch"], kw], ensure_ascii=False, separators=(",", ":"))] = {
                "r": serp.blog_rank(page(kw, "pc", True), blog),
                "pc": serp.label(pc), "m": serp.label(mo),
                "src": (mo["sources"] or pc["sources"])[:3],
            }
            fails = 0
        except Exception as e:  # 한 키워드 실패로 전체를 멈추지 않는다
            fails += 1
            print(f"실패: {kw} — {e}")
    return res


def merge(old: dict, today: str, res: dict[str, dict]) -> dict:
    hist = old.get("kw", {})
    cut = (datetime.now(KST) - timedelta(days=KEEP_DAYS)).strftime("%Y-%m-%d")
    for k, v in res.items():
        h = [x for x in hist.get(k, []) if x["d"] != today and x["d"] >= cut]
        hist[k] = h + [{"d": today, **v}]
    return {"updated": datetime.now(KST).strftime("%Y-%m-%d %H:%M"), "tabDepth": serp.TAB_DEPTH, "kw": hist}


def git(*a: str, env: dict | None = None) -> str:
    p = subprocess.run(["git", *a], cwd=ROOT, capture_output=True, text=True, encoding="utf-8", env=env)
    if p.returncode:
        raise RuntimeError(f"git {' '.join(a)}: {p.stderr.strip()}")
    return p.stdout.strip()


def push(msg: str) -> None:
    """기록이 쌓이지 않게 부모 없는 커밋 하나로 덮어쓴다 (chehumdan-data 와 같은 방식)."""
    index = Path(git("rev-parse", "--absolute-git-dir")) / "blog-data.index"
    env = {**os.environ, **BOT, "GIT_INDEX_FILE": str(index)}
    index.unlink(missing_ok=True)
    blob = git("hash-object", "-w", str(OUT))
    git("update-index", "--add", "--cacheinfo", f"100644,{blob},serp.json", env=env)
    commit = git("commit-tree", git("write-tree", env=env), "-m", msg, env=env)
    git("push", "-q", "--force", "origin", f"{commit}:refs/heads/{BRANCH}")
    index.unlink(missing_ok=True)
    print(f"{BRANCH} 에 올림")


def main() -> int:
    ts = targets()
    today = datetime.now(KST).strftime("%Y-%m-%d")
    res = check(ts)
    data = merge(previous(), today, res)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    cited = sum("AI 브리핑 인용" in (v["pc"] or "") or "AI 브리핑 인용" in (v["m"] or "") for v in res.values())
    print(f"{today}: 확인 {len(res)}/{len(ts)} · 블로그탭 5위 안 {sum(0 < v['r'] <= 5 for v in res.values())} · AI 브리핑 인용 {cited}")
    if "--dry" not in sys.argv:
        push(f"블로그 검색 확인 {today}: {len(res)}개")
    return 0 if res or not ts else 1


if __name__ == "__main__":
    sys.exit(main())
