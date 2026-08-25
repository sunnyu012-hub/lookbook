import type { KitchenRecipeDef } from '@/types'

/**
 * 열두 가지 요리.
 *
 * 이 표가 부엌의 전부다. 화면 코드에는 요리 이름이 하나도 없다.
 *
 * ── 재료는 정원에서만 온다 ─────────────────────────────
 *
 * 우유 · 밀가루 · 소금 같은 기본 재료를 따로 두지 않았다.
 * 그런 걸 두면 요리하려고 가게에서 우유를 반복 구매하는 관리 게임이 되고,
 * 그건 정원에서 거둔 것이 이야기가 되는 것과 정반대다.
 * 부족한 것은 늘 "정원에 가면 있는 것" 이어야 한다.
 *
 * ── 조건은 이미 있는 기록에서 센다 ──────────────────────
 *
 * 무엇을 몇 번 거뒀는지 · 무엇을 만들어봤는지. 따로 적립하지 않는다.
 * 진행률은 평균이 아니라 제일 덜 온 것으로 본다.
 */

const S = 'crop_strawberry'
const T = 'crop_tomato'
const P = 'crop_potato'
const B = 'crop_basil'
const L = 'crop_lavender'
const C = 'crop_carrot'
const K = 'crop_pumpkin'
const M = 'crop_tiny_mushroom'

export const KITCHEN_RECIPES: KitchenRecipeDef[] = [
  // ── 처음부터 아는 넷 ────────────────────────────────
  {
    id: 'strawberry_milk',
    name: '딸기 우유',
    icon: '🥛',
    category: 'DRINK',
    rarity: 'COMMON',
    ingredients: [{ itemId: S, count: 2 }],
    outputItemId: 'food_strawberry_milk',
    description: '달콤하고 부드러운 분홍빛 한 잔.',
    tags: ['sweet', 'drink'],
    giftTags: ['sweet', 'cozy'],
    conditions: [{ kind: 'DEFAULT' }],
    hintAt: 1,
    hint: '',
    buff: { label: '다음 퀘스트 EXP +5%', category: null, expPct: 5 },
  },
  {
    id: 'herb_potato_soup',
    name: '허브 감자수프',
    icon: '🥣',
    category: 'MEAL',
    rarity: 'COMMON',
    ingredients: [
      { itemId: P, count: 2 },
      { itemId: B, count: 1 },
    ],
    outputItemId: 'food_herb_potato_soup',
    description: '따뜻하게 먹으면 마음까지 조금 느슨해진다.',
    tags: ['warm', 'herb'],
    giftTags: ['healthy', 'cozy'],
    conditions: [{ kind: 'DEFAULT' }],
    hintAt: 1,
    hint: '',
    buff: { label: '다음 퀘스트 EXP +5%', category: null, expPct: 5 },
  },
  {
    id: 'tomato_pasta',
    name: '작은 토마토 파스타',
    icon: '🍝',
    category: 'MEAL',
    rarity: 'COMMON',
    ingredients: [
      { itemId: T, count: 2 },
      { itemId: B, count: 1 },
    ],
    outputItemId: 'food_tomato_pasta',
    description: '작은 접시 하나면 충분한 날.',
    tags: ['warm'],
    giftTags: ['healthy', 'cozy'],
    conditions: [{ kind: 'DEFAULT' }],
    hintAt: 1,
    hint: '',
  },
  {
    id: 'carrot_soup',
    name: '당근 수프',
    icon: '🍲',
    category: 'MEAL',
    rarity: 'COMMON',
    ingredients: [{ itemId: C, count: 2 }],
    outputItemId: 'food_carrot_soup',
    description: '부드럽고 포근한 주황빛 수프.',
    tags: ['warm'],
    giftTags: ['healthy'],
    conditions: [{ kind: 'DEFAULT' }],
    hintAt: 1,
    hint: '',
  },

  // ── 정원을 돌보다 알게 되는 넷 ──────────────────────
  {
    id: 'strawberry_toast',
    name: '딸기 토스트',
    icon: '🍞',
    category: 'SNACK',
    rarity: 'RARE',
    ingredients: [{ itemId: S, count: 2 }],
    outputItemId: 'food_strawberry_toast',
    description: '아침에 먹으면 하루가 조금 다르게 시작된다.',
    tags: ['sweet'],
    giftTags: ['sweet'],
    conditions: [{ kind: 'CROP_HARVESTED', cropId: 'strawberry', count: 3 }],
    hintAt: 0.3,
    hint: '딸기를 조금 더 달콤하게 먹는 방법이 있을 것 같다.',
  },
  {
    id: 'pumpkin_tart',
    name: '호박 타르트',
    icon: '🥧',
    category: 'DESSERT',
    rarity: 'RARE',
    ingredients: [{ itemId: K, count: 1 }],
    outputItemId: 'food_pumpkin_tart',
    description: '오래 기다린 것에는 단맛이 든다.',
    tags: ['sweet', 'dessert'],
    giftTags: ['sweet', 'cozy'],
    conditions: [{ kind: 'CROP_HARVESTED', cropId: 'pumpkin', count: 3 }],
    hintAt: 0.3,
    hint: '천천히 자란 호박은 달콤한 무언가가 될 수 있다.',
  },
  {
    id: 'lavender_tea',
    name: '라벤더 티',
    icon: '🫖',
    category: 'DRINK',
    rarity: 'RARE',
    ingredients: [{ itemId: L, count: 2 }],
    outputItemId: 'food_lavender_tea',
    description: '한 모금 마시면 소리가 한 겹 줄어든다.',
    tags: ['herb', 'night'],
    giftTags: ['tea', 'moon'],
    conditions: [{ kind: 'CROP_HARVESTED', cropId: 'lavender', count: 2 }],
    hintAt: 0.5,
    hint: '향긋한 꽃을 따뜻하게 우려볼 수 있을 것 같다.',
    buff: { label: '다음 마음 퀘스트 EXP +10%', category: 'MIND', expPct: 10 },
  },
  {
    id: 'mushroom_cream_soup',
    name: '버섯 크림수프',
    icon: '🍄',
    category: 'MEAL',
    rarity: 'RARE',
    ingredients: [
      { itemId: M, count: 2 },
      { itemId: P, count: 1 },
    ],
    outputItemId: 'food_mushroom_cream_soup',
    description: '어디서 났는지 모르는 버섯이 제일 맛있다.',
    tags: ['warm'],
    giftTags: ['healthy', 'cozy'],
    conditions: [{ kind: 'CROP_HARVESTED', cropId: 'tiny_mushroom', count: 2 }],
    hintAt: 0.5,
    hint: '작은 버섯과 부드러운 무언가.',
  },

  // ── 만들다 보면 알게 되는 것 ────────────────────────
  {
    id: 'picnic_lunchbox',
    name: '작은 피크닉 도시락',
    icon: '🧺',
    category: 'SPECIAL',
    rarity: 'EPIC',
    ingredients: [
      { itemId: T, count: 1 },
      { itemId: C, count: 1 },
      { itemId: P, count: 1 },
      { itemId: S, count: 1 },
    ],
    outputItemId: 'food_picnic_lunchbox',
    description: '정원에서 가져온 것들을 작은 상자에 담았다.',
    tags: ['picnic'],
    giftTags: ['nature', 'cozy'],
    conditions: [{ kind: 'RECIPES_COOKED', count: 4 }],
    hintAt: 0.5,
    hint: '이것저것 만들다 보면 한 상자에 담고 싶어진다.',
  },

  // ── 아직 만나기 어려운 것들 ────────────────────────
  {
    id: 'moon_tea',
    name: '달빛차',
    icon: '🌙',
    category: 'DRINK',
    rarity: 'EPIC',
    ingredients: [
      { itemId: 'crop_moon_herb', count: 1 },
      { itemId: L, count: 1 },
    ],
    outputItemId: 'food_moon_tea',
    description: '밤에만 향이 짙어진다.',
    tags: ['night', 'herb'],
    giftTags: ['moon', 'tea'],
    conditions: [{ kind: 'CROP_HARVESTED', cropId: 'moon_herb', count: 1 }],
    hintAt: 0.01,
    hint: '밤에 피는 허브와 향긋한 꽃.',
    hiddenUntilDiscovered: true,
  },
  {
    id: 'star_berry_cake',
    name: '별딸기 케이크',
    icon: '🍰',
    category: 'DESSERT',
    rarity: 'LEGENDARY',
    ingredients: [
      { itemId: 'crop_dream_strawberry', count: 1 },
      { itemId: S, count: 2 },
    ],
    outputItemId: 'food_star_berry_cake',
    description: '한 조각에 밤하늘이 들어 있다.',
    tags: ['sweet', 'dessert', 'night'],
    giftTags: ['sweet', 'moon'],
    conditions: [{ kind: 'CROP_HARVESTED', cropId: 'dream_strawberry', count: 1 }],
    hintAt: 0.01,
    hint: '아무도 먹어본 적 없는 딸기가 필요하다.',
    hiddenUntilDiscovered: true,
  },
  {
    id: 'dream_parfait',
    name: '꿈빛 파르페',
    icon: '🍨',
    category: 'SPECIAL',
    rarity: 'LEGENDARY',
    ingredients: [
      { itemId: 'crop_dream_strawberry', count: 1 },
      { itemId: 'crop_golden_strawberry', count: 1 },
      { itemId: 'crop_star_flower', count: 1 },
    ],
    outputItemId: 'food_dream_parfait',
    description: '정원이 줄 수 있는 것을 전부 담았다.',
    tags: ['sweet', 'dessert'],
    giftTags: ['sweet', 'collectible'],
    // 열두 가지를 다 거둬본 사람에게만
    conditions: [{ kind: 'CROPS_DISCOVERED', count: 12 }],
    hintAt: 0.5,
    hint: '정원의 가장 귀한 것들이 한자리에.',
    hiddenUntilDiscovered: true,
  },
]

const BY_ID = new Map(KITCHEN_RECIPES.map((r) => [r.id, r]))
const BY_OUTPUT = new Map(KITCHEN_RECIPES.map((r) => [r.outputItemId, r]))

export function findKitchenRecipe(id: string): KitchenRecipeDef | null {
  return BY_ID.get(id) ?? null
}

/** 이 음식이 어느 레시피에서 나오는지 */
export function recipeForFood(itemId: string): KitchenRecipeDef | null {
  return BY_OUTPUT.get(itemId) ?? null
}

/** 처음 부엌을 열 때 이미 알고 있는 것들 */
export const DEFAULT_RECIPE_IDS = KITCHEN_RECIPES.filter((r) =>
  r.conditions.some((c) => c.kind === 'DEFAULT'),
).map((r) => r.id)

/** 이 재료를 쓰는 요리들 — 도감의 작물 카드에서 "이걸로 만들 수 있는 것" 에 쓴다 */
export function recipesUsing(itemId: string): KitchenRecipeDef[] {
  return KITCHEN_RECIPES.filter((r) => r.ingredients.some((i) => i.itemId === itemId))
}
