"""도감 격자에서 쓸 작은 그림을 만들고, 가장자리가 잘렸는지 함께 본다.

    npm run assets:thumbs

도감 한 칸은 폰에서 32~56px 다. 화면이 촘촘한 폰이라도 128px 면 넉넉하다. 320px 짜리를 그대로 내려받게 하면
240칸을 훑는 동안 필요 없는 데이터를 몇 배로 받는다.
긴 쪽 128px 로 줄여 public/assets/thumbs/ 에 같은 구조로 둔다.

방에 놓은 그림과 도감 상세는 원본을 그대로 쓴다. 거기서는 크게 보인다.

여기서 어차피 그림을 다 열어보니, 테두리에 물감이 얼마나 닿아 있는지도 같이 잰다.
시트에서 조각을 뽑을 때 옆 물건이 딸려 오면 그림이 테두리에서 끊기는데
도감에서는 작게 나와 눈으로는 잘 안 보인다. 잰 값은 매니페스트에 적어두고
`npm run assets:audit` 이 읽어서 "볼 것" 으로 표시한다.
"""
import json
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ITEMS = os.path.join(ROOT, "public/assets/items")
THUMBS = os.path.join(ROOT, "public/assets/thumbs")
MANIFEST = os.path.join(ROOT, "src/data/asset-manifest.json")
MAX = 128

def edge_alpha(im):
    """테두리 한 줄에서 물감이 차지하는 비율. 0 이면 사방이 깨끗하게 떨어졌다."""
    a = np.array(im)[..., 3] > 40
    if a.size == 0:
        return 0.0
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    return float(border.mean())


# ── 캐릭터 모습 ────────────────────────────────────────
# 의상실 한 칸도 폰에서 86px 다. 백스무 벌을 367x508 원본으로 받으면
# 시트를 여는 순간 4MB 가 넘는다. 여기는 매니페스트를 안 거치고
# 파일 이름이 곧 스킨 id 라서 폴더를 그대로 훑는다.
CHARACTERS = os.path.join(ROOT, "public/assets/characters")
CHAR_THUMBS = os.path.join(THUMBS, "characters")

char_made = 0
if os.path.isdir(CHARACTERS):
    os.makedirs(CHAR_THUMBS, exist_ok=True)
    for name in sorted(os.listdir(CHARACTERS)):
        if not name.endswith(".webp"):
            continue
        im = Image.open(os.path.join(CHARACTERS, name)).convert("RGBA")
        im.thumbnail((MAX, MAX), Image.LANCZOS)
        im.save(os.path.join(CHAR_THUMBS, name), "WEBP", quality=82, method=6)
        char_made += 1
    print(f"캐릭터 모습 작은 그림 {char_made}장")


with open(MANIFEST, encoding="utf-8") as f:
    manifest = json.load(f)

made = 0
saved = 0
for item_id, entry in manifest.items():
    src = os.path.join(ROOT, "public", entry["file"].lstrip("/"))
    if not os.path.exists(src):
        print(f"  파일 없음: {item_id}")
        continue

    rel = os.path.relpath(src, ITEMS)
    dst = os.path.join(THUMBS, rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)

    im = Image.open(src).convert("RGBA")
    before = os.path.getsize(src)
    entry["edgeAlpha"] = round(edge_alpha(im), 3)
    im.thumbnail((MAX, MAX), Image.LANCZOS)
    im.save(dst, "WEBP", quality=82, method=6)

    entry["thumb"] = "/assets/thumbs/" + rel.replace(os.sep, "/")
    made += 1
    saved += before - os.path.getsize(dst)

with open(MANIFEST, "w", encoding="utf-8") as f:
    json.dump(manifest, f, indent=2, ensure_ascii=False)
    f.write("\n")

# 네모난 물건은 원래 테두리가 꽉 찬다. 판정은 audit 쪽에 맡기고 여기서는 세기만 한다.
crowded = [k for k, v in manifest.items() if v.get("edgeAlpha", 0) > 0.35]
print(f"작은 그림 {made}개 · 도감 한 바퀴에 {round(saved / 1024 / 1024, 2)}MB 덜 받는다")
print(f"테두리까지 꽉 찬 그림 {len(crowded)}개 (assets:audit 에서 볼 것으로 나온다)")
