"""동료 시트에서 자세 하나하나를 잘라낸다.

    npm run assets:companions

투명 PNG 시트라 alpha 로 덩어리를 찾으면 된다 (아이템 시트와 같은 방식).
네 줄이 각각 한 마리고, 한 줄에 여덟 자세가 들어 있다.

    public/assets/companions/<동료id>/<자세>.webp

시트가 없으면 이미 내보낸 파일은 그대로 두고 조용히 끝난다.
"""
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEET = os.path.join(ROOT, "assets/source-sheets/companions.png")
OUT = os.path.join(ROOT, "public/assets/companions")

# 홈 화면에서는 40px 남짓으로 보이지만, 나중에 크게 쓸 자리가 생길 수 있어
# 넉넉히 남겨둔다. webp 라 용량은 얼마 안 든다.
MAX = 256

# 줄마다 y 범위 · 누구인지 · 왼쪽부터 어떤 자세인지.
#
# 자세 순서가 줄마다 다르다. 눈으로 확인하고 적었다 —
# 고양이 다섯 번째는 자는 게 아니라 기지개고, 새는 일곱 번째가 자는 자세다.
# 여기서 대충 이름을 붙이면 나중에 "sleep" 을 불렀는데 기지개가 나온다.
#
# 어느 줄에나 idle · walk · sleep 은 있다. 화면에서 쓰는 건 그 셋이다.
ROWS = [
    (67, 296, "bori", ["idle", "side", "back", "walk", "sleep", "play", "sit_bag", "bag"]),
    (320, 534, "mochi", ["idle", "side", "back", "walk", "stretch", "sleep", "happy", "bag"]),
    (565, 740, "bean", ["idle", "side", "back", "walk", "glide", "perch", "sleep", "hover"]),
    (770, 964, "luna", ["idle", "bag", "back", "walk", "glide", "sleep", "hooded", "star"]),
]

MIN_AREA = 1500


def slice_row(alpha, y0, y1):
    """한 줄에서 덩어리를 왼쪽부터 찾는다.

    상자와 함께 덩어리 번호도 돌려준다. 상자만 잘라내면 옆 그림 조각이
    같이 딸려오는데, 번호로 한 번 더 거르면 그게 빠진다.

    루나 주위의 별처럼 몸에서 멀리 떨어진 장식은 따로 번호가 붙는데,
    그건 남긴다. 빼는 건 "옆 자세의 몸통" 뿐이다 —
    작다고 다 지우면 별이 사라지고, 번호만으로 거르면 조각이 남는다.
    """
    band = alpha[y0:y1] > 40
    # 가로로만 넓게 부풀린다. 다리·꼬리가 몸에서 떨어져 보이는 걸 붙이려는 것이고,
    # 세로로 부풀리면 위아래 줄이 붙어버린다.
    grown = ndimage.binary_dilation(band, np.ones((3, 9)))
    labels, _ = ndimage.label(grown)

    boxes = []
    for n, sl in enumerate(ndimage.find_objects(labels), start=1):
        if sl is None:
            continue
        h = sl[0].stop - sl[0].start
        w = sl[1].stop - sl[1].start
        if h * w < MIN_AREA:
            continue
        boxes.append((sl[1].start, sl[1].stop, sl[0].start, sl[0].stop, n))

    boxes.sort()

    # 몸통이라 부를 만큼 큰 덩어리들
    counts = np.bincount(labels.ravel())
    big_labels = np.flatnonzero(counts >= MIN_AREA)
    big_labels = big_labels[big_labels != 0]

    return boxes, labels, big_labels


def trim(img):
    """가장자리의 빈 자리를 잘라낸다."""
    a = np.array(img)
    ys, xs = np.where(a[..., 3] > 8)
    if len(ys) == 0:
        return img
    return img.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def fit(img, box):
    """정사각 안에 넣는다. 비율은 건드리지 않는다."""
    w, h = img.size
    scale = min(box / max(w, h), 1.0)
    if scale < 1.0:
        img = img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    return img


def main():
    if not os.path.exists(SHEET):
        print(f"  시트가 없다: {SHEET} — 넘어간다")
        return 0

    sheet = Image.open(SHEET).convert("RGBA")
    alpha = np.array(sheet)[..., 3]

    made = 0
    for y0, y1, who, poses in ROWS:
        boxes, labels, big_labels = slice_row(alpha, y0, y1)
        if len(boxes) != len(poses):
            print(f"  ! {who}: 덩어리가 {len(boxes)}개다 ({len(poses)}개를 기대했다)")

        folder = os.path.join(OUT, who)
        os.makedirs(folder, exist_ok=True)

        for i, (x0, x1, ry0, ry1, n) in enumerate(boxes):
            if i >= len(poses):
                break
            crop = sheet.crop((x0, y0 + ry0, x1, y0 + ry1))

            # 옆 자세의 몸통만 지운다. 몸통은 큰 덩어리라 sizes 로 가려낼 수 있고,
            # 별 같은 작은 장식은 그대로 둔다.
            here = labels[ry0:ry1, x0:x1]
            other_body = np.isin(here, big_labels) & (here != n)
            mine = ~other_body
            pixels = np.array(crop)
            pixels[..., 3] = np.where(mine, pixels[..., 3], 0)
            crop = Image.fromarray(pixels)

            crop = fit(trim(crop), MAX)
            path = os.path.join(folder, f"{poses[i]}.webp")
            crop.save(path, "WEBP", quality=92, method=6)
            made += 1

        print(f"  {who}: {len(boxes)}개")

    print(f"  모두 {made}개")
    return 0


if __name__ == "__main__":
    sys.exit(main())
