"""모든 사이트를 수집해 ../data/campaigns.json 을 만든다.

- 사이트 하나가 실패해도 나머지는 계속한다. 실패한 사이트는 지난번 데이터를 그대로 둔다.
- first_seen: 처음 발견한 날(KST). '오늘 새로' 탭이 이 값을 쓴다.
- 마감이 지난 공고는 뺀다.
사용: python run.py [사이트 ...]
"""
from __future__ import annotations

import json
import sys
import traceback
from datetime import datetime
from pathlib import Path

from common import KST, today_kst

import site_reviewnote

# 강남맛집·레뷰·포포몬이 빠진 이유는 ../PLAN.md 참고
COLLECTORS = {
    "reviewnote": site_reviewnote.collect,
}
OUT = Path(__file__).resolve().parent.parent / "data" / "campaigns.json"


def load_prev() -> dict:
    try:
        return json.loads(OUT.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {"items": [], "sites": {}}


def main(only: list[str]) -> int:
    prev = load_prev()
    prev_by_id = {it["id"]: it for it in prev.get("items", [])}
    prev_sites = {it["site"] for it in prev.get("items", [])}
    today = today_kst()
    sites_meta = dict(prev.get("sites", {}))
    items: list[dict] = []

    for name, fn in COLLECTORS.items():
        if only and name not in only:
            items += [it for it in prev.get("items", []) if it["site"] == name]
            continue
        try:
            got = fn()
            if not got:
                raise RuntimeError("0건 — 사이트 구조가 바뀌었을 수 있음")
            sites_meta[name] = {"ok": True, "count": len(got), "at": datetime.now(KST).isoformat(timespec="minutes")}
            items += got
            print(f"[{name}] {len(got)}건")
        except Exception as e:  # noqa: BLE001
            traceback.print_exc()
            old = [it for it in prev.get("items", []) if it["site"] == name]
            sites_meta[name] = {**sites_meta.get(name, {}), "ok": False, "count": len(old), "error": str(e)[:200]}
            items += old
            print(f"[{name}] 실패 — 지난 데이터 {len(old)}건 유지: {e}")

    out, seen = [], set()
    for it in items:
        if it["id"] in seen or (it.get("end") and it["end"] < today):
            continue
        seen.add(it["id"])
        it.pop("url", None)  # 주소는 화면에서 site+id 로 만든다(파일 크기 절약)
        if it["id"] in prev_by_id:
            it["first_seen"] = prev_by_id[it["id"]].get("first_seen")
        else:
            # 사이트를 처음 수집할 때는 기준선이라 '오늘 새로'로 치지 않는다(null).
            it["first_seen"] = None if it["site"] not in prev_sites else today
        out.append(it)
    out.sort(key=lambda x: (x.get("end") or "9999", x["id"]))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    data = {"updated": datetime.now(KST).isoformat(timespec="minutes"), "sites": sites_meta, "items": out}
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"총 {len(out)}건 → {OUT}")
    return 0 if any(m.get("ok") for m in sites_meta.values()) else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
