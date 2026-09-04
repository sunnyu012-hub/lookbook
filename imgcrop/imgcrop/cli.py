"""명령줄 인터페이스."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .core import (
    SUPPORTED_INPUTS,
    Settings,
    collect_images,
    preset,
    process_file,
)

PRESETS = ("split", "trim", "cutout", "sprite", "thumb")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="imgcrop",
        description="이미지를 요소별로 잘라 분리하고 여백을 없애 크기를 딱 맞춥니다.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""예시:
  imgcrop sheet.png -o out                     # 요소별로 잘라 저장
  imgcrop sheet.png -o out --preset cutout     # 배경 지우고 투명 PNG로
  imgcrop sheet.png -o out --mode grid --grid 4x3
  imgcrop photo.jpg -o out --preset trim       # 여백만 제거
  imgcrop assets/ -o out -r --size 512x512     # 폴더 전체를 512x512로
""",
    )
    p.add_argument("inputs", nargs="+", help="이미지 파일 또는 폴더")
    p.add_argument("-o", "--out", default="out", help="저장 폴더 (기본: out)")
    p.add_argument("-r", "--recursive", action="store_true", help="폴더를 하위까지 탐색")
    p.add_argument("--preset", choices=PRESETS, help="자주 쓰는 설정 묶음")

    g = p.add_argument_group("검출")
    g.add_argument("--mode", choices=("auto", "components", "xycut", "grid", "none"),
                   help="분할 방식 (기본: auto)")
    g.add_argument("--grid", metavar="CxR", help="격자 분할 크기, 예: 4x3 (--mode grid)")
    g.add_argument("--tolerance", metavar="N|auto", help="배경 판정 임계값 (기본: auto)")
    g.add_argument("--edge-barrier", type=float, metavar="F",
                   help="경계 장벽 강도, 0이면 끔 (기본: 1.0)")
    g.add_argument("--min-area", type=float, metavar="R",
                   help="전체 대비 최소 요소 크기 비율 (기본: 0.0005)")
    g.add_argument("--min-relative-area", type=float, metavar="R",
                   help="다른 요소 중앙값 대비 이 비율보다 작은 조각은 버림 (기본: 0.08, 0이면 끔)")
    g.add_argument("--merge-gap", type=int, metavar="PX",
                   help="이 간격 이내 요소를 하나로 합침")
    g.add_argument("--separation", type=int, metavar="PX",
                   help="가늘게 붙은 요소를 떼어내는 강도")

    o = p.add_argument_group("출력")
    o.add_argument("--padding", type=int, metavar="PX", help="크롭 주변 여백")
    o.add_argument("--padding-ratio", type=float, metavar="R", help="요소 크기 대비 여백 비율")
    o.add_argument("--size", metavar="WxH", help="출력 크기 고정, 예: 512x512")
    o.add_argument("--square", action="store_true", help="정사각형으로 맞춤(확대 없음)")
    o.add_argument("--fit", choices=("contain", "cover"), help="--size 사용 시 맞춤 방식")
    o.add_argument("--no-upscale", action="store_true", help="원본보다 크게 늘리지 않음")
    o.add_argument("--cutout", action="store_true", help="배경을 지우고 요소만 남김")
    o.add_argument("--bg", metavar="COLOR", help="배경 (transparent/white/#rrggbb)")
    o.add_argument("--format", dest="image_format", choices=("png", "jpg", "webp"),
                   help="저장 형식 (기본: png)")
    o.add_argument("--quality", type=int, metavar="N", help="jpg/webp 품질 (기본: 95)")
    o.add_argument("--name", metavar="TPL", dest="name_template",
                   help="파일명 서식, 사용 가능: {stem} {index} {total}")

    p.add_argument("--dry-run", action="store_true", help="저장하지 않고 검출 결과만 표시")
    p.add_argument("-q", "--quiet", action="store_true", help="진행 상황 숨김")
    return p


def _parse_pair(text: str, label: str) -> tuple[int, int]:
    parts = text.lower().replace("*", "x").split("x")
    if len(parts) != 2 or not all(v.strip().isdigit() for v in parts):
        raise SystemExit(f"{label} 형식이 잘못되었습니다: {text!r} (예: 512x512)")
    return int(parts[0]), int(parts[1])


def settings_from_args(args: argparse.Namespace) -> Settings:
    s = preset(args.preset) if args.preset else Settings()

    if args.mode:
        s.split_mode = args.mode
    if args.grid:
        s.grid_cols, s.grid_rows = _parse_pair(args.grid, "--grid")
        if not args.mode:
            s.split_mode = "grid"
    if args.tolerance:
        s.tolerance = args.tolerance if args.tolerance == "auto" else int(args.tolerance)
    if args.edge_barrier is not None:
        s.edge_barrier = args.edge_barrier
    if args.min_area is not None:
        s.min_area_ratio = args.min_area
    if args.min_relative_area is not None:
        s.min_relative_area = args.min_relative_area
    if args.merge_gap is not None:
        s.merge_gap = args.merge_gap
    if args.separation is not None:
        s.separation = args.separation

    if args.padding is not None:
        s.padding = args.padding
    if args.padding_ratio is not None:
        s.padding_ratio = args.padding_ratio
    if args.square:
        s.output_mode = "square"
    if args.size:
        s.out_width, s.out_height = _parse_pair(args.size, "--size")
        s.output_mode = "fixed"
    if args.fit:
        s.fit = args.fit
    if args.no_upscale:
        s.allow_upscale = False
    if args.cutout:
        s.cutout = True
    if args.bg:
        s.background = args.bg
    if args.image_format:
        s.image_format = args.image_format
    if args.quality is not None:
        s.jpeg_quality = args.quality
    if args.name_template:
        s.name_template = args.name_template
    return s


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    settings = settings_from_args(args)

    files = collect_images(args.inputs, recursive=args.recursive)
    if not files:
        exts = ", ".join(sorted(SUPPORTED_INPUTS))
        print(f"처리할 이미지가 없습니다. 지원 형식: {exts}", file=sys.stderr)
        return 1

    out_dir = Path(args.out)
    total = 0
    failures = 0
    for path in files:
        try:
            if args.dry_run:
                from .core import detect, load_rgba

                d = detect(load_rgba(path), settings, path=path)
                written = []
                found = len(d.elements)
                for element in d.elements:
                    print(f"    {element.index:>3}. {element.width}x{element.height} @ {element.box}")
            else:
                d, written = process_file(path, out_dir, settings)
                found = len(d.elements)
            total += found
            if not args.quiet:
                tol = d.info.get("tolerance", "-")
                print(f"{path.name}: {found}개 (배경={d.info.get('source')}, 임계값={tol})")
                for element, (target, size) in zip(d.elements, written):
                    source = f"{element.width}x{element.height}"
                    final = f"{size[0]}x{size[1]}"
                    shape = source if source == final else f"{source} -> {final}"
                    print(f"    {element.index:>3}. {shape}  {target.name}")
        except Exception as exc:  # 한 장이 실패해도 나머지는 계속 처리
            failures += 1
            print(f"{path.name}: 실패 - {exc}", file=sys.stderr)

    if not args.quiet:
        action = "찾음" if args.dry_run else f"저장 완료 -> {out_dir}"
        print(f"\n이미지 {len(files)}장에서 요소 {total}개 {action}")
        if failures:
            print(f"{failures}장은 처리하지 못했습니다.", file=sys.stderr)
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
