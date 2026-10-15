"""강남맛집 (강남맛집.net) — 해외 IP를 막아서 한국 PC(self-hosted runner)에서만 돈다.

사이트 구조는 한국 PC에서 처음 접속해 본 뒤에 채운다(워크플로 probe 모드).
"""
from __future__ import annotations


def collect() -> list[dict]:
    raise RuntimeError("구조 확인 전 — 한국 PC에서 probe 모드를 먼저 실행")
