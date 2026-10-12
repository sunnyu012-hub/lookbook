# 컷짤 GIF 메이커

영상을 넣으면 블로그용 GIF를 자동으로 골라 만들어 주는 단일 HTML 도구.
영상은 브라우저 안에서만 처리되고 어디에도 업로드되지 않는다.

- `app.html` — 원본 (Claude 아티팩트로 게시하는 형태, doctype 없음)
- `index.html` — `app.html` 을 감싼 단독 실행본. 브라우저로 바로 열면 된다.

`app.html` 을 고친 뒤 `index.html` 은 아래로 다시 만든다.

```sh
{ printf '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>\n'; cat app.html; printf '\n</body></html>\n'; } > index.html
```

## 기능
- 자동 추천: 움직임 많은 3~5초 구간, 장면 전환·어두운/흐린 구간 회피, 긴 영상은 N개를 고르게
- 타임라인에서 구간 끌어서 조정, 현재 위치에 구간 추가, 카드별 ±0.5초
- 비율 16:9 / 4:3 / 1:1 / 원본, GIF 영역 자동(움직임 중심)·가운데·직접 드래그
- 화질 3단계, 용량 상한 넘으면 크기·fps 자동 축소
- 재생 속도 1x/1.5x/2x, 부메랑 반복, 자막 한 줄, 워터마크
- ZIP 일괄 저장(대표 JPG 포함 선택), 설정 자동 기억, 원클릭 모드

GIF 인코딩은 [gifenc](https://github.com/mattdesl/gifenc) 1.0.3 (MIT) 을 jsDelivr 에서 불러온다.
