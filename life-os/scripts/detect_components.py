"""에셋 시트에서 알파 기준으로 스프라이트 덩어리를 찾아 bbox 목록을 뽑는다."""
import json
import sys
from collections import deque

sys.path.insert(0, 'scripts')
from pixelsheet import read_png


def detect(path, alpha_min=100, gap=1, min_area=200):
    w, h, px = read_png(path)
    mask = bytearray(w * h)
    for i in range(w * h):
        if px[i * 4 + 3] > alpha_min:
            mask[i] = 1

    # gap 만큼의 틈은 같은 스프라이트로 본다 (분리된 눈·반짝임 조각 대응)
    dil = bytearray(mask)
    if gap:
        tmp = bytearray(w * h)
        for y in range(h):
            row = y * w
            run = 0
            for x in range(w):
                if mask[row + x]:
                    run = gap + 1
                if run:
                    tmp[row + x] = 1
                    run -= 1
            run = 0
            for x in range(w - 1, -1, -1):
                if mask[row + x]:
                    run = gap + 1
                if run:
                    tmp[row + x] = 1
                    run -= 1
        dil = bytearray(w * h)
        for x in range(w):
            run = 0
            for y in range(h):
                if tmp[y * w + x]:
                    run = gap + 1
                if run:
                    dil[y * w + x] = 1
                    run -= 1
            run = 0
            for y in range(h - 1, -1, -1):
                if tmp[y * w + x]:
                    run = gap + 1
                if run:
                    dil[y * w + x] = 1
                    run -= 1

    seen = bytearray(w * h)
    comps = []
    for start in range(w * h):
        if not dil[start] or seen[start]:
            continue
        q = deque([start])
        seen[start] = 1
        x0 = y0 = 10 ** 9
        x1 = y1 = -1
        area = 0
        while q:
            p = q.popleft()
            py, pxx = divmod(p, w)
            if mask[p]:
                area += 1
                x0 = min(x0, pxx); x1 = max(x1, pxx)
                y0 = min(y0, py); y1 = max(y1, py)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    nx, ny = pxx + dx, py + dy
                    if 0 <= nx < w and 0 <= ny < h:
                        n = ny * w + nx
                        if dil[n] and not seen[n]:
                            seen[n] = 1
                            q.append(n)
        if area >= min_area and x1 >= x0:
            comps.append([x0, y0, x1 + 1, y1 + 1, area])
    comps.sort(key=lambda c: (c[1] // 24, c[0]))
    return w, h, comps


if __name__ == '__main__':
    gap = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    w, h, comps = detect(sys.argv[1], gap=gap)
    json.dump(comps, open(sys.argv[3], 'w'))
    print(len(comps), 'components')
