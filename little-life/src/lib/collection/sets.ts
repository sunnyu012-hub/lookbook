import type { CollectionSetDef, HomeEffectDef, HomeEffectId } from '@/types'

/**
 * 세트.
 *
 * 모으라고 시키는 목록이 아니다. 이미 모아둔 걸 보다가
 * "어, 이거 하나만 더 있으면 되네" 하고 알아차리는 쪽에 가깝다.
 * 그래서 완성 보상도 능력치가 아니라 방의 공기다.
 */
export const COLLECTION_SETS: CollectionSetDef[] = [
  {
    id: 'sunday_morning',
    name: 'Sunday Morning',
    icon: '🍞',
    description: '알람을 안 맞춰도 되는 아침.',
    itemIds: [
      'cream_bed',
      'sunlight_rug',
      'toast_butter',
      'my_mug',
      'small_radio',
      'travel_magazine',
      'wildflowers',
    ],
    rewards: [{ kind: 'ROOM_EFFECT', effectId: 'SOFT_MORNING' }],
  },
  {
    id: 'rainy_afternoon',
    name: 'Rainy Afternoon',
    icon: '🌧️',
    description: '나가지 않아도 되는 이유가 생긴 날.',
    itemIds: [
      'raindrop_rug',
      'clear_umbrella',
      'umbrella_stand',
      'rainy_candle',
      'glass_teacup',
      'raindrop_light',
    ],
    rewards: [{ kind: 'ROOM_EFFECT', effectId: 'RAINY_WINDOW' }],
  },
  {
    id: 'tiny_cafe',
    name: 'Tiny Cafe',
    icon: '☕',
    description: '집에서 제일 비싼 자리.',
    itemIds: ['cafe_table', 'rattan_chair', 'home_cafe_cart', 'coffee_cup', 'latte_cup', 'cake_slice'],
    rewards: [{ kind: 'ROOM_EFFECT', effectId: 'CAFE_AMBIENCE' }],
  },
  {
    id: 'green_corner',
    name: 'Green Corner',
    icon: '🌿',
    description: '한쪽 구석만 계절이 다르다.',
    itemIds: ['big_monstera', 'window_ivy', 'pothos', 'succulent', 'rubber_tree', 'rattan_basket'],
    rewards: [
      { kind: 'ROOM_EFFECT', effectId: 'GREEN_CORNER' },
      { kind: 'RECIPE', recipeId: 'clover_bottle' },
    ],
  },
  {
    id: 'cozy_reader',
    name: 'Cozy Reader',
    icon: '📖',
    description: '한 장만 더.',
    itemIds: ['reading_chair', 'floor_lamp', 'unfinished_novel', 'poem_book', 'check_blanket', 'my_mug'],
    rewards: [{ kind: 'ROOM_EFFECT', effectId: 'READING_TIME' }],
  },
  {
    id: 'night_dream',
    name: 'Night Dream',
    icon: '🌙',
    description: '불을 끄고 나서가 더 밝다.',
    itemIds: ['moon_light', 'constellation_rug', 'star_cushion', 'star_projector', 'moon_poster', 'moon_ticket_c'],
    rewards: [{ kind: 'ROOM_EFFECT', effectId: 'NIGHT_SKY' }],
  },
  {
    id: 'little_artist',
    name: 'Little Artist',
    icon: '🎨',
    description: '잘 그릴 필요는 없다.',
    itemIds: ['sketchbook', 'pencil_case', 'easel', 'palette', 'art_box', 'abstract_poster'],
    rewards: [{ kind: 'COIN', amount: 300 }],
  },
  {
    id: 'home_worker',
    name: 'Home Worker',
    icon: '💻',
    description: '출근 거리 3미터.',
    itemIds: ['window_desk', 'work_chair', 'small_laptop', 'headphones_c', 'fountain_pen', 'small_tumbler'],
    rewards: [{ kind: 'TITLE', title: '집에서 일하는 사람' }],
  },
  {
    id: 'vintage_soul',
    name: 'Vintage Soul',
    icon: '📻',
    description: '전부 나보다 나이가 많다.',
    itemIds: [
      'vintage_sofa',
      'vintage_side_table',
      'vintage_lamp',
      'vintage_alarm',
      'turntable',
      'record',
      'old_map',
    ],
    rewards: [{ kind: 'ROOM_EFFECT', effectId: 'FLOATING_DUST' }],
  },
  {
    id: 'plant_parent',
    name: 'Plant Parent',
    icon: '🪴',
    description: '이름을 다 알고 있다.',
    // 어떤 식물을 좋아하는지는 사람마다 다르다. 목록을 정해두면 그건 취향이 아니라 숙제다.
    itemIds: [],
    anyOf: { category: 'PLANT', count: 10 },
    rewards: [{ kind: 'RECIPE', recipeId: 'star_pot' }],
  },
  {
    id: 'soft_pink',
    name: 'Soft Pink',
    icon: '🌸',
    description: '한 색으로만 방을 채우면 이렇게 된다.',
    itemIds: ['pink_sofa', 'pink_glass_lamp', 'pink_cloud_rug', 'pink_tulip', 'pink_beanbag'],
    rewards: [{ kind: 'COIN', amount: 250 }],
  },
  {
    id: 'sage_day',
    name: 'Sage Day',
    icon: '🌱',
    description: '조용한 초록.',
    itemIds: ['sage_chair', 'sage_cabinet', 'sage_rug', 'herb_pot', 'green_stand'],
    rewards: [{ kind: 'COIN', amount: 250 }],
  },
  {
    id: 'little_gamer',
    name: 'Little Gamer',
    icon: '🎮',
    description: '한 판만 더.',
    itemIds: ['small_laptop', 'monitor', 'keyboard', 'controller', 'handheld', 'speaker'],
    rewards: [{ kind: 'COIN', amount: 400 }],
  },
  {
    id: 'slow_kitchen',
    name: 'Slow Kitchen',
    icon: '🍳',
    description: '오래 걸려도 상관없는 날.',
    itemIds: ['mini_table', 'kitchen_shelf', 'toast_plate', 'wood_tray', 'small_pot', 'cutting_board'],
    rewards: [{ kind: 'RECIPE', recipeId: 'mushroom_stool' }],
  },
  {
    id: 'picnic_day',
    name: 'Picnic Day',
    icon: '🧺',
    description: '돗자리만 있으면 어디든 된다.',
    itemIds: ['picnic_mat', 'eco_bag', 'lemonade', 'cookie_plate', 'apple_basket', 'instant_camera'],
    rewards: [{ kind: 'ROOM_EFFECT', effectId: 'GOLDEN_HOUR' }],
  },
  {
    id: 'music_evening',
    name: 'Music Evening',
    icon: '🎶',
    description: '저녁에만 트는 것들.',
    itemIds: ['turntable', 'record', 'small_radio', 'guitar', 'mini_piano', 'speaker'],
    rewards: [{ kind: 'TITLE', title: '저녁의 연주자' }],
  },
  {
    id: 'little_explorer',
    name: 'Little Explorer',
    icon: '🗺️',
    description: '멀리 안 가도 탐험은 된다.',
    itemIds: ['eco_bag', 'vintage_camera', 'film_roll', 'travel_magazine', 'old_map', 'sneakers_c'],
    rewards: [{ kind: 'COIN', amount: 500 }],
  },
  {
    id: 'after_workout',
    name: 'After Workout',
    icon: '💪',
    description: '끝나고 나서가 제일 좋다.',
    itemIds: ['yoga_mat', 'chalk_bag', 'sneakers_c', 'water_bottle'],
    rewards: [{ kind: 'COIN', amount: 200 }],
  },
  {
    id: 'star_collector',
    name: 'Star Collector',
    icon: '⭐',
    description: '하나씩 주워 모은 것.',
    itemIds: ['star_piece', 'stardust_jar', 'star_lamp', 'star_cushion', 'star_mobile', 'neon_star'],
    rewards: [
      { kind: 'ITEM', itemId: 'star_music_box' },
      { kind: 'ROOM_EFFECT', effectId: 'FIREFLY' },
    ],
  },
  {
    id: 'moon_collector',
    name: 'Moon Collector',
    icon: '🌕',
    description: '밤 시장을 몇 번이나 다녀왔는지.',
    itemIds: ['moon_light', 'moon_keyring_c', 'moon_poster', 'moondust_jar', 'moon_ticket_c'],
    // 완성하면 Moon Globe 가 트로피로 온다 (lib/collection/trophies.ts)
    rewards: [{ kind: 'COIN', amount: 600 }],
  },
  // ── 부엌에서 만든 것들 ──
  // 요리도 결국 모으는 것이라, 완성 보상은 방에 남는 물건으로 돌려준다.
  // 다른 세트와 같은 얼개다 — 세트 시스템을 따로 만들지 않았다.
  {
    id: 'cozy_soup',
    name: 'Cozy Soup',
    icon: '🍲',
    description: '따뜻한 걸 세 가지 끓여본 사람.',
    itemIds: ['food_herb_potato_soup', 'food_carrot_soup', 'food_mushroom_cream_soup'],
    rewards: [{ kind: 'ITEM', itemId: 'k_soup_pot' }],
  },
  {
    id: 'sweet_afternoon',
    name: 'Sweet Afternoon',
    icon: '🍰',
    description: '오후 세 시쯤에 어울리는 것들.',
    itemIds: ['food_strawberry_milk', 'food_strawberry_toast', 'food_pumpkin_tart'],
    rewards: [{ kind: 'ITEM', itemId: 'k_dessert_tray' }],
  },
  {
    id: 'little_picnic',
    name: 'Little Picnic',
    icon: '🧺',
    description: '나가서 먹으면 더 맛있는 것들.',
    itemIds: ['food_picnic_lunchbox', 'food_strawberry_milk', 'food_tomato_pasta'],
    rewards: [{ kind: 'ITEM', itemId: 'k_picnic_basket' }],
  },
  // ── 정원에서 모으는 것들 ──
  // 작물과 요리가 섞여 있다. 정원과 부엌이 따로 노는 게 아니라
  // 하나의 이야기라는 걸 세트가 말해준다.
  {
    id: 'strawberry_patch',
    name: 'Strawberry Patch',
    icon: '🍓',
    description: '딸기로 할 수 있는 것들.',
    itemIds: [
      'crop_strawberry',
      'food_strawberry_milk',
      'food_strawberry_toast',
      'crop_dream_strawberry',
      'crop_golden_strawberry',
    ],
    partialAt: 3,
    partialRewards: [{ kind: 'ITEM', itemId: 'g_strawberry_planter' }],
    rewards: [{ kind: 'ITEM', itemId: 'g_strawberry_sign' }],
  },
  {
    id: 'herb_corner',
    name: 'Herb Corner',
    icon: '🌿',
    description: '향이 나는 쪽 구석.',
    itemIds: [
      'crop_basil',
      'crop_lavender',
      'crop_moon_herb',
      'food_lavender_tea',
      'food_herb_potato_soup',
    ],
    partialAt: 3,
    partialRewards: [{ kind: 'ITEM', itemId: 'g_herb_rack' }],
    rewards: [{ kind: 'ITEM', itemId: 'g_moon_arch' }],
  },
  {
    id: 'autumn_harvest',
    name: 'Autumn Harvest',
    icon: '🍂',
    description: '해가 짧아질 때 거두는 것들.',
    itemIds: [
      'crop_potato',
      'crop_carrot',
      'crop_pumpkin',
      'crop_tiny_mushroom',
      'food_pumpkin_tart',
    ],
    partialAt: 3,
    partialRewards: [{ kind: 'ITEM', itemId: 'g_harvest_basket' }],
    rewards: [{ kind: 'ITEM', itemId: 'g_autumn_table' }],
  },
  {
    id: 'moon_garden',
    name: 'Moon Garden',
    icon: '🌙',
    description: '밤에만 보이는 쪽.',
    // 별빛꽃이나 달빛허브를 만나기 전까지는 도감에서 감춘다 —
    // 있는 줄도 모르는 것의 목록을 먼저 보여주면 그건 숙제가 된다.
    hiddenUntil: { kind: 'CROP_FOUND', cropIds: ['star_flower', 'moon_herb'] },
    itemIds: [
      'crop_star_flower',
      'crop_moon_herb',
      'crop_dream_strawberry',
      'food_moon_tea',
      'w_moon_lamp',
    ],
    rewards: [{ kind: 'COIN', amount: 800 }],
  },
]

/** 방의 공기. 세트를 완성하면 하나씩 열린다. */
export const HOME_EFFECTS: HomeEffectDef[] = [
  { id: 'SOFT_MORNING', name: '나른한 아침빛', description: '창으로 빛이 길게 들어온다.', icon: '🌤️' },
  { id: 'RAINY_WINDOW', name: '비 오는 창', description: '창에 빗줄기가 흐른다.', icon: '🌧️' },
  { id: 'CAFE_AMBIENCE', name: '카페의 공기', description: '컵 부딪는 소리가 들릴 것 같은 빛.', icon: '☕' },
  { id: 'GREEN_CORNER', name: '초록 구석', description: '잎 그림자가 벽에 진다.', icon: '🌿' },
  { id: 'READING_TIME', name: '읽는 시간', description: '한쪽만 따뜻하게 밝다.', icon: '📖' },
  { id: 'NIGHT_SKY', name: '밤하늘', description: '천장에 별이 조용히 지나간다.', icon: '🌌' },
  { id: 'GOLDEN_HOUR', name: '노을 시간', description: '방 전체가 살구색이 된다.', icon: '🌇' },
  { id: 'FIREFLY', name: '반딧불', description: '작은 빛이 천천히 떠다닌다.', icon: '✨' },
  { id: 'FLOATING_DUST', name: '떠다니는 먼지', description: '빛줄기 안에서만 보이는 것.', icon: '🌫️' },
]

export function findSet(id: string): CollectionSetDef | null {
  return COLLECTION_SETS.find((s) => s.id === id) ?? null
}

export function findEffect(id: HomeEffectId): HomeEffectDef | null {
  return HOME_EFFECTS.find((e) => e.id === id) ?? null
}

/**
 * 이 물건이 속한 세트들.
 * 아이템 표에 세트 id 를 적어두면 양쪽이 어긋나기 때문에 여기서 한 번만 만든다.
 */
const BY_ITEM: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {}
  for (const set of COLLECTION_SETS) {
    for (const itemId of set.itemIds) {
      map[itemId] = [...(map[itemId] ?? []), set.id]
    }
  }
  return map
})()

export function setsForItem(itemId: string): string[] {
  return BY_ITEM[itemId] ?? []
}
