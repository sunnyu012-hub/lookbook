"""완성된 SVG가 업로드 규칙을 지키는지 검사한다.

사용: python check.py out/*.svg [--max-colors 5] [--before before_dir]

--before 를 주면 같은 이름의 파일과 렌더링을 픽셀 비교해서
후처리가 모양을 바꾸지 않았는지 확인한다. 후처리 전후 대조는
"규칙은 지켰는데 그림이 망가졌다" 를 잡아내는 유일한 방법이라
파이프라인을 돌릴 때마다 해두는 편이 좋다.
"""
import argparse, io, os, re, sys
import xml.etree.ElementTree as ET

SVG = "http://www.w3.org/2000/svg"
BANNED = ("clipPath", "linearGradient", "radialGradient", "pattern", "filter",
          "mask", "image", "use", "text", "style")


def render(path, width=600, height=None):
    import cairosvg
    from PIL import Image
    kw = {"url": path, "output_width": width}
    if height:
        kw["output_height"] = height
    return Image.open(io.BytesIO(cairosvg.svg2png(**kw))).convert("RGBA")


def render_at_scale(path, k=3.0):
    """viewBox 크기와 무관하게 유저 좌표 1 = k 픽셀로 그린 뒤 내용만 잘라낸다.

    fit.py 가 viewBox 를 줄이면 같은 그림이라도 렌더 크기가 달라진다.
    배율을 고정하고 알파 경계로 잘라야 전후를 그대로 겹쳐 볼 수 있다.
    """
    from PIL import Image
    vb = re.search(r'viewBox="\s*([-\d.eE]+)[ ,]+([-\d.eE]+)[ ,]+([-\d.eE]+)[ ,]+([-\d.eE]+)"',
                   open(path, encoding="utf-8").read())
    w = float(vb.group(3)) if vb else 200.0
    h = float(vb.group(4)) if vb else 200.0
    img = render(path, width=max(1, round(w * k)), height=max(1, round(h * k)))
    bb = img.getbbox()
    return img.crop(bb) if bb else img


def colors(text):
    found = re.findall(r'#[0-9a-fA-F]{3,8}\b', text)
    out = set()
    for c in found:
        c = c.upper()
        if len(c) == 4:                      # #ABC -> #AABBCC
            c = "#" + "".join(ch * 2 for ch in c[1:])
        out.add(c[:7])
    return sorted(out)


def check(path, max_colors, before_dir):
    text = open(path, encoding="utf-8").read()
    rows = []

    def add(name, ok, detail=""):
        rows.append((name, ok, detail))

    st = len(re.findall(r'\bstroke(-[a-z]+)?\s*[=:]', text))
    add("stroke 속성 없음", st == 0, f"{st}개 발견")

    ev = text.count("evenodd")
    add("fill-rule evenodd 없음", ev == 0, f"{ev}개 발견")

    cols = colors(text)
    add(f"색상 {max_colors}개 이하", len(cols) <= max_colors,
        f"{len(cols)}색: {' '.join(cols)}")

    root = ET.parse(path).getroot()
    hit = sorted({el.tag.split('}')[-1] for el in root.iter()
                  if el.tag.split('}')[-1] in BANNED})
    add("인쇄 변환 위험 요소 없음", not hit, "발견: " + ", ".join(hit) if hit else "")

    img = render(path)
    px = img.load()
    w, h = img.size
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    add("배경 투명", all(c[3] == 0 for c in corners),
        "모서리 알파: " + " ".join(str(c[3]) for c in corners))

    bb = img.getbbox()
    slack = max(bb[0], bb[1], w - bb[2], h - bb[3]) / w * 100
    add("viewBox 여백 5% 이하", slack <= 5.0, f"최대 여백 {slack:.1f}%")

    kids = [el for el in root if el.tag.split('}')[-1] not in ("defs", "title", "desc")]
    first = kids[0].tag.split('}')[-1] if kids else None
    add("크랙 방지 백킹 존재", first == "path" and kids[0].get("d", "").count("M") >= 1,
        f"첫 요소가 {first}")

    if before_dir:
        import numpy as np
        prev = os.path.join(before_dir, os.path.basename(path))
        if os.path.exists(prev):
            a = render_at_scale(prev)
            b = render_at_scale(path)
            if abs(a.width - b.width) > 2 or abs(a.height - b.height) > 2:
                add("후처리 전후 모양 동일", False,
                    f"내용 크기가 다르다 {a.size} vs {b.size}")
                return rows
            b = b.resize(a.size) if a.size != b.size else b
            d = np.abs(np.asarray(a, float) - np.asarray(b, float))
            mean = d.mean()
            big = (d.max(axis=2) > 32).mean() * 100
            # 백킹이 경계 틈을 메우면서 생기는 안티에일리어싱 차이는 1% 안쪽이다.
            add("후처리 전후 모양 동일", mean < 1.2 and big < 1.2,
                f"평균차 {mean:.2f}/255, 차이 픽셀 {big:.2f}%")
        else:
            add("후처리 전후 모양 동일", True, "비교본 없음 (건너뜀)")

    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+")
    ap.add_argument("--max-colors", type=int, default=5)
    ap.add_argument("--before", default=None)
    args = ap.parse_args()

    failed = []
    for f in args.files:
        rows = check(f, args.max_colors, args.before)
        bad = [r for r in rows if not r[1]]
        mark = "PASS" if not bad else "FAIL"
        print(f"[{mark}] {f}")
        for name, ok, detail in rows:
            if not ok or detail:
                print(f"       {'o' if ok else 'X'} {name}" + (f" — {detail}" if detail else ""))
        if bad:
            failed.append(f)
    print()
    print(f"{len(args.files) - len(failed)}/{len(args.files)} 통과")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
