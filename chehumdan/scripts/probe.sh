#!/usr/bin/env bash
# 개발용: 각 체험단 사이트의 페이지 원본을 받아 _probe/ 에 저장한다.
# 사용: probe.sh <url목록파일>
set -u
OUT="chehumdan/_probe"
mkdir -p "$OUT"
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36"
while read -r name url; do
  [ -z "${name:-}" ] && continue
  case "$name" in \#*) continue;; esac
  curl -sS -L --max-time 30 -A "$UA" -H "Accept-Language: ko-KR,ko;q=0.9" \
    -D "$OUT/$name.headers" -o "$OUT/$name.body" \
    -w "$name %{http_code} %{url_effective} %{size_download}\n" "$url" >> "$OUT/_summary.txt" 2>>"$OUT/_errors.txt" \
    || echo "$name FAILED $url" >> "$OUT/_summary.txt"
done < "$1"
