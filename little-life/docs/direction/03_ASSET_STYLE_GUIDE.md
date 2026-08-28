# LITTLE LIFE — Asset Style Guide

## 1. 핵심 그림체

- 뽀용
- 부들부들
- 포근함
- 둥근 실루엣
- 파스텔
- 낮은 대비
- 은은한 수채화/브러시 질감

딱딱한 벡터 아이콘처럼 만들지 않는다.

## 2. 공통 규칙

- 배경 없음
- 가능하면 transparent
- 에셋 단독
- 외곽 여백 충분히
- 그림자 최소
- 과한 광택 금지
- 입자 효과 금지
- 흰 테두리 금지
- 텍스트 금지

희귀도는 반짝이 입자가 아니라 색조·은은한 빛·재질로 표현한다.

---

# Sheet A — crops.png

작물과 이슬 13개.

도감 작물 칸 / 수확 카드 / 요리 재료.

**밭에 심긴 모습이 아니라 거둔 결과물.**
그릇 없음.

1. crop_strawberry — 딸기 두세 알
2. crop_tomato — 동그란 토마토, 초록 꼭지
3. crop_potato — 감자 몇 알, 흙 한 점
4. crop_basil — 초록 잎 한 줌 묶음
5. crop_lavender — 보라 줄기 다발
6. crop_carrot — 일부러 살짝 휜 당근
7. crop_pumpkin — 주황 단호박
8. crop_tiny_mushroom — 작은 버섯 두세 송이
9. crop_star_flower — 희귀, 은은한 옅은 발광
10. crop_moon_herb — 희귀, 푸른빛 도는 잎
11. crop_dream_strawberry — 희귀, 보라·남색
12. crop_golden_strawberry — 가장 귀함, 따뜻한 금빛
13. garden_dew — 물방울 하나

---

# Sheet B — stages.png

자라는 단계 4개.

모든 작물이 공용으로 사용한다. 종을 알 수 없어야 한다.

1. stage_0 — 흙이 살짝 봉긋, 싹 없음
2. stage_1 — 떡잎 두 장
3. stage_2 — 잎 서너 장의 어린 포기
4. stage_3 — 거의 다 자란 일반 포기, 열매/꽃 없음

완성 단계는 Sheet A 작물 이미지 재사용.

---

# Sheet C — foods.png

부엌 요리 12개.

사람 손 없음. 배경 없음. 한 접시 / 한 잔 단위.

1. food_strawberry_milk — 분홍 딸기 우유 / 유리컵
2. food_herb_potato_soup — 허브 감자수프 / 김 한 줄기
3. food_tomato_pasta — 작은 토마토 파스타
4. food_carrot_soup — 포근한 주황 수프
5. food_strawberry_toast — 딸기 토스트
6. food_pumpkin_tart — 호박 타르트 한 조각
7. food_lavender_tea — 연보라 찻잔
8. food_mushroom_cream_soup — 버섯 크림수프
9. food_picnic_lunchbox — 작은 도시락 / 뚜껑 열린 채
10. food_moon_tea — 푸른빛 찻잔
11. food_star_berry_cake — 귀함, 밤하늘 느낌 한 조각
12. food_dream_parfait — 가장 귀함, 긴 잔

---

# Sheet D — workshop.png

작업실 제작물.

1. w_strawberry_shelf — 13×13 — 작은 나무 선반 + 딸기
2. w_herb_bundle — 10×9 — 벽에 거는 허브 다발
3. w_veggie_crate — 13×13 — 나무 채소 상자
4. w_lavender_cushion — 8×8 — 작은 라벤더 쿠션
5. w_mushroom_lamp — 9×12 — 기존 mushroom_lamp와 겹치지 않는 버섯 램프
6. w_garden_table — 13×13 — 작은 원목 사이드 테이블
7. w_recipe_shelf — 13×13 — 노트 몇 권이 있는 레시피 선반
8. w_picnic_set — 12×11 — 바구니 + 묶은 돗자리
9. w_moon_lamp — 9×12 — 유리병 속 달빛허브
10. w_star_vase — 9×11 — 별빛꽃 화병
11. w_autumn_bench — 13×13 — 가을 벤치 / 낙엽 한 장
12. w_quarry_lantern — 9×12 — 돌 + 등불

---

# Sheet E — decor.png

## Garden Set Reward
1. g_strawberry_planter
2. g_strawberry_sign
3. g_herb_rack
4. g_harvest_basket
5. g_autumn_table
6. g_moon_arch — 가장 큼

## Kitchen Set Reward
7. k_soup_pot
8. k_dessert_tray — 2단
9. k_picnic_basket
10. k_recipe_book

## Trophy
11. t_garden_pot
12. t_garden_window
13. t_tiny_workbench

트로피 셋은 기존 `items/trophies/`처럼 **받침대에 올린 형태**로 통일.

---

# Quarry Missing Assets

신규 광물:
- mineral_spark_stone
- mineral_red_shard
- mineral_blue_stone
- mineral_quartz
- mineral_amethyst
- mineral_moss_stone
- mineral_moon_ore
- mineral_star_vein
- mineral_rose_crystal
- mineral_old_metal
- mineral_strange_fragment

추가:
- Old Quarry 장소 이미지
- w_quarry_lantern

기존 `m_stone` 재사용.

---

# Dungeon Missing Assets

Dungeon rooms:
- 돌문 앞
- 조용한 입구
- 무너진 복도
- 작은 방
- 안쪽 닫힌 문

Discovery:
- 벽화 조각
- 낡은 동전
- 희미한 수정
- 부드러운 동굴 이끼
- 작은 흔적
- 오래된 열쇠

---

# Character Full Skin Strategy

레이어 의상 대신 완성형 캐릭터.

추천 카테고리:
- Daily
- Activity
- Mood
- Season
- Special

헤어스타일은 스킨마다 실루엣이 확실히 달라도 된다.

단 얼굴·눈·체형·전체 캐릭터 정체성은 유지한다.
