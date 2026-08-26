# 에셋 점검

생성: `npm run assets:audit`

## 요약

| | 개수 |
| --- | --- |
| 도감 | 240 |
| 트로피 | 14 |
| 재료 | 8 |
| 그림 연결됨 | 259 |
| 그림 없음 (이모지로 그림) | 62 |
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
| MATERIAL_ONLY | 33 |

| 놓는 자리 | 개수 |
| --- | --- |
| TABLETOP | 156 |
| FLOOR | 77 |
| DECOR | 55 |
| RUG | 14 |
| WALL | 14 |
| HANGING | 4 |
| WINDOW | 1 |

## 그림이 없는 물건

- `t_garden_pot` 정원에서 온 화분 — TROPHY
- `t_tiny_workbench` 작은 작업대 — TROPHY
- `t_garden_window` 정원이 보이는 창 — TROPHY
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
- `crop_strawberry` 딸기 — MATERIAL
- `crop_tomato` 토마토 — MATERIAL
- `crop_potato` 감자 — MATERIAL
- `crop_basil` 바질 — MATERIAL
- `crop_lavender` 라벤더 — MATERIAL
- `crop_carrot` 당근 — MATERIAL
- `crop_pumpkin` 호박 — MATERIAL
- `crop_tiny_mushroom` 작은 버섯 — MATERIAL
- `crop_star_flower` 별빛꽃 — MATERIAL
- `crop_moon_herb` 달빛허브 — MATERIAL
- `crop_dream_strawberry` 꿈딸기 — MATERIAL
- `crop_golden_strawberry` 황금 딸기 — MATERIAL
- `garden_dew` 아침 이슬 — MATERIAL
- `g_strawberry_planter` 딸기 화분 — OUTDOOR
- `g_strawberry_sign` 딸기밭 표지판 — OUTDOOR
- `g_herb_rack` 허브 건조대 — OUTDOOR
- `g_harvest_basket` 수확 바구니 — OUTDOOR
- `g_autumn_table` 가을 정원 테이블 — OUTDOOR
- `g_moon_arch` 달빛 정원 아치 — OUTDOOR
- `food_strawberry_milk` 딸기 우유 — FOOD
- `food_herb_potato_soup` 허브 감자수프 — FOOD
- `food_tomato_pasta` 작은 토마토 파스타 — FOOD
- `food_carrot_soup` 당근 수프 — FOOD
- `food_strawberry_toast` 딸기 토스트 — FOOD
- `food_pumpkin_tart` 호박 타르트 — FOOD
- `food_lavender_tea` 라벤더 티 — FOOD
- `food_mushroom_cream_soup` 버섯 크림수프 — FOOD
- `food_picnic_lunchbox` 작은 피크닉 도시락 — FOOD
- `food_moon_tea` 달빛차 — FOOD
- `food_star_berry_cake` 별딸기 케이크 — FOOD
- `food_dream_parfait` 꿈빛 파르페 — FOOD
- `k_soup_pot` 포근한 수프 냄비 — KITCHEN
- `k_dessert_tray` 디저트 트레이 — KITCHEN
- `k_picnic_basket` 피크닉 바구니 — KITCHEN
- `k_recipe_book` 작은 레시피 노트 — KITCHEN
- `w_strawberry_shelf` 딸기 선반 — FURNITURE
- `w_herb_bundle` 허브 다발 — WALL
- `w_veggie_crate` 채소 상자 — FURNITURE
- `w_lavender_cushion` 라벤더 쿠션 — LITTLE_THING
- `w_mushroom_lamp` 버섯 램프 — LIGHTING
- `w_garden_table` 정원 사이드 테이블 — FURNITURE
- `w_recipe_shelf` 레시피 선반 — FURNITURE
- `w_picnic_set` 피크닉 세트 — OUTDOOR
- `w_moon_lamp` 달빛허브 램프 — LIGHTING
- `w_star_vase` 별빛꽃 화병 — PLANT
- `w_autumn_bench` 가을 벤치 — FURNITURE
- `w_quarry_lantern` 돌등불 — LIGHTING

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

