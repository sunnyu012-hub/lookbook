#!/usr/bin/env bash
# macOS / Linux 실행
cd "$(dirname "$0")"
exec python3 -m imgcrop "$@"
