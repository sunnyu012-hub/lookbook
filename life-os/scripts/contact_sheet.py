"""검출된 컴포넌트를 격자로 늘어놓아 눈으로 확인하기 위한 미리보기 생성."""
import json
import sys

sys.path.insert(0, 'scripts')
from pixelsheet import read_png, write_png

CELL, COLS = 128, 12


def build(sheet, comps_path, out_prefix, per_part=60):
    w, h, px = read_png(sheet)
    comps = json.load(open(comps_path))
    parts = []
    for part in range((len(comps) + per_part - 1) // per_part):
        chunk = comps[part * per_part:(part + 1) * per_part]
        rows = (len(chunk) + COLS - 1) // COLS
        W, H = COLS * CELL, rows * CELL
        out = bytearray(W * H * 4)
        for y in range(H):
            for x in range(W):
                c = 235 if ((x // 8 + y // 8) % 2 == 0) else 205
                if x % CELL < 2 or y % CELL < 2:
                    c = 120
                i = (y * W + x) * 4
                out[i:i + 4] = bytes((c, c, c, 255))
        for idx, (x0, y0, x1, y1, _area) in enumerate(chunk):
            cw, ch = x1 - x0, y1 - y0
            f = min((CELL - 10) / cw, (CELL - 10) / ch, 1.0)
            dw, dh = max(1, int(cw * f)), max(1, int(ch * f))
            cx = (idx % COLS) * CELL + (CELL - dw) // 2
            cy = (idx // COLS) * CELL + (CELL - dh) // 2
            for y in range(dh):
                sy = y0 + int(y / f)
                for x in range(dw):
                    sx = x0 + int(x / f)
                    s = (sy * w + sx) * 4
                    a = px[s + 3]
                    if a < 40:
                        continue
                    d = ((cy + y) * W + cx + x) * 4
                    for k in range(3):
                        out[d + k] = (px[s + k] * a + out[d + k] * (255 - a)) // 255
        path = f'{out_prefix}-{part}.png'
        write_png(path, W, H, out)
        parts.append((path, part * per_part, part * per_part + len(chunk) - 1))
    return parts


if __name__ == '__main__':
    for p in build(sys.argv[1], sys.argv[2], sys.argv[3]):
        print(p)
