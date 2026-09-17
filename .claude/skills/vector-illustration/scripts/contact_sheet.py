"""SVG 를 렌더링해서 대조 시트를 만든다.

    python contact_sheet.py final/*.svg --out sheet.png
    python contact_sheet.py final/*.svg --ref ref/ --out compare.png

--ref 를 주면 같은 이름(확장자 무관)의 참고 이미지를 위 줄에,
결과 SVG 를 아래 줄에 붙여 세로로 짝지어 보여준다.
배경은 중간 회색이다. 흰 배경에서는 밝은 면이, 검은 배경에서는
어두운 면이 사라져서 "규칙은 통과했는데 안 보이는" 실수를 놓친다.
"""
import argparse, glob, io, os
import cairosvg
from PIL import Image

BG = (120, 124, 132)


def load(path, cell):
    if path.lower().endswith(".svg"):
        img = Image.open(io.BytesIO(cairosvg.svg2png(url=path, output_width=cell * 2)))
    else:
        img = Image.open(path)
    img = img.convert("RGBA")
    img.thumbnail((cell, cell), Image.LANCZOS)
    return img


def find_ref(ref_dir, name):
    stem = os.path.splitext(os.path.basename(name))[0]
    for p in sorted(glob.glob(os.path.join(ref_dir, "*"))):
        if os.path.splitext(os.path.basename(p))[0] == stem:
            return p
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+")
    ap.add_argument("--out", required=True)
    ap.add_argument("--ref", default=None)
    ap.add_argument("--cell", type=int, default=180)
    ap.add_argument("--cols", type=int, default=8)
    args = ap.parse_args()

    C, P, GAP = args.cell, 14, 8
    files = list(args.files)
    cols = min(args.cols, len(files))
    rows = (len(files) + cols - 1) // cols
    band = (2 * C + GAP) if args.ref else C
    sheet = Image.new("RGB", (cols * (C + P) + P, rows * (band + P) + P), BG)

    for i, f in enumerate(files):
        r, c = divmod(i, cols)
        x = P + c * (C + P)
        y = P + r * (band + P)
        if args.ref:
            ref = find_ref(args.ref, f)
            if ref:
                im = load(ref, C)
                sheet.paste(im, (x + (C - im.width) // 2, y + (C - im.height) // 2), im)
            y += C + GAP
        im = load(f, C)
        sheet.paste(im, (x + (C - im.width) // 2, y + (C - im.height) // 2), im)

    sheet.save(args.out)
    print(args.out, sheet.size)
    print("이 이미지를 직접 열어서 확인할 것. 만들어만 두면 의미가 없다.")


if __name__ == "__main__":
    main()
