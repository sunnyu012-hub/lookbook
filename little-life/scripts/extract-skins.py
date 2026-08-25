"""캐릭터 스킨 시트에서 열두 모습을 잘라낸다.

    npm run assets:skins

    assets/source-sheets/skins-1.png   베이직 · 코지 홈 · 카페 워크 · 클라이밍
    assets/source-sheets/skins-2.png   레이니 · 위켄드 · 데이트 · 크리에이티브
    assets/source-sheets/skins-3.png   나이트 아울 · 스프링 피크닉 · 윈터 코지 · 문 앨리

    → public/assets/characters/<스킨id>.webp

── 이 스크립트가 실제로 푸는 문제 ──────────────────────

하나. 시트 배경이 흰색이다 (동료 시트는 투명이었다).
      전체를 밝기로 자르면 크림색 후드와 흰 양말까지 같이 사라진다.
      그래서 "가장자리와 이어진 흰색" 만 지운다 — 옷 안쪽의 흰색은
      캐릭터 윤곽선에 둘러싸여 있어서 가장자리와 이어지지 않는다.

둘. 열두 장의 키가 제각각이다. 우산은 머리 위로 솟고, 문 앨리는 머리카락이 길다.
     잘라낸 그대로 화면에서 같은 높이로 그리면, 우산 쓴 모습만 몸이 작아진다.
     그래서 열둘 다 같은 크기 캔버스에 올리고, 발끝을 같은 줄에 맞춘다.
     화면에서는 그냥 같은 크기로 그리면 몸 크기가 저절로 맞는다.

셋. 가운데를 상자 기준으로 잡으면 우산 쪽으로 캐릭터가 밀린다.
     그래서 아래쪽(발) 기준으로 가운데를 잡는다. 서 있는 자리가 기준이다.

시트가 없으면 이미 내보낸 파일은 그대로 두고 조용히 끝난다.
"""
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEETS = os.path.join(ROOT, "assets/source-sheets")
OUT = os.path.join(ROOT, "public/assets/characters")

# 시트마다 왼쪽위 · 오른쪽위 · 왼쪽아래 · 오른쪽아래 순서
LAYOUT = [
    ("skins-1.png", ["basic_day", "cozy_home", "cafe_work", "climbing_day"]),
    ("skins-2.png", ["rainy_day", "weekend_casual", "date_day", "creative_day"]),
    ("skins-3.png", ["night_owl", "spring_picnic", "winter_cozy", "moon_alley"]),
]

# 내보낼 캔버스의 긴 변. 홈에서는 150px 남짓으로 보이지만
# 미리보기와 고해상도 화면을 생각해 넉넉히 둔다.
MAX_SIDE = 640

# 이보다 밝으면 배경 후보. 크림색 옷(240 근처)까지 잡히지만,
# 가장자리와 이어진 것만 지우기 때문에 옷은 살아남는다.
WHITE = 236

# 윤곽선 바깥의 반투명한 테두리를 부드럽게 만드는 구간
EDGE_DARK = 205


def cut_background(rgb):
    """가장자리와 이어진 흰색만 지우고 alpha 를 만든다."""
    arr = np.asarray(rgb).astype(np.int16)
    whiteish = arr.min(axis=2) > WHITE

    labels, _ = ndimage.label(whiteish)
    edges = np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]])
    outside = set(np.unique(edges).tolist())
    outside.discard(0)
    if not outside:
        return np.full(arr.shape[:2], 255, dtype=np.uint8)

    background = np.isin(labels, sorted(outside))
    alpha = np.where(background, 0, 255).astype(np.uint8)

    # 윤곽선 바깥 한 겹은 반쯤 투명하게 둔다. 딱 잘라내면 흰 테가 남는다.
    rim = ndimage.binary_dilation(background, np.ones((3, 3))) & ~background
    lum = arr.mean(axis=2)
    soft = np.clip((255 - lum) / (255 - EDGE_DARK), 0, 1)
    alpha = np.where(rim, (soft * 255).astype(np.uint8), alpha)
    return alpha


def quadrants(h, w):
    """2x2. 가운데를 반으로 나눈다 — 시트가 그렇게 그려져 있다."""
    mid_y, mid_x = h // 2, w // 2
    return [
        (0, mid_y, 0, mid_x),
        (0, mid_y, mid_x, w),
        (mid_y, h, 0, mid_x),
        (mid_y, h, mid_x, w),
    ]


def content_box(alpha):
    """알맹이가 든 상자. 없으면 None."""
    rows = np.where(alpha.max(axis=1) > 24)[0]
    cols = np.where(alpha.max(axis=0) > 24)[0]
    if rows.size == 0 or cols.size == 0:
        return None
    return int(rows[0]), int(rows[-1]) + 1, int(cols[0]), int(cols[-1]) + 1


def foot_center(alpha, y0, y1, x0, x1):
    """서 있는 자리의 가로 가운데.

    상자 가운데를 쓰면 우산이나 등불 쪽으로 캐릭터가 밀린다.
    아래 12% 는 거의 신발이라 그걸 기준으로 잡는다.
    """
    band_top = max(y0, y1 - max(4, int((y1 - y0) * 0.12)))
    band = alpha[band_top:y1, x0:x1]
    cols = np.where(band.max(axis=0) > 24)[0]
    if cols.size == 0:
        return (x0 + x1) / 2
    return x0 + (float(cols[0]) + float(cols[-1]) + 1) / 2


def main():
    found = [(name, ids) for name, ids in LAYOUT if os.path.exists(os.path.join(SHEETS, name))]
    if not found:
        print("시트가 없습니다. 이미 뽑아둔 파일은 그대로 둡니다.")
        print(f"  넣을 곳: {SHEETS}/skins-1.png · skins-2.png · skins-3.png")
        return 0

    os.makedirs(OUT, exist_ok=True)
    pieces = []  # (skin_id, RGBA 배열, 상자, 발 가운데)

    for name, ids in found:
        path = os.path.join(SHEETS, name)
        image = Image.open(path).convert("RGB")
        alpha = cut_background(image)
        rgb = np.asarray(image)
        h, w = alpha.shape

        for (y0, y1, x0, x1), skin_id in zip(quadrants(h, w), ids):
            part_alpha = alpha[y0:y1, x0:x1]
            box = content_box(part_alpha)
            if box is None:
                print(f"  ! {skin_id}: 빈 칸입니다 ({name})")
                continue

            by0, by1, bx0, bx1 = box
            center = foot_center(part_alpha, by0, by1, bx0, bx1)
            rgba = np.dstack([rgb[y0:y1, x0:x1], part_alpha])
            pieces.append((skin_id, rgba, box, center))

    if not pieces:
        print("잘라낼 것이 없습니다.")
        return 1

    # ── 열둘을 같은 캔버스에 올린다 ────────────────────
    # 발끝을 같은 줄에, 서 있는 자리를 같은 세로선에 둔다.
    # 그래야 화면에서 같은 크기로 그렸을 때 몸 크기가 저절로 맞는다.
    left = max(int(c - b[2]) for _, _, b, c in pieces)
    right = max(int(b[3] - c) for _, _, b, c in pieces)
    tall = max(b[1] - b[0] for _, _, b, _ in pieces)

    pad = 12
    canvas_w = left + right + pad * 2
    canvas_h = tall + pad * 2
    scale = min(1.0, MAX_SIDE / max(canvas_w, canvas_h))

    print(f"캔버스 {canvas_w}x{canvas_h} · 배율 {scale:.3f}")

    for skin_id, rgba, (by0, by1, bx0, bx1), center in pieces:
        crop = Image.fromarray(rgba[by0:by1, bx0:bx1], "RGBA")
        canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
        # 발끝을 아래 여백 위에, 서 있는 자리를 가운데에
        x = pad + left - int(round(center - bx0))
        y = canvas_h - pad - crop.height
        canvas.paste(crop, (x, y), crop)

        if scale < 1.0:
            size = (int(round(canvas_w * scale)), int(round(canvas_h * scale)))
            canvas = canvas.resize(size, Image.LANCZOS)

        out = os.path.join(OUT, f"{skin_id}.webp")
        canvas.save(out, "WEBP", quality=92, method=6)
        kb = os.path.getsize(out) / 1024
        print(f"  {skin_id:16s} {crop.width:4d}x{crop.height:4d} → {kb:6.1f}KB")

    print(f"\n{len(pieces)}장 저장: {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
