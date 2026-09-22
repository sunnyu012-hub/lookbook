"""디자인허브 가이드 후처리.

1) clip-path 를 실제 도형에 구워 넣고 <clipPath> 정의를 없앤다.
2) fill-rule="evenodd" 를 제거한다. (Clipper 출력이라 방향이 이미 nonzero 에 맞다)
3) 크랙 방지용으로 전체를 합집합한 도형을 맨 뒤에 깔아준다.
"""
import re, sys, xml.etree.ElementTree as ET
import pyclipper
from svgelements import Path as SPath

SVG = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG)
S = 1000.0


def flatten(d):
    out, cur = [], []
    for seg in SPath(d).segments():
        k = type(seg).__name__
        if k == "Move":
            if len(cur) > 2:
                out.append(cur)
            cur = [(seg.end.x, seg.end.y)]
        elif k == "Close":
            if len(cur) > 2:
                out.append(cur)
            cur = [cur[0]] if cur else []
        elif k == "Line":
            cur.append((seg.end.x, seg.end.y))
        else:
            for i in range(1, 33):
                p = seg.point(i / 32)
                cur.append((p.x, p.y))
    if len(cur) > 2:
        out.append(cur)
    return out


def num(el, key, default=0.0):
    v = el.get(key)
    return float(v) if v is not None else default


def shape_d(el):
    tag = el.tag.split("}")[-1]
    if tag == "path":
        return el.get("d")
    if tag == "rect":
        x, y = num(el, "x"), num(el, "y")
        w, h = num(el, "width"), num(el, "height")
        r = min(num(el, "rx", num(el, "ry")), w / 2, h / 2)
        if r <= 0:
            return f"M{x} {y} H{x+w} V{y+h} H{x} Z"
        return (f"M{x+r} {y} H{x+w-r} A{r} {r} 0 0 1 {x+w} {y+r} V{y+h-r} "
                f"A{r} {r} 0 0 1 {x+w-r} {y+h} H{x+r} A{r} {r} 0 0 1 {x} {y+h-r} "
                f"V{y+r} A{r} {r} 0 0 1 {x+r} {y} Z")
    if tag == "circle":
        cx, cy, r = num(el, "cx"), num(el, "cy"), num(el, "r")
        return (f"M{cx-r} {cy} A{r} {r} 0 1 1 {cx+r} {cy} A{r} {r} 0 1 1 {cx-r} {cy} Z")
    if tag == "ellipse":
        cx, cy = num(el, "cx"), num(el, "cy")
        rx, ry = num(el, "rx"), num(el, "ry")
        return (f"M{cx-rx} {cy} A{rx} {ry} 0 1 1 {cx+rx} {cy} A{rx} {ry} 0 1 1 {cx-rx} {cy} Z")
    return None


def ipaths(polys):
    return [[(round(x * S), round(y * S)) for x, y in p] for p in polys]


def clip_op(subject, clipper, op):
    pc = pyclipper.Pyclipper()
    pc.AddPaths(ipaths(subject), pyclipper.PT_SUBJECT, True)
    if clipper:
        pc.AddPaths(ipaths(clipper), pyclipper.PT_CLIP, True)
    sol = pc.Execute(op, pyclipper.PFT_NONZERO, pyclipper.PFT_NONZERO)
    return [[(x / S, y / S) for x, y in p] for p in sol]


def to_d(polys):
    out = []
    for p in polys:
        out.append("M" + " L".join(f"{round(x,1)} {round(y,1)}" for x, y in p) + " Z")
    return " ".join(out)


def area(polys):
    tot = 0.0
    for p in polys:
        a = 0.0
        for i in range(len(p)):
            x1, y1 = p[i]
            x2, y2 = p[(i + 1) % len(p)]
            a += x1 * y2 - x2 * y1
        tot += a / 2
    return tot


def run(path):
    tree = ET.parse(path)
    root = tree.getroot()

    clips = {}
    for cp in root.findall(f"{{{SVG}}}clipPath"):
        polys = []
        for ch in cp:
            d = shape_d(ch)
            if d:
                polys += flatten(d)
        clips[cp.get("id")] = polys
        root.remove(cp)

    drawn = []          # (fill, polys)
    new_children = []

    def emit(el, clip, inherited):
        d = shape_d(el)
        if d is None:
            return
        polys = flatten(d)
        own = el.get("fill")
        if clip:
            polys = clip_op(polys, clip, pyclipper.CT_INTERSECTION)
            if not polys:
                return
            el = ET.Element(f"{{{SVG}}}path")
            el.set("d", to_d(polys))
            if own:
                el.set("fill", own)
        el.attrib.pop("fill-rule", None)
        fill = el.get("fill") or inherited or "#000000"
        el.set("fill", fill)
        drawn.append((fill, polys))
        new_children.append(el)

    def walk(node, clip, inherited):
        for el in list(node):
            tag = el.tag.split("}")[-1]
            ref = el.get("clip-path")
            sub = clip
            if ref:
                key = ref.strip()[5:-1].lstrip("#")
                sub = clips.get(key, clip)
            fill = el.get("fill") or inherited
            if tag == "g":
                walk(el, sub, fill)
            else:
                emit(el, sub, inherited)

    walk(root, None, None)

    # 3) 합집합 백킹
    every = []
    for _, polys in drawn:
        every += polys
    union = clip_op(every, None, pyclipper.CT_UNION)

    by_fill = {}
    for fill, polys in drawn:
        by_fill[fill] = by_fill.get(fill, 0.0) + abs(area(polys))
    base = max(by_fill, key=by_fill.get)

    back = ET.Element(f"{{{SVG}}}path")
    back.set("d", to_d(union))
    back.set("fill", base)

    for el in list(root):
        root.remove(el)
    root.append(back)
    for el in new_children:
        root.append(el)

    ET.indent(tree, "  ")
    tree.write(path, encoding="unicode", xml_declaration=False)
    txt = open(path, encoding="utf-8").read()
    txt = txt.replace(' xmlns:ns0="http://www.w3.org/2000/svg"', "").replace("ns0:", "")
    open(path, "w", encoding="utf-8").write(txt)


if __name__ == "__main__":
    for p in sys.argv[1:]:
        run(p)
        print("ok", p)
