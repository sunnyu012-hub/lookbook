import type { CropId } from './garden'
import type { RecipeIngredient } from './collection'
import type { Rarity } from './rpg'
import type { GiftTag } from './city'

/**
 * 작은 부엌.
 *
 * 정원에서 거둔 것이 여기서 다른 이야기가 된다.
 * 현실에서 요리를 하라는 시스템이 아니다 — 게임 안의 만들기 콘텐츠다.
 *
 * 이 층에는 다음이 없고, 앞으로도 넣지 않는다:
 * 매일 요리하는 숙제 · 음식이 상함 · 보관 시간 · 안 하면 손해 ·
 * 조리 미니게임 · 칼로리.
 *
 * 만들기 자체는 새로 만들지 않았다. 작은 작업실이 쓰는 길을 그대로 쓴다 —
 * 재료를 빼고(spendItems) 결과를 넣는다(addItem). 계산이 두 벌이 되면
 * 어느 쪽이 맞는지 아무도 모르게 된다.
 */

// ── 분류 ────────────────────────────────────────────────

export const RECIPE_CATEGORIES = ['DRINK', 'MEAL', 'DESSERT', 'SNACK', 'SPECIAL'] as const
export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number]

// ── 레시피를 알게 되는 조건 ─────────────────────────────

/**
 * 전부 이미 쌓여 있는 기록에서 센다.
 * 정원에서 무엇을 몇 번 거뒀는지, 무엇을 몇 가지 만들어봤는지.
 *
 * 그래서 "레시피를 알고 있다" 를 따로 저장하지 않는다 —
 * 저장하면 나중에 조건을 바꿨을 때 이미 열린 것과 어긋난다.
 */
export type RecipeCondition =
  /** 처음부터 안다 */
  | { kind: 'DEFAULT' }
  /** 이 작물을 몇 번 거뒀는지 */
  | { kind: 'CROP_HARVESTED'; cropId: CropId; count: number }
  /** 서로 다른 작물을 몇 가지 거뒀는지 */
  | { kind: 'CROPS_DISCOVERED'; count: number }
  /** 서로 다른 요리를 몇 가지 만들어봤는지 */
  | { kind: 'RECIPES_COOKED'; count: number }

/**
 * 이 레시피가 나에게 어디까지 왔는지.
 *
 * UNKNOWN    — ??? 로 남는다
 * HINTED     — 낌새가 있다. 한 줄짜리 힌트만.
 * DISCOVERED — 이름 · 재료 · 만들기까지 보인다.
 */
export type RecipeStage = 'UNKNOWN' | 'HINTED' | 'DISCOVERED'

export interface KitchenRecipeDef {
  id: string
  name: string
  /** 이모지 한 글자. 그림이 들어오기 전까지 자리를 지킨다. */
  icon: string
  category: RecipeCategory
  rarity: Rarity
  /** 재료. 작은 작업실과 같은 모양이라 같은 함수로 셈한다. */
  ingredients: RecipeIngredient[]
  /** 만들어지는 음식 아이템 */
  outputItemId: string
  /** 한 줄 */
  description: string
  tags: string[]
  /** 도시 사람에게 줄 때 어떤 결의 음식인지 */
  giftTags: GiftTag[]
  /** 전부 만족하면 알게 된다 */
  conditions: RecipeCondition[]
  /** 이 비율만큼 왔으면 낌새를 흘린다 (0~1). 1 이면 낌새 없이 바로 열린다. */
  hintAt: number
  /** 알기 전에 흘리는 말 */
  hint: string
  /** 알기 전에는 이름도 감춘다 */
  hiddenUntilDiscovered?: boolean
  /**
   * 다음 퀘스트 하나에 아주 작게 붙는 것.
   *
   * 없어도 되는 값이다. "이걸 안 먹으면 손해" 가 되면 안 된다 —
   * 모습에 능력치를 안 붙인 것과 같은 이유다.
   */
  buff?: KitchenBuff
}

/** 음식 하나가 주는 아주 작은 보너스 */
export interface KitchenBuff {
  /** 화면에 보여줄 한 줄 */
  label: string
  /** null 이면 아무 퀘스트에나 */
  category: import('./index').Category | null
  expPct: number
}

// ── 저장되는 것 ─────────────────────────────────────────

/**
 * 부엌에서 저장하는 전부.
 *
 * 무엇을 알고 있는지는 여기 없다. 정원 기록에서 매번 다시 센다.
 * 저장하는 건 "무엇을 몇 번 만들었는지" 와 "무엇에 하트를 눌렀는지" 뿐이다.
 */
export interface KitchenState {
  /** 부엌을 연 시각. 아직 못 열었으면 null. */
  unlockedAt: string | null
  /** 첫 안내를 본 시각 */
  tutorialSeenAt: string | null
  /** recipeId → 만든 횟수 */
  cookedRecipeCounts: Record<string, number>
  /** 하트를 누른 것. 보너스는 하나도 없다 — 목록 맨 위로 올라올 뿐이다. */
  favoriteRecipeIds: string[]
}

// ── 화면에서 보는 모양 ──────────────────────────────────

export interface RecipeIngredientView {
  itemId: string
  /** 이름. 못 찾으면 물음표. */
  name: string
  icon: string
  need: number
  have: number
}

export interface KitchenRecipeView {
  def: KitchenRecipeDef
  stage: RecipeStage
  /** 0~1 */
  progress: number
  ingredients: RecipeIngredientView[]
  /** 지금 만들 수 있는지 */
  canCook: boolean
  /** 모자란 재료 가짓수. 정렬에 쓴다. */
  missingKinds: number
  /** 지금까지 만든 횟수 */
  cooked: number
  favorite: boolean
}

export interface KitchenView {
  unlocked: boolean
  recipes: KitchenRecipeView[]
  /** 알게 된 레시피 수 */
  discovered: number
  total: number
  totalCooked: number
  /** 지금 만들 수 있는 것 중 하나. 없으면 null. */
  suggestion: KitchenRecipeView | null
}
