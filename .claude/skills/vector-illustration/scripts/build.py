"""구성용 SVG 한 장을 업로드 가능한 SVG 로 굽는다.

    python build.py src/*.svg --out final/

outline(스트로크를 면으로) -> finish(클립 굽기 + evenodd 제거 + 백킹)
-> fit(viewBox 타이트) 순으로 돌리고, 후처리 직전 상태를 <out>/.before/
에 남겨둔다. check.py --before 로 모양이 안 변했는지 대조할 수 있다.
"""
import argparse, os, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))


def run(script, *args, allow_fail=False):
    r = subprocess.run([sys.executable, os.path.join(HERE, script), *args],
                       capture_output=True, text=True)
    if r.returncode and not allow_fail:
        sys.exit(f"{script} 실패:\n{r.stderr}")
    return r.stdout


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    before = os.path.join(args.out, ".before")
    os.makedirs(before, exist_ok=True)

    made = []
    for src in args.files:
        dst = os.path.join(args.out, os.path.basename(src))
        run("outline.py", src, dst)
        shutil.copy(dst, os.path.join(before, os.path.basename(src)))
        run("finish.py", dst)
        run("fit.py", dst)
        made.append(dst)
        print("구움:", dst)

    print()
    report = run("check.py", *made, "--before", before, allow_fail=True)
    print(report)
    if "FAIL" in report:
        sys.exit("규칙 위반이 남아 있다. 위 항목을 고치고 다시 굽는다.")


if __name__ == "__main__":
    main()
