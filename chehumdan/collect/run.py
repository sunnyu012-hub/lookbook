"""사이트를 수집해 ../data/sites/<사이트>.json 을 만든다.

- 사이트마다 파일이 따로라서 GitHub 서버 수집과 한국 PC 수집이 서로 덮어쓰지 않는다.
- 실패한 사이트는 지난번 데이터를 그대로 둔다(마감 지난 공고만 뺀다).
- first_seen: 처음 발견한 날(KST). '오늘 새로' 탭이 이 값을 쓴다. 사이트 첫 수집분은 기준선(null).
사용: python run.py 사이트 [사이트 ...]
"""
from __future__ import annotations

import importlib
import json
import sys
import threading
import traceback
from datetime import datetime
from pathlib import Path

from common import KST, today_kst

# 사이트 이름 → 수집기 모듈. 빠진 곳과 이유는 ../PLAN.md 참고
SITES = {
    "reviewnote": "site_reviewnote",
    "popomon": "site_popomon",
    "revu": "site_revu",
    "gangnam": "site_gangnam",
    "dinnerqueen": "site_dinnerqueen",
    "cometoplay": "site_cometoplay",
    "chvu": "site_chvu",
    "remin": "site_remin",
    "fourblog": "site_fourblog",
    "cloudreview": "site_cloudreview",
    "ddok": "site_ddok",
    "odiya": "site_odiya",
    "ringble": "site_ringble",
    "seoulouba": "site_seoulouba",
    "reviewplace": "site_reviewplace",
    "clipview": "site_clipview",
    "gugudas": "site_gugudas",
}
DATA = Path(__file__).resolve().parent.parent / "data" / "sites"
SITE_TIMEOUT = 25 * 60  # 초. 포포몬·디너의여왕 7~9분
SITE_TIMEOUTS = {"reviewnote": 45 * 60}  # 시/도별 1,100여 번 요청 — GitHub 서버에서 25분 넘게 걸림(10-15)


def load(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def collect_timed(module: str, limit: int = SITE_TIMEOUT) -> list[dict]:
    """사이트 하나가 해외 IP 차단 등으로 시간 초과를 반복해도 전체 작업이 멈추지 않게 상한을 둔다."""
    box: dict = {}

    def work():
        try:
            box["v"] = importlib.import_module(module).collect()
        except Exception as e:  # noqa: BLE001
            box["e"] = e

    # ponytail: 상한을 넘긴 스레드는 멈추지 않고 뒤에서 끝까지 돈다(데몬이라 프로세스가 끝나면 같이 끝남)
    t = threading.Thread(target=work, daemon=True)
    t.start()
    t.join(limit)
    if t.is_alive():
        raise TimeoutError(f"{limit // 60}분 넘게 걸림 — 접속이 막혔거나 아주 느림")
    if "e" in box:
        raise box["e"]
    return box["v"]


def run_site(name: str) -> bool:
    path = DATA / f"{name}.json"
    prev = load(path)
    prev_items = prev.get("items", [])
    prev_by_id = {it["id"]: it for it in prev_items}
    today = today_kst()
    meta = {"site": name}
    try:
        got = collect_timed(SITES[name], SITE_TIMEOUTS.get(name, SITE_TIMEOUT))
        if not got:
            raise RuntimeError("0건 — 사이트 구조가 바뀌었을 수 있음")
        items, ok = got, True
        print(f"[{name}] {len(got)}건")
    except Exception as e:  # noqa: BLE001
        traceback.print_exc()
        items, ok = prev_items, False
        meta["error"] = str(e)[:200]
        print(f"[{name}] 실패 — 지난 데이터 {len(prev_items)}건 유지: {e}")

    out, seen = [], set()
    for it in items:
        if it["id"] in seen or (it.get("end") and it["end"] < today):
            continue
        seen.add(it["id"])
        it.pop("url", None)  # 주소는 화면에서 site+id 로 만든다(파일 크기 절약)
        if it["id"] in prev_by_id:
            it["first_seen"] = prev_by_id[it["id"]].get("first_seen")
        elif "first_seen" not in it:
            it["first_seen"] = today if prev_items else None
        out.append(it)
    out.sort(key=lambda x: (x.get("end") or "9999", x["id"]))

    # 한 번도 성공 못 한 사이트도 실패 이유를 남긴다(items 0건, 화면은 건너뜀)
    now = datetime.now(KST).isoformat(timespec="minutes")
    meta.update({
        "ok": ok,
        "count": len(out),
        "updated": now if ok else prev.get("updated"),
        "checked": now,
        "items": out,
    })
    DATA.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(meta, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"[{name}] 저장 {len(out)}건 → {path}")
    return ok


def main(names: list[str]) -> int:
    bad = [n for n in names if n not in SITES]
    if not names or bad:
        print(f"사용: python run.py {' | '.join(SITES)} …  (모르는 이름: {bad})")
        return 2
    results = [run_site(n) for n in names]
    return 0 if any(results) else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
