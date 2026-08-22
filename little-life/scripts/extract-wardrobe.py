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

# 격자로 그려진 시트. (칸 수, 줄 수) 를 알면 붙어 나와도 나눌 수 있다.
# 원피스는 옆 벌과 손끝이 닿아 있어서 덩어리로는 안 갈라진다.
GRID = {
    "char-onepiece": (4, 3),
    "char-shoes": (4, 3),
    "char-hair": (4, 3),
    "char-face": (3, 4),
    "char-acc": (4, 4),
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

ONE_PIECE_MAP = [
    "cream_shirt_dress", "navy_pinafore", "pink_knit_dress", "black_slip_dress",
    "beige_long_overalls", "denim_long_overalls", "khaki_jumpsuit", "bear_fleece_onesie",
    "pink_gingham_dress", "black_puff_dress", "cardigan_skirt_set", "trench_set",
]

SHOES_MAP = [
    "white_sneakers", "navy_sneakers", "black_loafers", "brown_loafers",
    "cream_mary_janes", "black_derby", "pink_runners", "beige_canvas",
    "brown_boots", "yellow_rainboots", "bunny_slippers", "khaki_trail",
]

HAIR_MAP = [
    "brown_bob", "brown_short_wave", "dark_mid_wave", "brown_long_straight",
    "brown_shoulder", "black_long", "brown_curly_long", "blonde_long_wave",
    "brown_low_pony", "brown_bun_wave", "ash_short", "navy_short_wave",
]

FACE_MAP = [
    "smile", "grin", "laugh",
    "soft_smile", "wink", "calm",
    "sleepy", "surprised", "oh",
    "pout", "teary", "playful_wink",
]

ACC_MAP = [
    "cream_beanie", "charcoal_beanie", "black_cap", "beige_beret",
    "gingham_headband", "flower_bow", "round_glasses", "clear_glasses",
    "gold_earrings", "cream_saddle_bag", "canvas_tote", "pink_backpack",
    "brown_hobo_bag", "gingham_pouch", "khaki_chalk_bag", "flower_umbrella",
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


def punch_face(im):
    """머리 조각의 얼굴 자리를 뚫는다.

    머리 그림은 머리카락과 머리통이 통째로 그려져 있고 얼굴만 밝은 살색으로 비어 있다.
    그대로 얹으면 밑에 깔린 표정을 덮어버린다.

    가장자리에 닿지 않는 덩어리만 지운다 — 그래야 밝은 금발을 얼굴로 착각하지 않는다.
    """
    a = np.array(im).astype(int)
    h, w = a.shape[:2]
    rgb = a[..., :3]
    skin = (rgb.min(2) > 212) & (rgb[..., 0] > 236) & (a[..., 3] > 200)
    labels, n = ndimage.label(skin)

    best, best_size = None, 0
    for i in range(1, n + 1):
        ys, xs = np.where(labels == i)
        if len(ys) < h * w * 0.02:
            continue
        if ys.min() == 0 or xs.min() == 0 or ys.max() == h - 1 or xs.max() == w - 1:
            continue
        if len(ys) > best_size:
            best, best_size = labels == i, len(ys)

    if best is None:
        return im, False

    # 경계에 남는 밝은 테를 조금 더 먹어 들어간다. 안 그러면 얼굴 둘레에 흰 띠가 생긴다.
    grown = ndimage.binary_dilation(best, structure=np.ones((3, 3)), iterations=2)
    out = np.array(im)
    out[..., 3] = np.where(grown, 0, out[..., 3])
    return Image.fromarray(out, "RGBA"), True


def drop_fragments(im, keep_ratio=0.18):
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


def slice_grid(name, cols, rows):
    """격자로 그려진 시트를 칸마다 하나씩 떼어낸다.

    칸 한가운데에 닿아 있는 덩어리를 가져온다. 그 덩어리가 옆 칸까지
    이어져 있으면(손끝이 닿은 경우) 칸 네모로 잘라 쓴다.
    """
    path = os.path.join(SHEETS, f"{name}.png")
    if not os.path.exists(path):
        return None, []

    im = clean_alpha(Image.open(path).convert("RGBA"))
    mask = np.array(im)[..., 3] > 40
    labels, _ = ndimage.label(ndimage.binary_dilation(mask, structure=np.ones((5, 5))))
    H, W = mask.shape
    cell_w, cell_h = W / cols, H / rows

    boxes = []
    for r in range(rows):
        for c in range(cols):
            left, right = int(c * cell_w), int((c + 1) * cell_w)
            top, bottom = int(r * cell_h), int((r + 1) * cell_h)

            value = labels[int((r + 0.5) * cell_h), int((c + 0.5) * cell_w)]
            if value == 0:
                sub = labels[top:bottom, left:right]
                vals, counts = np.unique(sub[sub > 0], return_counts=True)
                value = vals[counts.argmax()] if len(vals) else 0

            if value == 0:
                continue

            ys, xs = np.where(labels == value)
            x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)

            # 옆 칸까지 이어져 있을 때만 칸 네모로 자른다.
            # 무조건 자르면 칸보다 큰 그림(얼굴처럼)이 턱에서 잘린다.
            if x1 - x0 > cell_w * 1.3:
                x0, x1 = max(x0, left), min(x1, right)
            if y1 - y0 > cell_h * 1.3:
                y0, y1 = max(y0, top), min(y1, bottom)

            boxes.append((x0, y0, x1, y1))
    return im, boxes


def save(im, box, folder, item_id):
    piece = drop_fragments(im.crop(box))
    if folder == "hair":
        piece, punched = punch_face(piece)
        if not punched:
            print(f"    ⚠ 얼굴 자리를 못 찾음: {item_id}")
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

    for sheet, folder, mapping in [
        ("char-onepiece", "onepiece", ONE_PIECE_MAP),
        ("char-shoes", "shoes", SHOES_MAP),
        ("char-hair", "hair", HAIR_MAP),
        ("char-face", "face", FACE_MAP),
        ("char-acc", "acc", ACC_MAP),
    ]:
        cols, rows = GRID[sheet]
        im, boxes = slice_grid(sheet, cols, rows)
        if im is None:
            continue
        print(f"{sheet}: {len(boxes)} 칸 · 표 {len(mapping)}개")
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
