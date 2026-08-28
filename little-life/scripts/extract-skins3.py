"""새 옷 시트 24장을 96벌로 자른다 — **이름 붙이기 전 단계.**

    python3 scripts/extract-skins3.py

    assets/source-sheets/skins3-01.png … skins3-24.png
    → assets/slices/skins3/skins3-01-a.webp … skins3-24-d.webp   (a=왼위 b=오위 c=왼아 d=오아)

왜 public/assets/characters 로 바로 안 내보내는가:
스킨 id 는 세이브에 남는 영구 열쇠다. 한 번 정하면 못 바꾼다.
그래서 이름이 정해지기 전에는 자리 이름(01-a)으로만 두고, 이름이 정해지면
extract-skins.py 의 LAYOUT 에 넣어 정식으로 뽑는다.

자르는 규칙은 extract-skins.py 와 같은 것을 그대로 쓴다 —
시트별 키 중앙값 맞춤, 발끝 기준 가운데, 같은 캔버스.
두 곳이 다르면 새 옷만 화면에서 크기가 어긋난다.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image

from importlib import import_module

skins = import_module("extract-skins".replace("-", "_")) if False else None

# extract-skins.py 는 하이픈이 있어서 그냥 import 가 안 된다. 필요한 것만 가져온다.
import importlib.util

_spec = importlib.util.spec_from_file_location(
    "extract_skins", os.path.join(os.path.dirname(os.path.abspath(__file__)), "extract-skins.py")
)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)

sheet_alpha = _mod.sheet_alpha
quadrants = _mod.quadrants
content_box = _mod.content_box
foot_center = _mod.foot_center
TARGET_BODY = _mod.TARGET_BODY
MAX_SIDE = _mod.MAX_SIDE

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEETS = os.path.join(ROOT, "assets/source-sheets")
OUT = os.path.join(ROOT, "assets/slices/skins3")
SLOTS = ["a", "b", "c", "d"]


def main():
    os.makedirs(OUT, exist_ok=True)
    total = 0
    for i in range(1, 25):
        name = f"skins3-{i:02d}.png"
        path = os.path.join(SHEETS, name)
        if not os.path.exists(path):
            print(f"  ! {name} 없음")
            continue

        image = Image.open(path)
        alpha, how = sheet_alpha(image)
        rgb = np.asarray(image.convert("RGB"))
        h, w = alpha.shape

        cut = []
        for (y0, y1, x0, x1), slot in zip(quadrants(h, w), SLOTS):
            part = alpha[y0:y1, x0:x1]
            box = content_box(part)
            if box is None:
                print(f"  ! {name} {slot}: 빈 칸")
                continue
            by0, by1, bx0, bx1 = box
            center = foot_center(part, by0, by1, bx0, bx1)
            rgba = np.dstack([rgb[y0:y1, x0:x1], part])
            cut.append((slot, rgba, box, center))

        if not cut:
            continue

        heights = sorted(b[1] - b[0] for _, _, b, _ in cut)
        middle = (heights[len(heights) // 2] + heights[(len(heights) - 1) // 2]) / 2
        ratio = TARGET_BODY / middle if middle > 0 else 1.0

        for slot, rgba, box, center in cut:
            by0, by1, bx0, bx1 = box
            crop = Image.fromarray(rgba[by0:by1, bx0:bx1], "RGBA")
            if abs(ratio - 1.0) > 0.005:
                crop = crop.resize(
                    (max(1, round(crop.width * ratio)), max(1, round(crop.height * ratio))),
                    Image.LANCZOS,
                )
            canvas = Image.new("RGBA", (MAX_SIDE, MAX_SIDE), (0, 0, 0, 0))
            # 발끝을 아래에서 같은 자리에 놓고, 서 있는 자리를 가로 가운데로
            fx = (center - bx0) * ratio
            x = round(MAX_SIDE / 2 - fx)
            y = MAX_SIDE - crop.height - round(MAX_SIDE * 0.03)
            canvas.alpha_composite(crop, (max(0, x), max(0, y)))
            out = os.path.join(OUT, f"skins3-{i:02d}-{slot}.webp")
            canvas.save(out, "WEBP", quality=92, method=6)
            total += 1

        print(f"{name} · {how} · 키 중앙값 {middle:.0f} → 배율 {ratio:.3f} · {len(cut)}벌")

    print(f"\n총 {total}벌 → {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
