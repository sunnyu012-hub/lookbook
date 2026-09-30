import sys, re, cairosvg, io
from PIL import Image

def fit(path, margin=4):
    src = open(path, encoding='utf-8').read()
    m = re.search(r'viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"', src)
    x0, y0, w, h = (float(v) for v in m.groups())
    S = 3
    png = cairosvg.svg2png(bytestring=src.encode(), output_width=int(w*S), output_height=int(h*S))
    bb = Image.open(io.BytesIO(png)).getbbox()
    if not bb:
        return
    nx = x0 + bb[0]/S - margin
    ny = y0 + bb[1]/S - margin
    nw = (bb[2]-bb[0])/S + 2*margin
    nh = (bb[3]-bb[1])/S + 2*margin
    out = re.sub(r'viewBox="[^"]*"', 'viewBox="%.1f %.1f %.1f %.1f"' % (nx, ny, nw, nh), src, count=1)
    out = re.sub(r'width="[^"]*"', 'width="%.0f"' % nw, out, count=1)
    out = re.sub(r'height="[^"]*"', 'height="%.0f"' % nh, out, count=1)
    open(path, 'w', encoding='utf-8').write(out)
    print(path, '-> %.0fx%.0f' % (nw, nh))

for p in sys.argv[1:]:
    fit(p)
