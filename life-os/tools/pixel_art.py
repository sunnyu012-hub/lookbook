#!/usr/bin/env python3
"""
Life OS 픽셀 아트 생성기.

에셋을 코드로 그려서 public/sprites/*.png 로 굽는다.
나중에 손으로 그린 PNG 스프라이트 시트로 교체할 때는, 같은 격자 규격
(아이콘 16px / 캐릭터 32px)만 지키면 이 스크립트를 지우고 파일만 갈아끼우면 된다.

    python3 tools/pixel_art.py
"""
import os
import struct
import zlib

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public', 'sprites')

# ── 팔레트 (soft pixel game) ────────────────────────────────
P = {
    '.': None,                 # 투명
    'k': (0x5A, 0x4B, 0x3E),   # 외곽선 (warm ink)
    'K': (0x3E, 0x33, 0x2A),   # 진한 외곽선
    'w': (0xFF, 0xFF, 0xFF),
    'i': (0xFF, 0xFB, 0xF2),   # ivory
    'c': (0xF6, 0xEF, 0xE2),   # cream
    'e': (0xE7, 0xDC, 0xC8),   # cream shade
    'r': (0xE9, 0xA9, 0xB0),   # dusty pink
    'R': (0xD3, 0x84, 0x8E),
    'p': (0xC4, 0xB8, 0xE8),   # soft lavender
    'P': (0x9A, 0x8A, 0xD1),
    'y': (0xF5, 0xD5, 0x7C),   # butter yellow
    'Y': (0xE0, 0xB3, 0x4E),
    'g': (0xA8, 0xC6, 0x9F),   # sage green
    'G': (0x7A, 0x9E, 0x74),
    'b': (0xAE, 0xD4, 0xEC),   # sky blue
    'B': (0x7F, 0xB3, 0xD8),
    'n': (0xD8, 0xB0, 0x87),   # warm light brown
    'N': (0xA8, 0x7C, 0x56),   # warm brown
    's': (0xF7, 0xD3, 0xB0),   # skin
    'S': (0xE2, 0xB0, 0x8A),   # skin shade
    'h': (0x7A, 0x53, 0x40),   # hair
    'o': (0xEF, 0xA9, 0x6A),   # orange accent
}


def png(path, w, h, px):
    """px: [(r,g,b,a), ...] 길이 w*h"""
    raw = b''
    for y in range(h):
        raw += b'\x00' + b''.join(bytes(px[y * w + x]) for x in range(w))

    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)

    blob = (
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
        + chunk(b'IDAT', zlib.compress(raw, 9))
        + chunk(b'IEND', b'')
    )
    with open(path, 'wb') as f:
        f.write(blob)


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = [(0, 0, 0, 0)] * (w * h)

    def set(self, x, y, ch):
        if ch == '.' or not (0 <= x < self.w and 0 <= y < self.h):
            return
        rgb = P[ch]
        self.px[y * self.w + x] = (rgb[0], rgb[1], rgb[2], 255)

    def blit(self, rows, ox=0, oy=0):
        for y, row in enumerate(rows):
            for x, ch in enumerate(row):
                self.set(ox + x, oy + y, ch)

    def rect(self, x0, y0, x1, y1, ch):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.set(x, y, ch)

    def save(self, name):
        png(os.path.join(OUT, name), self.w, self.h, self.px)


def mir(half):
    """왼쪽 8칸을 그리면 오른쪽은 대칭으로 채운다 (정확한 좌우 대칭 보장)"""
    return [row + row[::-1] for row in half]


def patch(rows, points, ch):
    rows = [list(r) for r in rows]
    for x, y in points:
        rows[y][x] = ch
    return [''.join(r) for r in rows]


def canvas_rows(c):
    """캔버스를 다시 문자 격자로 (회전·이동용) — 팔레트 역매핑"""
    inv = {}
    for ch, rgb in P.items():
        if rgb:
            inv[rgb] = ch
    out = []
    for y in range(c.h):
        row = ''
        for x in range(c.w):
            r, g, b, a = c.px[y * c.w + x]
            row += '.' if a == 0 else inv.get((r, g, b), '.')
        out.append(row)
    return out


E = '........'  # 빈 반쪽 행

# ── 16x16 아이콘 ────────────────────────────────────────────
def heart(fill, shade):
    half = [
        E, E,
        '...kkkk.',
        '..k' + fill * 4 + 'k',
        '.k' + fill * 6,
        '.k' + fill * 6,
        '.k' + fill * 6,
        '..k' + fill * 5,
        '...k' + fill * 4,
        '....k' + fill * 3,
        '.....k' + fill * 2,
        '......k' + fill,
        '.......k',
        E, E, E,
    ]
    rows = mir(half)
    rows = patch(rows, [(4, 4), (5, 4), (4, 5)], shade)
    return rows


def gem(fill, edge):
    """다이아몬드 ◆ — 기하학적 도형은 수식으로 그려 대칭을 보장한다"""
    rows = []
    for y in range(16):
        row = ''
        for x in range(16):
            d = abs(x - 7.5) + abs(y - 7.5)
            row += edge if 5.5 < d <= 6.5 else (fill if d <= 5.5 else '.')
        rows.append(row)
    return rows


def star(fill):
    half = [
        E,
        E,
        '.......k',
        '......k' + fill,
        '......k' + fill,
        '...kkk' + fill * 2,
        '.kk' + fill * 5,
        '..k' + fill * 5,
        '...k' + fill * 4,
        '...k' + fill * 4,
        '..k' + fill * 2 + 'k' + fill * 2,
        '.k' + fill * 2 + 'k..k',
        '.k' + fill + 'k....',
        '.kk.....',
        E, E,
    ]
    return mir(half)


ICONS = {
    # 스탯 표시용 (채움 / 빈칸)
    'heart': heart('r', 'w'),
    'heart_off': heart('e', 'i'),
    'gem': gem('p', 'P'),
    'gem_off': gem('e', 'n'),
    'star': star('y'),
    'star_off': star('e'),

    # 모드 4종
    'moon': [
        '................',
        '................',
        '.....kkkkk......',
        '...kkyyyyk......',
        '..kyyyykk.......',
        '..kyyyk.........',
        '.kyyyk..........',
        '.kyyyk..........',
        '.kyyyk..........',
        '.kyyyk..........',
        '..kyyyk.........',
        '..kyyyykk.......',
        '...kkyyyyk......',
        '.....kkkkk......',
        '................',
        '................',
    ],
    'sprout': [
        '................',
        '................',
        '.....kk...kk....',
        '....kggk.kggk...',
        '...kgggkkgggk...',
        '...kggggkgggk...',
        '....kkkkGkkk....',
        '.......kGk......',
        '.......kGk......',
        '..kkkkkkGkkkkk..',
        '..kNNNNNNNNNNk..',
        '...kNNNNNNNNk...',
        '....kkkkkkkk....',
        '................',
        '................',
        '................',
    ],
    'sun': mir([
        E,
        '.......k',
        '.......k',
        '..k....k',
        '....kkkk',
        '.....kyy',
        '....kyyy',
        'k..kyyyy',
        'k..kyyyy',
        '....kyyy',
        '.....kyy',
        '....kkkk',
        '..k....k',
        '.......k',
        '.......k',
        E,
    ]),
    'bolt': [
        '................',
        '..........kk....',
        '.........kyk....',
        '........kyyk....',
        '.......kyyk.....',
        '......kyyk......',
        '.....kyykkkk....',
        '....kyyyyyyk....',
        '....kkkkyyyk....',
        '.......kyyk.....',
        '......kyyk......',
        '.....kyyk.......',
        '....kyyk........',
        '....kyk.........',
        '....kk..........',
        '................',
    ],

    # 습관 / 퀘스트
    'bed': [
        '................',
        '................',
        '..k.............',
        '..k....kkkkk....',
        '..k...kiiiiik...',
        '..kkkkkiiiiikk..',
        '..kppppkkkkkkk..',
        '..kpppppppppppk.',
        '..kNNNNNNNNNNNk.',
        '..kkkkkkkkkkkkk.',
        '..k...........k.',
        '..k...........k.',
        '................',
        '................',
        '................',
        '................',
    ],
    'coffee': [
        '................',
        '................',
        '.....k..k.......',
        '......k..k......',
        '.....k..k.......',
        '..kkkkkkkkkk....',
        '..kiiiiiiiik....',
        '..kiNNNNNNikkk..',
        '..kiNNNNNNik.k..',
        '..kiNNNNNNik.k..',
        '...kNNNNNNikk...',
        '...kNNNNNNk.....',
        '....kkkkkk......',
        '................',
        '................',
        '................',
    ],
    'food': [
        '................',
        '................',
        '................',
        '.....kkkkk......',
        '....kiiiiik.....',
        '...kiiiiiiik....',
        '..kkkkkkkkkkk...',
        '..kyyyyyyyyyk...',
        '...kyyyyyyyk....',
        '....kyyyyyk.....',
        '.....kkkkk......',
        '................',
        '................',
        '................',
        '................',
        '................',
    ],
    'drop': mir([
        E,
        '.......k',
        '.......k',
        '......kb',
        '......kb',
        '.....kbb',
        '.....kbb',
        '....kbbb',
        '....kbbb',
        '....kbbb',
        '.....kbb',
        '......kb',
        '.......k',
        E, E, E,
    ]),
    'shoe': [
        '................',
        '................',
        '................',
        '...kk...........',
        '..kwwk..........',
        '..kwwk..........',
        '..kwwkkk........',
        '..kwwbbkkk......',
        '..kwwbbbbbkkk...',
        '..kwwwwwwwwwwk..',
        '..kbbbbbbbbbbk..',
        '...kkkkkkkkkk...',
        '................',
        '................',
        '................',
        '................',
    ],
    'dumbbell': [
        '................',
        '................',
        '................',
        '................',
        '..kk.......kk...',
        '.kppk.....kppk..',
        '.kppkkkkkkkppk..',
        '.kppppppppppppk.',
        '.kppppppppppppk.',
        '.kppkkkkkkkppk..',
        '.kppk.....kppk..',
        '..kk.......kk...',
        '................',
        '................',
        '................',
        '................',
    ],

    # 장식
    'sparkle': mir([
        E,
        '.......k',
        '.......y',
        '......ky',
        '......ky',
        '.....kyy',
        '.kkkkyyy',
        'k...kyyy',
        'k...kyyy',
        '.kkkkyyy',
        '.....kyy',
        '......ky',
        '......ky',
        '.......y',
        '.......k',
        E,
    ]),
    'cloud': [
        '................',
        '................',
        '................',
        '......kkkk......',
        '.....kwwwwkk....',
        '...kkwwwwwwwk...',
        '..kwwwwwwwwwwk..',
        '.kwwwwwwwwwwwwk.',
        '.kwwwwwwwwwwwwk.',
        '..kkkkkkkkkkkk..',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
    ],
    'flower': mir([
        E, E,
        '....kkk.',
        '...krrrk',
        '...krrrr',
        'kkkkrrrr',
        'krrrkyyy',
        'krrrkyyy',
        'kkkkrrrr',
        '...krrrr',
        '...krrrk',
        '....kkkG',
        '.......G',
        '.....kkG',
        '.......G',
        E,
    ]),
    'zzz': [
        '................',
        '................',
        '.........kkkk...',
        '.........kkpk...',
        '..........kpk...',
        '..kkkkk..kpk....',
        '..kkkpk.kpkkk...',
        '....kpk.kkkkk...',
        '...kpk..........',
        '..kpkkk.........',
        '..kkkkk.........',
        '................',
        '................',
        '................',
        '................',
        '................',
    ],

    # 내비게이션
    'home': mir([
        E,
        E,
        '.......k',
        '......kN',
        '.....kNN',
        '....kNNN',
        '...kNNNN',
        '..kNNNNN',
        '.kkkkkkk',
        '.kiiiiii',
        '.kiikkii',
        '.kiikNii',
        '.kiikNii',
        '.kkkkkkk',
        E, E,
    ]),
    'floppy': [
        '................',
        '................',
        '..kkkkkkkkkkkk..',
        '..kbbbbbbbbbbk..',
        '..kbkkkkkkkbbk..',
        '..kbkiiiiikbbk..',
        '..kbkiiiiikbbk..',
        '..kbkkkkkkkbbk..',
        '..kbbbbbbbbbbk..',
        '..kbkkkkkkkkbk..',
        '..kbkiiiiiikbk..',
        '..kbkiikkiikbk..',
        '..kbkiikkiikbk..',
        '..kkkkkkkkkkkk..',
        '................',
        '................',
    ],
    'book': [
        '................',
        '................',
        '...kkkkkkkkkk...',
        '...kGGGGGGGGk...',
        '...kGiiiiiiGk...',
        '...kGiiiiiiGk...',
        '...kGikkkkiGk...',
        '...kGiiiiiiGk...',
        '...kGikkkkiGk...',
        '...kGiiiiiiGk...',
        '...kGGGGGGGGk...',
        '...kkkkkkkkkk...',
        '................',
        '................',
        '................',
        '................',
    ],
    'check': [
        '................',
        '................',
        '................',
        '.............kk.',
        '............kGk.',
        '...........kGk..',
        '..k.......kGk...',
        '..kk.....kGk....',
        '...kk...kGk.....',
        '....kGkkGk......',
        '.....kGGk.......',
        '......kk........',
        '................',
        '................',
        '................',
        '................',
    ],
}


# ── 표정 / 날씨 아이콘 (체크인 선택지용) ─────────────────────
FACE_BASE = mir([
    E, E, E,
    '.....kkk',
    '...kkyyy',
    '..kyyyyy',
    '.kyyyyyy',
    '.kyyyyyy',
    '.kyyyyyy',
    '.kyyyyyy',
    '.kyyyyyy',
    '..kyyyyy',
    '...kkyyy',
    '.....kkk',
    E, E,
])

FACES = {
    'face_great': [(4, 8), (5, 7), (6, 8), (9, 8), (10, 7), (11, 8),
                   (5, 10), (6, 11), (7, 11), (8, 11), (9, 11), (10, 10)],
    'face_good': [(4, 7), (5, 7), (4, 8), (5, 8), (10, 7), (11, 7), (10, 8), (11, 8),
                  (6, 10), (7, 11), (8, 11), (9, 10)],
    'face_ok': [(4, 7), (5, 7), (4, 8), (5, 8), (10, 7), (11, 7), (10, 8), (11, 8),
                (6, 11), (7, 11), (8, 11), (9, 11)],
    'face_tired': [(4, 8), (5, 8), (6, 8), (9, 8), (10, 8), (11, 8),
                   (4, 9), (11, 9), (7, 11), (8, 11)],
    'face_gone': [(4, 7), (5, 8), (6, 9), (6, 7), (4, 9),
                  (9, 7), (10, 8), (11, 9), (11, 7), (9, 9),
                  (5, 11), (6, 10), (7, 11), (8, 10), (9, 11)],
}

for _name, _pts in FACES.items():
    ICONS[_name] = patch(FACE_BASE, _pts, 'k')


def _compose(layers):
    c = Canvas(16, 16)
    for art, ox, oy in layers:
        c.blit(art, ox, oy)
    return canvas_rows(c)


def _scaled(art, keep):
    """아이콘 일부만 잘라 쓰기 위한 헬퍼 — keep=(x0,y0,x1,y1)"""
    x0, y0, x1, y1 = keep
    return [row[x0:x1 + 1] for row in art[y0:y1 + 1]]


ICONS['food_off'] = [row.replace('y', 'e').replace('i', 'c') for row in ICONS['food']]

ICONS['rain'] = patch(
    _compose([(_scaled(ICONS['cloud'], (1, 3, 14, 9)), 1, 1)]),
    [(4, 11), (4, 12), (7, 11), (7, 12), (10, 11), (10, 12),
     (5, 13), (8, 13), (11, 13)],
    'B',
)

ICONS['partly'] = _compose([
    (_scaled(ICONS['sun'], (4, 3, 15, 12)), 4, 0),
    (_scaled(ICONS['cloud'], (1, 3, 14, 9)), 0, 7),
])

ICONS['sun_bright'] = patch(
    _compose([(_scaled(ICONS['sun'], (2, 2, 13, 13)), 2, 2)]),
    [(1, 1), (0, 2), (2, 2), (14, 1), (13, 2), (15, 2), (1, 14), (0, 13), (2, 13)],
    'y',
)

ICON_ORDER = [
    'heart', 'heart_off', 'gem', 'gem_off', 'star', 'star_off', 'moon', 'sprout',
    'sun', 'bolt', 'bed', 'coffee', 'food', 'drop', 'shoe', 'dumbbell',
    'sparkle', 'cloud', 'flower', 'zzz', 'home', 'floppy', 'book', 'check',
    'face_great', 'face_good', 'face_ok', 'face_tired', 'face_gone',
    'rain', 'partly', 'sun_bright', 'food_off',
]

ICON_COLS = 8


def build_icons():
    rows = (len(ICON_ORDER) + ICON_COLS - 1) // ICON_COLS
    c = Canvas(ICON_COLS * 16, rows * 16)
    for i, name in enumerate(ICON_ORDER):
        art = ICONS[name]
        assert len(art) == 16 and all(len(r) == 16 for r in art), f'{name} 크기 오류'
        c.blit(art, (i % ICON_COLS) * 16, (i // ICON_COLS) * 16)
    c.save('icons.png')
    print('icons.png', ICON_COLS * 16, rows * 16, len(ICON_ORDER), '개')



# ── 32x32 캐릭터 포즈 ───────────────────────────────────────
# 왼쪽 절반(16칸)만 그리고 좌우 대칭으로 채운다. 비대칭 요소(컵 등)는 mirror 후 덧그린다.
BLANK = '................'

def W(rows, w=32):
    """행을 오른쪽으로 채워 폭을 맞춘다 (문자 세는 수고를 줄이려고)"""
    out = []
    for r in rows:
        assert len(r) <= w, f'행이 너무 김: {len(r)}'
        out.append(r + '.' * (w - len(r)))
    return out


POSE_STAND = [
    BLANK, BLANK, BLANK, BLANK, BLANK, BLANK,
    '.........kkkkkkk',
    '........khhhhhhh',
    '.......khhhhhhhh',
    '.......khhhhhhhh',
    '.......khhhhhhhh',
    '.......khsssssss',
    '......khssssssss',
    '......khssKKssss',
    '......khssKKssss',
    '......khssssssss',
    '......khsrsssssK',
    '.......khsssssss',
    '........kkssssss',
    '..........kkkkkk',
    '........kkgggggg',
    '.......kssgggggg',
    '.......kssgggggg',
    '.......kkkgggggg',
    '.........kgggggg',
    '.........kNNNNNN',
    '.........kNNNNNN',
    '...........kssk.',
    '...........kssk.',
    '...........kNNk.',
    '...........kkkk.',
    BLANK,
]

POSE_CHEER = [
    BLANK, BLANK, BLANK,
    '...kss..........',
    '...kss..........',
    '...kss..........',
    '...kss...kkkkkkk',
    '....kss.khhhhhhh',
    '....ksskhhhhhhhh',
    '.....kskhhhhhhhh',
    '.....kskhhhhhhhh',
    '......kkhsssssss',
    '......khssssssss',
    '......khssKKssss',
    '......khssKKssss',
    '......khssssssss',
    '......khsrsssskK',
    '.......khssssskK',
    '........kkssssss',
    '..........kkkkkk',
    '.........kgggggg',
    '.........kgggggg',
    '.........kgggggg',
    '.........kgggggg',
    '.........kNNNNNN',
    '.........kNNNNNN',
    '.........kNNNNNN',
    '..........kssk..',
    '..........kssk..',
    '..........kNNk..',
    '..........kkkk..',
    BLANK,
]

POSE_SIT = [
    BLANK, BLANK, BLANK, BLANK, BLANK, BLANK,
    '.........kkkkkkk',
    '........khhhhhhh',
    '.......khhhhhhhh',
    '.......khhhhhhhh',
    '.......khhhhhhhh',
    '.......khsssssss',
    '......khssssssss',
    '......khssKKssss',
    '......khssKKssss',
    '......khssssssss',
    '......khsrsssssK',
    '.......khsssssss',
    '........kkssssss',
    '..........kkkkkk',
    '........kkgggggg',
    '.......kssgggggg',
    '.......kssgggggg',
    '.......kkkgggggg',
    '.........kgggggg',
    '.........kNNNNNN',
    '........kNNNNNNN',
    '.....kkkkNNNNNNN',
    '....kNNNNNNNNNNN',
    '....kkkkkkkkkkkk',
    BLANK, BLANK,
]

# 옆으로 누운 포즈 — 머리는 왼쪽, 몸은 이불 아래. 대칭이 아니라 32칸 전체를 그린다.
POSE_LIE = W([
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '.....kkkkkk',
    '....khhhhhhk',
    '...khhhhhhhhk',
    '...khhhhhhhhk...kkkkkkkkkkkk',
    '..khhhhhssssk..krrrrrrrrrrrrk',
    '..khhhsssssssk.krrrrrrrrrrrrk',
    '..khssssssssskkrrrrrrrrrrrrrrk',
    '..khsskkssssskkrrrrrrrrrrrrrrk',
    '..khsssssssssskrrrrrrrrrrrrrrk',
    '...khsrsssssskkrrrrrrrrrrrrrrk',
    '...khssssssssskrrrrrrrrrrrrrrk',
    '....khhssssskkkkkkkkkkkkkkkkkk',
    '.....kkkkkkk',
    '',
]) + [BLANK * 2] * 10

# 앉은 포즈 옆에 놓을 머그컵 (mirror 이후 좌표에 덧그림)
CUP = [
    '.kkkk..',
    'kiiiik.',
    'kiNNikk',
    'kiNNik.',
    'kkNNkk.',
    '.kkkk..',
]


def blink(rows):
    """눈(K)을 한 픽셀 아래로 내려 반쯤 감은 프레임을 만든다"""
    grid = [list(r) for r in rows]
    eyes = [(x, y) for y, r in enumerate(rows) for x, ch in enumerate(r) if ch == 'K']
    for x, y in eyes:
        grid[y][x] = 's'
    for x, y in eyes:
        if y + 1 < len(grid) and grid[y + 1][x] == 's':
            grid[y + 1][x] = 'K'
    return [''.join(r) for r in grid]


def shift(rows, dy):
    w = len(rows[0])
    empty = '.' * w
    if dy > 0:
        return [empty] * dy + rows[:-dy]
    if dy < 0:
        return rows[-dy:] + [empty] * (-dy)
    return list(rows)


def rotate_cw(rows):
    h, w = len(rows), len(rows[0])
    return [''.join(rows[h - 1 - y][x] for y in range(h)) for x in range(w)]


def draw_pose(rows, extra=None):
    c = Canvas(32, 32)
    c.blit(mir(rows))
    if extra:
        for art, ox, oy in extra:
            c.blit(art, ox, oy)
    return c


def lying_pose():
    c = Canvas(32, 32)
    c.blit(POSE_LIE)
    return canvas_rows(c)


STATE_ORDER = ['recovery', 'easy', 'normal', 'power']


def build_character():
    sit = draw_pose(POSE_SIT, extra=[(CUP, 4, 20)])
    sit_rows = canvas_rows(sit)
    stand_rows = canvas_rows(draw_pose(POSE_STAND))
    cheer_rows = canvas_rows(draw_pose(POSE_CHEER))
    lie_rows = lying_pose()

    frames = {
        'recovery': [lie_rows, shift(lie_rows, 1)],
        'easy': [sit_rows, blink(shift(sit_rows, 1))],
        'normal': [stand_rows, blink(shift(stand_rows, 1))],
        'power': [cheer_rows, shift(cheer_rows, -1)],
    }

    c = Canvas(32 * 2, 32 * len(STATE_ORDER))
    for row, state in enumerate(STATE_ORDER):
        for col, art in enumerate(frames[state]):
            c.blit(art, col * 32, row * 32)
    c.save('character.png')
    print('character.png', c.w, c.h)


# ── 160x112 코지 픽셀 방 ────────────────────────────────────
ROOM_W, ROOM_H = 160, 112


def build_room():
    c = Canvas(ROOM_W, ROOM_H)

    # 벽 / 바닥
    c.rect(0, 0, ROOM_W - 1, 73, 'c')
    c.rect(0, 70, ROOM_W - 1, 73, 'e')
    c.rect(0, 74, ROOM_W - 1, ROOM_H - 1, 'n')
    for y in (82, 92, 102):
        c.rect(0, y, ROOM_W - 1, y, 'e')

    # 창문
    c.rect(14, 10, 50, 46, 'k')
    c.rect(16, 12, 48, 44, 'b')
    c.rect(31, 12, 32, 44, 'k')
    c.rect(16, 27, 48, 28, 'k')
    c.blit(ICONS['cloud'], 18, 14)
    c.blit(ICONS['sun'], 34, 14)
    c.rect(12, 47, 52, 49, 'N')      # 창턱
    c.rect(12, 47, 52, 47, 'k')

    # 액자
    c.rect(98, 12, 128, 34, 'k')
    c.rect(100, 14, 126, 32, 'i')
    c.blit(ICONS['heart'], 105, 15)

    # 침대
    c.rect(76, 54, 156, 96, 'k')     # 프레임 외곽
    c.rect(78, 56, 154, 94, 'N')
    c.rect(80, 60, 152, 88, 'i')     # 매트리스
    c.rect(80, 60, 104, 88, 'w')     # 베개 영역
    c.rect(104, 60, 152, 88, 'p')    # 이불
    c.rect(104, 60, 105, 88, 'k')
    c.rect(80, 88, 152, 90, 'k')
    c.rect(150, 46, 156, 96, 'N')    # 헤드보드
    c.rect(150, 46, 156, 47, 'k')
    c.rect(78, 96, 82, 104, 'k')     # 다리
    c.rect(150, 96, 154, 104, 'k')

    # 러그
    for y in range(86, 105):
        dy = abs(y - 95) / 9.0
        half = int(27 * (1 - dy * dy) ** 0.5)
        cx = 42
        c.rect(cx - half, y, cx + half, y, 'r')
        c.set(cx - half, y, 'R')
        c.set(cx + half, y, 'R')

    # 화분
    c.blit(ICONS['sprout'], 2, 66)
    c.rect(2, 82, 18, 84, 'N')
    c.rect(2, 82, 18, 82, 'k')

    c.save('room.png')
    print('room.png', ROOM_W, ROOM_H)


def write_manifest():
    ts_path = os.path.join(os.path.dirname(OUT), '..', 'src', 'lib', 'sprites.generated.ts')
    ts_path = os.path.normpath(ts_path)
    names = ',\n  '.join(f"'{n}'" for n in ICON_ORDER)
    body = f"""// 이 파일은 tools/pixel_art.py 가 생성한다. 직접 고치지 말 것.
export const ICON_SHEET = '/sprites/icons.png'
export const ICON_COLS = {ICON_COLS}
export const ICON_ROWS = {(len(ICON_ORDER) + ICON_COLS - 1) // ICON_COLS}

export const ICON_NAMES = [
  {names},
] as const

export type IconName = (typeof ICON_NAMES)[number]

export const CHARACTER_SHEET = '/sprites/character.png'
export const CHARACTER_SIZE = 32
export const CHARACTER_FRAMES = 2
export const CHARACTER_STATES = [{', '.join(f"'{s}'" for s in STATE_ORDER)}] as const

export const ROOM_SHEET = '/sprites/room.png'
export const ROOM_SIZE = {{ width: ROOM_W_PLACEHOLDER, height: ROOM_H_PLACEHOLDER }}
"""
    body = body.replace('ROOM_W_PLACEHOLDER', str(ROOM_W)).replace('ROOM_H_PLACEHOLDER', str(ROOM_H))
    with open(ts_path, 'w') as f:
        f.write(body)
    print('sprites.generated.ts')


# ── 앱 아이콘 (PWA) ────────────────────────────────────────
def build_app_icons():
    """32x32 원본을 정수배로만 키워서 픽셀이 뭉개지지 않게 만든다."""
    base = Canvas(32, 32)
    base.rect(0, 0, 31, 31, 'c')
    base.rect(0, 27, 31, 31, 'n')
    base.rect(0, 27, 31, 27, 'e')
    base.blit(shift(mir(POSE_STAND), -2))
    base.blit(_scaled(ICONS['heart'], (2, 2, 13, 12)), 20, 2)

    out_dir = os.path.join(os.path.dirname(OUT), 'icons')
    os.makedirs(out_dir, exist_ok=True)

    def emit(size, scale, pad):
        c = Canvas(size, size)
        c.rect(0, 0, size - 1, size - 1, 'c')
        for y in range(32):
            for x in range(32):
                r, g, b, a = base.px[y * 32 + x]
                if a == 0:
                    continue
                for dy in range(scale):
                    for dx in range(scale):
                        px = pad + x * scale + dx
                        py = pad + y * scale + dy
                        c.px[py * size + px] = (r, g, b, 255)
        png(os.path.join(out_dir, f'icon-{size}.png'), size, size, c.px)

    emit(512, 16, 0)
    emit(192, 6, 0)
    emit(180, 5, 10)
    print('app icons')


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    build_icons()
    build_character()
    build_room()
    build_app_icons()
    write_manifest()
