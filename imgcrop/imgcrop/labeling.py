"""Run-length 기반 연결 요소 라벨링 (외부 의존성 없이 numpy만 사용)."""

from __future__ import annotations

import numpy as np


class _UnionFind:
    def __init__(self) -> None:
        self.parent: list[int] = []

    def make(self) -> int:
        idx = len(self.parent)
        self.parent.append(idx)
        return idx

    def find(self, x: int) -> int:
        root = x
        while self.parent[root] != root:
            root = self.parent[root]
        while self.parent[x] != root:
            self.parent[x], x = root, self.parent[x]
        return root

    def union(self, a: int, b: int) -> None:
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.parent[max(ra, rb)] = min(ra, rb)


def _extract_runs(mask: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """행 단위 연속 구간(run)을 벡터 연산으로 한 번에 추출한다."""
    h, w = mask.shape
    padded = np.zeros((h, w + 2), dtype=np.int8)
    padded[:, 1:-1] = mask
    diff = np.diff(padded, axis=1)
    start_rows, start_cols = np.nonzero(diff == 1)
    _, end_cols = np.nonzero(diff == -1)
    return start_rows, start_cols, end_cols  # end는 exclusive


def label_components(mask: np.ndarray, connectivity: int = 8):
    """전경 마스크를 라벨 이미지로 변환한다.

    Returns:
        labels: int32 라벨 이미지 (0 = 배경, 1..n = 요소)
        boxes:  [(x0, y0, x1, y1, area), ...] 라벨 순서와 동일
    """
    mask = np.ascontiguousarray(mask, dtype=bool)
    h, w = mask.shape
    rows, starts, ends = _extract_runs(mask)
    n_runs = rows.size
    labels = np.zeros((h, w), dtype=np.int32)
    if n_runs == 0:
        return labels, []

    uf = _UnionFind()
    run_ids = np.empty(n_runs, dtype=np.int64)

    # 행별 run 구간의 시작 인덱스 (rows는 오름차순 정렬 상태)
    row_offsets = np.searchsorted(rows, np.arange(h + 1))

    slack = 1 if connectivity == 8 else 0
    for row in range(h):
        cur_lo, cur_hi = row_offsets[row], row_offsets[row + 1]
        if cur_lo == cur_hi:
            continue
        for i in range(cur_lo, cur_hi):
            run_ids[i] = uf.make()

        if row == 0:
            continue
        prev_lo, prev_hi = row_offsets[row - 1], row_offsets[row]
        j = prev_lo
        for i in range(cur_lo, cur_hi):
            s, e = starts[i], ends[i]
            # 이전 행에서 겹치지 않고 지나간 run은 건너뛴다
            while j < prev_hi and ends[j] + slack <= s:
                j += 1
            k = j
            while k < prev_hi and starts[k] < e + slack:
                uf.union(int(run_ids[i]), int(run_ids[k]))
                k += 1

    # 루트를 1부터 시작하는 연속 라벨로 압축
    roots = np.array([uf.find(i) for i in range(len(uf.parent))], dtype=np.int64)
    uniq, compact = np.unique(roots, return_inverse=True)
    run_label = compact[run_ids] + 1
    n_labels = uniq.size

    for i in range(n_runs):
        labels[rows[i], starts[i]:ends[i]] = run_label[i]

    x0 = np.full(n_labels + 1, w, dtype=np.int64)
    x1 = np.zeros(n_labels + 1, dtype=np.int64)
    y0 = np.full(n_labels + 1, h, dtype=np.int64)
    y1 = np.zeros(n_labels + 1, dtype=np.int64)
    area = np.zeros(n_labels + 1, dtype=np.int64)

    for i in range(n_runs):
        lab = run_label[i]
        r, s, e = rows[i], starts[i], ends[i]
        if s < x0[lab]:
            x0[lab] = s
        if e > x1[lab]:
            x1[lab] = e
        if r < y0[lab]:
            y0[lab] = r
        if r + 1 > y1[lab]:
            y1[lab] = r + 1
        area[lab] += e - s

    boxes = [
        (int(x0[i]), int(y0[i]), int(x1[i]), int(y1[i]), int(area[i]))
        for i in range(1, n_labels + 1)
    ]
    return labels, boxes


def bboxes_from_labels(labels: np.ndarray) -> list[tuple[int, int, int, int, int]]:
    """라벨 이미지에서 라벨별 (x0, y0, x1, y1, area)를 구한다."""
    n = int(labels.max())
    if n == 0:
        return []
    ys, xs = np.nonzero(labels)
    vals = labels[ys, xs]
    order = np.argsort(vals, kind="stable")
    vals, ys, xs = vals[order], ys[order], xs[order]
    counts = np.bincount(vals, minlength=n + 1)[1:]
    starts = np.concatenate([[0], np.cumsum(counts)[:-1]])

    out = []
    for i in range(n):
        s, c = int(starts[i]), int(counts[i])
        if c == 0:
            out.append((0, 0, 0, 0, 0))
            continue
        yy, xx = ys[s:s + c], xs[s:s + c]
        out.append((int(xx.min()), int(yy.min()), int(xx.max()) + 1, int(yy.max()) + 1, c))
    return out


def _shift_max(dst: np.ndarray, src: np.ndarray) -> np.ndarray:
    """상하좌우 1픽셀 이웃 중 최대 라벨을 취한다 (경계에서 감싸지 않음)."""
    np.maximum(dst[1:, :], src[:-1, :], out=dst[1:, :])
    np.maximum(dst[:-1, :], src[1:, :], out=dst[:-1, :])
    np.maximum(dst[:, 1:], src[:, :-1], out=dst[:, 1:])
    np.maximum(dst[:, :-1], src[:, 1:], out=dst[:, :-1])
    return dst


def label_separated(mask: np.ndarray, connectivity: int = 8, separation: int = 0):
    """가는 다리로 붙어 있는 요소를 떼어내며 라벨링한다.

    마스크를 `separation`만큼 침식해 씨앗을 만든다. 한 덩어리 안에 씨앗이
    둘 이상 생겼다면 다리가 끊어진 것이므로, 그 덩어리 안에서만 씨앗을
    수렴할 때까지 키워 나눈다. 씨앗이 하나뿐인 덩어리는 손대지 않으므로
    가는 부분이 있는 요소가 잘못 쪼개지지 않는다.
    """
    labels, boxes = label_components(mask, connectivity)
    if separation <= 0 or not boxes:
        return labels, boxes

    from .masking import erode  # 순환 참조를 피하려고 지연 임포트

    seeds = erode(mask, separation)
    if not seeds.any():
        return labels, boxes

    seed_labels, _ = label_components(seeds, connectivity)
    pairs = np.unique(
        np.stack([labels[seeds], seed_labels[seeds]], axis=1), axis=0
    )
    by_component: dict[int, list[int]] = {}
    for original, seed in pairs:
        by_component.setdefault(int(original), []).append(int(seed))

    out = labels.copy()
    next_label = int(labels.max())
    for original, seed_ids in by_component.items():
        if len(seed_ids) < 2:
            continue
        x0, y0, x1, y1 = boxes[original - 1][:4]
        window = out[y0:y1, x0:x1]
        region = labels[y0:y1, x0:x1] == original

        current = np.where(region, seed_labels[y0:y1, x0:x1], 0)
        for _ in range(max(x1 - x0, y1 - y0) + separation):
            grown = current.copy()
            _shift_max(grown, current)
            # 이미 주인이 있는 픽셀은 그대로 두고 빈 곳만 채운다.
            # (그냥 최댓값을 쓰면 큰 번호가 작은 번호를 삼켜 버린다)
            grown = np.where(region & (current == 0), grown, current)
            if np.array_equal(grown, current):
                break
            current = grown

        for seed in seed_ids:
            next_label += 1
            window[current == seed] = next_label
        # 씨앗에서 닿지 못한 자투리는 원래 덩어리에 그대로 둔다
        window[region & (current == 0)] = original

    # 사용하지 않게 된 번호를 없애고 1..n 으로 다시 매긴다
    used = np.unique(out)
    used = used[used > 0]
    remap = np.zeros(int(out.max()) + 1, dtype=np.int32)
    remap[used] = np.arange(1, used.size + 1, dtype=np.int32)
    out = remap[out]
    return out, bboxes_from_labels(out)
