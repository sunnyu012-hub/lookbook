"""캐릭터 시트에서 베이스와 의상을 잘라낸다.

    npm run wardrobe:extract

시트는 assets/source-sheets/char-*.png 에 있다. 잘라낸 것은
public/assets/wardrobe/<종류>/<id>.webp 로 나간다.

의상 시트는 한 장에 격자로 그려져 있어서, 알파 덩어리를 찾아
줄로 묶고 왼쪽부터 번호를 매긴 뒤 아래 매핑 표와 연결한다.
그림만 보고 이름을 추측하지 않는다 — 표에 적힌 대로만 간다.
"""
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEETS = os.path.join(ROOT, "assets/source-sheets")
OUT = os.path.join(ROOT, "public/assets/wardrobe")

# 줄이지 않는다.
# 베이스와 의상은 같은 시트 배율로 그려져 있어서, 하나만 줄이면 그 배율이 깨진다.
# 화면에서 작게 보이는 건 렌더러가 통째로 줄이면 된다.
MAX = 1400

# 시트마다 덩어리가 붙어 있는 정도가 달라서 따로 잡는다
PARAMS = {
    "char-base": dict(dilate=7, min_area=3000, row_h=500),
    "char-top": dict(dilate=7, min_area=3000, row_h=300),
    "char-bottom": dict(dilate=7, min_area=3000, row_h=300),
}

# 두 벌이 붙어 나온 조각. (시트, 조각번호) → 나눌 x 비율
SPLIT = {
    ("char-top", 9): 0.5,
    ("char-top", 12): 0.5,
}

# ── 매핑 ────────────────────────────────────────────────
# 자른 순서(왼→오른쪽, 위→아래)와 아이템 id 를 잇는다.

BASE_MAP = {
    "body": 0,   # 서 있는 베이스 (같은 포즈가 둘 있는데 왼쪽을 쓴다)
    "head_front": 2,
    "head_side": 3,
    "head_back": 4,
}

TOP_MAP = [
    "cream_tee", "charcoal_tee", "navy_stripe_tee", "grey_hoodie",
    "grey_sweat", "brown_knit", "cream_cardigan", "blue_shirt",
    "denim_jacket", "black_track_jacket", "navy_rugby", "pink_cardigan",
    "white_shirt", "green_track_jacket", "mountain_tee", "sage_cable_knit",
]

BOTTOM_MAP = [
    "blue_jeans", "light_wide_jeans", "brown_slacks", "black_slacks",
    "beige_pants", "khaki_cargo", "cream_sweatpants", "charcoal_sweatpants",
    "denim_shorts", "black_shorts", "cream_pleats", "black_pleats",
    "denim_long_skirt", "beige_flare_skirt", "pink_pleats", "cream_overalls",
]


def clean_alpha(im):
    """가장자리에 남은 압축 찌꺼기(빨강·노랑 점)를 지운다."""
    a = np.array(im)
    alpha = a[..., 3].astype(np.int16)
    r, g, b = a[..., 0].astype(np.int16), a[..., 1].astype(np.int16), a[..., 2].astype(np.int16)
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    alpha[(alpha < 200) & ((mx - mn) > 110)] = 0
    alpha[alpha < 24] = 0
    a[..., 3] = alpha.astype(np.uint8)
    return Image.fromarray(a, "RGBA")


def drop_fragments(im, keep_ratio=0.10):
    """옆 조각이 잘려 들어온 부스러기를 지운다."""
    a = np.array(im)
    mask = a[..., 3] > 40
    labels, n = ndimage.label(ndimage.binary_dilation(mask, structure=np.ones((5, 5))))
    if n <= 1:
        return im
    sizes = ndimage.sum(mask, labels, range(1, n + 1))
    keep = [i + 1 for i, s in enumerate(sizes) if s >= sizes.max() * keep_ratio]
    a[..., 3] = np.where(np.isin(labels, keep), a[..., 3], 0)
    out = Image.fromarray(a, "RGBA")
    bb = out.getbbox()
    return out.crop(bb) if bb else out


def slice_sheet(name, dilate=7, min_area=3000, row_h=300):
    """시트 하나를 조각으로 나눈다. 왼→오른쪽, 위→아래 순서."""
    path = os.path.join(SHEETS, f"{name}.png")
    if not os.path.exists(path):
        return None, []

    im = clean_alpha(Image.open(path).convert("RGBA"))
    mask = np.array(im)[..., 3] > 40
    labels, _ = ndimage.label(ndimage.binary_dilation(mask, structure=np.ones((dilate, dilate))))

    boxes = []
    for sl in ndimage.find_objects(labels):
        y, x = sl
        if mask[sl].sum() < min_area:
            continue
        boxes.append((x.start, y.start, x.stop, y.stop))
    boxes.sort(key=lambda b: (round(b[1] / row_h), b[0]))

    # 두 벌이 붙어 나온 것은 반으로 나눈다
    out = []
    for i, box in enumerate(boxes):
        ratio = SPLIT.get((name, i))
        if ratio is None:
            out.append(box)
            continue
        mid = box[0] + int((box[2] - box[0]) * ratio)
        out.append((box[0], box[1], mid, box[3]))
        out.append((mid, box[1], box[2], box[3]))
    return im, out


def save(im, box, folder, item_id):
    piece = drop_fragments(im.crop(box))
    bb = piece.getbbox()
    if bb:
        piece = piece.crop(bb)
    if max(piece.size) > MAX:
        piece.thumbnail((MAX, MAX), Image.LANCZOS)

    directory = os.path.join(OUT, folder)
    os.makedirs(directory, exist_ok=True)
    piece.save(os.path.join(directory, f"{item_id}.webp"), "WEBP", quality=92, method=6)
    return piece.size


def main():
    if not os.path.isdir(SHEETS):
        print(f"시트가 없다: {SHEETS}")
        return 0

    made = 0

    im, boxes = slice_sheet("char-base", **PARAMS["char-base"])
    if im is not None:
        print(f"char-base: {len(boxes)} 조각")
        for item_id, index in BASE_MAP.items():
            if index >= len(boxes):
                print(f"  조각 없음: {item_id} ({index})")
                continue
            size = save(im, boxes[index], "base", item_id)
            print(f"  base/{item_id:12} {size}")
            made += 1

    for sheet, folder, mapping in [
        ("char-top", "top", TOP_MAP),
        ("char-bottom", "bottom", BOTTOM_MAP),
    ]:
        im, boxes = slice_sheet(sheet, **PARAMS[sheet])
        if im is None:
            continue
        print(f"{sheet}: {len(boxes)} 조각 · 표 {len(mapping)}개")
        if len(boxes) != len(mapping):
            print(f"  ⚠ 조각 수와 표가 다르다. 표를 고치거나 SPLIT 을 손봐야 한다.")
        for index, item_id in enumerate(mapping):
            if index >= len(boxes):
                print(f"  조각 없음: {item_id} ({index})")
                continue
            size = save(im, boxes[index], folder, item_id)
            print(f"  {folder}/{item_id:22} {size}")
            made += 1

    print(f"\n잘라낸 것 {made}개 → public/assets/wardrobe/")
    print("다음: npm run wardrobe:align (정렬 좌표 계산)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
