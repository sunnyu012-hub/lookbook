import type { WardrobeRarity } from '@/types/wardrobe'

/**
 * 옷 이름표.
 *
 * 좌표·크기·파일 경로는 여기 없다 — 그건 그림에서 계산해서
 * `src/data/wardrobe-manifest.json` 에 적힌다 (scripts/align-wardrobe.py).
 * 여기에는 사람이 정하는 것만 둔다: 이름, 등급, 결, 값.
 *
 * 매니페스트에 있는데 여기 없는 옷은 파일 이름을 그대로 이름으로 쓴다.
 * 그래야 그림을 먼저 넣어보고 이름은 나중에 붙일 수 있다.
 */

interface Row {
  name: string
  rarity: WardrobeRarity
  tags: string[]
  price?: number
  basic?: boolean
}

export const WARDROBE_ROWS: Record<string, Row> = {
  // ── 상의 ──
  cream_tee: { name: '크림 반팔', rarity: 'BASIC', tags: ['기본', '데일리'], basic: true },
  charcoal_tee: { name: '차콜 반팔', rarity: 'COMMON', tags: ['데일리'], price: 120 },
  navy_stripe_tee: { name: '네이비 스트라이프', rarity: 'COMMON', tags: ['데일리', '줄무늬'], price: 160 },
  grey_hoodie: { name: '회색 후디', rarity: 'COMMON', tags: ['편한', '가을'], price: 220 },
  grey_sweat: { name: '회색 스웨트', rarity: 'COMMON', tags: ['편한'], price: 180 },
  brown_knit: { name: '브라운 니트', rarity: 'RARE', tags: ['가을', '포근한'], price: 280 },
  cream_cardigan: { name: '크림 가디건', rarity: 'RARE', tags: ['포근한', '단정한'], price: 300 },
  blue_shirt: { name: '블루 셔츠', rarity: 'COMMON', tags: ['단정한'], price: 200 },
  denim_jacket: { name: '데님 자켓', rarity: 'RARE', tags: ['봄', '캐주얼'], price: 340 },
  black_track_jacket: { name: '블랙 트랙 자켓', rarity: 'RARE', tags: ['운동', '캐주얼'], price: 320 },
  navy_rugby: { name: '네이비 럭비 셔츠', rarity: 'RARE', tags: ['줄무늬', '가을'], price: 300 },
  pink_cardigan: { name: '핑크 가디건', rarity: 'RARE', tags: ['포근한', '봄'], price: 320 },
  white_shirt: { name: '화이트 셔츠', rarity: 'COMMON', tags: ['단정한'], price: 200 },
  green_track_jacket: { name: '그린 트랙 자켓', rarity: 'EPIC', tags: ['운동', '레트로'], price: 520 },
  mountain_tee: { name: '산 그림 티셔츠', rarity: 'RARE', tags: ['바깥', '여름'], price: 260 },
  sage_cable_knit: { name: '세이지 케이블 니트', rarity: 'EPIC', tags: ['포근한', '겨울'], price: 560 },

  // ── 하의 (신발까지 한 그림이다) ──
  blue_jeans: { name: '블루 진', rarity: 'BASIC', tags: ['기본', '데일리'], basic: true },
  light_wide_jeans: { name: '연청 와이드 진', rarity: 'COMMON', tags: ['데일리'], price: 220 },
  brown_slacks: { name: '브라운 슬랙스', rarity: 'RARE', tags: ['단정한', '가을'], price: 300 },
  black_slacks: { name: '블랙 슬랙스', rarity: 'COMMON', tags: ['단정한'], price: 240 },
  beige_pants: { name: '베이지 팬츠', rarity: 'COMMON', tags: ['데일리'], price: 200 },
  khaki_cargo: { name: '카키 카고 팬츠', rarity: 'RARE', tags: ['바깥', '캐주얼'], price: 320 },
  cream_sweatpants: { name: '크림 스웨트팬츠', rarity: 'COMMON', tags: ['편한'], price: 180 },
  charcoal_sweatpants: { name: '차콜 스웨트팬츠', rarity: 'COMMON', tags: ['편한'], price: 180 },
  denim_shorts: { name: '데님 반바지', rarity: 'COMMON', tags: ['여름'], price: 160 },
  black_shorts: { name: '블랙 반바지', rarity: 'COMMON', tags: ['여름'], price: 160 },
  cream_pleats: { name: '크림 플리츠 스커트', rarity: 'RARE', tags: ['단정한'], price: 280 },
  black_pleats: { name: '블랙 플리츠 스커트', rarity: 'RARE', tags: ['단정한'], price: 280 },
  denim_long_skirt: { name: '데님 롱스커트', rarity: 'EPIC', tags: ['봄'], price: 480 },
  beige_flare_skirt: { name: '베이지 플레어 스커트', rarity: 'EPIC', tags: ['봄', '단정한'], price: 520 },
  pink_pleats: { name: '핑크 플리츠 스커트', rarity: 'RARE', tags: ['봄'], price: 300 },
  cream_overalls: { name: '크림 멜빵 반바지', rarity: 'EPIC', tags: ['여름', '캐주얼'], price: 500 },
}

/**
 * 처음부터 가지고 있는 한 벌.
 *
 * 새 시스템을 켰는데 캐릭터가 속옷 차림이면 그건 시작이 아니라 사고다.
 * 이 둘은 팔 수 없고 뺏기지도 않는다.
 */
export const BASIC_OUTFIT = {
  topId: 'cream_tee',
  bottomId: 'blue_jeans',
} as const
