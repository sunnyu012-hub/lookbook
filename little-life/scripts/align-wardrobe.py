"""의상을 베이스에 맞추는 좌표를 그림에서 계산한다.

    npm run wardrobe:align

CSS 에서 눈대중으로 아이템마다 margin 을 붙이지 않는다.
베이스의 목·어깨·허리·발끝을 재고, 각 의상에서도 같은 자리를 찾아
둘이 겹치도록 offset 과 scale 을 구한다.

결과는 src/data/wardrobe-manifest.json 으로 나간다.
좌표계는 베이스 그림의 픽셀이고, 렌더러가 통째로 줄여서 쓴다.

사람이 눈으로 보고 고친 값은 OVERRIDES 에 적는다.
자동으로 구한 값을 덮어쓰되, 무엇을 왜 고쳤는지 여기 남는다.
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WARDROBE = os.path.join(ROOT, "public/assets/wardrobe")
MANIFEST = os.path.join(ROOT, "src/data/wardrobe-manifest.json")

# 하의는 신발 밑창이 베이스 발끝보다 이만큼 내려오게 한다.
# 딱 맞추면 베이스의 맨발가락이 신발 밑으로 삐져나온다.
FOOT_OVERSHOOT = 10

# 하의 배율. 16벌을 다 입혀보고 정한 값이다.
# 세로는 배율로 맞추지 않는다 — 밑창이 발끝에 닿도록 y 를 역산한다.
# 그래야 미니스커트든 긴바지든 신발이 늘 바닥에 선다.
BOTTOM_SCALE = 1.6

# 상의 소매 끝(손 포함) 폭을 이 값에 맞춘다.
# 눈으로 맞춰본 값이다 — 이보다 크면 어깨를 삼키고, 작으면 팔이 드러난다.
TOP_SPAN = 490

# 신발 그림에도 종아리가 같이 그려져 있다. 하의와 같은 배율을 쓴다.
SHOES_SCALE = 1.6


# 액세서리 시트 한 장에 모자·안경·가방이 섞여 있다. 칸을 여기서 나눈다.
CATEGORY_OF: dict = {
    "cream_beanie": "HEAD",
    "charcoal_beanie": "HEAD",
    "black_cap": "HEAD",
    "beige_beret": "HEAD",
    "gingham_headband": "HEAD",
    "flower_bow": "HEAD",
    "round_glasses": "ACCESSORY",
    "clear_glasses": "ACCESSORY",
    "gold_earrings": "ACCESSORY",
    "flower_umbrella": "ACCESSORY",
    "cream_saddle_bag": "BAG",
    "canvas_tote": "BAG",
    "pink_backpack": "BAG",
    "brown_hobo_bag": "BAG",
    "gingham_pouch": "BAG",
    "khaki_chalk_bag": "BAG",
}


def load(path):
    return np.array(Image.open(path).convert("RGBA"))


def rows(mask):
    """행마다 (왼쪽, 오른쪽, 폭). 빈 행은 (0, 0, 0)."""
    out = []
    for y in range(mask.shape[0]):
        xs = np.where(mask[y])[0]
        out.append((xs[0], xs[-1], xs[-1] - xs[0]) if len(xs) else (0, 0, 0))
    return out


def base_landmarks():
    """베이스에서 옷이 걸리는 자리를 찾는다."""
    a = load(os.path.join(WARDROBE, "base/body.webp"))
    mask = a[..., 3] > 40
    h, w = mask.shape
    prof = rows(mask)

    # 머리와 몸통 사이에서 제일 좁은 곳이 목이다
    neck = min(range(int(h * 0.33), int(h * 0.45)), key=lambda y: prof[y][2])

    # 목 아래로 폭이 다시 벌어지기 시작하는 곳이 어깨다
    shoulder = neck
    for y in range(neck, h):
        if prof[y][2] > prof[neck][2] * 1.6:
            shoulder = y
            break

    # 반바지 윗선 = 허리.
    # 러닝과 반바지가 둘 다 크림색이라 색으로는 못 가른다.
    # 대신 둘 사이에 그어진 윤곽선을 찾는다 — 몸통 한가운데가 제일 진해지는 행이다.
    rgb = a[..., :3].astype(int)
    band = [
        (rgb[y, w // 2 - 20 : w // 2 + 20].min(1).mean(), y)
        for y in range(int(h * 0.5), int(h * 0.68))
    ]
    waist = min(band)[1]

    # 머리와 얼굴 자리 — 표정과 머리를 앉힐 때 쓴다
    head = mask[:neck]
    hys, hxs = np.where(head)
    oval = face_oval(a[:neck])

    return {
        "width": int(w),
        "height": int(h),
        "centerX": int((prof[neck][0] + prof[neck][1]) // 2),
        "neckY": int(neck),
        "shoulderY": int(shoulder),
        "waistY": int(waist),
        "feetY": int(h - 1),
        "headLeft": int(hxs.min()),
        "headRight": int(hxs.max()),
        "headTop": int(hys.min()),
        "faceLeft": int(oval[2]) if oval else int(hxs.min()),
        "faceTop": int(oval[3]) if oval else 0,
        "faceRight": int(oval[4]) if oval else int(hxs.max()),
        "faceBottom": int(oval[5]) if oval else int(neck),
    }


def face_oval(a):
    """머리 조각 안의 얼굴 자리.

    머리 그림은 머리카락과 함께 머리통이 통째로 그려져 있고,
    얼굴만 밝은 살색으로 비어 있다. 그 자리를 찾아 두 가지에 쓴다.
      1) 알파를 지워 구멍을 낸다 — 그래야 밑에 깔린 표정이 보인다
      2) 이 구멍을 베이스 얼굴에 맞춰 머리를 앉힌다

    가장자리에 닿지 않는 덩어리만 본다. 그래야 밝은 금발을 얼굴로 착각하지 않는다.
    """
    h, w = a.shape[:2]
    rgb = a[..., :3].astype(int)
    skin = (rgb.min(2) > 212) & (rgb[..., 0] > 236) & (a[..., 3] > 200)
    labels, n = ndimage.label(skin)

    best = None
    for i in range(1, n + 1):
        ys, xs = np.where(labels == i)
        if len(ys) < h * w * 0.02:
            continue
        if ys.min() == 0 or xs.min() == 0 or ys.max() == h - 1 or xs.max() == w - 1:
            continue
        if best is None or len(ys) > best[0]:
            best = (len(ys), labels == i, int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))
    return best


def top_shoulder_row(mask):
    """소매가 벌어지기 시작하는 줄. 후드처럼 위로 솟은 것도 여기서 걸러진다."""
    prof = rows(mask)
    widest = max(p[2] for p in prof)
    for y, (_, _, wd) in enumerate(prof):
        if wd >= widest * 0.55:
            return y
    return 0


def measure(path, kind, base):
    a = load(path)
    mask = a[..., 3] > 40
    h, w = mask.shape
    prof = rows(mask)

    if kind == "face":
        # 표정은 머리통 전체다. 베이스 머리에 폭을 맞추고 턱을 목에 붙인다.
        scale = (base["headRight"] - base["headLeft"]) / w
        x = base["headLeft"]
        y = base["neckY"] - h * scale

    elif kind == "hair":
        # 얼굴 구멍을 베이스 얼굴에 포갠다. 그러면 머리가 저절로 제자리에 앉는다.
        oval = face_oval(a)
        if oval is None:
            scale = (base["headRight"] - base["headLeft"]) / w
            x = base["centerX"] - w * scale / 2
            y = base["neckY"] - h * scale
        else:
            _, _, ox0, oy0, ox1, oy1 = oval
            scale = (base["faceRight"] - base["faceLeft"]) / (ox1 - ox0)
            x = base["faceLeft"] - ox0 * scale
            y = base["faceTop"] - oy0 * scale

    elif kind == "onepiece":
        # 목부터 신발 밑창까지 한 벌이다. 두 끝을 동시에 맞춘다.
        scale = (base["feetY"] + FOOT_OVERSHOOT - base["shoulderY"]) / h
        y = base["shoulderY"]
        band = prof[min(h - 1, int(h * 0.06))]
        x = base["centerX"] - (band[0] + band[1]) / 2 * scale

    elif kind == "shoes":
        # 신발도 밑창을 바닥에 세운다.
        scale = SHOES_SCALE
        y = base["feetY"] + FOOT_OVERSHOOT - h * scale
        x = base["centerX"] - w * scale / 2

    elif kind == "top":
        scale = TOP_SPAN / w
        row = top_shoulder_row(mask)
        # 어깨선이 베이스 어깨에 오도록
        y = base["shoulderY"] - row * scale
        # 가로는 소매 폭의 한가운데를 베이스 가운데에
        x = base["centerX"] - (w * scale) / 2
    elif kind == "bottom":
        # 하의에는 다리와 신발까지 다 그려져 있다.
        # 그래서 밑창이 베이스 발끝에 닿는 자리에서 거꾸로 허리 높이를 구한다.
        scale = BOTTOM_SCALE
        y = base["feetY"] + FOOT_OVERSHOOT - h * scale
        # 허리춤 한가운데를 베이스 가운데에 — 아랫단은 폭이 제각각이라 기준이 못 된다
        band = prof[min(h - 1, int(h * 0.04))]
        x = base["centerX"] - (band[0] + band[1]) / 2 * scale

    else:
        # 액세서리는 종류마다 걸리는 자리가 달라서 표로 정한다 (ACC_ANCHOR)
        anchor = ACC_ANCHOR.get(os.path.basename(path)[:-5], ACC_ANCHOR["_default"])
        span = base["headRight"] - base["headLeft"]
        scale = span * anchor["width"] / w
        x = base["centerX"] - w * scale / 2 + anchor["dx"]
        y = anchor["y"](base) - h * scale * anchor["anchorY"] + anchor["dy"]

    return {
        "w": int(w),
        "h": int(h),
        "scale": round(scale, 4),
        "offsetX": round(x, 1),
        "offsetY": round(y, 1),
    }


# ── 액세서리가 걸리는 자리 ──────────────────────────────
#
# width  베이스 머리 폭 대비 몇 배로 그릴지
# y      기준 높이 (베이스 기준점에서)
# anchorY 그림의 어디를 그 높이에 맞출지 (0=위, 1=아래)
ACC_ANCHOR: dict = {
    "_default": dict(width=0.55, y=lambda b: b["neckY"], anchorY=1.0, dx=0, dy=0),
    # 모자는 머리 위에 얹힌다
    "cream_beanie": dict(width=0.92, y=lambda b: b["headTop"], anchorY=0.0, dx=0, dy=-24),
    "charcoal_beanie": dict(width=0.92, y=lambda b: b["headTop"], anchorY=0.0, dx=0, dy=-12),
    "black_cap": dict(width=0.98, y=lambda b: b["headTop"], anchorY=0.0, dx=0, dy=-6),
    "beige_beret": dict(width=0.80, y=lambda b: b["headTop"], anchorY=0.0, dx=-28, dy=-18),
    # 머리띠·리본은 이마 언저리
    "gingham_headband": dict(width=0.86, y=lambda b: b["headTop"], anchorY=0.0, dx=0, dy=10),
    "flower_bow": dict(width=0.34, y=lambda b: b["headTop"], anchorY=0.0, dx=-118, dy=44),
    # 안경은 눈높이. 얼굴 자리 위에서 45% 쯤이 눈이다.
    "round_glasses": dict(
        width=0.78,
        y=lambda b: b["faceTop"] + (b["faceBottom"] - b["faceTop"]) * 0.46,
        anchorY=0.5, dx=0, dy=0,
    ),
    "clear_glasses": dict(
        width=0.78,
        y=lambda b: b["faceTop"] + (b["faceBottom"] - b["faceTop"]) * 0.46,
        anchorY=0.5, dx=0, dy=0,
    ),
    "gold_earrings": dict(
        width=0.62,
        y=lambda b: b["faceTop"] + (b["faceBottom"] - b["faceTop"]) * 0.62,
        anchorY=0.5, dx=0, dy=0,
    ),
    # 가방은 어깨에서 허리 사이에 걸린다
    "cream_saddle_bag": dict(width=0.52, y=lambda b: b["waistY"], anchorY=0.5, dx=96, dy=0),
    "canvas_tote": dict(width=0.52, y=lambda b: b["waistY"], anchorY=0.5, dx=104, dy=10),
    "pink_backpack": dict(width=0.52, y=lambda b: b["waistY"], anchorY=0.5, dx=-104, dy=0),
    "brown_hobo_bag": dict(width=0.52, y=lambda b: b["waistY"], anchorY=0.5, dx=100, dy=0),
    "gingham_pouch": dict(width=0.44, y=lambda b: b["waistY"], anchorY=0.5, dx=104, dy=20),
    "khaki_chalk_bag": dict(width=0.36, y=lambda b: b["waistY"], anchorY=0.5, dx=98, dy=24),
    "flower_umbrella": dict(width=0.72, y=lambda b: b["waistY"], anchorY=0.4, dx=-116, dy=-40),
}

# ── 눈으로 보고 고친 것 ─────────────────────────────────
#
# 어깨선은 "폭이 제일 넓은 곳의 55% 가 되는 첫 행" 으로 찾는다.
# 대부분 맞는데, 후드나 세운 깃처럼 어깨보다 위로 솟은 것이 있으면
# 그걸 어깨로 착각해서 옷이 통째로 올라가 얼굴을 덮는다.
#
# 그런 세 벌만 여기서 내린다. 값은 입혀보고 정했다.
# 자동으로 맞은 것은 건드리지 않는다.
OVERRIDES: dict[str, dict] = {
    "grey_hoodie": {"dy": 58, "note": "후드를 어깨로 봐서 입까지 올라왔다"},
    "green_track_jacket": {"dy": 44, "note": "세운 깃이 입을 덮었다"},
    "black_track_jacket": {"dy": 42, "note": "세운 깃이 입을 덮었다"},
}


def main():
    if not os.path.isdir(WARDROBE):
        print("의상 에셋이 없다. npm run wardrobe:extract 를 먼저 돌린다.")
        return 1

    base = base_landmarks()
    print("베이스 기준점")
    for k, v in base.items():
        print(f"  {k:10} {v}")

    items = {}
    tuned = 0
    for kind in ("top", "bottom", "onepiece", "shoes", "hair", "face", "acc"):
        folder = os.path.join(WARDROBE, kind)
        if not os.path.isdir(folder):
            continue
        for name in sorted(os.listdir(folder)):
            if not name.endswith(".webp"):
                continue
            item_id = name[:-5]
            entry = measure(os.path.join(folder, name), kind, base)
            entry["file"] = f"/assets/wardrobe/{kind}/{name}"
            entry["category"] = CATEGORY_OF.get(item_id, kind.upper())

            fix = OVERRIDES.get(item_id)
            if fix:
                if "dy" in fix:
                    entry["offsetY"] = round(entry["offsetY"] + fix["dy"], 1)
                for key in ("offsetX", "scale"):
                    if key in fix:
                        entry[key] = fix[key]
                entry["adjusted"] = fix["note"]
                tuned += 1
            items[item_id] = entry

    base_entry = {
        "file": "/assets/wardrobe/base/body.webp",
        "category": "BASE",
        "w": base["width"],
        "h": base["height"],
        "scale": 1,
        "offsetX": 0,
        "offsetY": 0,
    }

    out = {"base": {**base_entry, "landmarks": base}, "items": items}
    os.makedirs(os.path.dirname(MANIFEST), exist_ok=True)
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
        f.write("\n")

    from collections import Counter

    counts = Counter(v["category"] for v in items.values())
    print("\n" + " · ".join(f"{k} {v}" for k, v in sorted(counts.items())))
    print(f"손으로 고친 것 {tuned}")
    print(f"→ src/data/wardrobe-manifest.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
