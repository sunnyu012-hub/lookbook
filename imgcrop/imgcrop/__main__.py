"""python -m imgcrop 진입점. 인자가 없으면 GUI를 연다."""

import sys


def main() -> int:
    if len(sys.argv) > 1:
        from .cli import main as cli_main

        return cli_main()

    try:
        from .gui import main as gui_main
    except ImportError as exc:
        print(f"GUI를 열 수 없습니다 ({exc}).", file=sys.stderr)
        print("tkinter가 필요합니다. 명령줄로 쓰려면: python -m imgcrop --help", file=sys.stderr)
        return 1
    return gui_main()


if __name__ == "__main__":
    raise SystemExit(main())
