#!/usr/bin/env python3
"""
Life OS 픽셀 에셋 파이프라인.

assets-source/asset-sheet.png (알파 있는 원본 시트) 에서 스프라이트를 자동으로 잘라
public/assets/pixel/<카테고리>/<이름>.png 로 저장하고, TS 레지스트리를 생성한다.

    python3 scripts/process-pixel-assets.py

- 스프라이트 분리는 알파 채널 기준 연결 요소 검출로 한다 (detect_components.py).
- 검출 파라미터(alpha_min=100, gap=1)를 바꾸면 인덱스가 달라지므로 고정해 둔다.
- 시트를 새로 그리면 INDEX 값을 다시 맞춰야 한다. 확인용 대조표는
  scripts/contact_sheet.py 로 만든다.
"""
import json
import os
import sys
from collections import deque

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from detect_components import detect
from pixelsheet import crop, read_png, write_png

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_ROOT = os.path.join(ROOT, 'public', 'assets', 'pixel')

# ── 시트를 여러 장 함께 쓴다
#   v4 : 캐릭터 · 고양이 (전신 포즈)
#   v5 : 물건 · 옷 · 가구
#   v3 : 상태 배지 · 반짝임 · 말풍선 · 하트 · 별처럼 v4/v5 에 없는 UI 조각
#   v1 : 그래도 없는 것 (카메라 · 구름 · 무지개 · 전구줄 · 일부 가구)
SHEETS = {
    'v4': os.path.join(ROOT, 'assets-source', 'asset-sheet-v4.png'),
    'v5': os.path.join(ROOT, 'assets-source', 'asset-sheet-v5.png'),
    'v3': os.path.join(ROOT, 'assets-source', 'asset-sheet-v3.png'),
    'v1': os.path.join(ROOT, 'assets-source', 'asset-sheet.png'),
}
DEFAULT_SHEET = 'v5'

# 카테고리/이름 -> (시트, 컴포넌트 인덱스). 숫자만 쓰면 DEFAULT_SHEET.
MAP = {
    # 방에 세우는 캐릭터는 전부 전신 포즈만 쓴다 (상반신 컷은 쓰지 않는다)
    'characters': {
        'idle': ('v4', 0),        # 서 있는 정면
        'recovery': ('v4', 7),    # 쿠션 끌어안고 눈 감은 모습
        'easy': ('v4', 26),       # 책상다리로 앉아 음료
        'normal': ('v4', 4),      # 무릎에 노트북 (방의 책상과 겹치지 않게)
        'power': ('v4', 27),      # 무릎 세우고 팔 번쩍
        'back-bag': ('v4', 11),   # 가방 메고 걷는 뒷모습
        'back-coat': ('v4', 24),  # 서 있는 뒷모습
    },
    'pets': {
        'cat-sit': ('v4', 41),
        'cat-walk': ('v4', 42),
        'cat-lying': ('v4', 44),
        'cat-curl': ('v4', 63),
        'cat-box': ('v4', 56),
        'cat-stand': ('v4', 51),
        'cat-white': ('v4', 46),
    },
    'icons': {
        'focus': 7,          # 노트북
        'work': 8,           # 노트북(어두운)
        'log': 26,           # 펼친 책
        'climbing': 76,      # 초크백
        'caffeine': 54,      # 머그
        'water': 59,         # 물병
        'food': 65,          # 과일 볼
        'appetite': 64,      # 주먹밥
        'exercise': 106,     # 운동화
        'outfit': 70,        # 티셔츠
        'fatigue': 114,      # 베개
        'clean': 128,        # 정리용 상자
        # v5 에 없는 것
        'sleep': ('v3', 55),
        'mood': ('v3', 132),
        'body': ('v3', 19),
        'energy': ('v3', 67),
        'music': ('v3', 74),
        'save': ('v3', 192),
        'shower': ('v3', 126),
        'xp': ('v3', 189),
        'camera': ('v1', 116),
    },
    'items': {
        'coffee-mug': 58,
        'milk': 36,
        'smoothie': 50,
        'iced-coffee': 50,
        'water-bottle': 59,
        'onigiri': 64,
        'apple': 56,
        'banana': 66,
        'fruit-bowl': 65,
        'toast': ('v3', 47),
        'chocolate': ('v1', 105),
        'croissant': ('v1', 95),
        'peach': ('v1', 97),
        'sandwich': ('v1', 83),
    },
    'gear': {
        'climbing-shoes': 103,
        'sneakers': 106,
        'yoga-mat': 116,     # 돌돌 만 매트
        'headphones': 2,
        'dumbbell': 88,
    },
    'furniture': {
        'beanbag': 111,
        'clock': 78,
        'desk': 121,
        'hanging-plant': 79,
        'lamp': 80,
        'mirror': 39,
        'photo-frames': 49,
        'pinboard': 81,
        'plant': 62,
        'poster-pink': 105,
        'poster-sky': 102,
        # 방 배경 그림에 이미 들어 있는 것들 — 다른 화면용으로만 남겨 둔다
        'bed': ('v1', 136),
        'bookshelf': ('v1', 158),
        'clothing-rack': ('v1', 155),
        'laundry-basket': ('v1', 180),
        'nightstand': ('v1', 134),
        'rug': ('v1', 138),
        'window-day': ('v1', 188),
        'window-morning': ('v1', 189),
        'window-sunset': ('v1', 190),
        'window-night': ('v1', 191),
    },
    'fashion': {
        'backpack': 41,
        'bag-black': 42,
        'cap': 87,
        'jeans': 89,
        'shorts-black': 92,
        'shorts-denim': 90,
        'tshirt-pink': 70,
        'tshirt-bow': 72,
        'tote-climb': 40,
        'tote-make': ('v1', 147),
    },
    'effects': {
        'heart': ('v3', 132),
        'heart-bubble': ('v3', 123),
        'sparkle-01': ('v3', 135),
        'sparkle-02': ('v3', 136),
        'zzz-bubble': ('v3', 125),
        'flower': ('v3', 159),
        'cloud': ('v1', 25),
        'rainbow': ('v1', 36),
        'string-lights': ('v1', 66),
    },
    'ui': {
        'pill-recovery': ('v3', 10),
        'pill-easy': ('v3', 18),
        'pill-normal': ('v3', 31),
        'pill-power': ('v3', 46),
        'pill-idle': ('v1', 37),
        'logo': ('v1', 85),
        'save-button': ('v1', 187),
        'mascot': ('v1', 174),
    },
}

# 배경 타일이 붙어 있어 통째로 못 자르는 것들: 부모 컴포넌트 안에서 비율로 잘라내고
# 가장자리에서 flood fill 로 단색 배경을 지운다.
SUBCROPS = {
    # v1 시트의 배경 타일이 붙어 있던 것
    ('icons', 'home'): ('v1', 186, 0.040, 0.09, 0.196, 0.62),
}


def trim(px, w, h):
    x0, y0, x1, y1 = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            if px[(y * w + x) * 4 + 3] > 12:
                x0 = min(x0, x); x1 = max(x1, x)
                y0 = min(y0, y); y1 = max(y1, y)
    if x1 < 0:
        return w, h, px
    return crop(px, w, x0, y0, x1 + 1, y1 + 1)


def drop_flat_background(px, w, h, tolerance=26):
    """테두리에서 시작해 비슷한 색을 지운다 (평평한 카드 배경 제거용)."""
    corner = px[0:3]
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        q.append(x)
        q.append((h - 1) * w + x)
    for y in range(h):
        q.append(y * w)
        q.append(y * w + w - 1)
    while q:
        p = q.popleft()
        if seen[p]:
            continue
        seen[p] = 1
        i = p * 4
        if abs(px[i] - corner[0]) + abs(px[i + 1] - corner[1]) + abs(px[i + 2] - corner[2]) > tolerance:
            continue
        px[i + 3] = 0
        py, pxx = divmod(p, w)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = pxx + dx, py + dy
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
                q.append(ny * w + nx)
    return px


def main():
    sheets = {}
    for key, path in SHEETS.items():
        print(f'{key} 시트 분석 중…')
        sw, sh, comps = detect(path, gap=1)
        _w, _h, px = read_png(path)
        sheets[key] = (sw, sh, comps, px)
        print(f'  {len(comps)} 개 스프라이트 검출')

    manifest = {}
    written = 0
    used = {key: 0 for key in SHEETS}

    def resolve(entry):
        """숫자면 기본 시트, (시트, 번호) 면 그 시트."""
        if isinstance(entry, tuple):
            return entry[0], entry[1]
        return DEFAULT_SHEET, entry

    def save(category, name, cw, ch, cpx):
        out_dir = os.path.join(OUT_ROOT, category)
        os.makedirs(out_dir, exist_ok=True)
        write_png(os.path.join(out_dir, f'{name}.png'), cw, ch, cpx)
        manifest.setdefault(category, {})[name] = {
            'src': f'/assets/pixel/{category}/{name}.png',
            'width': cw,
            'height': ch,
        }

    for category, entries in MAP.items():
        for name, entry in entries.items():
            key, index = resolve(entry)
            sw, _sh, comps, px = sheets[key]
            x0, y0, x1, y1, _area = comps[index]
            cw, ch, cpx = crop(px, sw, x0, y0, x1, y1)
            cw, ch, cpx = trim(cpx, cw, ch)
            save(category, name, cw, ch, cpx)
            used[key] += 1
            written += 1

    for (category, name), (key, index, fx0, fy0, fx1, fy1) in SUBCROPS.items():
        sw, _sh, comps, px = sheets[key]
        x0, y0, x1, y1, _area = comps[index]
        bw, bh = x1 - x0, y1 - y0
        cw, ch, cpx = crop(
            px, sw,
            x0 + int(bw * fx0), y0 + int(bh * fy0),
            x0 + int(bw * fx1), y0 + int(bh * fy1),
        )
        cpx = drop_flat_background(cpx, cw, ch)
        cw, ch, cpx = trim(cpx, cw, ch)
        save(category, name, cw, ch, cpx)
        used[key] += 1
        written += 1

    os.makedirs(OUT_ROOT, exist_ok=True)
    with open(os.path.join(OUT_ROOT, 'manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=2, sort_keys=True)

    write_registry(manifest)
    build_app_icons()
    counts = ' · '.join(f'{k} {v}개' for k, v in used.items())
    print(f'  {written} 개 파일 기록 ({counts}) → public/assets/pixel/')


def camel(name):
    head, *rest = name.split('-')
    return head + ''.join(p.capitalize() for p in rest)


def write_registry(manifest):
    lines = [
        '// 이 파일은 scripts/process-pixel-assets.py 가 생성한다. 직접 고치지 말 것.',
        '// 에셋 원본: assets-source/asset-sheet-v3.png (없는 것만 asset-sheet.png)',
        '',
        'export interface PixelAsset {',
        '  src: string',
        '  width: number',
        '  height: number',
        '}',
        '',
    ]
    for category in sorted(manifest):
        entries = manifest[category]
        lines.append(f'export const {category} = {{')
        for name in sorted(entries):
            e = entries[name]
            lines.append(
                f"  {camel(name)}: {{ src: '{e['src']}', width: {e['width']}, height: {e['height']} }},"
            )
        lines.append('} as const satisfies Record<string, PixelAsset>')
        lines.append('')

    cats = sorted(manifest)
    lines.append('export const pixelAssets = {')
    for c in cats:
        lines.append(f'  {c},')
    lines.append('} as const')
    lines.append('')
    for c in cats:
        lines.append(f'export type {c[0].upper() + c[1:]}Name = keyof typeof {c}')
    lines.append('')

    path = os.path.join(ROOT, 'src', 'lib', 'pixelAssets.generated.ts')
    with open(path, 'w') as f:
        f.write('\n'.join(lines))
    print('  src/lib/pixelAssets.generated.ts 갱신')


def build_app_icons():
    """홈 화면 아이콘 — 캐릭터 스프라이트를 크림 배경에 올려 만든다."""
    src = os.path.join(OUT_ROOT, 'characters', 'idle.png')
    w, h, px = read_png(src)
    out_dir = os.path.join(ROOT, 'public', 'icons')
    os.makedirs(out_dir, exist_ok=True)
    bg = (253, 246, 236, 255)

    for size in (180, 192, 512):
        canvas = bytearray(bytes(bg) * (size * size))
        # 캐릭터를 정수배로 키워 도트를 유지한다
        scale = max(1, int((size * 0.72) // h))
        dw, dh = w * scale, h * scale
        ox, oy = (size - dw) // 2, size - dh - int(size * 0.08)
        for y in range(dh):
            sy = y // scale
            for x in range(dw):
                s = (sy * w + x // scale) * 4
                a = px[s + 3]
                if a < 20:
                    continue
                dx, dy = ox + x, oy + y
                if not (0 <= dx < size and 0 <= dy < size):
                    continue
                d = (dy * size + dx) * 4
                for k in range(3):
                    canvas[d + k] = (px[s + k] * a + canvas[d + k] * (255 - a)) // 255
                canvas[d + 3] = 255
        write_png(os.path.join(out_dir, f'icon-{size}.png'), size, size, canvas)
    print('  앱 아이콘 3종 생성')


if __name__ == '__main__':
    main()
