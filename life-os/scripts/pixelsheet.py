"""PNG 읽기/쓰기 + 스프라이트 추출 유틸 (외부 의존성 없이 순수 파이썬)."""
import struct
import zlib


def read_png(path):
    data = open(path, 'rb').read()
    pos, idat, w, h, depth, ctype = 8, b'', 0, 0, 8, 6
    plte = None
    while pos < len(data):
        ln = struct.unpack('>I', data[pos:pos + 4])[0]
        tag = data[pos + 4:pos + 8]
        chunk = data[pos + 8:pos + 8 + ln]
        if tag == b'IHDR':
            w, h, depth, ctype = (*struct.unpack('>II', chunk[:8]), chunk[8], chunk[9])
        elif tag == b'PLTE':
            plte = chunk
        elif tag == b'IDAT':
            idat += chunk
        pos += 12 + ln
    if depth != 8:
        raise ValueError('8bit PNG 만 지원')

    channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[ctype]
    raw = zlib.decompress(idat)
    stride = w * channels
    out = bytearray(w * h * 4)
    prev = bytearray(stride)
    i = 0
    for y in range(h):
        f = raw[i]; i += 1
        line = bytearray(raw[i:i + stride]); i += stride
        bpp = channels
        if f:
            for x in range(stride):
                a = line[x - bpp] if x >= bpp else 0
                b = prev[x]
                c = prev[x - bpp] if x >= bpp else 0
                if f == 1:
                    line[x] = (line[x] + a) & 255
                elif f == 2:
                    line[x] = (line[x] + b) & 255
                elif f == 3:
                    line[x] = (line[x] + (a + b) // 2) & 255
                else:
                    p = a + b - c
                    pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                    pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                    line[x] = (line[x] + pr) & 255
        prev = line
        base = y * w * 4
        if ctype == 6:
            out[base:base + w * 4] = line
        elif ctype == 2:
            for x in range(w):
                out[base + x * 4:base + x * 4 + 3] = line[x * 3:x * 3 + 3]
                out[base + x * 4 + 3] = 255
        elif ctype == 3:
            for x in range(w):
                idx = line[x] * 3
                out[base + x * 4:base + x * 4 + 3] = plte[idx:idx + 3]
                out[base + x * 4 + 3] = 255
        elif ctype == 0:
            for x in range(w):
                v = line[x]
                out[base + x * 4:base + x * 4 + 4] = bytes((v, v, v, 255))
        else:  # 4: gray+alpha
            for x in range(w):
                v, a = line[x * 2], line[x * 2 + 1]
                out[base + x * 4:base + x * 4 + 4] = bytes((v, v, v, a))
    return w, h, out


def write_png(path, w, h, px):
    raw = b''.join(b'\x00' + bytes(px[y * w * 4:(y + 1) * w * 4]) for y in range(h))

    def chunk(tag, d):
        c = struct.pack('>I', len(d)) + tag + d
        return c + struct.pack('>I', zlib.crc32(tag + d) & 0xFFFFFFFF)

    blob = (
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
        + chunk(b'IDAT', zlib.compress(bytes(raw), 9))
        + chunk(b'IEND', b'')
    )
    open(path, 'wb').write(blob)


def crop(src, sw, x0, y0, x1, y1):
    w, h = x1 - x0, y1 - y0
    out = bytearray(w * h * 4)
    for y in range(h):
        s = ((y0 + y) * sw + x0) * 4
        out[y * w * 4:(y + 1) * w * 4] = src[s:s + w * 4]
    return w, h, out


def scale(px, w, h, factor):
    ow, oh = w * factor, h * factor
    out = bytearray(ow * oh * 4)
    for y in range(oh):
        sy = y // factor
        for x in range(ow):
            si = (sy * w + x // factor) * 4
            di = (y * ow + x) * 4
            out[di:di + 4] = px[si:si + 4]
    return ow, oh, out
