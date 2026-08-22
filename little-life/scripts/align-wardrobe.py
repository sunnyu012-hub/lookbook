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

    return {
        "width": int(w),
        "height": int(h),
        "centerX": int((prof[neck][0] + prof[neck][1]) // 2),
        "neckY": int(neck),
        "shoulderY": int(shoulder),
        "waistY": int(waist),
        "feetY": int(h - 1),
    }


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

    if kind == "top":
        scale = TOP_SPAN / w
        row = top_shoulder_row(mask)
        # 어깨선이 베이스 어깨에 오도록
        y = base["shoulderY"] - row * scale
        # 가로는 소매 폭의 한가운데를 베이스 가운데에
        x = base["centerX"] - (w * scale) / 2
    else:
        # 하의에는 다리와 신발까지 다 그려져 있다.
        # 그래서 밑창이 베이스 발끝에 닿는 자리에서 거꾸로 허리 높이를 구한다.
        scale = BOTTOM_SCALE
        y = base["feetY"] + FOOT_OVERSHOOT - h * scale
        # 허리춤 한가운데를 베이스 가운데에 — 아랫단은 폭이 제각각이라 기준이 못 된다
        band = prof[min(h - 1, int(h * 0.04))]
        x = base["centerX"] - (band[0] + band[1]) / 2 * scale

    return {
        "w": int(w),
        "h": int(h),
        "scale": round(scale, 4),
        "offsetX": round(x, 1),
        "offsetY": round(y, 1),
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
    for kind in ("top", "bottom"):
        folder = os.path.join(WARDROBE, kind)
        if not os.path.isdir(folder):
            continue
        for name in sorted(os.listdir(folder)):
            if not name.endswith(".webp"):
                continue
            item_id = name[:-5]
            entry = measure(os.path.join(folder, name), kind, base)
            entry["file"] = f"/assets/wardrobe/{kind}/{name}"
            entry["category"] = kind.upper()

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

    tops = sum(1 for v in items.values() if v["category"] == "TOP")
    bottoms = len(items) - tops
    print(f"\n상의 {tops} · 하의 {bottoms} · 손으로 고친 것 {tuned}")
    print(f"→ src/data/wardrobe-manifest.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
