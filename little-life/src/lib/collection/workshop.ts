import type { CollectionItemDef, RecipeDef } from '@/types'

/**
 * 작은 작업실에 늘어난 것들.
 *
 * ── 새 엔진을 만들지 않았다 ────────────────────────────
 *
 * 만들기는 이미 있다 (lib/collection/recipes.ts · spendItems → addItem).
 * 여기서 하는 건 그 표에 줄을 더하는 것뿐이다.
 * 재료도 하나도 새로 만들지 않았다 — 정원 작물과 이미 있던 재료
 * (나무조각 · 천 · 유리 · 종이 · 잎)만 쓴다.
 *
 * ── 아직 못 만드는 것도 목록에 둔다 ────────────────────
 *
 * 마지막 하나는 지금 재료로는 못 만든다. 감춰두는 대신
 * "단단한 재료가 필요하다" 는 자리로 남겨둔다 —
 * 다음에 무엇이 올지 알려주는 건 잠긴 문이 아니라 열쇠구멍이다.
 */

const C = (id: string) => `crop_${id}`

/**
 * 분류별로 방에서 차지하는 자리.
 *
 * 방 렌더러는 footprint.width 하나만 본다 (RoomCanvas.tsx — 높이는 그림
 * 비율이 정하고, 그림이 없으면 정사각형이 된다). 그래서 폭을 이미
 * 그림이 있는 물건들의 관례에 맞춘다:
 *
 *   LIGHTING · PLANT  13   (스무 개 · 스물다섯 개가 전부 13)
 *   LITTLE_THING      10   (서른다섯 개가 전부 10)
 *   WALL              16   (열다섯 개가 전부 16)
 *   FURNITURE      15~32   (중앙값 26. 작은 선반은 아래쪽인 21)
 *
 * 처음에 적었던 13/9/10/8 은 어느 분류에서든 기존 물건보다 작았다.
 * 방에 놓으면 장난감처럼 보인다. 받은 숫자는 서로의 크기 비(比)를
 * 말한 것이라, 그 순서만 지키고 실제 값은 관례에서 가져왔다.
 */
const FOOTPRINT: Partial<Record<CollectionItemDef['category'], { width: number; height: number }>> =
  {
    FURNITURE: { width: 21, height: 21 },
    LIGHTING: { width: 13, height: 17 },
    WALL: { width: 16, height: 14 },
    LITTLE_THING: { width: 10, height: 10 },
    PLANT: { width: 13, height: 17 },
    // 소품과 가구 사이. 그림이 있는 OUTDOOR 물건이 아직 없어 관례가 없다.
    OUTDOOR: { width: 18, height: 16 },
  }

function item(
  id: string,
  nameKo: string,
  icon: string,
  description: string,
  rarity: CollectionItemDef['rarity'],
  category: CollectionItemDef['category'],
): CollectionItemDef {
  return {
    id,
    nameKo,
    icon,
    category,
    subcategory: '작업실',
    rarity,
    description,
    hasPlaceableAsset: true,
    placeable: true,
    // 아직 그림이 없어서 이모지가 그 자리를 채운다. 그러니 자리 크기가
    // 곧 보이는 크기다 — 선반 하나가 벤치만 하면 방이 이상해진다.
    footprint: FOOTPRINT[category] ?? { width: 11, height: 11 },
    acquisitionSources: [{ kind: 'CRAFT' }],
    collectionSetIds: [],
    tags: ['작업실'],
    stackable: false,
    unique: true,
  }
}

/** 작업실에서 만들어지는 것들. 도감 240칸에는 안 들어간다. */
export const WORKSHOP_ITEMS: CollectionItemDef[] = [
  item('w_strawberry_shelf', '딸기 선반', '🍓', '아침에 제일 먼저 눈에 띄는 자리.', 'COMMON', 'FURNITURE'),
  item('w_herb_bundle', '허브 다발', '🌿', '거꾸로 매달아두면 향이 오래 간다.', 'COMMON', 'WALL'),
  item('w_veggie_crate', '채소 상자', '🥕', '아래 칸에 뭐가 있는지는 대체로 잊는다.', 'COMMON', 'FURNITURE'),
  item('w_lavender_cushion', '라벤더 쿠션', '💜', '누우면 향이 한 번 올라온다.', 'RARE', 'LITTLE_THING'),
  item('w_mushroom_lamp', '버섯 램프', '🍄', '갓 아래가 제일 따뜻하다.', 'RARE', 'LIGHTING'),
  item('w_garden_table', '정원 사이드 테이블', '🪵', '컵 하나 놓기 딱 좋은 크기.', 'COMMON', 'FURNITURE'),
  item('w_recipe_shelf', '레시피 선반', '📚', '적어둔 것보다 기억하는 게 더 많다.', 'RARE', 'FURNITURE'),
  item('w_picnic_set', '피크닉 세트', '🧺', '언제든 나갈 수 있게 묶어뒀다.', 'RARE', 'OUTDOOR'),
  item('w_moon_lamp', '달빛허브 램프', '🌙', '불을 끄면 그제야 보이는 빛.', 'EPIC', 'LIGHTING'),
  item('w_star_vase', '별빛꽃 화병', '✨', '물을 갈아줄 때마다 조금씩 반짝인다.', 'EPIC', 'PLANT'),
  item('w_autumn_bench', '가을 벤치', '🍂', '해가 짧아지면 여기 앉는 시간이 는다.', 'EPIC', 'FURNITURE'),
  // 아직 못 만드는 것. 이름도 그림도 만나기 전까지 감춘다.
  //
  // 손에 들어올 길이 하나도 없어야 한다 — 만들 수도, 방에 놓을 수도 없다.
  // 목록에 자리만 남겨서 다음에 무엇이 올지 알려주는 게 전부다.
  // acquisitionSources 를 비워두면 catalog 의 placementFor 를 지나서도
  // 놓을 것 목록(PLACEABLE_CATALOG)에 안 들어간다.
  {
    ...item('w_quarry_lantern', '돌등불', '🪨', '단단한 것으로 받쳐야 오래 간다.', 'EPIC', 'LIGHTING'),
    hiddenUntilDiscovered: true,
    comingSoon: true,
    acquisitionSources: [],
  },
]

/**
 * 작업실 레시피.
 *
 * 기존 RecipeDef 그대로다. 재료 목록이 아이템 id 기반이라
 * 나중에 다른 데서 오는 재료가 생겨도 이 구조를 안 바꿔도 된다.
 */
export const WORKSHOP_RECIPES: RecipeDef[] = [
  {
    id: 'w_strawberry_shelf',
    resultItemId: 'w_strawberry_shelf',
    ingredients: [
      { itemId: C('strawberry'), count: 3 },
      { itemId: 'm_wood', count: 1 },
    ],
    unlock: { kind: 'CROP_HARVESTED', cropId: 'strawberry', count: 3 },
    unlockHint: '딸기를 몇 번 거두고 나면',
    category: 'DECOR',
    hintAt: 0.3,
    hint: '딸기를 둘 자리가 있으면 좋겠다.',
  },
  {
    id: 'w_herb_bundle',
    resultItemId: 'w_herb_bundle',
    ingredients: [
      { itemId: C('basil'), count: 2 },
      { itemId: C('lavender'), count: 2 },
      { itemId: 'm_cloth', count: 1 },
    ],
    unlock: { kind: 'CROP_HARVESTED', cropId: 'lavender', count: 5 },
    unlockHint: '라벤더를 다섯 번 거두면',
    category: 'DECOR',
    hintAt: 0.4,
    hint: '향을 오래 남길 방법이 있을 것 같다.',
  },
  {
    id: 'w_veggie_crate',
    resultItemId: 'w_veggie_crate',
    ingredients: [
      { itemId: C('carrot'), count: 1 },
      { itemId: C('potato'), count: 1 },
      { itemId: C('pumpkin'), count: 1 },
      { itemId: 'm_wood', count: 2 },
    ],
    unlock: { kind: 'CROP_HARVESTED', cropId: 'potato', count: 3 },
    unlockHint: '감자를 몇 번 거두면',
    category: 'FURNITURE',
    hintAt: 0.3,
    hint: '거둔 걸 담아둘 게 필요하다.',
  },
  {
    id: 'w_lavender_cushion',
    resultItemId: 'w_lavender_cushion',
    ingredients: [
      { itemId: C('lavender'), count: 3 },
      { itemId: 'm_cloth', count: 2 },
    ],
    unlock: { kind: 'CROP_HARVESTED', cropId: 'lavender', count: 8 },
    unlockHint: '라벤더를 여덟 번 거두면',
    category: 'DECOR',
    hintAt: 0.4,
    hint: '베고 자면 어떨까 싶다.',
  },
  {
    id: 'w_mushroom_lamp',
    resultItemId: 'w_mushroom_lamp',
    ingredients: [
      { itemId: C('tiny_mushroom'), count: 3 },
      { itemId: 'm_glass', count: 1 },
    ],
    unlock: { kind: 'CROP_HARVESTED', cropId: 'tiny_mushroom', count: 5 },
    unlockHint: '작은 버섯을 다섯 번 거두면',
    category: 'DECOR',
    hintAt: 0.2,
    hint: '작은 버섯에서 은은한 빛이 난다.',
  },
  {
    id: 'w_garden_table',
    resultItemId: 'w_garden_table',
    ingredients: [
      { itemId: 'm_wood', count: 3 },
      { itemId: C('basil'), count: 1 },
    ],
    unlock: { kind: 'CROP_HARVESTED', cropId: 'basil', count: 3 },
    unlockHint: '바질을 몇 번 거두면',
    category: 'FURNITURE',
    hintAt: 0.3,
    hint: '정원 옆에 둘 게 하나 있으면 좋겠다.',
  },
  {
    id: 'w_recipe_shelf',
    resultItemId: 'w_recipe_shelf',
    ingredients: [
      { itemId: 'm_paper', count: 3 },
      { itemId: 'm_wood', count: 2 },
    ],
    unlock: { kind: 'RECIPES_COOKED', count: 5 },
    unlockHint: '요리를 다섯 가지 만들어보면',
    category: 'FURNITURE',
    hintAt: 0.4,
    hint: '적어둘 데가 있으면 좋겠다.',
  },
  {
    id: 'w_picnic_set',
    resultItemId: 'w_picnic_set',
    ingredients: [
      { itemId: C('strawberry'), count: 2 },
      { itemId: 'm_cloth', count: 3 },
    ],
    unlock: { kind: 'RECIPES_COOKED', count: 3 },
    unlockHint: '요리를 세 가지 만들어보면',
    category: 'DECOR',
    hintAt: 0.3,
    hint: '싸 들고 나갈 것을 묶어두고 싶다.',
  },
  {
    id: 'w_autumn_bench',
    resultItemId: 'w_autumn_bench',
    ingredients: [
      { itemId: C('pumpkin'), count: 2 },
      { itemId: C('tiny_mushroom'), count: 2 },
      { itemId: 'm_wood', count: 3 },
    ],
    unlock: { kind: 'CROP_HARVESTED', cropId: 'pumpkin', count: 3 },
    unlockHint: '호박을 세 번 거두면',
    category: 'FURNITURE',
    hintAt: 0.3,
    hint: '앉아서 정원을 볼 자리가 있으면.',
  },
  {
    id: 'w_moon_lamp',
    resultItemId: 'w_moon_lamp',
    ingredients: [
      { itemId: C('moon_herb'), count: 2 },
      { itemId: C('lavender'), count: 1 },
      { itemId: 'm_glass', count: 2 },
    ],
    unlock: { kind: 'CROP_HARVESTED', cropId: 'moon_herb', count: 1 },
    unlockHint: '달빛허브를 만나면',
    category: 'DECOR',
    hintAt: 1,
    hint: '밤에 피는 것을 병에 담아두면 어떨까.',
  },
  {
    id: 'w_star_vase',
    resultItemId: 'w_star_vase',
    ingredients: [
      { itemId: C('star_flower'), count: 2 },
      { itemId: 'm_glass', count: 2 },
    ],
    unlock: { kind: 'CROP_HARVESTED', cropId: 'star_flower', count: 1 },
    unlockHint: '별빛꽃을 만나면',
    category: 'DECOR',
    hintAt: 1,
    hint: '꺾기는 아깝고 담아두고는 싶다.',
  },
]

/**
 * 아직 못 만드는 것.
 *
 * 정원에서 나는 것만으로는 안 되는 게 하나 있다.
 * 감춰두는 대신 자리를 남겨서, 다음에 무엇이 올지 알려준다.
 */
export const WORKSHOP_COMING: RecipeDef = {
  id: 'w_quarry_lantern',
  resultItemId: 'w_quarry_lantern',
  ingredients: [{ itemId: 'm_glass', count: 2 }],
  unlock: { kind: 'COMING_SOON' },
  unlockHint: '아직',
  category: 'SPECIAL',
  hintAt: 0,
  hint: '작업대에 쓸 단단한 재료가 조금 부족하다.',
}
