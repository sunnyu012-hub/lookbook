# 에셋 점검

생성: `npm run assets:audit`

## 요약

| | 개수 |
| --- | --- |
| 도감 | 240 |
| 트로피 | 14 |
| 재료 | 8 |
| 그림 연결됨 | 308 |
| 그림 없음 (이모지로 그림) | 24 |
| 그림도 이모지도 없음 | 0 |
| 경로는 있는데 파일 없음 | 0 |
| 카탈로그에 없는 파일 | 0 |
| id 중복 | 0 |
| 경로 중복 | 0 |
| 테두리까지 꽉 참 (POSSIBLE_CROP) | 5 |
| 유난히 촘촘함 (STYLE_REVIEW) | 3 |

## 배치 분류

| | 개수 |
| --- | --- |
| PLACEABLE | 257 |
| DISPLAY_ONLY | 31 |
| MATERIAL_ONLY | 44 |

| 놓는 자리 | 개수 |
| --- | --- |
| TABLETOP | 156 |
| FLOOR | 77 |
| DECOR | 66 |
| RUG | 14 |
| WALL | 14 |
| HANGING | 4 |
| WINDOW | 1 |

## 그림이 없는 물건

- `seed_strawberry` 딸기 씨앗 — MATERIAL
- `seed_tomato` 토마토 씨앗 — MATERIAL
- `seed_potato` 감자 씨앗 — MATERIAL
- `seed_basil` 바질 씨앗 — MATERIAL
- `seed_lavender` 라벤더 씨앗 — MATERIAL
- `seed_carrot` 당근 씨앗 — MATERIAL
- `seed_pumpkin` 호박 씨앗 — MATERIAL
- `seed_tiny_mushroom` 작은 버섯 씨앗 — MATERIAL
- `seed_star_flower` 별빛꽃 씨앗 — MATERIAL
- `seed_moon_herb` 달빛허브 씨앗 — MATERIAL
- `seed_dream_strawberry` 꿈딸기 씨앗 — MATERIAL
- `seed_golden_strawberry` 황금 딸기 씨앗 — MATERIAL
- `w_quarry_lantern` 돌등불 — LIGHTING
- `mineral_spark_stone` 반짝돌 — MATERIAL
- `mineral_red_shard` 붉은 조각 — MATERIAL
- `mineral_blue_stone` 푸른 돌 — MATERIAL
- `mineral_quartz` 석영 조각 — MATERIAL
- `mineral_amethyst` 자수정 조각 — MATERIAL
- `mineral_moss_stone` 이끼 낀 돌 — MATERIAL
- `mineral_moon_ore` 달조각 광석 — MATERIAL
- `mineral_star_vein` 별맥석 — MATERIAL
- `mineral_rose_crystal` 장밋빛 수정 — MATERIAL
- `mineral_old_metal` 오래된 금속 조각 — MATERIAL
- `mineral_strange_fragment` 이상한 돌조각 — MATERIAL

## 방에 놓을 수 있는데 그림이 없는 것

없음

## 경로는 있는데 파일이 없는 것

없음

## 카탈로그에 없는 파일

없음

## 너무 작은 그림

- `round_stool` 동그란 스툴 — 116×108

## 너무 큰 그림

없음

## 테두리까지 꽉 찬 그림 (POSSIBLE_CROP)

테두리가 35% 넘게 차 있는 것.

**네모난 물건은 원래 여기 걸린다.** 잘렸다는 판정이 아니라 한 번 보라는 목록이다.

- `full_shelf` 꽉 찬 책장 — 테두리 42% 가 차 있다
- `check_rug` 체크 러그 — 테두리 44% 가 차 있다
- `monitor` 데스크 모니터 — 테두리 57% 가 차 있다
- `friend_photo` 친구와 찍은 사진 액자 — 테두리 57% 가 차 있다
- `cork_board` 작은 코르크보드 — 테두리 44% 가 차 있다

## 유난히 촘촘한 그림 (STYLE_REVIEW)

같은 크기인데 파일이 무겁다 — 잔선이 많다는 뜻이다.
다른 화풍이 섞이면 대개 여기 먼저 걸리지만, 잎이 많은 화분처럼 원래 촘촘한 것도 걸린다.

- `rosemary_pot` 로즈마리 화분 — 0.55 B/px
- `lavender_pot` 라벤더 화분 — 0.58 B/px
- `baby_breath` 안개꽃 화병 — 0.60 B/px

