"""시트를 칸으로 나누는 방법들 (격자 지정 / 투영 기반 자동 분할)."""

from __future__ import annotations

import numpy as np

Rect = tuple[int, int, int, int]  # x0, y0, x1, y1


def grid_cells(width: int, height: int, cols: int, rows: int) -> list[Rect]:
    """캔버스를 cols x rows 로 균등 분할한다."""
    cols, rows = max(1, cols), max(1, rows)
    xs = [round(width * i / cols) for i in range(cols + 1)]
    ys = [round(height * i / rows) for i in range(rows + 1)]
    return [
        (xs[c], ys[r], xs[c + 1], ys[r + 1])
        for r in range(rows)
        for c in range(cols)
    ]


def _best_cut(projection: np.ndarray, min_cell: int, valley_ratio: float):
    """투영값의 골짜기를 찾아 자를 위치와 깊이를 돌려준다."""
    n = projection.size
    if n < 2 * min_cell:
        return None
    inner = projection[min_cell:n - min_cell]
    if inner.size == 0:
        return None

    lowest = inner.min()
    # 가장 낮은 구간이 여러 곳이면 그 중 가장 넓은 구간의 한가운데를 자른다
    flat = np.flatnonzero(inner <= lowest)
    splits = np.split(flat, np.flatnonzero(np.diff(flat) > 1) + 1)
    widest = max(splits, key=len)
    index = int(widest[len(widest) // 2]) + min_cell

    left_peak = projection[:index].max(initial=0)
    right_peak = projection[index + 1:].max(initial=0)
    shoulder = min(left_peak, right_peak)
    if shoulder <= 0:
        return None
    depth = 1.0 - (float(lowest) / float(shoulder))
    if float(lowest) > valley_ratio * shoulder:
        return None
    return index, depth


def xy_cut(
    mask: np.ndarray,
    valley_ratio: float = 0.35,
    min_cell: int = 24,
    max_depth: int = 8,
    axis: str = "both",
) -> list[Rect]:
    """행/열 투영의 골짜기를 따라 재귀적으로 나눈다 (문서 레이아웃의 XY-cut).

    맞닿아 있어도 사이가 잘록하면 갈라지므로, 격자로 배치된 시트에 잘 맞는다.
    """
    h, w = mask.shape
    cells: list[Rect] = []

    def recurse(x0: int, y0: int, x1: int, y1: int, depth: int) -> None:
        region = mask[y0:y1, x0:x1]
        if not region.any():
            return
        if depth >= max_depth:
            cells.append((x0, y0, x1, y1))
            return

        row_cut = _best_cut(region.sum(axis=1), min_cell, valley_ratio) if axis in ("both", "row") else None
        col_cut = _best_cut(region.sum(axis=0), min_cell, valley_ratio) if axis in ("both", "col") else None

        if row_cut and (not col_cut or row_cut[1] >= col_cut[1]):
            cut = y0 + row_cut[0]
            recurse(x0, y0, x1, cut, depth + 1)
            recurse(x0, cut, x1, y1, depth + 1)
        elif col_cut:
            cut = x0 + col_cut[0]
            recurse(x0, y0, cut, y1, depth + 1)
            recurse(cut, y0, x1, y1, depth + 1)
        else:
            cells.append((x0, y0, x1, y1))

    recurse(0, 0, w, h, 0)
    return cells


def _cluster(values: list[float], gap: float) -> int:
    """1차원 좌표를 gap 이상 벌어진 곳에서 끊어 묶음 수를 센다."""
    if not values:
        return 1
    ordered = sorted(values)
    groups = 1
    for prev, cur in zip(ordered, ordered[1:]):
        if cur - prev > gap:
            groups += 1
    return groups


def infer_grid(boxes: list[Rect], limit: int = 32) -> tuple[int, int]:
    """요소 배치에서 열 x 행 수를 추정한다.

    요소 중심이 몇 줄로 늘어서 있는지 세는 방식이라, 격자로 배치된 시트에서
    잘 맞는다. 배치가 불규칙하면 그만큼 큰 값이 나오므로 결과를 그대로
    믿지 말고 참고값으로 쓴다.
    """
    if not boxes:
        return 1, 1
    widths = sorted(b[2] - b[0] for b in boxes)
    heights = sorted(b[3] - b[1] for b in boxes)
    mid_w = widths[len(widths) // 2]
    mid_h = heights[len(heights) // 2]

    cols = _cluster([(b[0] + b[2]) / 2 for b in boxes], mid_w * 0.5)
    rows = _cluster([(b[1] + b[3]) / 2 for b in boxes], mid_h * 0.5)
    return max(1, min(cols, limit)), max(1, min(rows, limit))
