"""배경 추정과 전경 마스크 생성/정리."""

from __future__ import annotations

import numpy as np

from .labeling import label_components

AUTO = "auto"
BLUR_RADIUS = 2  # 경계 계산 전 살짝 흐리는 반경


def _integral_box_sum(binary: np.ndarray, radius: int) -> np.ndarray:
    """(2r+1)x(2r+1) 정사각 윈도우 합. 적분 이미지라 반지름과 무관하게 O(N)."""
    h, w = binary.shape
    integral = np.zeros((h + 1, w + 1), dtype=np.int32)
    np.cumsum(np.cumsum(binary.astype(np.int32), axis=0), axis=1, out=integral[1:, 1:])

    y0 = np.clip(np.arange(h) - radius, 0, h)
    y1 = np.clip(np.arange(h) + radius + 1, 0, h)
    x0 = np.clip(np.arange(w) - radius, 0, w)
    x1 = np.clip(np.arange(w) + radius + 1, 0, w)

    total = (
        integral[np.ix_(y1, x1)]
        - integral[np.ix_(y0, x1)]
        - integral[np.ix_(y1, x0)]
        + integral[np.ix_(y0, x0)]
    )
    counts = np.outer(y1 - y0, x1 - x0)
    return total, counts


def dilate(mask: np.ndarray, radius: int) -> np.ndarray:
    if radius <= 0:
        return mask
    total, _ = _integral_box_sum(mask, radius)
    return total > 0


def erode(mask: np.ndarray, radius: int) -> np.ndarray:
    if radius <= 0:
        return mask
    total, counts = _integral_box_sum(mask, radius)
    return total >= counts


def clean_mask(mask: np.ndarray, denoise: int = 0, fill: int = 0) -> np.ndarray:
    """열기(점 노이즈 제거) 후 닫기(요소 내부 구멍 메우기)."""
    if denoise > 0:
        mask = dilate(erode(mask, denoise), denoise)
    if fill > 0:
        mask = erode(dilate(mask, fill), fill)
    return mask


def box_blur(channel: np.ndarray, radius: int) -> np.ndarray:
    if radius <= 0:
        return channel.astype(np.float32)
    total, counts = _integral_box_sum(channel.astype(np.int32), radius)
    return (total / counts).astype(np.float32)


def gradient_magnitude(rgb: np.ndarray, radius: int = 2) -> np.ndarray:
    """살짝 흐린 명도에서 구한 경계 세기. 배경 텍스처보다 피사체 윤곽이 훨씬 강하다."""
    gray = box_blur(rgb.astype(np.float32).mean(axis=2), radius)
    gy, gx = np.gradient(gray)
    return np.hypot(gx, gy)


def border_samples(rgb: np.ndarray, ring: int) -> np.ndarray:
    h, w = rgb.shape[:2]
    ring = max(1, min(ring, h // 2, w // 2))
    parts = [
        rgb[:ring].reshape(-1, 3),
        rgb[-ring:].reshape(-1, 3),
        rgb[ring:-ring, :ring].reshape(-1, 3),
        rgb[ring:-ring, -ring:].reshape(-1, 3),
    ]
    return np.concatenate([p for p in parts if p.size])


def estimate_background(rgb: np.ndarray, ring_ratio: float = 0.02) -> np.ndarray:
    """테두리 픽셀의 중앙값을 배경색으로 본다."""
    h, w = rgb.shape[:2]
    ring = max(2, int(min(h, w) * ring_ratio))
    return np.median(border_samples(rgb, ring), axis=0)


def color_distance(rgb: np.ndarray, bg: np.ndarray) -> np.ndarray:
    """채널별 최대 차이(체비셰프 거리). 밝기 차이에 과민하지 않다."""
    return np.abs(rgb.astype(np.int16) - bg.astype(np.int16)).max(axis=2)


def otsu_threshold(distance: np.ndarray) -> int:
    """거리 히스토그램을 배경/전경 두 무리로 가르는 임계값(Otsu)."""
    hist = np.bincount(distance.ravel().astype(np.int64), minlength=256).astype(np.float64)
    total = hist.sum()
    if total == 0:
        return 32
    levels = np.arange(256)
    omega = np.cumsum(hist) / total
    mu = np.cumsum(hist * levels) / total
    mu_total = mu[-1]
    denom = omega * (1.0 - omega)
    with np.errstate(divide="ignore", invalid="ignore"):
        variance = (mu_total * omega - mu) ** 2 / denom
    variance[~np.isfinite(variance)] = -1.0
    return int(np.argmax(variance))


def ring_values(field: np.ndarray, ring_ratio: float = 0.02) -> np.ndarray:
    h, w = field.shape
    ring = max(2, int(min(h, w) * ring_ratio))
    return np.concatenate(
        [
            field[:ring].ravel(),
            field[-ring:].ravel(),
            field[ring:-ring, :ring].ravel(),
            field[ring:-ring, -ring:].ravel(),
        ]
    )


def auto_tolerance(distance: np.ndarray, ring_ratio: float = 0.02) -> int:
    """배경 종류를 먼저 판별하고 그에 맞는 임계값을 고른다.

    - 깨끗한 단색/투명 배경(스티커 시트, 에셋 시트): 배경 잡음 바로 위로 낮게 잡는다.
      Otsu를 쓰면 임계값이 너무 높아져 흰 모자·수건 같은 밝은 부분이 배경으로 샌다.
    - 텍스처가 있는 배경(실사 사진): Otsu로 두 무리를 가른다.
    """
    edge = ring_values(distance, ring_ratio)
    noise = float(np.percentile(edge, 90))  # p99는 테두리에 닿은 피사체에 흔들린다
    if noise <= 10.0:
        return int(np.clip(round(noise) + 10, 10, 40))
    texture_floor = float(np.percentile(edge, 75)) + 4.0
    return int(np.clip(max(otsu_threshold(distance), texture_floor), 6, 140))


def border_connected(region: np.ndarray) -> np.ndarray:
    """이미지 테두리와 이어진 영역만 남긴다 (테두리에서 시작하는 flood fill)."""
    if not region.any():
        return region
    labels, boxes = label_components(region, connectivity=4)
    touching = np.unique(
        np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]])
    )
    touching = touching[touching > 0]
    if touching.size == 0:
        return np.zeros_like(region)
    keep = np.zeros(len(boxes) + 1, dtype=bool)
    keep[touching] = True
    return keep[labels]


def build_mask(
    rgba: np.ndarray,
    tolerance: int | str = AUTO,
    alpha_threshold: int = 8,
    denoise: int = 1,
    fill: int = 0,
    edge_barrier: float = 1.0,
    flood_from_border: bool = True,
    scale_morphology: bool = True,
) -> tuple[np.ndarray, dict]:
    """전경 마스크와 진단 정보를 반환한다.

    알파 채널이 실제로 쓰이면 알파를 우선한다. 그렇지 않으면
    (1) 테두리에서 추정한 배경색과의 색 거리,
    (2) 피사체 윤곽을 막아 주는 경계 장벽,
    (3) 테두리에서 시작하는 flood fill
    을 조합해 배경을 판정한다. 배경과 색이 비슷한 흰 옷도 (2)(3) 덕분에
    통째로 살아남는다.
    """
    rgb = rgba[:, :, :3]
    alpha = rgba[:, :, 3]
    h, w = alpha.shape
    info: dict = {}

    if scale_morphology:
        scale = max(1.0, min(h, w) / 700.0)
        denoise = int(round(denoise * scale))
        fill = int(round(fill * scale))
    info["denoise"] = denoise
    info["fill"] = fill

    if int(alpha.min()) < 250:
        info["source"] = "alpha"
        info["tolerance"] = int(alpha_threshold)
        mask = alpha > alpha_threshold
    else:
        bg = estimate_background(rgb)
        distance = color_distance(rgb, bg)
        tol = auto_tolerance(distance) if tolerance == AUTO else int(tolerance)
        info["source"] = "color"
        info["background"] = tuple(int(v) for v in bg)
        info["tolerance"] = tol

        background_like = distance <= tol
        blocked = None
        if edge_barrier > 0:
            gm = gradient_magnitude(rgb, radius=BLUR_RADIUS)
            # 깨끗한 단색 배경에서는 테두리 경계값이 0에 가까워지므로 하한을 둔다.
            gtol = max(float(np.percentile(ring_values(gm), 98)), 1.5) / max(edge_barrier, 1e-3)
            info["edge_threshold"] = round(gtol, 3)
            blocked = background_like & (gm > gtol)

        if not flood_from_border:
            mask = ~background_like
        else:
            flood_source = background_like if blocked is None else (background_like & ~blocked)
            region = border_connected(flood_source)
            if blocked is not None and region.any():
                # 장벽은 flood가 피사체 안으로 새는 것만 막으면 된다.
                # 배경 쪽에 맞닿은 장벽 띠는 다시 배경으로 되돌려야 크롭이 딱 맞는다.
                recover = BLUR_RADIUS + 1
                region |= blocked & dilate(region, recover)
            mask = ~region

    mask = clean_mask(mask, denoise=denoise, fill=fill)
    info["coverage"] = float(mask.mean())
    return mask, info
