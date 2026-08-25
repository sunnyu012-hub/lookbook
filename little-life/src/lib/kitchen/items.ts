import type { CollectionItemDef } from '@/types'
import { KITCHEN_RECIPES } from './recipes'

/**
 * 부엌에서 나오는 것들 — 만든 음식과, 세트를 채우면 방에 남는 것.
 *
 * 음식은 레시피 표에서 만들어낸다. 같은 사실을 두 군데 적지 않는다.
 *
 * 도감의 240칸에는 들어가지 않는다. 작물과 같은 이유다 —
 * 이미 채워둔 사람의 "184 / 240" 이 어느 날 늘어나면
 * 그건 새 콘텐츠가 아니라 뒷걸음질처럼 보인다.
 */

function food(id: string, nameKo: string, icon: string, description: string): CollectionItemDef {
  return {
    id,
    nameKo,
    icon,
    category: 'FOOD',
    subcategory: '요리',
    rarity: 'COMMON',
    description,
    hasPlaceableAsset: false,
    // 만든 음식은 방에 놓는 물건이 아니다. 먹거나 · 주거나 · 도감에 남는다.
    placeable: false,
    placement: 'MATERIAL_ONLY',
    acquisitionSources: [{ kind: 'CRAFT' }],
    collectionSetIds: [],
    tags: [],
    stackable: true,
    unique: false,
  }
}

/** 만든 음식 열두 가지 */
export const FOOD_ITEMS: CollectionItemDef[] = KITCHEN_RECIPES.map((recipe) => ({
  ...food(recipe.outputItemId, recipe.name, recipe.icon, recipe.description),
  rarity: recipe.rarity,
  tags: ['food', ...recipe.tags],
  ...(recipe.hiddenUntilDiscovered ? { hiddenUntilDiscovered: true } : {}),
}))

/**
 * 레시피 세트를 채우면 방에 하나씩 남는다.
 *
 * 능력치는 하나도 안 붙는다. 트로피와 같은 규칙이다 —
 * 붙이는 순간 "효율 때문에 놓는 것" 이 되고, 예쁜 걸 놓을 자리가 없어진다.
 */
function decor(id: string, nameKo: string, icon: string, description: string): CollectionItemDef {
  return {
    id,
    nameKo,
    icon,
    category: 'KITCHEN',
    subcategory: '부엌',
    rarity: 'EPIC',
    description,
    hasPlaceableAsset: true,
    placeable: true,
    footprint: { width: 11, height: 11 },
    acquisitionSources: [{ kind: 'SET', setId: 'kitchen' }],
    collectionSetIds: [],
    tags: ['부엌'],
    stackable: false,
    unique: true,
  }
}

export const KITCHEN_DECOR: CollectionItemDef[] = [
  decor('k_soup_pot', '포근한 수프 냄비', '🍲', '뚜껑을 열면 김이 한 번 올라온다.'),
  decor('k_dessert_tray', '디저트 트레이', '🍰', '오후 세 시쯤이 제일 잘 어울린다.'),
  decor('k_picnic_basket', '피크닉 바구니', '🧺', '언제든 나갈 수 있게 현관 옆에.'),
  decor('k_recipe_book', '작은 레시피 노트', '📔', '글씨가 점점 흘려 쓴 것으로 바뀐다.'),
]

export const KITCHEN_ITEMS: CollectionItemDef[] = [...FOOD_ITEMS, ...KITCHEN_DECOR]
