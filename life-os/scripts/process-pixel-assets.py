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

# ── 시트 두 장을 함께 쓴다
#   v3 : 새 시트 (캐릭터 · 고양이 · 대부분의 아이콘)
#   v1 : 예전 시트 (v3 에 없는 것만 — 카메라 · 구름 · 무지개 · 아령 · 집 · 가구 등)
SHEETS = {
    'v3': os.path.join(ROOT, 'assets-source', 'asset-sheet-v3.png'),
    'v1': os.path.join(ROOT, 'assets-source', 'asset-sheet.png'),
}
DEFAULT_SHEET = 'v3'

# 카테고리/이름 -> 컴포넌트 인덱스.
#   숫자만 쓰면 v3 시트, ('v1', 번호) 로 쓰면 예전 시트에서 가져온다.
MAP = {
    'characters': {
        'idle': 69,          # 앉아서 책 보는 모습
        'recovery': 142,     # 쿠션에 엎드려 자는 모습
        'easy': 71,          # 음료 들고 서 있는 모습
        'normal': 141,       # 노트북 앞에 앉은 모습
        # power 는 두 스프라이트가 붙어 검출돼서 SUBCROPS 에서 잘라낸다
        'back-bag': 72,
        'back-coat': 111,
    },
    'pets': {
        'cat-sit': 175,
        'cat-lying': 185,
        'cat-curl': 194,
        'cat-walk': 170,
        'cat-white': 172,
        'cat-stand': 171,
        'cat-box': 186,
    },
    'icons': {
        'sleep': 55,         # 보라 달
        'mood': 132,         # 분홍 하트
        'body': 19,          # 팔 근육
        'focus': 32,         # 작은 노트북
        'appetite': 47,      # 토스트
        'caffeine': 54,      # 머그
        'climbing': 82,      # 초크백
        'energy': 67,        # 번개
        'exercise': 145,     # 운동화
        'food': 166,         # 샐러드 볼
        'log': 62,           # 펼친 책
        'music': 74,         # 음표
        'outfit': 94,        # 나시
        'save': 192,         # 플로피
        'shower': 126,       # 물방울 말풍선
        'water': 104,        # 물방울
        'work': 4,           # 노트북
        'xp': 189,           # 별
        # v3 에 마땅한 그림이 없는 것들
        'fatigue': ('v1', 73),
        'camera': ('v1', 116),
        'clean': ('v1', 93),
    },
    'items': {
        'coffee-mug': 53,
        'milk': 44,
        'smoothie': 42,
        'iced-coffee': 42,
        'water-bottle': 43,
        'onigiri': ('v1', 87),
        'croissant': ('v1', 95),
        'apple': 167,
        'fruit-bowl': 166,
        'chocolate': ('v1', 105),
        'toast': 47,
        'banana': ('v1', 94),
        'peach': ('v1', 97),
        'sandwich': ('v1', 83),
    },
    'gear': {
        'climbing-shoes': 80,
        'sneakers': 145,
        'yoga-mat': 196,     # 돌돌 만 매트
        'headphones': 25,
        'dumbbell': ('v1', 126),
    },
    'furniture': {
        'hanging-plant': 107,
        'plant': 169,
        'clock': 119,
        'photo-frames': 164,
        'pinboard': 160,
        'poster-sky': 182,
        'poster-pink': 179,
        # 방 배경 그림에 이미 들어 있는 가구들 — 다른 화면에서 쓸 수 있게 남겨 둔다
        'lamp': ('v1', 132),
        'beanbag': ('v1', 133),
        'nightstand': ('v1', 134),
        'bed': ('v1', 136),
        'rug': ('v1', 138),
        'desk': ('v1', 145),
        'clothing-rack': ('v1', 155),
        'mirror': ('v1', 156),
        'bookshelf': ('v1', 158),
        'laundry-basket': ('v1', 180),
        'window-day': ('v1', 188),
        'window-morning': ('v1', 189),
        'window-sunset': ('v1', 190),
        'window-night': ('v1', 191),
    },
    'fashion': {
        'backpack': 76,
        'bag-black': 77,
        'cap': 147,
        'jeans': 121,
        'shorts-black': 122,
        'shorts-denim': 131,
        'tshirt-pink': 100,
        'tshirt-bow': 94,
        'tote-climb': ('v1', 146),
        'tote-make': ('v1', 147),
    },
    'effects': {
        'heart': 132,
        'heart-bubble': 123,
        'sparkle-01': 135,
        'sparkle-02': 136,
        'zzz-bubble': 125,
        'flower': 159,
        'cloud': ('v1', 25),
        'rainbow': ('v1', 36),
        'string-lights': ('v1', 66),
    },
    'ui': {
        'pill-recovery': 10,
        'pill-easy': 18,
        'pill-normal': 31,
        'pill-power': 46,
        'pill-idle': ('v1', 37),
        'logo': ('v1', 85),
        'save-button': ('v1', 187),
        'mascot': ('v1', 174),
    },
}

# 배경 타일이 붙어 있어 통째로 못 자르는 것들: 부모 컴포넌트 안에서 비율로 잘라내고
# 가장자리에서 flood fill 로 단색 배경을 지운다.
SUBCROPS = {
    # v3 에서 두 스프라이트가 붙어 검출된 덩어리의 위쪽(만세하는 모습)만 쓴다
    ('characters', 'power'): ('v3', 110, 0.0, 0.0, 1.0, 0.50),
    # v1 시트의 배경 타일이 붙어 있던 것들
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
