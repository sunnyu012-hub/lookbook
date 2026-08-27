import type { RecipeDef } from '@/types'
import { QUARRY_LANTERN_RECIPE, WORKSHOP_RECIPES } from './workshop'

/**
 * 만들기.
 *
 * 재료 경제를 복잡하게 만들지 않는다. 재료는 여덟 가지뿐이고,
 * 하나를 만드는 데 필요한 건 대체로 두세 종류다.
 * 창고 관리 게임이 되는 순간 이건 더 이상 생활 앱이 아니다.
 *
 * 모든 레시피를 처음부터 보여주지 않는다 (§40).
 * 아직 모르는 건 ??? 로 남고, 살다 보면 하나씩 알게 된다.
 */
const BASE_RECIPES: RecipeDef[] = [
  // ── 처음부터 아는 것 ──
  {
    id: 'sprout_jar',
    resultItemId: 'sprout_jar',
    ingredients: [{ itemId: 'm_glass', count: 2 }, { itemId: 'm_leaf', count: 2 }],
    unlock: { kind: 'DEFAULT' },
    unlockHint: '처음부터 알고 있던 것',
  },
  {
    id: 'small_frame',
    resultItemId: 'small_frame',
    ingredients: [{ itemId: 'm_wood', count: 2 }, { itemId: 'm_glass', count: 1 }],
    unlock: { kind: 'DEFAULT' },
    unlockHint: '처음부터 알고 있던 것',
  },
  {
    id: 'pencil_cup',
    resultItemId: 'pencil_cup',
    ingredients: [{ itemId: 'm_paper', count: 3 }],
    unlock: { kind: 'DEFAULT' },
    unlockHint: '처음부터 알고 있던 것',
  },
  {
    id: 'yarn',
    resultItemId: 'yarn',
    ingredients: [{ itemId: 'm_cloth', count: 2 }],
    unlock: { kind: 'DEFAULT' },
    unlockHint: '처음부터 알고 있던 것',
  },
  {
    id: 'small_candle',
    resultItemId: 'small_candle',
    ingredients: [{ itemId: 'm_glass', count: 1 }, { itemId: 'm_petal', count: 2 }],
    unlock: { kind: 'DEFAULT' },
    unlockHint: '처음부터 알고 있던 것',
  },
  {
    id: 'postcards',
    resultItemId: 'postcards',
    ingredients: [{ itemId: 'm_paper', count: 4 }],
    unlock: { kind: 'DEFAULT' },
    unlockHint: '처음부터 알고 있던 것',
  },

  {
    id: 'toast_plate',
    resultItemId: 'toast_plate',
    ingredients: [{ itemId: 'm_glass', count: 3 }],
    unlock: { kind: 'DEFAULT' },
    unlockHint: '처음부터 알고 있던 것',
  },
  {
    id: 'candle_light',
    resultItemId: 'candle_light',
    ingredients: [{ itemId: 'm_glass', count: 2 }, { itemId: 'm_metal', count: 1 }],
    unlock: { kind: 'DEFAULT' },
    unlockHint: '처음부터 알고 있던 것',
  },
  {
    id: 'pothos',
    resultItemId: 'pothos',
    ingredients: [{ itemId: 'm_leaf', count: 3 }],
    unlock: { kind: 'DEFAULT' },
    unlockHint: '처음부터 알고 있던 것',
  },

  // ── 살다 보면 알게 되는 것 ──
  {
    id: 'window_ivy',
    resultItemId: 'window_ivy',
    ingredients: [{ itemId: 'm_leaf', count: 3 }, { itemId: 'm_stone', count: 1 }],
    unlock: { kind: 'LEVEL', level: 2 },
    unlockHint: 'Lv.2',
  },
  {
    id: 'rattan_basket',
    resultItemId: 'rattan_basket',
    ingredients: [{ itemId: 'm_leaf', count: 4 }, { itemId: 'm_cloth', count: 2 }],
    unlock: { kind: 'LEVEL', level: 3 },
    unlockHint: 'Lv.3',
  },
  {
    id: 'check_blanket',
    resultItemId: 'check_blanket',
    ingredients: [{ itemId: 'm_cloth', count: 4 }],
    unlock: { kind: 'LEVEL', level: 5 },
    unlockHint: 'Lv.5',
  },
  {
    id: 'coat_rack',
    resultItemId: 'coat_rack',
    ingredients: [{ itemId: 'm_wood', count: 3 }, { itemId: 'm_metal', count: 2 }],
    unlock: { kind: 'LEVEL', level: 5 },
    unlockHint: 'Lv.5',
  },
  {
    id: 'window_ledge',
    resultItemId: 'window_ledge',
    ingredients: [{ itemId: 'm_wood', count: 4 }, { itemId: 'm_metal', count: 1 }],
    unlock: { kind: 'LEVEL', level: 7 },
    unlockHint: 'Lv.7',
  },
  {
    id: 'wood_bench',
    resultItemId: 'wood_bench',
    ingredients: [{ itemId: 'm_wood', count: 6 }],
    unlock: { kind: 'LEVEL', level: 8 },
    unlockHint: 'Lv.8',
  },
  {
    id: 'mushroom_rug',
    resultItemId: 'mushroom_rug',
    ingredients: [{ itemId: 'm_cloth', count: 5 }, { itemId: 'm_petal', count: 2 }],
    unlock: { kind: 'LEVEL', level: 9 },
    unlockHint: 'Lv.9',
  },
  {
    id: 'wood_tray',
    resultItemId: 'wood_tray',
    ingredients: [{ itemId: 'm_wood', count: 3 }],
    unlock: { kind: 'LEVEL', level: 3 },
    unlockHint: 'Lv.3',
  },
  {
    id: 'small_blanket',
    resultItemId: 'small_blanket',
    ingredients: [{ itemId: 'm_cloth', count: 3 }],
    unlock: { kind: 'LEVEL', level: 3 },
    unlockHint: 'Lv.3',
  },
  {
    id: 'yellow_cushion',
    resultItemId: 'yellow_cushion',
    ingredients: [{ itemId: 'm_cloth', count: 2 }, { itemId: 'm_petal', count: 1 }],
    unlock: { kind: 'LEVEL', level: 4 },
    unlockHint: 'Lv.4',
  },
  {
    id: 'herb_pot',
    resultItemId: 'herb_pot',
    ingredients: [{ itemId: 'm_leaf', count: 3 }, { itemId: 'm_stone', count: 2 }],
    unlock: { kind: 'LEVEL', level: 4 },
    unlockHint: 'Lv.4',
  },
  {
    id: 'cork_board',
    resultItemId: 'cork_board',
    ingredients: [{ itemId: 'm_wood', count: 2 }, { itemId: 'm_paper', count: 3 }],
    unlock: { kind: 'LEVEL', level: 5 },
    unlockHint: 'Lv.5',
  },
  {
    id: 'mushroom_stool',
    resultItemId: 'mushroom_stool',
    ingredients: [{ itemId: 'm_wood', count: 4 }, { itemId: 'm_cloth', count: 2 }],
    unlock: { kind: 'LEVEL', level: 6 },
    unlockHint: 'Lv.6',
  },
  {
    id: 'garland',
    resultItemId: 'garland',
    ingredients: [{ itemId: 'm_paper', count: 3 }, { itemId: 'm_cloth', count: 1 }],
    unlock: { kind: 'LEVEL', level: 6 },
    unlockHint: 'Lv.6',
  },
  {
    id: 'knitting_basket',
    resultItemId: 'knitting_basket',
    ingredients: [{ itemId: 'm_cloth', count: 4 }, { itemId: 'm_wood', count: 2 }],
    unlock: { kind: 'LEVEL', level: 8 },
    unlockHint: 'Lv.8',
  },
  {
    id: 'picnic_mat',
    resultItemId: 'picnic_mat',
    ingredients: [{ itemId: 'm_cloth', count: 5 }, { itemId: 'm_leaf', count: 2 }],
    unlock: { kind: 'LEVEL', level: 9 },
    unlockHint: 'Lv.9',
  },
  {
    id: 'paper_lantern',
    resultItemId: 'paper_lantern',
    ingredients: [{ itemId: 'm_paper', count: 5 }, { itemId: 'm_metal', count: 1 }],
    unlock: { kind: 'LEVEL', level: 10 },
    unlockHint: 'Lv.10',
  },

  // ── 도감을 채우다 알게 되는 것 ──
  {
    id: 'star_side_table',
    resultItemId: 'star_side_table',
    ingredients: [{ itemId: 'm_wood', count: 5 }, { itemId: 'star_piece', count: 2 }],
    unlock: { kind: 'COLLECTION', count: 25 },
    unlockHint: '도감 25개',
  },
  {
    id: 'mushroom_lamp',
    resultItemId: 'mushroom_lamp',
    ingredients: [
      { itemId: 'm_glass', count: 3 },
      { itemId: 'm_wood', count: 2 },
      { itemId: 'stardust_jar', count: 1 },
    ],
    unlock: { kind: 'COLLECTION', count: 30 },
    unlockHint: '도감 30개',
  },
  {
    id: 'firefly_jar',
    resultItemId: 'firefly_jar',
    ingredients: [{ itemId: 'm_glass', count: 4 }, { itemId: 'stardust_jar', count: 2 }],
    unlock: { kind: 'COLLECTION', count: 50 },
    unlockHint: '도감 50개',
  },
  {
    id: 'cat_cushion',
    resultItemId: 'cat_cushion',
    ingredients: [{ itemId: 'm_cloth', count: 4 }, { itemId: 'm_petal', count: 2 }],
    unlock: { kind: 'COLLECTION', count: 40 },
    unlockHint: '도감 40개',
  },
  {
    id: 'star_cushion',
    resultItemId: 'star_cushion',
    ingredients: [{ itemId: 'm_cloth', count: 4 }, { itemId: 'star_piece', count: 1 }],
    unlock: { kind: 'COLLECTION', count: 60 },
    unlockHint: '도감 60개',
  },

  // ── 사람에게 배우는 것 ──
  {
    id: 'cloud_light',
    resultItemId: 'cloud_light',
    ingredients: [
      { itemId: 'm_cloth', count: 4 },
      { itemId: 'm_glass', count: 2 },
      { itemId: 'dream_piece', count: 1 },
    ],
    unlock: { kind: 'NPC', npcId: 'LULU', friendship: 20 },
    unlockHint: '루루에게 배운다',
  },
  {
    id: 'raindrop_light',
    resultItemId: 'raindrop_light',
    ingredients: [
      { itemId: 'm_glass', count: 3 },
      { itemId: 'm_metal', count: 2 },
      { itemId: 'raindrop_crystal', count: 1 },
    ],
    unlock: { kind: 'NPC', npcId: 'NOA', friendship: 30 },
    unlockHint: '노아에게 배운다',
  },
  {
    id: 'sleepy_bear_cushion',
    resultItemId: 'sleepy_bear_cushion',
    ingredients: [{ itemId: 'm_cloth', count: 5 }, { itemId: 'm_petal', count: 3 }],
    unlock: { kind: 'NPC', npcId: 'JUNE', friendship: 25 },
    unlockHint: '준에게 배운다',
  },

  // ── 세트를 완성하고 알게 되는 것 ──
  {
    id: 'clover_bottle',
    resultItemId: 'clover_bottle',
    ingredients: [{ itemId: 'm_glass', count: 2 }, { itemId: 'clover', count: 1 }],
    unlock: { kind: 'SET', setId: 'green_corner' },
    unlockHint: 'Green Corner 를 완성하면',
  },
  {
    id: 'star_pot',
    resultItemId: 'star_pot',
    ingredients: [
      { itemId: 'm_leaf', count: 5 },
      { itemId: 'm_stone', count: 3 },
      { itemId: 'stardust_jar', count: 2 },
    ],
    unlock: { kind: 'SET', setId: 'plant_parent' },
    unlockHint: 'Plant Parent 를 완성하면',
  },
  {
    id: 'basil_pot',
    resultItemId: 'basil_pot',
    ingredients: [{ itemId: 'm_leaf', count: 4 }, { itemId: 'm_stone', count: 1 }],
    unlock: { kind: 'SET', setId: 'slow_kitchen' },
    unlockHint: 'Slow Kitchen 을 완성하면',
  },
  {
    id: 'rosemary_pot',
    resultItemId: 'rosemary_pot',
    ingredients: [{ itemId: 'm_leaf', count: 4 }, { itemId: 'm_petal', count: 1 }],
    unlock: { kind: 'SET', setId: 'sage_day' },
    unlockHint: 'Sage Day 를 완성하면',
  },
]

/**
 * 만들 수 있는 것 전부.
 *
 * 정원 쪽 레시피를 따로 두지 않고 같은 목록에 넣는다 —
 * 작업실이 두 개가 되면 어느 쪽에서 만드는지부터 헷갈린다.
 */
export const RECIPES: RecipeDef[] = [...BASE_RECIPES, ...WORKSHOP_RECIPES, QUARRY_LANTERN_RECIPE]

export function findRecipe(id: string): RecipeDef | null {
  return RECIPES.find((r) => r.id === id) ?? null
}

/** 이 물건을 만들 수 있는 레시피 */
export function recipeForItem(itemId: string): RecipeDef | null {
  return RECIPES.find((r) => r.resultItemId === itemId) ?? null
}

/** 만들 수 있는 물건 전부 — 아이템 표에 손으로 적지 않고 여기서 가져간다 */
export const CRAFTABLE_ITEM_IDS = new Set(RECIPES.map((r) => r.resultItemId))
