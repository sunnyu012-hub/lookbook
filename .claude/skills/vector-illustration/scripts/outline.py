"""SVG의 stroke 를 채워진 도형으로 바꾼다.

선을 폴리라인으로 펴고 Clipper 로 바깥쪽/안쪽 오프셋을 떠서 윤곽선을
실제 면으로 만든다. 그려지는 모양은 그대로 두고 stroke 속성만 없앤다.
"""
import math, re, sys, xml.etree.ElementTree as ET
import pyclipper
from svgelements import Path as SPath

SVG = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG)
SCALE = 1000.0
INHERIT = ("stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "fill", "opacity")

CAP = {"round": pyclipper.ET_OPENROUND, "square": pyclipper.ET_OPENSQUARE,
       "butt": pyclipper.ET_OPENBUTT, None: pyclipper.ET_OPENBUTT}
JOIN = {"round": pyclipper.JT_ROUND, "miter": pyclipper.JT_MITER,
        "bevel": pyclipper.JT_SQUARE, None: pyclipper.JT_MITER}


def subpaths(d):
    """path 데이터를 (점 목록, 닫힘여부) 로 편다."""
    out, cur, closed = [], [], False
    for seg in SPath(d).segments():
        kind = type(seg).__name__
        if kind == "Move":
            if len(cur) > 1:
                out.append((cur, closed))
            cur, closed = [(seg.end.x, seg.end.y)], False
        elif kind == "Close":
            closed = True
        elif kind == "Line":
            cur.append((seg.end.x, seg.end.y))
        else:
            steps = 28
            for i in range(1, steps + 1):
                p = seg.point(i / steps)
                cur.append((p.x, p.y))
    if len(cur) > 1:
        out.append((cur, closed))
    return out


def offset(parts, delta, end_type, join):
    pco = pyclipper.PyclipperOffset()
    pco.ArcTolerance = 0.12 * SCALE
    pco.MiterLimit = 3
    for pts, _ in parts:
        pco.AddPath([(round(x * SCALE), round(y * SCALE)) for x, y in pts], join, end_type)
    return pco.Execute(delta * SCALE)


def to_d(solution):
    chunks = []
    for poly in solution:
        pts = [(round(x / SCALE, 1), round(y / SCALE, 1)) for x, y in poly]
        chunks.append("M" + " L".join(f"{x} {y}" for x, y in pts) + " Z")
    return " ".join(chunks)


def ring_path(cx, cy, r_out, r_in):
    """두 원으로 만든 고리. 정확해서 근사할 필요가 없다."""
    def circle(r, sweep):
        return (f"M{round(cx - r,2)} {round(cy,2)} "
                f"A{r} {r} 0 1 {sweep} {round(cx + r,2)} {round(cy,2)} "
                f"A{r} {r} 0 1 {sweep} {round(cx - r,2)} {round(cy,2)} Z")
    return circle(r_out, 1) + " " + circle(r_in, 0)


def convert(node, inherited, parent):
    style = dict(inherited)
    for key in INHERIT:
        if node.get(key) is not None:
            style[key] = node.get(key)

    tag = node.tag.split("}")[-1]
    stroke = style.get("stroke")
    made = None

    if stroke and stroke != "none" and tag in ("path", "circle", "line", "rect"):
        width = float(style.get("stroke-width", 1))
        half = width / 2.0
        fill = style.get("fill", "black")
        cap = CAP.get(style.get("stroke-linecap"), pyclipper.ET_OPENBUTT)
        join = JOIN.get(style.get("stroke-linejoin"), pyclipper.JT_MITER)

        if tag == "circle" and (fill == "none" or fill is None):
            cx, cy, r = float(node.get("cx")), float(node.get("cy")), float(node.get("r"))
            made = ET.Element(f"{{{SVG}}}path", {
                "d": ring_path(cx, cy, r + half, r - half),
                "fill": stroke, "fill-rule": "evenodd"})
        else:
            if tag == "path":
                parts = subpaths(node.get("d"))
            elif tag == "line":
                parts = [([(float(node.get("x1")), float(node.get("y1"))),
                           (float(node.get("x2")), float(node.get("y2")))], False)]
            else:
                parts = []

            if parts:
                same_paint = fill and fill != "none" and fill == stroke
                if all(c for _, c in parts) and same_paint:
                    # 면과 선이 같은 색이면 바깥으로 한 번만 부풀리면 된다
                    sol = offset(parts, half, pyclipper.ET_CLOSEDPOLYGON, join)
                elif all(c for _, c in parts):
                    outer = offset(parts, half, pyclipper.ET_CLOSEDPOLYGON, join)
                    inner = offset(parts, -half, pyclipper.ET_CLOSEDPOLYGON, join)
                    clip = pyclipper.Pyclipper()
                    clip.AddPaths(outer, pyclipper.PT_SUBJECT, True)
                    if inner:
                        clip.AddPaths(inner, pyclipper.PT_CLIP, True)
                    sol = clip.Execute(pyclipper.CT_DIFFERENCE,
                                       pyclipper.PFT_NONZERO, pyclipper.PFT_NONZERO)
                else:
                    sol = offset(parts, half, cap, join)

                if sol:
                    attrs = {"d": to_d(sol), "fill": stroke, "fill-rule": "evenodd"}
                    if style.get("opacity"):
                        attrs["opacity"] = style["opacity"]
                    made = ET.Element(f"{{{SVG}}}path", attrs)

        # 원래 요소에서 선 속성을 떼고, 채움이 따로 있으면 남긴다
        for key in ("stroke", "stroke-width", "stroke-linecap", "stroke-linejoin"):
            node.attrib.pop(key, None)
        keeps_fill = fill and fill != "none" and fill != stroke
        if made is not None and parent is not None:
            index = list(parent).index(node)
            if keeps_fill:
                parent.insert(index + 1, made)
            else:
                parent.remove(node)
                parent.insert(index, made)
            node = made

    for key in ("stroke", "stroke-width", "stroke-linecap", "stroke-linejoin"):
        if tag == "g":
            node.attrib.pop(key, None)

    for child in list(node):
        convert(child, style, node)


def run(src, dst):
    tree = ET.parse(src)
    root = tree.getroot()
    convert(root, {}, None)
    tree.write(dst, encoding="unicode", xml_declaration=False)
    text = open(dst).read()
    open(dst, "w").write(text)
    return len(text)


if __name__ == "__main__":
    print(run(sys.argv[1], sys.argv[2]), "bytes")
