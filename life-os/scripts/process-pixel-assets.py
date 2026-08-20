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
SHEET = os.path.join(ROOT, 'assets-source', 'asset-sheet.png')
OUT_ROOT = os.path.join(ROOT, 'public', 'assets', 'pixel')

# 카테고리/이름 -> 시트에서 검출된 컴포넌트 인덱스
MAP = {
    'characters': {
        'idle': 4,
        'recovery': 19,
        'easy': 5,
        'normal': 6,
        'power': 7,
        'back-bag': 60,
        'back-coat': 61,
    },
    'pets': {
        'cat-sit': 13,
        'cat-lying': 14,
        'cat-curl': 15,
        'cat-walk': 26,
        'cat-white': 27,
        'cat-stand': 28,
        'cat-box': 29,
    },
    'icons': {
        'sleep': 72,
        'fatigue': 73,
        'mood': 74,
        'body': 75,
        'focus': 76,
        'appetite': 77,
        'caffeine': 78,
        'exercise': 88,
        'climbing': 89,
        'water': 90,
        'shower': 91,
        'food': 92,
        'clean': 93,
        'outfit': 114,
        'work': 115,
        'camera': 116,
        'music': 117,
        'save': 118,
        'energy': 119,
        'xp': 120,
    },
    'items': {
        'iced-coffee': 69,
        'smoothie': 79,
        'water-bottle': 80,
        'milk': 81,
        'toast': 82,
        'sandwich': 83,
        'fruit-bowl': 84,
        'coffee-mug': 86,
        'onigiri': 87,
        'banana': 94,
        'croissant': 95,
        'apple': 96,
        'peach': 97,
        'chocolate': 105,
    },
    'gear': {
        'climbing-shoes': 123,
        'headphones': 125,
        'dumbbell': 126,
        'yoga-mat': 127,
        'sneakers': 128,
    },
    'furniture': {
        'lamp': 132,
        'beanbag': 133,
        'nightstand': 134,
        'bed': 136,
        'rug': 138,
        'desk': 145,
        'clothing-rack': 155,
        'mirror': 156,
        'bookshelf': 158,
        'plant': 169,
        'hanging-plant': 153,
        'clock': 171,
        'photo-frames': 172,
        'pinboard': 178,
        'laundry-basket': 180,
        'window-day': 188,
        'window-morning': 189,
        'window-sunset': 190,
        'window-night': 191,
        'poster-sky': 175,
        'poster-pink': 176,
    },
    'fashion': {
        'tshirt-pink': 141,
        'tshirt-bow': 142,
        'jeans': 143,
        'tote-climb': 146,
        'tote-make': 147,
        'backpack': 148,
        'shorts-black': 150,
        'shorts-denim': 152,
        'cap': 161,
        'bag-black': 179,
    },
    'effects': {
        'sparkle-01': 16,
        'sparkle-02': 21,
        'heart': 22,
        'heart-bubble': 30,
        'zzz-bubble': 31,
        'cloud': 25,
        'rainbow': 36,
        'string-lights': 66,
        'flower': 35,
    },
    'ui': {
        'pill-idle': 37,
        'pill-recovery': 38,
        'pill-easy': 39,
        'pill-normal': 40,
        'pill-power': 41,
        'logo': 85,
        'save-button': 187,
        'mascot': 174,
    },
}

# 배경 타일이 붙어 있어 통째로 못 자르는 것들: 부모 컴포넌트 안에서 비율로 잘라내고
# 가장자리에서 flood fill 로 단색 배경을 지운다.
SUBCROPS = {
    ('icons', 'home'): (186, 0.040, 0.09, 0.196, 0.62),
    ('icons', 'log'): (186, 0.545, 0.09, 0.700, 0.62),
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
    print('시트 분석 중…')
    sw, sh, comps = detect(SHEET, gap=1)
    print(f'  {len(comps)} 개 스프라이트 검출')
    _w, _h, sheet = read_png(SHEET)

    manifest = {}
    written = 0

    for category, entries in MAP.items():
        out_dir = os.path.join(OUT_ROOT, category)
        os.makedirs(out_dir, exist_ok=True)
        manifest.setdefault(category, {})
        for name, index in entries.items():
            x0, y0, x1, y1, _area = comps[index]
            cw, ch, cpx = crop(sheet, sw, x0, y0, x1, y1)
            cw, ch, cpx = trim(cpx, cw, ch)
            write_png(os.path.join(out_dir, f'{name}.png'), cw, ch, cpx)
            manifest[category][name] = {
                'src': f'/assets/pixel/{category}/{name}.png',
                'width': cw,
                'height': ch,
            }
            written += 1

    for (category, name), (index, fx0, fy0, fx1, fy1) in SUBCROPS.items():
        out_dir = os.path.join(OUT_ROOT, category)
        os.makedirs(out_dir, exist_ok=True)
        x0, y0, x1, y1, _area = comps[index]
        bw, bh = x1 - x0, y1 - y0
        cw, ch, cpx = crop(
            sheet, sw,
            x0 + int(bw * fx0), y0 + int(bh * fy0),
            x0 + int(bw * fx1), y0 + int(bh * fy1),
        )
        cpx = drop_flat_background(cpx, cw, ch)
        cw, ch, cpx = trim(cpx, cw, ch)
        write_png(os.path.join(out_dir, f'{name}.png'), cw, ch, cpx)
        manifest.setdefault(category, {})[name] = {
            'src': f'/assets/pixel/{category}/{name}.png',
            'width': cw,
            'height': ch,
        }
        written += 1

    os.makedirs(OUT_ROOT, exist_ok=True)
    with open(os.path.join(OUT_ROOT, 'manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=2, sort_keys=True)

    write_registry(manifest)
    build_app_icons()
    print(f'  {written} 개 파일 기록 → public/assets/pixel/')


def camel(name):
    head, *rest = name.split('-')
    return head + ''.join(p.capitalize() for p in rest)


def write_registry(manifest):
    lines = [
        '// 이 파일은 scripts/process-pixel-assets.py 가 생성한다. 직접 고치지 말 것.',
        '// 에셋 원본: assets-source/asset-sheet.png',
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
