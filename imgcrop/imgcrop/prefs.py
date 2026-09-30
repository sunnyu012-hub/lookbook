"""마지막으로 고른 작업 방식을 기억한다.

프로그램을 다시 켤 때마다 "요소별로 나누기"로 돌아가면, 여백만 자르려는
사람은 매번 같은 곳을 다시 찾아 눌러야 한다. 설정 파일 하나로 그걸 막는다.
읽기/쓰기가 실패해도 프로그램은 그대로 돌아가야 하므로 조용히 넘어간다.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

VALID_SPLIT_MODES = ("auto", "components", "xycut", "grid", "none")


def config_path() -> Path:
    base = os.environ.get("IMGCROP_CONFIG_DIR")
    if base:
        return Path(base) / "imgcrop.json"
    if os.name == "nt":
        root = os.environ.get("APPDATA") or Path.home()
        return Path(root) / "imgcrop" / "imgcrop.json"
    root = os.environ.get("XDG_CONFIG_HOME") or (Path.home() / ".config")
    return Path(root) / "imgcrop" / "imgcrop.json"


def load() -> dict:
    try:
        data = json.loads(config_path().read_text(encoding="utf-8"))
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def save(**values) -> None:
    data = load()
    data.update(values)
    try:
        path = config_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass  # 설정을 못 남기는 건 작업을 막을 이유가 아니다


def split_mode(default: str = "auto") -> str:
    value = load().get("split_mode")
    return value if value in VALID_SPLIT_MODES else default
