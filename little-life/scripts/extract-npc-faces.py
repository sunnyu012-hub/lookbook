"""도시 사람들의 얼굴을 시트에서 잘라낸다.

    npm run assets:npcs

지금까지 사람 자리에는 이모지 하나(☕ 🏃 🧶)가 서 있었다. 자리표로는 됐지만
카페 거리에 사람이 열둘 서면 컵과 책과 가방이 나란히 놓일 뿐, 누가 누군지
알아볼 수가 없었다. 그려진 얼굴이 오니 이름을 읽기 전에 사람이 먼저 보인다.

    assets/source-sheets/npc-faces-a.webp   여섯 명 (흰 바탕)
    assets/source-sheets/npc-faces-b.webp   열세 명 (투명)
    assets/source-sheets/npc-face-*.webp    한 명씩 그려진 넉 장

    → public/assets/npcs/<NPC_ID>.webp

파일 이름은 `src/types/city.ts` 의 NPC id 를 그대로 쓴다. 사람 이름이 아니라
id 다 — 초반 여섯은 id 와 이름이 다르고(MINA = 윤하루), 저장이 붙잡고 있는
것도 id 쪽이다.

시트가 없으면 이미 내보낸 파일은 그대로 두고 조용히 끝난다.
"""
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEETS = os.path.join(ROOT, "assets/source-sheets")
OUT = os.path.join(ROOT, "public/assets/npcs")

# 시트에서 제일 크게 보이는 자리가 NPC 시트 머리(64px)다. 나중에 더 큰 자리가
# 생겨도 견디게 넉넉히 남기되, 스물셋을 다 받아야 하니 과하게 두지 않는다.
SIZE = 256

# 덩어리로 치는 최소 넓이 (시트 넓이 대비). 이름 글자는 여기서 걸러진다.
MIN_AREA_RATIO = 0.004

# ── 어느 얼굴이 누구인지 ────────────────────────────────────────────
#
# 시트에 손글씨로 이름이 적혀 있어서 눈으로 확인하고 적었다.
# 왼쪽 위부터 오른쪽으로, 그다음 줄로 내려간다.
SHEET_A = ["HARU", "RIO", "HAEIN", "LULU", None, "SIWOO"]
#
# 중간에 None 이 있는 건, 시트에 있는 얼굴 대신 한 장짜리 그림으로 바꾼
# 사람이라서다 (아래 SINGLES — 유나 · 지호 · 민지). 목록에서 빼지 않고 자리만
# 비운다 — 이 목록은 시트를 왼쪽 위부터 세는 순서라 한 칸을 빼면 뒤가
# 전부 한 칸씩 밀린다.
SHEET_B = [
    "MINA", "JUNE", "EUNCHAE", None, "JUN",
    "HYUNWOO", "HARIN", "RAON", None, "SUA",
    "SUNJAE", "YEONJU", "JEONGWON",
]

# 한 장에 한 명씩 그려진 넉 장.
#
# 소라와 재희는 그림에 이름이 적혀 있다. 우식과 세라 두 장은 이름이 없어서
# 남은 자리로 맞췄고 — 스물넷 중 얼굴이 없던 사람이 셋(장우식·차세라·강유현)
# 뿐이었다 — 나중에 사용자가 둘 다 맞다고 확인해줬다.
SINGLES = {
    "npc-face-sora.webp": "SORA",
    "npc-face-jaehui.webp": "JAEHUI",
    "npc-face-woosik.webp": "WOOSIK",
    "npc-face-sera.webp": "NOA",
    "npc-face-yuhyeon.webp": "YUHYEON",
    "npc-face-jiho.webp": "JIHO",
    "npc-face-yuna.webp": "YUNA",
    "npc-face-minji.webp": "MINJI",
}

# ── 얼굴로 자를 네모 ────────────────────────────────────────────────
#
# 시트의 작은 그림들은 머리가 그림 폭만큼 커서 위에서 정사각형으로 자르면
# 그대로 얼굴이 된다. 한 명씩 그려진 넉 장은 상반신이라 얼굴이 훨씬 작고
# 가운데에 있지도 않아서, 눈으로 보고 자리를 잡았다.
#
#   (폭 배율, 가로 중심 0~1, 위 여백 0~1)
FACE_BOX = {
    "SORA": (0.70, 0.46, 0.05),
    "JAEHUI": (0.64, 0.42, 0.00),
    "WOOSIK": (0.78, 0.39, 0.00),
    "NOA": (0.68, 0.44, 0.02),
    "YUHYEON": (0.68, 0.48, -0.015),
    "JIHO": (0.72, 0.48, -0.005),
    "YUNA": (0.66, 0.50, 0.01),
    "MINJI": (0.66, 0.37, 0.00),
}
FACE_BOX_DEFAULT = (1.00, 0.50, -0.02)


def load(name):
    path = os.path.join(SHEETS, name)
    if not os.path.exists(path):
        return None
    im = Image.open(path)
    if im.mode == "RGBA":
        return np.array(im)
    # 흰 바탕 시트. 테두리에서 이어지는 흰 덩어리만 배경으로 친다 —
    # 그래야 흰 티셔츠와 수건이 사람에게서 뚫리지 않는다.
    rgb = np.array(im.convert("RGB"))
    white = rgb.min(axis=2) > 232
    lab, _ = ndimage.label(white)
    edge = set(lab[0, :]) | set(lab[-1, :]) | set(lab[:, 0]) | set(lab[:, -1])
    edge.discard(0)
    bg = np.isin(lab, sorted(edge))
    fg = ndimage.binary_fill_holes(~bg)
    return np.dstack([rgb, (fg * 255).astype(np.uint8)])


def boxes(sheet, expect):
    """사람 하나하나의 네모를 찾는다. 왼쪽 위부터 읽는 순서로 돌려준다."""
    mask = sheet[:, :, 3] > 24
    lab, n = ndimage.label(mask)
    sizes = ndimage.sum(mask, lab, range(1, n + 1))
    limit = MIN_AREA_RATIO * mask.size
    found = []
    for slc, size in zip(ndimage.find_objects(lab), sizes):
        if size < limit:
            continue
        found.append([slc[1].start, slc[0].start, slc[1].stop, slc[0].stop])

    # 머리카락이 닿아서 위아래 두 사람이 한 덩어리가 되는 자리가 있다.
    # 유독 키가 큰 덩어리는 픽셀이 제일 얇은 줄에서 가른다.
    if len(found) == expect - 1:
        heights = [b[3] - b[1] for b in found]
        tall = int(np.argmax(heights))
        x0, y0, x1, y1 = found[tall]
        rows = mask[y0:y1, x0:x1].sum(axis=1)
        lo, hi = int(len(rows) * 0.35), int(len(rows) * 0.65)
        cut = y0 + lo + int(np.argmin(rows[lo:hi]))
        found[tall] = [x0, y0, x1, cut]
        found.append([x0, cut, x1, y1])

    if len(found) != expect:
        raise SystemExit(f"사람 {expect} 을 찾으려 했는데 {len(found)} 이 나왔다")

    row = max(b[3] - b[1] for b in found) * 0.6
    found.sort(key=lambda b: (int(b[1] / row), b[0]))
    return found


def cutout(sheet, box):
    """네모 안에서 제일 큰 덩어리만 남긴다 (옆에 적힌 이름 글자를 떼어낸다)."""
    x0, y0, x1, y1 = box
    sub = sheet[y0:y1, x0:x1].astype(np.uint8).copy()
    lab, n = ndimage.label(sub[:, :, 3] > 24)
    sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
    keep = ndimage.binary_fill_holes(lab == int(np.argmax(sizes)) + 1)
    alpha = np.where(keep, np.maximum(sub[:, :, 3], 255 * ndimage.binary_erosion(keep)), 0)
    sub[:, :, 3] = np.clip(alpha, 0, 255).astype(np.uint8)
    ys, xs = np.where(keep)
    return sub[ys.min(): ys.max() + 1, xs.min(): xs.max() + 1]


def face(sub, npc_id):
    """얼굴이 가운데 오도록 정사각형으로 자른다."""
    h, w = sub.shape[:2]
    factor, cx, top = FACE_BOX.get(npc_id, FACE_BOX_DEFAULT)
    side = int(w * factor) if npc_id in FACE_BOX else int(min(w, h * 1.02) * factor)
    x0, y0 = int(w * cx - side / 2), int(h * top)
    canvas = np.zeros((side, side, 4), np.uint8)
    sx0, sy0 = max(0, x0), max(0, y0)
    sx1, sy1 = min(w, x0 + side), min(h, y0 + side)
    canvas[sy0 - y0: sy1 - y0, sx0 - x0: sx1 - x0] = sub[sy0:sy1, sx0:sx1]
    return Image.fromarray(canvas).resize((SIZE, SIZE), Image.LANCZOS)


def save(image, npc_id):
    os.makedirs(OUT, exist_ok=True)
    image.save(os.path.join(OUT, f"{npc_id}.webp"), "WEBP", quality=88, method=6)


def main():
    done = []
    for name, ids in (("npc-faces-a.webp", SHEET_A), ("npc-faces-b.webp", SHEET_B)):
        sheet = load(name)
        if sheet is None:
            print(f"{name} 이 없다. 건너뛴다.")
            continue
        for npc_id, box in zip(ids, boxes(sheet, len(ids))):
            if npc_id is None:
                continue
            save(face(cutout(sheet, box), npc_id), npc_id)
            done.append(npc_id)

    for name, npc_id in SINGLES.items():
        sheet = load(name)
        if sheet is None:
            print(f"{name} 이 없다. 건너뛴다.")
            continue
        box = [0, 0, sheet.shape[1], sheet.shape[0]]
        save(face(cutout(sheet, box), npc_id), npc_id)
        done.append(npc_id)

    print(f"{len(done)} 명: {' '.join(sorted(done))}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
