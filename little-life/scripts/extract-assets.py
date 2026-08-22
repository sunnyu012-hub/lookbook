"""에셋 시트에서 아이템 하나하나를 잘라내 게임에서 쓰는 파일로 만든다.

    npm run assets:extract

투명 PNG 시트를 alpha 로 훑어 덩어리를 찾고, 각 덩어리를 잘라
public/assets/items/<분류>/<아이템id>.webp 로 내보낸다.

시트 안 순서(왼→오른쪽, 위→아래)와 아래 매핑 표를 연결한다.
그림만 보고 이름을 추측하지 않는다 — 표에 적힌 대로만 간다.

원본 시트는 assets/source-sheets/ 에 둔다 (README 참고).
시트가 없으면 이미 내보낸 파일은 그대로 두고 조용히 끝난다.
"""
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEETS = os.path.join(ROOT, "assets/source-sheets")
SLICES = os.path.join(ROOT, "assets/slices")
OUT = os.path.join(ROOT, "public/assets/items")
MAX = 320

# 시트마다 덩어리가 붙어 있는 정도가 달라서 따로 잡는다
PARAMS = {
    "furniture": dict(dilate=5, min_area=2000, row_h=120),
    "light": dict(dilate=6, min_area=1800, row_h=120),
    "living": dict(dilate=6, min_area=1400, row_h=110),
    "magic": dict(dilate=6, min_area=1400, row_h=110),
    "furn2": dict(dilate=5, min_area=2200, row_h=130),
    "books": dict(dilate=6, min_area=2000, row_h=140),
    "food": dict(dilate=6, min_area=2000, row_h=140),
    "hobby": dict(dilate=6, min_area=1800, row_h=140),
    "plants": dict(dilate=6, min_area=1800, row_h=140),
    "bags": dict(dilate=5, min_area=1600, row_h=130),
    "daily": dict(dilate=5, min_area=1600, row_h=130),
    "wall": dict(dilate=5, min_area=1600, row_h=130),
    "fabric": dict(dilate=6, min_area=2500, row_h=170),
    "lamps": dict(dilate=6, min_area=2500, row_h=170),
    "sofa": dict(dilate=6, min_area=3000, row_h=250),
    # 이 시트만 물건마다 흰 테두리(스티커 선)가 둘려 있다
    "extra": dict(dilate=9, min_area=4000, row_h=300, sticker=True),
    "trophy": dict(dilate=9, min_area=4000, row_h=380),
}

# 아이템이 들어갈 폴더 (카탈로그 분류와 같은 이름)
FOLDER_BY_PREFIX = {}


def clean_alpha(im):
    """가장자리에 남은 압축 찌꺼기(빨강·노랑 점)를 지운다."""
    a = np.array(im)
    alpha = a[..., 3].astype(np.int16)
    r, g, b = a[..., 0].astype(np.int16), a[..., 1].astype(np.int16), a[..., 2].astype(np.int16)
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    artifact = (alpha < 200) & ((mx - mn) > 110)
    alpha[artifact] = 0
    alpha[alpha < 24] = 0
    a[..., 3] = alpha.astype(np.uint8)
    return Image.fromarray(a, "RGBA")


def strip_sticker(im):
    """스티커처럼 둘러 있는 흰 테두리를 벗긴다.

    어떤 시트는 물건마다 흰 선이 둘려 있다. 그대로 두면 방에 놓았을 때
    그 물건만 오려붙인 것처럼 보인다.

    **바깥에서 이어져 들어오는** 거의 흰 덩어리만 지운다. 그래야 빈백이나
    크림색 수납장처럼 몸통이 밝은 것을 파먹지 않는다 — 그것들은 순백이 아니다.
    """
    a = np.array(im).astype(int)
    alpha = a[..., 3]
    mask = alpha > 40
    rgb = a[..., :3]
    white = (rgb.min(2) > 238) & ((rgb.max(2) - rgb.min(2)) < 14) & mask

    labels, _ = ndimage.label(white)
    outside = ndimage.binary_dilation(~mask, structure=np.ones((3, 3)))
    touching = [n for n in np.unique(labels[outside & (labels > 0)]) if n > 0]
    border = np.isin(labels, touching)

    out = np.array(im)
    out[..., 3] = np.where(border, 0, alpha).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def drop_fragments(im, keep_ratio=0.12):
    """옆 조각이 잘려 들어온 부스러기를 지운다. 제일 큰 덩어리만 남긴다."""
    a = np.array(im)
    mask = a[..., 3] > 40
    labels, n = ndimage.label(ndimage.binary_dilation(mask, structure=np.ones((5, 5))))
    if n <= 1:
        return im
    sizes = ndimage.sum(mask, labels, range(1, n + 1))
    biggest = sizes.max()
    keep = np.isin(labels, [i + 1 for i, size in enumerate(sizes) if size >= biggest * keep_ratio])
    a[..., 3] = np.where(keep, a[..., 3], 0)
    out = Image.fromarray(a, "RGBA")
    bb = out.getbbox()
    return out.crop(bb) if bb else out


def slice_sheet(name, path, dilate=6, min_area=1800, row_h=130, sticker=False):
    """시트 하나를 조각으로 나눈다. 왼→오른쪽, 위→아래 순서로 번호를 매긴다."""
    im = clean_alpha(Image.open(path).convert("RGBA"))
    if sticker:
        im = strip_sticker(im)
    mask = np.array(im)[..., 3] > 40
    grown = ndimage.binary_dilation(mask, structure=np.ones((dilate, dilate)))
    labels, _ = ndimage.label(grown)

    boxes = []
    for sl in ndimage.find_objects(labels):
        y, x = sl
        if mask[sl].sum() < min_area or (y.stop - y.start) < 40 or (x.stop - x.start) < 40:
            continue
        pad = dilate // 2
        boxes.append(
            (
                max(0, x.start + pad),
                max(0, y.start + pad),
                min(im.width, x.stop - pad),
                min(im.height, y.stop - pad),
            )
        )

    # 줄로 묶은 다음 줄 안에서 왼쪽부터. 크기가 제각각이라 y 만으로 정렬하면 순서가 꼬인다.
    boxes.sort(key=lambda b: (round(b[1] / row_h), b[0]))

    out_dir = os.path.join(SLICES, name)
    os.makedirs(out_dir, exist_ok=True)
    for i, box in enumerate(boxes):
        piece = im.crop(box)
        bb = piece.getbbox()
        if bb:
            piece = piece.crop(bb)
        piece.save(os.path.join(out_dir, f"{i:02d}.png"))
    return len(boxes)


MAP = {
    # ── 가구 ──
    "cream_bed": "furniture/00.png",
    "cloud_bed": "furniture/01.png",
    "wood_bed": "furniture/02.png",
    "daybed": "furniture/03.png",
    "pink_sofa": "furniture/04.png",
    "sage_chair": "furniture/05.png",
    "vintage_sofa": "furniture/06.png",
    "rattan_chair": "furniture/07.png",
    "round_stool": "furniture/08.png",
    "mushroom_stool": "furniture/09.png",
    "work_chair": "furniture/10.png",
    "reading_chair": "furniture/11.png",
    "wood_desk": "furniture/12.png",
    "window_desk": "furniture/13.png",
    "cafe_table": "furniture/14.png",
    "tea_table": "furniture/15.png",
    "vintage_side_table": "furniture/16.png",
    "drawer_nightstand": "furniture/17.png",
    "mini_shelf": "furniture/18.png",
    "cream_drawer": "furniture/19.png",
    "rattan_storage": "furniture/20.png",
    "low_shelf": "furniture/21.png",
    "small_hanger": "furniture/22.png",
    "pink_beanbag": "furniture/23.png",
    # ── 조명 · 러그 · 벽 ──
    "floor_lamp": "light/00.png",
    "mushroom_lamp": "light/01.png",
    "cloud_light": "light/02.png",
    "moon_light": "light/03.png",
    "star_lamp": "light/04.png",
    "vintage_lamp": "light/05.png",
    "green_stand": "light/06.png",
    "pink_glass_lamp": "light/07.png",
    "reading_light": "light/08.png",
    "firefly_jar": "light/09.png",
    "cream_rug": "light/10.png",
    "pink_cloud_rug": "light/11.png",
    "sage_rug": "light/12.png",
    "raindrop_rug": "light/13.png",
    "sunlight_rug": "light/14.png",
    "flower_rug": "light/15-0.png",
    "sleepy_bear_cushion": "light/16.png",
    "cat_cushion": "light/17.png",
    "landscape_poster": "light/18.png",
    "flower_poster": "light/19.png",
    "moon_poster": "light/15-2.png",
    "cloud_mobile": "light/20.png",
    "star_mobile": "light/21.png",
    "fairy_lights": "light/22.png",
    # ── 식물 · 살림 ──
    "big_monstera": "living/00.png",
    "rubber_tree": "living/01.png",
    "small_monstera": "living/02.png",
    "succulent": "living/03.png",
    "mini_cactus": "living/04.png",
    "bunny_cactus": "living/05.png",
    "olive_tree": "living/06.png",
    "window_ivy": "living/07.png",
    "pothos": "living/08.png",
    "pink_tulip": "living/09.png",
    "white_daisy": "living/10.png",
    "basil_pot": "living/11.png",
    "my_mug": "living/12.png",
    "glass_teacup": "living/13.png",
    "small_tumbler": "living/14.png",
    "water_bottle": "living/15.png",
    "flower_plate": "living/16.png",
    "jam_toast": "living/17.png",
    "wood_tray": "living/18.png",
    "rattan_basket": "living/19.png",
    "laundry_basket": "living/20.png",
    "wall_clock": "living/21.png",
    "vintage_alarm": "living/22.png",
    "small_candle": "living/23.png",
    "rainy_candle": "living/24.png",
    "small_umbrella": "living/25.png",
    "clear_umbrella": "living/26.png",
    "umbrella_stand": "living/27.png",
    "small_radio": "living/28.png",
    "instant_camera": "living/29.png",
    "strawberry_cake": "living/30.png",
    "croissant": "living/31.png",
    "latte_cup": "living/32.png",
    "lemonade": "living/33.png",
    "cereal_bowl": "living/34.png",
    "small_pot": "living/35.png",
    # ── 보물 · 재료 · 트로피 ──
    "stardust_jar": "magic/00.png",
    "moondust_jar": "magic/01.png",
    "clover_bottle": "magic/02.png",
    "star_piece": "magic/03.png",
    "shiny_pebble": "magic/04.png",
    "sunset_crystal": "magic/05.png",
    "cloud_piece": "magic/06.png",
    "dream_piece": "magic/07.png",
    "dawn_crystal": "magic/08.png",
    "raindrop_crystal": "magic/09.png",
    "moon_ticket_c": "magic/10.png",
    "night_ticket_c": "magic/11.png",
    "star_music_box": "magic/12.png",
    "sleeping_star": "magic/13.png",
    "little_moon": "magic/14.png",
    "m_wood": "magic/15.png",
    "m_cloth": "magic/16.png",
    "m_glass": "magic/17.png",
    "m_metal": "magic/18.png",
    "m_paper": "magic/19.png",
    "t_golden_broom": "magic/20.png",
    "t_golden_pen": "magic/21.png",
    "m_leaf": "magic/22.png",
    "m_petal": "magic/23.png",
    "m_stone": "magic/24.png",
    "t_shoe_trophy": "magic/25.png",
    "t_dragon": "magic/26.png",
    "t_hundred_stars": "magic/27.png",
    "moon_globe": "magic/28.png",
    "t_shiny_palette": "magic/29.png",
    # ── 가구 2차 ──
    "acrylic_chair": "furn2/00.png",
    "small_nightstand": "furn2/01.png",
    "drawer_nightstand": "furn2/02.png",
    "full_shelf": "furn2/03.png",
    "glass_cabinet": "furn2/04.png",
    "rattan_storage": "furn2/05.png",
    "sage_cabinet": "furn2/06.png",
    "small_hanger": "furn2/07.png",
    "coat_rack": "furn2/08.png",
    "window_bench": "furn2/09.png",
    "floor_chair": "furn2/10.png",
    "vanity": "furn2/11.png",
    "round_vanity": "furn2/12.png",
    "cafe_table": "furn2/13.png",
    "duo_table": "furn2/15.png",
    "kitchen_shelf": "furn2/16.png",
    "home_cafe_cart": "furn2/17-0.png",
    "shoe_cabinet": "furn2/17-1.png",
    "trolley": "furn2/18.png",
    "craft_cabinet": "furn2/19.png",
    "record_cabinet": "furn2/20.png",
    "entry_bench": "furn2/21.png",
    "window_ledge": "furn2/22.png",
    "jewel_box": "furn2/23.png",
    # ── 책과 종이 ──
    "unfinished_novel": "books/00.png",
    "thick_essay": "books/01.png",
    "poem_book": "books/02.png",
    "travel_magazine": "books/03.png",
    "fashion_magazine": "books/04.png",
    "old_picture_book": "books/05.png",
    "plant_book": "books/06.png",
    "star_book": "books/07.png",
    "cook_book": "books/08.png",
    "small_notebook": "books/09.png",
    "checklist_notebook": "books/10.png",
    "secret_diary": "books/11.png",
    "sketchbook": "books/12.png",
    "pencil_case": "books/13.png",
    "pencil_cup": "books/14.png",
    "fountain_pen": "books/15.png",
    "sticky_notes": "books/17.png",
    "letter": "books/18.png",
    "postcards": "books/19.png",
    "old_map": "books/20.png",
    # ── 먹을 것 ──
    "toast_butter": "food/00.png",
    "jam_toast": "food/01.png",
    "pancake": "food/02.png",
    "croissant": "food/03.png",
    "cake_slice": "food/04.png",
    "strawberry_cake": "food/05.png",
    "cookie_plate": "food/06.png",
    "apple_basket": "food/07.png",
    "tangerine_basket": "food/08.png",
    "strawberry_pack": "food/09.png",
    "coffee_cup": "food/10.png",
    "latte_cup": "food/11.png",
    "warm_tea": "food/12.png",
    "lemonade": "food/13.png",
    "milk_bottle": "food/14.png",
    "cereal_bowl": "food/15.png",
    "small_pot": "food/16.png",
    "frying_pan": "food/17.png",
    "cutting_board": "food/18.png",
    "oven_mitt": "food/19.png",
    # ── 기계와 취미 ──
    "small_laptop": "hobby/00.png",
    "monitor": "hobby/01.png",
    "keyboard": "hobby/02.png",
    "mouse": "hobby/03.png",
    "tablet": "hobby/04.png",
    "controller": "hobby/05.png",
    "speaker": "hobby/06.png",
    "handheld": "hobby/07.png",
    "guitar": "hobby/08.png",
    "knitting_basket": "hobby/09.png",
    "yarn": "hobby/10.png",
    "mini_piano": "hobby/11.png",
    "art_box": "hobby/12.png",
    "easel": "hobby/13.png",
    "palette": "hobby/14.png",
    "puzzle_box": "hobby/15.png",
    "board_game": "hobby/17.png",
    "yoga_mat": "hobby/18.png",
    "chalk_bag": "hobby/19.png",
    "sneakers_c": "hobby/20.png",
    # ── 식물과 꽃 ──
    "herb_pot": "plants/00.png",
    "basil_pot": "plants/01.png",
    "rosemary_pot": "plants/02.png",
    "lavender_pot": "plants/03.png",
    "yellow_tulip": "plants/04.png",
    "pink_tulip": "plants/05.png",
    "white_daisy": "plants/06.png",
    "rose_vase": "plants/07.png",
    "wildflowers": "plants/08.png",
    "baby_breath": "plants/09.png",
    "sunflower": "plants/10.png",
    "sprout_jar": "plants/11-0.png",
    "window_ivy": "plants/11-1.png",
    "clover": "plants/12.png",
    "night_flower": "plants/13.png",
    "mushroom_pot": "plants/14.png",
    # ── 가방 · 소품 · 기계 ──
    "eco_bag": "bags/00.png",
    "small_pouch": "bags/04.png",
    "lucky_keyring_c": "bags/08.png",
    "cloud_keyring": "bags/09.png",
    "moon_keyring_c": "bags/10.png",
    "jewel_box": "bags/11.png",
    "glasses_case": "bags/13.png",
    "vintage_camera": "bags/14.png",
    "instant_camera": "bags/15.png",
    "film_roll": "bags/16.png",
    "headphones_c": "bags/17.png",
    "hand_mirror": "bags/18-mirror.png",
    "turntable": "bags/19.png",
    "record": "bags/20.png",
    "small_comb": "bags/21.png",
    # ── 살림 소품 ──
    "small_tumbler": "daily/00.png",
    "water_bottle": "daily/01.png",
    "my_mug": "daily/02.png",
    "glass_teacup": "daily/03.png",
    "flower_plate": "daily/04.png",
    "toast_plate": "daily/05.png",
    "laundry_basket": "daily/06.png",
    "small_bin": "daily/07.png",
    "wood_tray": "daily/08.png",
    "rattan_basket": "daily/09.png",
    "cream_clock": "daily/10.png",
    "vintage_alarm": "daily/11.png",
    "desk_calendar": "daily/12.png",
    "small_candle": "daily/13.png",
    "small_umbrella": "daily/14.png",
    "clear_umbrella": "daily/15.png",
    "umbrella_stand": "daily/16.png",
    "rainy_candle": "daily/17.png",
    "matchbox": "daily/18.png",
    # ── 벽 ──
    "landscape_poster": "wall/00.png",
    "abstract_poster": "wall/01.png",
    "flower_poster": "wall/02.png",
    "moon_poster": "wall/03.png",
    "movie_poster": "wall/04.png",
    "small_frame": "wall/05.png",
    "friend_photo": "wall/06.png",
    "cloud_mobile": "wall/10.png",
    "polaroid_wall": "wall/11.png",
    "wall_clock": "wall/12.png",
    "star_mobile": "wall/13.png",
    "garland": "wall/14.png",
    "fairy_lights": "wall/15.png",
    "wall_mirror": "wall/16.png",
    "cork_board": "wall/19.png",
    # ── 러그와 천 ──
    "check_rug": "fabric/00.png",
    "sunlight_rug": "fabric/01.png",
    "mushroom_rug": "fabric/02.png",
    "cat_paw_rug": "fabric/03.png",
    "white_rug": "fabric/04.png",
    "persian_rug": "fabric/05.png",
    "picnic_mat": "fabric/06.png",
    "small_blanket": "fabric/07.png",
    "check_blanket": "fabric/08.png",
    "cloud_blanket": "fabric/09.png",
    "yellow_cushion": "fabric/10.png",
    "star_cushion": "fabric/11.png",
    # ── 조명 2차 ──
    "sunset_lamp": "lamps/00.png",
    "raindrop_light": "lamps/01.png",
    "candle_light": "lamps/02.png",
    "bud_lamp": "lamps/03.png",
    "paper_lantern": "lamps/04.png",
    "neon_star": "lamps/05.png",
    "star_projector": "lamps/06.png",
    "cat_lamp": "lamps/07.png",
    "dawn_lamp": "lamps/08.png",
    # ── 소파 · 벤치 ──
    "check_sofa": "sofa/00.png",
    "star_side_table": "sofa/01.png",
    "wood_bench": "sofa/02.png",
    # ── 트로피 ──
    "t_wood_star": "trophy/00.png",
    "t_adventure_book": "trophy/01.png",
    "t_thousand_stars": "trophy/02.png",
    "t_moon_shard": "trophy/03.png",
    "t_heart_bottle": "trophy/04.png",
    # ── 1차에 빠졌던 여섯 개 ──
    "beanbag": "extra/00.png",
    "mini_table": "extra/01.png",
    "constellation_rug": "extra/02.png",
    "small_cabinet": "extra/03.png",
    "secret_drawer": "extra/04.png",
    "star_pot": "extra/05.png",
}


def main():
    if not os.path.isdir(SHEETS):
        print(f"원본 시트가 없다: {SHEETS}")
        print("assets/source-sheets/README.md 를 참고해 시트를 넣고 다시 실행한다.")
        return 0

    sheets = sorted(f for f in os.listdir(SHEETS) if f.lower().endswith(".png"))
    if not sheets:
        print("시트가 없다. 이미 내보낸 파일은 그대로 둔다.")
        return 0

    total = 0
    for file in sheets:
        name = os.path.splitext(file)[0]
        count = slice_sheet(name, os.path.join(SHEETS, file), **PARAMS.get(name, {}))
        print(f"  {name}: {count} 조각")
        total += count

    made = 0
    for item_id, rel in sorted(MAP.items()):
        src = os.path.join(SLICES, rel)
        if not os.path.exists(src):
            print(f"  조각 없음: {item_id} ({rel})")
            continue
        im = drop_fragments(Image.open(src).convert("RGBA"))
        im.thumbnail((MAX, MAX), Image.LANCZOS)
        # 폴더는 매니페스트 스크립트가 정리한다. 여기서는 평면으로 내보낸다.
        dst_dir = os.path.join(ROOT, "public/assets/collection")
        os.makedirs(dst_dir, exist_ok=True)
        im.save(os.path.join(dst_dir, f"{item_id}.webp"), "WEBP", quality=86, method=6)
        made += 1

    print(f"조각 {total}개 · 내보낸 아이템 {made}개")
    print("다음: npm run assets:manifest (분류 폴더로 옮기고 매니페스트 갱신)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
