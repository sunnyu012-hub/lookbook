"""render-drawn.mjs 가 그린 PNG 를 잘라 게임에서 쓰는 webp 로 만든다.

    npm run assets:draw    (render-drawn.mjs 다음에 이어서 돌아간다)

투명한 가장자리를 잘라내고 긴 쪽을 320px 로 맞춘다.
시트에서 뽑은 그림과 같은 규격이라 도감에서 크기가 튀지 않는다.
"""
import os
import shutil
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMP = os.path.join(ROOT, "assets/drawn/.rendered")
OUT = os.path.join(ROOT, "public/assets/items")
MAX = 320

# 어떤 물건이 어느 폴더로 가는지. 카탈로그 분류와 같은 이름을 쓴다.
FOLDER = {
    "t_wood_star": "trophies",
    "t_adventure_book": "trophies",
    "t_thousand_stars": "trophies",
    "t_moon_shard": "trophies",
    "t_heart_bottle": "trophies",
}

if not os.path.isdir(TMP):
    print("그린 PNG 가 없다. node scripts/render-drawn.mjs 를 먼저 돌린다.")
    sys.exit(1)

done = 0
for name in sorted(os.listdir(TMP)):
    if not name.endswith(".png"):
        continue
    item = name[:-4]
    folder = FOLDER.get(item)
    if folder is None:
        print(f"  어디에 넣을지 모름: {item}")
        continue

    im = Image.open(os.path.join(TMP, name)).convert("RGBA")
    bb = im.getbbox()
    if bb:
        im = im.crop(bb)
    if max(im.size) > MAX:
        im.thumbnail((MAX, MAX), Image.LANCZOS)

    os.makedirs(os.path.join(OUT, folder), exist_ok=True)
    im.save(os.path.join(OUT, folder, f"{item}.webp"), "WEBP", quality=92, method=6)
    done += 1

shutil.rmtree(TMP, ignore_errors=True)
print(f"webp {done}개 → public/assets/items/")
