import type {
  AppState,
  Category,
  CraftStage,
  ItemKnowledge,
  CollectionItemDef,
  CollectionSetDef,
  CollectionState,
  HomeEffectId,
  NpcId,
  RecipeDef,
  TrophyDef,
} from '@/types'
import { CATALOG, catalogTotal, findCollectionItem } from './catalog'
import { COLLECTION_SETS } from './sets'
import { RECIPES } from './recipes'
import { TROPHIES } from './trophies'
import { DEFAULT_ROOM_ID } from './rooms'

/**
 * 지금 무엇을 가졌고 무엇이 열렸는지.
 *
 * 여기 있는 건 거의 다 "계산" 이다. 완성한 세트도, 열린 방 효과도,
 * 아는 레시피도 저장하지 않는다. 가진 것에서 매번 다시 구한다 —
 * 그래야 나중에 세트 내용을 바꿔도 저장된 값과 어긋나지 않는다.
 *
 * 저장하는 건 딱 두 가지다: 무엇을 발견했는지, 몇 개 가졌는지.
 */

export function emptyCollection(): CollectionState {
  return {
    discovered: {},
    owned: {},
    wishlist: [],
    rooms: {},
    roomEffects: {},
    currentRoomId: DEFAULT_ROOM_ID,
    purchases: {},
    seen: {},
    shopVisits: {},
    claimedDeliveries: [],
    discoveredRecipeIds: [],
    claimedMilestones: [],
    claimedSetIds: [],
    earnedTrophyIds: [],
  }
}

export function ownedCount(c: CollectionState, itemId: string): number {
  return c.owned[itemId] ?? 0
}

export function isDiscovered(c: CollectionState, itemId: string): boolean {
  return c.discovered[itemId] !== undefined
}

/** 가게에서 보기만 했는지 */
export function isSeen(c: CollectionState, itemId: string): boolean {
  return c.seen[itemId] !== undefined
}

/**
 * 이 물건을 얼마나 아는지.
 *
 * 가진 것이 본 것을 덮는다 — 손에 넣었으면 그건 발견이지 목격이 아니다.
 */
export function knowledgeOf(c: CollectionState, itemId: string): ItemKnowledge {
  if (isDiscovered(c, itemId)) return 'DISCOVERED'
  if (isSeen(c, itemId)) return 'SEEN'
  return 'UNKNOWN'
}

/**
 * 진열대에서 본 것으로 적어둔다.
 *
 * 이미 발견한 것은 적지 않는다. 도감 수는 건드리지 않는다 —
 * 보기만 한 것으로 도감이 차면 그건 모은 게 아니다.
 */
export function markSeen(
  c: CollectionState,
  itemIds: string[],
  now: Date = new Date(),
): CollectionState {
  const fresh = itemIds.filter((id) => !isDiscovered(c, id) && !isSeen(c, id))
  if (fresh.length === 0) return c

  const seen = { ...c.seen }
  for (const id of fresh) seen[id] = now.toISOString()
  return { ...c, seen }
}

/**
 * 이 가게에 오늘 들렀다고 적어둔다.
 *
 * 오늘 아직 안 간 가게에만 표시를 붙이려고 쓴다.
 * 안 갔다고 뭐라 하지 않는다 — 표시가 없어질 뿐이다.
 */
export function markShopVisited(
  c: CollectionState,
  shopId: string,
  dayKey: string,
): CollectionState {
  if (c.shopVisits[shopId] === dayKey) return c
  return { ...c, shopVisits: { ...c.shopVisits, [shopId]: dayKey } }
}

/** 오늘 이 가게에 아직 안 갔는지 */
export function hasFreshStock(c: CollectionState, shopId: string, dayKey: string): boolean {
  return c.shopVisits[shopId] !== dayKey
}

/**
 * 하나 얻는다.
 *
 * 처음이면 발견으로 기록하고 알려준다. 두 번째부터는 조용히 개수만 는다 —
 * 같은 연출을 두 번 보여주면 세 번째부터는 아무 느낌이 없다.
 */
export function addItem(
  c: CollectionState,
  itemId: string,
  now: Date = new Date(),
): { collection: CollectionState; isNew: boolean } {
  const def = findCollectionItem(itemId)
  if (!def) return { collection: c, isNew: false }

  const isNew = !isDiscovered(c, itemId)
  const already = ownedCount(c, itemId)
  // 하나만 가질 수 있는 물건은 두 개가 되지 않는다
  const next = def.unique ? Math.min(1, already + 1) : already + 1

  return {
    collection: {
      ...c,
      discovered: isNew ? { ...c.discovered, [itemId]: now.toISOString() } : c.discovered,
      owned: { ...c.owned, [itemId]: next },
    },
    isNew,
  }
}

/**
 * 하나 되돌린다.
 *
 * 그때 처음 발견한 것이었으면 발견 기록까지 지운다.
 * 안 그러면 완료·되돌리기를 반복해서 도감만 채울 수 있다.
 */
export function removeItem(c: CollectionState, itemId: string, wasNew: boolean): CollectionState {
  const left = Math.max(0, ownedCount(c, itemId) - 1)
  const owned = { ...c.owned }
  if (left === 0) delete owned[itemId]
  else owned[itemId] = left

  const discovered = { ...c.discovered }
  if (wasNew) delete discovered[itemId]

  // 방에 놓아둔 것도 같이 거둔다 (가진 것보다 많이 놓여 있을 수 없다)
  const rooms = trimPlacements({ ...c, owned }, c.rooms)

  return { ...c, owned, discovered, rooms }
}

/** 재료를 쓴다. 없으면 그대로 돌려준다. */
export function spendItems(
  c: CollectionState,
  cost: Array<{ itemId: string; count: number }>,
): CollectionState | null {
  for (const need of cost) {
    if (ownedCount(c, need.itemId) < need.count) return null
  }

  const owned = { ...c.owned }
  for (const need of cost) {
    const left = owned[need.itemId] - need.count
    if (left <= 0) delete owned[need.itemId]
    else owned[need.itemId] = left
  }
  // 발견 기록은 지우지 않는다. 재료로 썼다고 만난 적이 없어지는 건 아니다.
  return trimPlaced({ ...c, owned })
}

/** 가진 것보다 많이 놓여 있으면 뒤에서부터 거둔다 */
function trimPlaced(c: CollectionState): CollectionState {
  return { ...c, rooms: trimPlacements(c, c.rooms) }
}

function trimPlacements(c: CollectionState, rooms: CollectionState['rooms']): CollectionState['rooms'] {
  const used: Record<string, number> = {}
  const out: CollectionState['rooms'] = {}
  let changed = false

  for (const [roomId, placed] of Object.entries(rooms)) {
    const kept = placed.filter((p) => {
      const next = (used[p.itemId] ?? 0) + 1
      if (next > ownedCount(c, p.itemId)) {
        changed = true
        return false
      }
      used[p.itemId] = next
      return true
    })
    out[roomId] = kept
  }
  return changed ? out : rooms
}

// ── 도감 진행 ───────────────────────────────────────────

/** 240개 중 몇 개를 만났는지 */
export function discoveredCount(c: CollectionState): number {
  let n = 0
  for (const item of CATALOG) {
    if (isDiscovered(c, item.id)) n += 1
  }
  return n
}

export function collectionProgress(c: CollectionState): { found: number; total: number } {
  return { found: discoveredCount(c), total: catalogTotal(c.discovered) }
}

// ── 세트 ────────────────────────────────────────────────

export interface SetProgress {
  have: number
  need: number
  complete: boolean
}

/**
 * 세트는 "가지고 있는지" 로 센다. 발견만 하고 안 가진 건 아직 아니다.
 * 다만 트로피처럼 다시 얻을 수 없는 것은 발견만으로도 인정한다.
 */
export function setProgress(set: CollectionSetDef, c: CollectionState): SetProgress {
  if (set.anyOf) {
    const have = CATALOG.filter(
      (i) => i.category === set.anyOf!.category && ownedCount(c, i.id) > 0,
    ).length
    return { have, need: set.anyOf.count, complete: have >= set.anyOf.count }
  }

  const have = set.itemIds.filter((id) => ownedCount(c, id) > 0).length
  return { have, need: set.itemIds.length, complete: have === set.itemIds.length }
}

export function completedSetIds(c: CollectionState): string[] {
  return COLLECTION_SETS.filter((s) => setProgress(s, c).complete).map((s) => s.id)
}

/** 완성했는데 아직 보상을 안 받은 세트 */
export function unclaimedSets(c: CollectionState): CollectionSetDef[] {
  return COLLECTION_SETS.filter(
    (s) => setProgress(s, c).complete && !c.claimedSetIds.includes(s.id),
  )
}

/**
 * 중간까지 왔는데 아직 그 몫을 안 받은 세트.
 *
 * 완성 보상과 따로 센다. `${id}:partial` 로 적어둬서
 * 저장 구조를 새로 늘리지 않았다.
 */
export function unclaimedPartials(c: CollectionState): CollectionSetDef[] {
  return COLLECTION_SETS.filter((s) => {
    if (s.partialAt === undefined || !s.partialRewards) return false
    if (c.claimedSetIds.includes(partialKey(s.id))) return false
    return setProgress(s, c).have >= s.partialAt
  })
}

/**
 * 도감에 이 세트를 보여줄지.
 *
 * 아직 못 만난 것으로만 채워지는 세트는 감춘다 — 별빛꽃을 본 적도 없는데
 * "달빛 정원 0/4" 가 목록에 떠 있으면 그건 목표가 아니라 못 가진 것의 자리다.
 * 감추는 조건도 저장하지 않는다. 거둔 기록에서 매번 다시 센다.
 */
export function isSetVisible(set: CollectionSetDef, state: AppState): boolean {
  if (!set.hiddenUntil) return true
  if (set.hiddenUntil.kind === 'CROP_FOUND') {
    return set.hiddenUntil.cropIds.some((id) => (state.garden.harvestedCropCounts[id] ?? 0) > 0)
  }
  return true
}

export function visibleSets(state: AppState): CollectionSetDef[] {
  return COLLECTION_SETS.filter((s) => isSetVisible(s, state))
}

export function partialKey(setId: string): string {
  return `${setId}:partial`
}

/** 지금 방에 걸 수 있는 공기 */
export function unlockedEffectIds(c: CollectionState): HomeEffectId[] {
  const done = new Set(completedSetIds(c))
  const out: HomeEffectId[] = []

  for (const set of COLLECTION_SETS) {
    if (!done.has(set.id)) continue
    for (const reward of set.rewards) {
      if (reward.kind === 'ROOM_EFFECT') out.push(reward.effectId)
    }
  }
  return out
}

/** 완성한 세트에서 받은 칭호 */
export function unlockedTitles(c: CollectionState): string[] {
  const done = new Set(completedSetIds(c))
  const out: string[] = []
  for (const set of COLLECTION_SETS) {
    if (!done.has(set.id)) continue
    for (const reward of set.rewards) {
      if (reward.kind === 'TITLE') out.push(reward.title)
    }
  }
  return out
}

// ── 레시피 ──────────────────────────────────────────────

export interface RecipeContext {
  /** 정원에서 무엇을 몇 번 거뒀는지 */
  harvestedCropCounts?: Record<string, number>
  /** 서로 다른 요리를 몇 가지 만들어봤는지 */
  cookedKinds?: number
  /** 채석장에서 몇 가지 광물을 만나봤는지 */
  mineralKinds?: number
  level: number
  discoveredCount: number
  completedSetIds: string[]
  friendship: Record<string, number>
  /** 사람이나 비밀로 따로 알게 된 것 */
  discoveredRecipeIds: string[]
}

/**
 * 조건에 지금 얼마나 왔는지 (0~1).
 *
 * 알거나 모르거나로만 두면 낌새를 흘릴 수가 없다.
 * 예전부터 있던 조건은 0 아니면 1 로 나온다 — 그건 그대로다.
 */
export function recipeProgress(recipe: RecipeDef, ctx: RecipeContext): number {
  if (ctx.discoveredRecipeIds.includes(recipe.id)) return 1

  switch (recipe.unlock.kind) {
    case 'DEFAULT':
      return 1
    case 'LEVEL':
      return Math.min(1, ctx.level / recipe.unlock.level)
    case 'COLLECTION':
      return Math.min(1, ctx.discoveredCount / recipe.unlock.count)
    case 'SET':
      return ctx.completedSetIds.includes(recipe.unlock.setId) ? 1 : 0
    case 'NPC':
      return Math.min(
        1,
        (ctx.friendship[recipe.unlock.npcId as NpcId] ?? 0) / recipe.unlock.friendship,
      )
    case 'CROP_HARVESTED':
      return Math.min(
        1,
        (ctx.harvestedCropCounts?.[recipe.unlock.cropId] ?? 0) / recipe.unlock.count,
      )
    case 'RECIPES_COOKED':
      return Math.min(1, (ctx.cookedKinds ?? 0) / recipe.unlock.count)
    case 'MINERALS_FOUND':
      return Math.min(1, (ctx.mineralKinds ?? 0) / recipe.unlock.count)
    case 'SECRET':
    case 'COMING_SOON':
      return 0
    default:
      return 0
  }
}

/**
 * 지금 상태에서 레시피 문맥을 만든다.
 *
 * 한 군데서만 만든다. 화면과 만들기 판정이 서로 다른 문맥을 쓰면
 * "보이는데 안 눌리는" 것이 생긴다 — 실제로 그랬다.
 */
export function recipeContextOf(state: AppState): RecipeContext {
  return {
    harvestedCropCounts: state.garden.harvestedCropCounts,
    cookedKinds: Object.values(state.kitchen.cookedRecipeCounts).filter((n) => n > 0).length,
    // 채석장 기록에서 센다. 정원·부엌과 같은 방식이다 — 따로 적어두지 않는다.
    mineralKinds: Object.values(state.quarry.foundMineralCounts).filter((n) => n > 0).length,
    level: state.user.level,
    discoveredCount: discoveredCount(state.collection),
    completedSetIds: completedSetIds(state.collection),
    friendship: Object.fromEntries(
      Object.entries(state.npcs).map(([id, npc]) => [id, npc.friendship]),
    ),
    discoveredRecipeIds: state.collection.discoveredRecipeIds,
  }
}

export function isRecipeKnown(recipe: RecipeDef, ctx: RecipeContext): boolean {
  if (recipe.unlock.kind === 'COMING_SOON') return false
  return recipeProgress(recipe, ctx) >= 1
}

/**
 * 이 레시피가 어디까지 왔는지.
 *
 * 낌새(hintAt)를 안 적은 레시피는 낌새 단계가 없다 —
 * 예전부터 있던 것들은 알거나 모르거나 둘 중 하나다.
 */
export function craftStage(recipe: RecipeDef, ctx: RecipeContext): CraftStage {
  if (recipe.unlock.kind === 'COMING_SOON') return 'COMING_SOON'
  const progress = recipeProgress(recipe, ctx)
  if (progress >= 1) return 'KNOWN'
  if (recipe.hintAt !== undefined && progress >= recipe.hintAt) return 'HINTED'
  return 'UNKNOWN'
}

export function knownRecipes(ctx: RecipeContext): RecipeDef[] {
  return RECIPES.filter((r) => isRecipeKnown(r, ctx))
}

/** 아직 모르는 레시피가 몇 개 남았는지 — 목록은 보여주지 않는다 */
export function unknownRecipeCount(ctx: RecipeContext): number {
  return RECIPES.length - knownRecipes(ctx).length
}

/**
 * 만들어본 가짓수.
 *
 * 만든 횟수를 따로 저장하지 않는다. 만들어서 손에 넣은 것은 발견으로
 * 남고, 발견은 지워지지 않는다 — 그러니 "만들기로만 얻을 수 있는 것을
 * 몇 가지 발견했는지" 가 곧 몇 가지 만들어봤는지다.
 *
 * 가게에서도 파는 물건은 세지 않는다. 사서 얻은 것을 만든 것으로
 * 쳐주면 작업실을 한 번도 안 연 사람이 작업 트로피를 받는다.
 */
function craftOnly(recipe: RecipeDef): boolean {
  const def = findCollectionItem(recipe.resultItemId)
  if (!def) return false
  return def.acquisitionSources.every((src) => src.kind === 'CRAFT')
}

export function craftedKinds(c: CollectionState): number {
  return RECIPES.filter((r) => craftOnly(r) && isDiscovered(c, r.resultItemId)).length
}

/** 그중 정원에서 온 재료로 만드는 것 (작업실에 늘어난 열둘) */
export function gardenCraftedKinds(c: CollectionState): number {
  return RECIPES.filter(
    (r) => r.id.startsWith('w_') && craftOnly(r) && isDiscovered(c, r.resultItemId),
  ).length
}

export function canCraft(recipe: RecipeDef, c: CollectionState): boolean {
  return recipe.ingredients.every((i) => ownedCount(c, i.itemId) >= i.count)
}

// ── 트로피 ──────────────────────────────────────────────

export interface TrophyContext {
  totalCompletedQuests: number
  categoryCompleted: Record<Category, number>
  bossClears: number
  completedSetIds: string[]
  discoveredCount: number
  /** 정원을 못 찾았으면 0 */
  gardenLevel: number
  /** 만들기로만 얻는 것을 몇 가지 만들어봤는지 */
  craftedKinds: number
}

export function trophyEarned(trophy: TrophyDef, ctx: TrophyContext): boolean {
  switch (trophy.condition.kind) {
    case 'TOTAL_QUESTS':
      return ctx.totalCompletedQuests >= trophy.condition.count
    case 'CATEGORY_QUESTS':
      return (ctx.categoryCompleted[trophy.condition.category] ?? 0) >= trophy.condition.count
    case 'BOSS_CLEARS':
      return ctx.bossClears >= trophy.condition.count
    case 'COLLECTION':
      return ctx.discoveredCount >= trophy.condition.count
    case 'SET_COMPLETE':
      return ctx.completedSetIds.includes(trophy.condition.setId)
    case 'GARDEN_LEVEL':
      return ctx.gardenLevel >= trophy.condition.level
    case 'CRAFTED_KINDS':
      return ctx.craftedKinds >= trophy.condition.count
    default:
      return false
  }
}

/** 이번에 새로 받을 트로피 */
export function newTrophies(c: CollectionState, ctx: TrophyContext): TrophyDef[] {
  return TROPHIES.filter((t) => !c.earnedTrophyIds.includes(t.id) && trophyEarned(t, ctx))
}

// ── 도감 보상 ───────────────────────────────────────────

export interface Milestone {
  count: number
  coins: number
  message: string
}

/** 도감을 채우다 만나는 자리들 */
export const MILESTONES: Milestone[] = [
  { count: 10, coins: 100, message: '열 개. 방이 조금 달라 보이기 시작한다.' },
  { count: 25, coins: 200, message: '스물다섯 개. 이제 뭘 찾는지 알겠다.' },
  { count: 50, coins: 300, message: '쉰 개. 절반의 절반.' },
  { count: 75, coins: 400, message: '일흔다섯 개.' },
  { count: 100, coins: 600, message: '백 개. 세어보니 그렇게 됐다.' },
  { count: 150, coins: 900, message: '백쉰 개. 남은 게 더 적어졌다.' },
  { count: 200, coins: 1200, message: '이백 개. 이제 못 찾은 것들이 눈에 띈다.' },
  { count: 240, coins: 2000, message: '전부. 하나도 안 빼고.' },
]

export function newMilestones(c: CollectionState): Milestone[] {
  const found = discoveredCount(c)
  return MILESTONES.filter((m) => found >= m.count && !c.claimedMilestones.includes(m.count))
}

// ── 힌트 ────────────────────────────────────────────────

/**
 * 아직 못 만난 물건에 붙는 한 줄.
 * "어디선가" 로 끝나면 힌트가 아니다. 갈 곳을 말해준다.
 */
export function acquisitionHint(item: CollectionItemDef, shopName: (id: string) => string): string {
  const first = item.acquisitionSources[0]
  if (!first) return '어디서 만날 수 있을까.'

  switch (first.kind) {
    case 'SHOP':
      return `${shopName(first.shopId)}에서 팔아.`
    case 'CRAFT':
      return '작은 작업실에서 만들 수 있어.'
    case 'QUEST':
      return first.category
        ? `${CATEGORY_KO[first.category]} 퀘스트를 하다 보면 나와.`
        : '퀘스트를 하다 보면 나와.'
    case 'NPC':
      return '도시 사람 중 누군가가 준대.'
    case 'BOSS':
      return '큰 걸 하나 넘고 나면.'
    case 'EVENT':
      return '도시에 무슨 일이 있는 날에.'
    case 'REPUTATION':
      return '그 동네에서 얼굴이 알려지면.'
    case 'MILESTONE':
      return `도감을 ${first.count}개 채우면.`
    case 'SET':
      return '어떤 세트를 완성하면.'
    case 'TROPHY':
      return '현실에서 충분히 쌓이면.'
    case 'GARDEN':
      return '작은 정원에서 거둘 수 있어.'
    case 'QUARRY':
      return '오래된 채석장에서 캘 수 있어.'
    case 'SECRET':
      return first.hint ?? '언제 만나게 될지는 아직.'
    default:
      return '어디서 만날 수 있을까.'
  }
}

const CATEGORY_KO: Record<Category, string> = {
  LIFE: '생활',
  WORK: '일',
  BODY: '몸',
  PLAY: '놀이',
  MIND: '마음',
  HEART: '관계',
}
