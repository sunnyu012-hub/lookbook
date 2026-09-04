"""요소 검출 -> 여백 제거 -> 크롭/리사이즈 파이프라인."""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field, replace
from pathlib import Path

import numpy as np
from PIL import Image

from .labeling import label_separated
from .layout import grid_cells, xy_cut
from .masking import AUTO, build_mask, dilate

OVERLAP_SHARE = 0.25  # 겹친 넓이가 작은 쪽의 이 비율 이상이면 한 요소로 본다

SUPPORTED_INPUTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif", ".tif", ".tiff"}


@dataclass
class Settings:
    # --- 검출 ---
    tolerance: int | str = AUTO       # 배경 판정 임계값 (auto = 자동 추정)
    denoise: int = 1                  # 점 노이즈 제거 반경
    fill: int = 0                     # 요소 내부 구멍 메우기 반경(보통 불필요)
    edge_barrier: float = 1.0         # 경계 장벽 강도(0=끔). 배경과 색이 비슷한 피사체에 필요
    connectivity: int = 8
    min_area_ratio: float = 0.0005    # 전체 면적 대비 최소 요소 크기
    min_relative_area: float = 0.08   # 다른 요소들의 중앙값 대비 이 비율보다 작으면 버림 (0이면 끔)
    attach_ratio: float = 0.05        # 요소 크기 대비 이 거리 안의 작은 조각은 그 요소에 붙임 (0이면 끔)
    merge_overlapping: bool = True    # 박스가 겹치는 큰 조각끼리 합침 (한 요소가 쪼개진 경우)
    min_side: int = 8                 # 요소 최소 변 길이(px)
    merge_gap: int = 0                # 이 간격 이내의 요소는 하나로 합침(px)
    separation: int = 0               # 맞닿은 요소를 떼어낼 강도(px). 다리 폭 2*n 이하를 끊는다

    # 시트를 어떻게 나눌지
    #   auto       - 연결 요소로 나누되, 유독 큰 덩어리만 XY-cut으로 다시 쪼갠다
    #   components - 연결 요소만 사용
    #   xycut      - 행/열 투영 골짜기로 칸을 나눈다
    #   grid       - grid_cols x grid_rows 균등 격자
    #   none       - 나누지 않고 전체 여백만 제거
    split_mode: str = "auto"
    grid_cols: int = 3
    grid_rows: int = 3
    valley_ratio: float = 0.35        # xycut 골짜기 판정 (낮을수록 덜 나눔)
    oversize_factor: float = 1.7      # auto 모드에서 "유독 큰" 기준 (중앙값 대비 배수)

    # --- 출력 ---
    padding: int = 0                  # 크롭 주변 여백(px)
    padding_ratio: float = 0.0        # 요소 크기 대비 여백 비율
    output_mode: str = "tight"        # tight | square | fixed
    out_width: int = 1000
    out_height: int = 1000
    fit: str = "contain"              # contain(전체 보존) | cover(꽉 채움)
    allow_upscale: bool = True
    cutout: bool = False              # 배경을 지우고 요소만 남김(누끼)
    background: str = "transparent"   # transparent | white | #rrggbb
    image_format: str = "png"         # png | jpg | webp
    jpeg_quality: int = 95
    name_template: str = "{stem}_{index:02d}"


@dataclass
class Element:
    index: int
    box: tuple[int, int, int, int]     # 여백 적용 전 타이트 박스 (x0, y0, x1, y1)
    area: int
    labels: tuple[int, ...] = ()       # 이 요소를 이루는 원본 연결 요소 번호들

    @property
    def width(self) -> int:
        return self.box[2] - self.box[0]

    @property
    def height(self) -> int:
        return self.box[3] - self.box[1]


@dataclass
class Detection:
    path: Path | None
    size: tuple[int, int]
    elements: list[Element]
    info: dict = field(default_factory=dict)
    rgba: np.ndarray | None = None
    labels: np.ndarray | None = None


def load_rgba(path: str | Path) -> np.ndarray:
    with Image.open(path) as img:
        img.load()
        if img.mode == "P" and "transparency" in img.info:
            img = img.convert("RGBA")
        return np.asarray(img.convert("RGBA"))


def parse_color(value: str) -> tuple[int, int, int, int]:
    value = (value or "").strip().lower()
    if value in ("transparent", "none", ""):
        return (0, 0, 0, 0)
    if value == "white":
        return (255, 255, 255, 255)
    if value == "black":
        return (0, 0, 0, 255)
    match = re.fullmatch(r"#?([0-9a-f]{6})", value)
    if match:
        raw = match.group(1)
        return (int(raw[0:2], 16), int(raw[2:4], 16), int(raw[4:6], 16), 255)
    raise ValueError(f"색상 형식을 알 수 없습니다: {value!r} (예: white, transparent, #f5f0e8)")


def _merge_boxes(boxes: list[tuple[int, int, int, int, int, int]], gap: int):
    """gap 이내로 인접한 박스를 하나로 합친다. 반환: (x0,y0,x1,y1,area,label들)"""
    if gap <= 0 or len(boxes) < 2:
        return [(b[0], b[1], b[2], b[3], b[4], [b[5]]) for b in boxes]

    groups = [[b[0], b[1], b[2], b[3], b[4], [b[5]]] for b in boxes]
    changed = True
    while changed:
        changed = False
        merged: list[list] = []
        for g in groups:
            for m in merged:
                near_x = g[0] - gap < m[2] and m[0] - gap < g[2]
                near_y = g[1] - gap < m[3] and m[1] - gap < g[3]
                if near_x and near_y:
                    m[0], m[1] = min(m[0], g[0]), min(m[1], g[1])
                    m[2], m[3] = max(m[2], g[2]), max(m[3], g[3])
                    m[4] += g[4]
                    m[5].extend(g[5])
                    changed = True
                    break
            else:
                merged.append(g)
        groups = merged
    return [tuple(g) for g in groups]


def _assign_to_cells(parts: dict, cells: list[tuple[int, int, int, int]]) -> list[tuple]:
    """각 요소를 중심점이 들어가는 칸에 배정하고, 칸별로 하나의 박스로 합친다."""
    buckets: dict[int, list[int]] = {}
    for label, (x0, y0, x1, y1, area) in parts.items():
        cx, cy = (x0 + x1) / 2.0, (y0 + y1) / 2.0
        for i, (a, b, c, d) in enumerate(cells):
            if a <= cx < c and b <= cy < d:
                buckets.setdefault(i, []).append(label)
                break

    groups = []
    for i in sorted(buckets):
        labels = buckets[i]
        boxes = [parts[l] for l in labels]
        groups.append(
            (
                min(b[0] for b in boxes),
                min(b[1] for b in boxes),
                max(b[2] for b in boxes),
                max(b[3] for b in boxes),
                sum(b[4] for b in boxes),
                labels,
            )
        )
    return groups


def _content_box(mask: np.ndarray, rect: tuple[int, int, int, int]):
    """칸 안에 실제로 남은 픽셀의 타이트한 박스."""
    x0, y0, x1, y1 = rect
    sub = mask[y0:y1, x0:x1]
    if not sub.any():
        return None
    ys, xs = np.nonzero(sub)
    return (
        x0 + int(xs.min()),
        y0 + int(ys.min()),
        x0 + int(xs.max()) + 1,
        y0 + int(ys.max()) + 1,
        int(sub.sum()),
    )


def _refine_oversized(groups: list[tuple], mask: np.ndarray, settings: Settings) -> list[tuple]:
    """주변 요소보다 유독 길쭉하게 큰 덩어리만 XY-cut으로 다시 나눈다.

    시트에 늘어선 다른 요소들의 중앙값 크기를 기준으로 삼기 때문에,
    "두 칸이 맞닿아 하나로 붙은 경우"만 골라낸다. 캐릭터 한 명을 목에서
    자르는 식의 오탐은 크기 비율 조건에서 걸러진다.
    """
    if len(groups) < 3:
        return groups

    widths = [g[2] - g[0] for g in groups]
    heights = [g[3] - g[1] for g in groups]
    areas = [w * h for w, h in zip(widths, heights)]
    biggest = max(areas)
    majors = [i for i, a in enumerate(areas) if a >= 0.2 * biggest]
    if len(majors) < 3:
        return groups

    med_w = sorted(widths[i] for i in majors)[len(majors) // 2]
    med_h = sorted(heights[i] for i in majors)[len(majors) // 2]
    factor = settings.oversize_factor

    refined = []
    for i, g in enumerate(groups):
        over_h = heights[i] > factor * med_h
        over_w = widths[i] > factor * med_w
        if i not in majors or not (over_h or over_w):
            refined.append(g)
            continue

        axis = "both" if over_h and over_w else ("row" if over_h else "col")
        min_cell = int(0.4 * (med_h if axis == "row" else med_w))
        x0, y0, x1, y1 = g[0], g[1], g[2], g[3]
        cells = xy_cut(
            mask[y0:y1, x0:x1],
            valley_ratio=settings.valley_ratio,
            min_cell=max(8, min_cell),
            axis=axis,
        )
        boxes = [
            _content_box(mask, (c[0] + x0, c[1] + y0, c[2] + x0, c[3] + y0))
            for c in cells
        ]
        boxes = [b for b in boxes if b]
        if len(boxes) < 2:
            refined.append(g)
            continue
        refined.extend((b[0], b[1], b[2], b[3], b[4], list(g[5])) for b in boxes)
    return refined


def _attach_small_parts(
    labels: np.ndarray,
    parts: dict,
    ratio: float,
) -> tuple[dict, int]:
    """큰 요소 가까이 있는 작은 조각을 그 요소에 붙인다.

    전구의 빛살이나 별의 반짝임처럼, 떨어져 있지만 그 아이콘의 일부인
    장식을 살리기 위한 단계다. 거리는 요소 크기에 비례해 잡으므로
    이미지 해상도가 달라져도 같게 동작한다.

    한 번만 훑는다. 붙은 조각을 발판 삼아 연쇄로 번지게 하면, 자잘한
    조각이 많은 사진에서 서로 다른 피사체까지 줄줄이 이어져 버린다.
    """
    merged = {k: (v[0], v[1], v[2], v[3], v[4], [k]) for k, v in parts.items()}
    if ratio <= 0 or len(parts) < 2:
        return merged, 0

    box_area = {k: (v[2] - v[0]) * (v[3] - v[1]) for k, v in parts.items()}
    biggest = max(box_area.values())
    major = [k for k, a in box_area.items() if a >= 0.2 * biggest]
    pending = [k for k in parts if k not in set(major)]
    if not major or not pending:
        return merged, 0

    sides = sorted(max(parts[k][2] - parts[k][0], parts[k][3] - parts[k][1]) for k in major)
    # 올림으로 잡는다. 내림하면 기준선 바로 위에 걸친 장식이 1px 차이로 떨어져 나간다.
    reach = max(2, math.ceil(ratio * sides[len(sides) // 2]))
    h, w = labels.shape
    major_set = set(major)
    attached = 0

    for k in pending:
        x0, y0, x1, y1, _ = parts[k]
        wx0, wy0 = max(0, x0 - reach - 1), max(0, y0 - reach - 1)
        wx1, wy1 = min(w, x1 + reach + 1), min(h, y1 + reach + 1)
        window = labels[wy0:wy1, wx0:wx1]
        grown = dilate(window == k, reach)

        best, overlap = None, 0
        for label, count in zip(*np.unique(window[grown], return_counts=True)):
            label = int(label)
            if label in major_set and count > overlap:
                best, overlap = label, int(count)
        if best is None:
            continue

        bx0, by0, bx1, by1, area, members = merged[best]
        merged[best] = (min(bx0, x0), min(by0, y0), max(bx1, x1), max(by1, y1),
                        area + parts[k][4], members + [k])
        merged.pop(k, None)
        attached += 1

    return merged, attached


def _merge_overlapping(groups: list[tuple]) -> list[tuple]:
    """박스가 서로 겹치는 큰 조각끼리 합친다.

    막대그래프와 그 위에 떠 있는 화살표처럼, 떨어져 있지만 한 요소인 경우를
    이어 붙인다. 시트에 나란히 놓인 서로 다른 요소는 박스가 겹치지 않으므로
    잘못 합쳐지지 않는다. 작은 조각(이름표 등)은 대상에서 빼기 때문에
    설명 글씨가 딸려 들어가지도 않는다.
    """
    if len(groups) < 2:
        return groups
    areas = [(g[2] - g[0]) * (g[3] - g[1]) for g in groups]
    threshold = 0.2 * max(areas)

    result: list[list] = []
    for g, area in zip(groups, areas):
        current = [g[0], g[1], g[2], g[3], g[4], list(g[5])]
        if area < threshold:
            result.append(current)
            continue
        for other, other_area in zip(result, [(r[2] - r[0]) * (r[3] - r[1]) for r in result]):
            if other_area < threshold:
                continue
            wide = min(current[2], other[2]) - max(current[0], other[0])
            tall = min(current[3], other[3]) - max(current[1], other[1])
            smaller = min(area, other_area)
            # 스치듯 겹친 것과 실제로 한 요소가 쪼개진 것을 넓이로 가른다.
            # 시트에 촘촘히 놓인 요소들은 몇 픽셀만 겹치지만,
            # 한 요소의 조각들은 서로 깊이 겹친다.
            if wide > 0 and tall > 0 and wide * tall >= OVERLAP_SHARE * smaller:
                other[0], other[1] = min(other[0], current[0]), min(other[1], current[1])
                other[2], other[3] = max(other[2], current[2]), max(other[3], current[3])
                other[4] += current[4]
                other[5].extend(current[5])
                break
        else:
            result.append(current)
    return [tuple(r) for r in result]


def _drop_outlier_specks(groups: list[tuple], ratio: float) -> list[tuple]:
    """다른 요소들에 비해 유독 작은 조각을 버린다.

    시트 옆에 붙은 이름표, 반짝임 표시, 떨어져 나온 장식 조각처럼
    "요소로 셀 만한 것"이 아닌 것들이 여기서 걸러진다. 기준을 절대 크기가
    아니라 다른 요소들의 중앙값에 두기 때문에, 이미지 해상도가 달라져도
    똑같이 동작한다.
    """
    if ratio <= 0 or len(groups) < 3:
        return groups
    areas = sorted((g[2] - g[0]) * (g[3] - g[1]) for g in groups)
    median = areas[len(areas) // 2]
    if median <= 0:
        return groups
    kept = [g for g in groups if (g[2] - g[0]) * (g[3] - g[1]) >= ratio * median]
    return kept if kept else groups


def detect(
    rgba: np.ndarray,
    settings: Settings,
    path: str | Path | None = None,
    keep_arrays: bool = True,
) -> Detection:
    """이미지에서 요소 박스들을 찾는다."""
    h, w = rgba.shape[:2]
    mask, info = build_mask(
        rgba,
        tolerance=settings.tolerance,
        denoise=settings.denoise,
        fill=settings.fill,
        edge_barrier=settings.edge_barrier,
    )
    empty = Detection(Path(path) if path else None, (w, h), [], info,
                      rgba if keep_arrays else None, None)
    if not mask.any():
        info["elements"] = 0
        return empty

    labels, raw_boxes = label_separated(mask, settings.connectivity, settings.separation)

    # 장식을 먼저 붙이고 나서 걸러야 한다. 순서가 반대면 전구의 빛살처럼
    # 작은 장식이 최소 크기 필터에 먼저 걸려 사라진다.
    raw_parts = {i + 1: box for i, box in enumerate(raw_boxes)}
    pieces, attached = _attach_small_parts(labels, raw_parts, settings.attach_ratio)
    info["attached"] = attached

    min_area = max(1, int(settings.min_area_ratio * w * h))
    parts, members = {}, {}
    for key, (x0, y0, x1, y1, area, labels_in) in pieces.items():
        if (area >= min_area
                and (x1 - x0) >= settings.min_side
                and (y1 - y0) >= settings.min_side):
            parts[key] = (x0, y0, x1, y1, area)
            members[key] = labels_in
    if not parts:
        info["elements"] = 0
        return empty

    mode = settings.split_mode
    if mode == "none":
        boxes = list(parts.values())
        groups = [
            (
                min(b[0] for b in boxes),
                min(b[1] for b in boxes),
                max(b[2] for b in boxes),
                max(b[3] for b in boxes),
                sum(b[4] for b in boxes),
                [m for ms in members.values() for m in ms],
            )
        ]
    elif mode == "grid":
        groups = _assign_to_cells(parts, grid_cells(w, h, settings.grid_cols, settings.grid_rows))
        groups = [(g[0], g[1], g[2], g[3], g[4],
                   [m for key in g[5] for m in members.get(key, [key])]) for g in groups]
    elif mode == "xycut":
        groups = _assign_to_cells(parts, xy_cut(mask, valley_ratio=settings.valley_ratio))
        groups = [(g[0], g[1], g[2], g[3], g[4],
                   [m for key in g[5] for m in members.get(key, [key])]) for g in groups]
    elif mode in ("components", "auto"):
        candidates = [(v[0], v[1], v[2], v[3], v[4], k) for k, v in parts.items()]
        groups = _merge_boxes(candidates, settings.merge_gap)
        groups = [(g[0], g[1], g[2], g[3], g[4],
                   [m for key in g[5] for m in members.get(key, [key])]) for g in groups]
        if settings.merge_overlapping:
            groups = _merge_overlapping(groups)
        if mode == "auto":
            groups = _refine_oversized(groups, mask, settings)
    else:
        raise ValueError(f"알 수 없는 분할 모드: {mode}")

    if mode != "none":
        groups = _drop_outlier_specks(groups, settings.min_relative_area)

    # 위 -> 아래, 왼쪽 -> 오른쪽 (읽는 순서)
    if groups:
        heights = sorted(g[3] - g[1] for g in groups)
        row_tol = max(8, int(heights[len(heights) // 2] * 0.5))
        groups.sort(key=lambda g: (g[1] // row_tol, g[0]))

    elements = [
        Element(index=i, box=(g[0], g[1], g[2], g[3]), area=g[4], labels=tuple(sorted(set(g[5]))))
        for i, g in enumerate(groups, start=1)
    ]

    info["elements"] = len(elements)
    return Detection(
        Path(path) if path else None,
        (w, h),
        elements,
        info,
        rgba if keep_arrays else None,
        labels if keep_arrays else None,
    )


def padded_box(element: Element, settings: Settings) -> tuple[int, int, int, int]:
    x0, y0, x1, y1 = element.box
    pad = settings.padding + int(round(min(x1 - x0, y1 - y0) * settings.padding_ratio))
    return (x0 - pad, y0 - pad, x1 + pad, y1 + pad)


def render_element(detection: Detection, element: Element, settings: Settings) -> Image.Image:
    """요소 하나를 잘라 설정에 맞는 최종 이미지로 만든다."""
    assert detection.rgba is not None
    rgba = detection.rgba
    h, w = rgba.shape[:2]
    bg = parse_color(settings.background)
    if settings.image_format.lower() in ("jpg", "jpeg") and bg[3] == 0:
        bg = (255, 255, 255, 255)

    x0, y0, x1, y1 = padded_box(element, settings)
    canvas_w, canvas_h = x1 - x0, y1 - y0
    canvas = np.empty((canvas_h, canvas_w, 4), dtype=np.uint8)
    canvas[:, :] = bg

    sx0, sy0 = max(x0, 0), max(y0, 0)
    sx1, sy1 = min(x1, w), min(y1, h)
    if sx1 > sx0 and sy1 > sy0:
        patch = rgba[sy0:sy1, sx0:sx1].copy()
        if settings.cutout and detection.labels is not None:
            keep = np.isin(detection.labels[sy0:sy1, sx0:sx1], element.labels)
            # 여백 때문에 잘려 들어온 이웃 요소는 지운다.
            # (맞닿아 있다가 나뉜 요소는 원본 라벨을 공유하므로 박스로 걸러야 한다)
            bx0, by0, bx1, by1 = element.box
            inside = np.zeros_like(keep)
            ix0, iy0 = max(bx0, sx0) - sx0, max(by0, sy0) - sy0
            ix1, iy1 = min(bx1, sx1) - sx0, min(by1, sy1) - sy0
            if ix1 > ix0 and iy1 > iy0:
                inside[iy0:iy1, ix0:ix1] = True
            keep &= inside
            patch[:, :, 3] = np.where(keep, patch[:, :, 3], 0)
            if bg[3] != 0:  # 불투명 배경 위에 합성
                blended = np.where(keep[:, :, None], patch[:, :, :3], np.array(bg[:3], dtype=np.uint8))
                patch[:, :, :3] = blended
                patch[:, :, 3] = 255
        canvas[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = patch

    img = Image.fromarray(canvas, mode="RGBA")
    img = _apply_output_mode(img, settings, bg)

    if settings.image_format.lower() in ("jpg", "jpeg"):
        flat = Image.new("RGB", img.size, bg[:3])
        flat.paste(img, mask=img.split()[3])
        return flat
    return img


def _apply_output_mode(img: Image.Image, settings: Settings, bg) -> Image.Image:
    mode = settings.output_mode
    if mode == "tight":
        return img

    if mode == "square":
        side = max(img.size)
        target = (side, side)
        scaled = img
    elif mode == "fixed":
        target = (max(1, settings.out_width), max(1, settings.out_height))
        scale = min(target[0] / img.width, target[1] / img.height)
        if settings.fit == "cover":
            scale = max(target[0] / img.width, target[1] / img.height)
        if not settings.allow_upscale:
            scale = min(scale, 1.0)
        new_size = (max(1, round(img.width * scale)), max(1, round(img.height * scale)))
        scaled = img.resize(new_size, Image.LANCZOS) if new_size != img.size else img
    else:
        raise ValueError(f"알 수 없는 출력 모드: {mode}")

    if mode == "fixed" and settings.fit == "cover":
        # 목표 크기를 넘치게 키운 뒤 가운데를 잘라낸다
        left = max(0, (scaled.width - target[0]) // 2)
        top = max(0, (scaled.height - target[1]) // 2)
        scaled = scaled.crop((left, top, left + target[0], top + target[1]))

    canvas = Image.new("RGBA", target, bg)
    canvas.paste(scaled, ((target[0] - scaled.width) // 2, (target[1] - scaled.height) // 2))
    return canvas


def output_name(stem: str, index: int, total: int, settings: Settings) -> str:
    ext = {"jpg": "jpg", "jpeg": "jpg", "png": "png", "webp": "webp"}[settings.image_format.lower()]
    base = settings.name_template.format(stem=stem, index=index, total=total)
    return f"{base}.{ext}"


def process_file(
    path: str | Path,
    out_dir: str | Path,
    settings: Settings,
    overwrite: bool = True,
) -> tuple[Detection, list[tuple[Path, tuple[int, int]]]]:
    """파일 하나를 처리하고 (저장 경로, 최종 크기) 목록을 반환한다."""
    path = Path(path)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    rgba = load_rgba(path)
    detection = detect(rgba, settings, path=path)
    written: list[tuple[Path, tuple[int, int]]] = []

    for element in detection.elements:
        img = render_element(detection, element, settings)
        name = output_name(path.stem, element.index, len(detection.elements), settings)
        target = out_dir / name
        if not overwrite:
            target = _unique_path(target)
        params = {}
        if settings.image_format.lower() in ("jpg", "jpeg"):
            params = {"quality": settings.jpeg_quality, "subsampling": 0}
        elif settings.image_format.lower() == "webp":
            params = {"quality": settings.jpeg_quality}
        img.save(target, **params)
        written.append((target, img.size))

    return detection, written


def _unique_path(path: Path) -> Path:
    if not path.exists():
        return path
    for n in range(2, 1000):
        candidate = path.with_name(f"{path.stem}({n}){path.suffix}")
        if not candidate.exists():
            return candidate
    return path


def collect_images(paths, recursive: bool = False) -> list[Path]:
    if isinstance(paths, (str, Path)):
        paths = [paths]
    found: list[Path] = []
    for raw in paths:
        if not raw:
            continue
        p = Path(raw)
        if p.is_dir():
            it = p.rglob("*") if recursive else p.glob("*")
            found.extend(sorted(f for f in it if f.suffix.lower() in SUPPORTED_INPUTS))
        elif p.suffix.lower() in SUPPORTED_INPUTS:
            found.append(p)
    seen, unique = set(), []
    for f in found:
        key = f.resolve()
        if key not in seen:
            seen.add(key)
            unique.append(f)
    return unique


def preset(name: str, base: Settings | None = None) -> Settings:
    """자주 쓰는 설정 묶음."""
    base = base or Settings()
    presets = {
        "trim": dict(split_mode="none", output_mode="tight", padding=0),
        "split": dict(split_mode="auto", output_mode="tight", padding=0),
        "cutout": dict(split_mode="auto", cutout=True, background="transparent", image_format="png"),
        "sprite": dict(split_mode="auto", cutout=True, background="transparent",
                       image_format="png", output_mode="square", padding_ratio=0.02),
        "thumb": dict(split_mode="none", output_mode="fixed", out_width=1000, out_height=1000,
                      fit="contain", padding_ratio=0.04, background="white", image_format="jpg"),
    }
    if name not in presets:
        raise ValueError(f"알 수 없는 프리셋: {name} (가능: {', '.join(presets)})")
    return replace(base, **presets[name])
