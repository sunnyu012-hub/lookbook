import type {
  DiscoveryState,
  GardenPlot,
  GardenState,
  KitchenState,
  ActiveBuff,
  QuestUsageProfile,
  RecommendSettings,
  UsageProfiles,
  AppState,
  AreaId,
  Battle,
  Category,
  CategoryStats,
  ClassId,
  CollectionState,
  EquippedItems,
  InventoryEntry,
  HomeEffectId,
  NpcStates,
  PlacedItem,
  Rarity,
  Reputation,
  RoomId,
  SkinId,
  Stats,
} from '@/types'
import {
  AREA_IDS,
  CATEGORIES,
  CLASS_IDS,
  COLLECTION_SHOP_IDS,
  EQUIP_SLOTS,
  HOME_EFFECT_IDS,
  RARITIES,
  STAT_KEYS,
} from '@/types'
import { findBattleDef, findItem } from '@/lib/rpg/content'
import { NPCS, findNpc } from '@/lib/city/npcs'
import { findSkill, availableSkillPoints } from '@/lib/city/skills'
import { emptyNpcState } from '@/lib/city/friendship'
import { emptyReputation } from '@/lib/city/reputation'
import { DIFFICULTIES } from '@/types'
import { normalizeTitle } from '@/lib/suggest'
import {
  backfillProfiles,
  emptyBandCounts,
  emptyDayCounts,
  RECENT_DATES_KEPT,
} from '@/lib/library/usage'
import { findCollectionItem } from '@/lib/collection/catalog'
import { emptyCollection } from '@/lib/collection/progress'
import { emptyDiscovery } from '@/lib/discovery/derive'
import { DEFAULT_SKIN_ID, defaultOwnedSkinIds } from '@/lib/character/skins'
import { MAX_PLOTS, emptyGarden, emptyPlots } from '@/lib/garden/derive'
import { MAX_ADVENTURE_ENERGY } from '@/lib/garden/quest'
import { findCrop } from '@/lib/garden/crops'
import { emptyKitchen } from '@/lib/kitchen/derive'
import { findKitchenRecipe } from '@/lib/kitchen/recipes'
import { AUTO_COLLECTION_IDS, COMPANION_IDS, SECRET_IDS, SKIN_IDS } from '@/types'
import { findChapter } from '@/lib/discovery/stories'
import { findRoom } from '@/lib/collection/rooms'

/**
 * 저장된 데이터를 지금 버전으로 끌어올린다.
 *
 * 원칙 하나: 기존 기록은 절대 지우지 않는다.
 * 없는 항목만 기본값으로 채우고, 있는 값은 손대지 않는다.
 */

export const STATE_VERSION = 13

/** 구매 기록을 며칠치까지 남길지 */
export const PURCHASE_DAYS_KEPT = 7

/** 받은 특별 배송을 몇 개까지 기억할지 */
export const DELIVERIES_KEPT = 60

export function defaultStats(): Stats {
  return STAT_KEYS.reduce((acc, key) => {
    acc[key] = 1
    return acc
  }, {} as Stats)
}

export function emptyEquipped(): EquippedItems {
  return EQUIP_SLOTS.reduce((acc, slot) => {
    acc[slot] = null
    return acc
  }, {} as EquippedItems)
}

function numberOr(value: unknown, fallback: number, min = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.max(min, Math.floor(value))
}

export function sanitizeStats(raw: unknown): Stats {
  const stats = defaultStats()
  if (!raw || typeof raw !== 'object') return stats
  const source = raw as Record<string, unknown>

  for (const key of STAT_KEYS) {
    stats[key] = numberOr(source[key], 1, 0)
  }
  return stats
}

export function sanitizeEquipped(raw: unknown): EquippedItems {
  const equipped = emptyEquipped()
  if (!raw || typeof raw !== 'object') return equipped
  const source = raw as Record<string, unknown>

  for (const slot of EQUIP_SLOTS) {
    const id = source[slot]
    if (typeof id !== 'string') continue

    // 없어진 아이템이 슬롯에 남아 있으면 조용히 비운다.
    // 그대로 두면 보너스 계산에서 계속 헛돈다.
    const def = findItem(id)
    if (def && def.equipSlot === slot) equipped[slot] = id
  }
  return equipped
}

export function sanitizeInventory(raw: unknown): InventoryEntry[] {
  if (!Array.isArray(raw)) return []

  const merged = new Map<string, InventoryEntry>()
  for (const value of raw) {
    if (!value || typeof value !== 'object') continue
    const entry = value as Record<string, unknown>
    const itemId = typeof entry.itemId === 'string' ? entry.itemId : null
    if (!itemId || !findItem(itemId)) continue

    const quantity = numberOr(entry.quantity, 1, 0)
    if (quantity <= 0) continue

    const prev = merged.get(itemId)
    if (prev) {
      prev.quantity += quantity
      continue
    }
    merged.set(itemId, {
      itemId,
      quantity,
      obtainedAt: typeof entry.obtainedAt === 'string' ? entry.obtainedAt : new Date().toISOString(),
      source: typeof entry.source === 'string' ? entry.source : 'unknown',
    })
  }
  return [...merged.values()]
}

function sanitizeRarity(raw: unknown, fallback: Rarity): Rarity {
  return RARITIES.includes(raw as Rarity) ? (raw as Rarity) : fallback
}

export function sanitizeBattles(raw: unknown, categories: readonly string[]): Battle[] {
  if (!Array.isArray(raw)) return []
  const result: Battle[] = []

  for (const value of raw) {
    if (!value || typeof value !== 'object') continue
    const b = value as Record<string, unknown>

    const id = typeof b.id === 'string' ? b.id : null
    const defId = typeof b.defId === 'string' ? b.defId : null
    if (!id || !defId) continue

    // 정의가 사라진 몬스터는 되살릴 방법이 없다
    const def = findBattleDef(defId)
    if (!def) continue

    const maxHp = numberOr(b.maxHp, def.maxHp, 1)
    const actions = Array.isArray(b.actions)
      ? b.actions
          .map((a, i) => {
            if (!a || typeof a !== 'object') return null
            const action = a as Record<string, unknown>
            return {
              id: typeof action.id === 'string' ? action.id : `${id}-${i}`,
              label: typeof action.label === 'string' ? action.label : `단계 ${i + 1}`,
              damage: numberOr(action.damage, 10, 0),
              doneAt: typeof action.doneAt === 'string' ? action.doneAt : null,
            }
          })
          .filter((a): a is Battle['actions'][number] => a !== null)
      : []

    result.push({
      id,
      defId,
      kind: b.kind === 'BOSS' ? 'BOSS' : 'MONSTER',
      name: typeof b.name === 'string' ? b.name : def.name,
      description: typeof b.description === 'string' ? b.description : def.description,
      category: categories.includes(b.category as string) ? (b.category as Category) : def.category,
      icon: typeof b.icon === 'string' ? b.icon : def.icon,
      hp: Math.min(maxHp, numberOr(b.hp, maxHp, 0)),
      maxHp,
      actions,
      rewardExp: numberOr(b.rewardExp, def.rewardExp, 0),
      rewardCoins: numberOr(b.rewardCoins, def.rewardCoins, 0),
      guaranteedRarity: sanitizeRarity(b.guaranteedRarity, def.guaranteedRarity),
      ...(def.bonusRarity ? { bonusRarity: sanitizeRarity(b.bonusRarity, def.bonusRarity) } : {}),
      status: b.status === 'CLEARED' ? 'CLEARED' : 'ACTIVE',
      createdAt: typeof b.createdAt === 'string' ? b.createdAt : new Date().toISOString(),
      clearedAt: typeof b.clearedAt === 'string' ? b.clearedAt : null,
    })
  }
  return result
}

export function sanitizeClassId(raw: unknown): ClassId | null {
  return CLASS_IDS.includes(raw as ClassId) ? (raw as ClassId) : null
}

export function sanitizeAreaId(raw: unknown): AreaId {
  return AREA_IDS.includes(raw as AreaId) ? (raw as AreaId) : 'HOME_BASE'
}

// ── 도시 ────────────────────────────────────────────────

export function emptyNpcStates(): NpcStates {
  return NPCS.reduce((acc, npc) => {
    acc[npc.id] = emptyNpcState()
    return acc
  }, {} as NpcStates)
}

/**
 * 나와 도시 사람들 사이의 기록.
 * 정의가 사라진 NPC 는 버리고, 새로 생긴 NPC 는 빈 관계로 채운다.
 */
export function sanitizeNpcs(raw: unknown): NpcStates {
  const states = emptyNpcStates()
  if (!raw || typeof raw !== 'object') return states
  const source = raw as Record<string, unknown>

  for (const [id, value] of Object.entries(source)) {
    if (!findNpc(id) || !value || typeof value !== 'object') continue
    const entry = value as Record<string, unknown>

    states[id] = {
      friendship: Math.min(100, numberOr(entry.friendship, 0)),
      lastTalkedOn:
        typeof entry.lastTalkedOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry.lastTalkedOn)
          ? entry.lastTalkedOn
          : null,
      clearedChainIds: Array.isArray(entry.clearedChainIds)
        ? [...new Set(entry.clearedChainIds.filter((v): v is string => typeof v === 'string'))]
        : [],
    }
  }
  return states
}

export function sanitizeReputation(raw: unknown): Reputation {
  const reputation = emptyReputation()
  if (!raw || typeof raw !== 'object') return reputation
  const source = raw as Record<string, unknown>

  for (const id of AREA_IDS) {
    reputation[id] = numberOr(source[id], 0)
  }
  return reputation
}

/** 없어진 스킬은 조용히 버린다. 안 그러면 쓴 포인트만 사라진 채로 남는다. */
export function sanitizeSkills(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.filter((v): v is string => typeof v === 'string' && findSkill(v) !== null))]
}

/** 마셔둔 것. 정의가 사라졌거나 다 쓴 것은 버린다. */
export function sanitizeBuffs(raw: unknown): ActiveBuff[] {
  if (!Array.isArray(raw)) return []
  const result: ActiveBuff[] = []

  for (const value of raw) {
    if (!value || typeof value !== 'object') continue
    const b = value as Record<string, unknown>

    const itemId = typeof b.itemId === 'string' ? b.itemId : null
    const def = itemId ? findItem(itemId) : null
    if (!def?.consumable) continue

    const uses = numberOr(b.uses, 0)
    if (uses <= 0) continue

    const category = CATEGORIES.includes(b.category as Category) ? (b.category as Category) : null

    result.push({
      id: typeof b.id === 'string' ? b.id : `${itemId}-${result.length}`,
      itemId: itemId!,
      name: typeof b.name === 'string' ? b.name : def.name,
      icon: typeof b.icon === 'string' ? b.icon : def.icon,
      category,
      expPct: numberOr(b.expPct, def.consumable.expPct),
      uses,
      startedAt: typeof b.startedAt === 'string' ? b.startedAt : new Date().toISOString(),
    })
  }
  return result
}

/**
 * 스킬 포인트를 레벨과 찍어둔 스킬에서 다시 계산해 덮는다.
 *
 * 따로 쌓아두면 완료를 되돌려 레벨이 내려가도 포인트가 남고,
 * 완료·되돌리기를 반복해서 포인트만 불릴 수 있다. 늘 계산하면 그럴 일이 없다.
 */
export function withSkillPoints(state: AppState): AppState {
  const points = availableSkillPoints(state.user.level, state.user.unlockedSkills)
  if (state.user.skillPoints === points) return state
  return { ...state, user: { ...state.user, skillPoints: points } }
}

// ── 사용 기록 ────────────────────────────────────────────

export function defaultRecommendSettings(): RecommendSettings {
  return { personalized: true }
}

export function sanitizeRecommendSettings(raw: unknown): RecommendSettings {
  if (!raw || typeof raw !== 'object') return defaultRecommendSettings()
  const s = raw as Record<string, unknown>
  return { personalized: s.personalized !== false }
}

function countMap(raw: unknown, keys: string[]): Record<string, number> {
  const out: Record<string, number> = {}
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  for (const key of keys) out[key] = numberOr(source[key], 0)
  return out
}

/**
 * 저장된 사용 기록.
 * 모양이 깨진 항목은 조용히 버린다 — 추천이 조금 덜 똑똑해질 뿐, 앱이 멈추면 안 된다.
 */
export function sanitizeUsageProfiles(raw: unknown): UsageProfiles {
  if (!raw || typeof raw !== 'object') return {}
  const source = raw as Record<string, unknown>
  const out: UsageProfiles = {}

  const bandKeys = Object.keys(emptyBandCounts())
  const dayKeys = Object.keys(emptyDayCounts())

  for (const [key, value] of Object.entries(source)) {
    if (!value || typeof value !== 'object') continue
    const p = value as Record<string, unknown>

    const title = typeof p.title === 'string' ? p.title.trim() : ''
    if (!key || !title) continue

    // 준비된 퀘스트가 아니면 key 는 늘 다듬은 제목이어야 한다.
    // 저장된 값이 어긋나 있으면 바로잡는다 — 안 그러면 같은 퀘스트가 둘로 갈린다.
    const presetId = typeof p.presetId === 'string' ? p.presetId : null
    const realKey = presetId ?? normalizeTitle(title)

    const profile: QuestUsageProfile = {
      questKey: realKey,
      title,
      category: CATEGORIES.includes(p.category as Category) ? (p.category as Category) : 'LIFE',
      difficulty: DIFFICULTIES.includes(p.difficulty as never)
        ? (p.difficulty as QuestUsageProfile['difficulty'])
        : 'NORMAL',
      presetId,
      sourcePackIds: Array.isArray(p.sourcePackIds)
        ? [...new Set(p.sourcePackIds.filter((v): v is string => typeof v === 'string'))]
        : [],
      totalAdded: numberOr(p.totalAdded, 0),
      totalCompleted: numberOr(p.totalCompleted, 0),
      lastAddedAt: typeof p.lastAddedAt === 'string' ? p.lastAddedAt : null,
      lastCompletedAt: typeof p.lastCompletedAt === 'string' ? p.lastCompletedAt : null,
      addedByDayOfWeek: countMap(p.addedByDayOfWeek, dayKeys),
      addedByBand: countMap(p.addedByBand, bandKeys) as QuestUsageProfile['addedByBand'],
      completedByDayOfWeek: countMap(p.completedByDayOfWeek, dayKeys),
      completedByBand: countMap(p.completedByBand, bandKeys) as QuestUsageProfile['completedByBand'],
      recentCompletionDates: Array.isArray(p.recentCompletionDates)
        ? p.recentCompletionDates
            .filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
            .slice(0, RECENT_DATES_KEPT)
        : [],
      favorite: p.favorite === true,
      dismissCount: numberOr(p.dismissCount, 0),
      hiddenOn:
        typeof p.hiddenOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.hiddenOn)
          ? p.hiddenOn
          : null,
    }
    const existing = out[realKey]
    out[realKey] = existing ? mergeProfiles(existing, profile) : profile
  }
  return out
}

/** 같은 퀘스트로 밝혀진 두 기록을 합친다. 숫자는 더하고, 최근 값을 남긴다. */
function mergeProfiles(a: QuestUsageProfile, b: QuestUsageProfile): QuestUsageProfile {
  const addCounts = (x: Record<string, number>, y: Record<string, number>) => {
    const out: Record<string, number> = { ...x }
    for (const [k, v] of Object.entries(y)) out[k] = (out[k] ?? 0) + v
    return out
  }
  const later = (x: string | null, y: string | null) =>
    !x ? y : !y ? x : x > y ? x : y

  return {
    ...a,
    totalAdded: a.totalAdded + b.totalAdded,
    totalCompleted: a.totalCompleted + b.totalCompleted,
    lastAddedAt: later(a.lastAddedAt, b.lastAddedAt),
    lastCompletedAt: later(a.lastCompletedAt, b.lastCompletedAt),
    addedByDayOfWeek: addCounts(a.addedByDayOfWeek, b.addedByDayOfWeek),
    addedByBand: addCounts(a.addedByBand, b.addedByBand) as QuestUsageProfile['addedByBand'],
    completedByDayOfWeek: addCounts(a.completedByDayOfWeek, b.completedByDayOfWeek),
    completedByBand: addCounts(
      a.completedByBand,
      b.completedByBand,
    ) as QuestUsageProfile['completedByBand'],
    recentCompletionDates: [
      ...new Set([...a.recentCompletionDates, ...b.recentCompletionDates]),
    ]
      .sort()
      .reverse()
      .slice(0, RECENT_DATES_KEPT),
    sourcePackIds: [...new Set([...a.sourcePackIds, ...b.sourcePackIds])],
    favorite: a.favorite || b.favorite,
    dismissCount: a.dismissCount + b.dismissCount,
    hiddenOn: later(a.hiddenOn, b.hiddenOn),
  }
}

/**
 * 사용 기록이 아직 없으면 지난 퀘스트에서 만들어 채운다.
 *
 * 업데이트하자마자 추천이 돌게 하려는 것이다.
 * 이미 몇 달 쓴 사람에게 "처음부터 다시 배울게요" 는 말이 안 된다.
 */
export function backfillUsage(state: AppState): AppState {
  if (Object.keys(state.usageProfiles).length > 0) return state
  if (state.quests.length === 0) return state
  return { ...state, usageProfiles: backfillProfiles(state.quests) }
}

// ── 수집 · 방 ───────────────────────────────────────────

/**
 * 저장된 수집 기록.
 *
 * 정의가 사라진 물건은 조용히 버린다. 방에 놓여 있던 것도 같이 사라진다 —
 * 없는 물건을 그리려다 화면이 깨지는 것보다 낫다.
 */
export function sanitizeCollection(raw: unknown): CollectionState {
  const empty = emptyCollection()
  if (!raw || typeof raw !== 'object') return empty
  const s = raw as Record<string, unknown>

  const discovered: Record<string, string> = {}
  if (s.discovered && typeof s.discovered === 'object') {
    for (const [id, at] of Object.entries(s.discovered as Record<string, unknown>)) {
      if (!findCollectionItem(id)) continue
      discovered[id] = typeof at === 'string' ? at : new Date().toISOString()
    }
  }

  const owned: Record<string, number> = {}
  if (s.owned && typeof s.owned === 'object') {
    for (const [id, count] of Object.entries(s.owned as Record<string, unknown>)) {
      const def = findCollectionItem(id)
      if (!def) continue
      const n = numberOr(count, 0)
      if (n <= 0) continue
      owned[id] = def.unique ? 1 : n
      // 가진 적이 있으면 발견한 것이다
      if (!discovered[id]) discovered[id] = new Date().toISOString()
    }
  }

  const rooms: CollectionState['rooms'] = {}
  if (s.rooms && typeof s.rooms === 'object') {
    for (const [roomId, placed] of Object.entries(s.rooms as Record<string, unknown>)) {
      if (!findRoom(roomId) || !Array.isArray(placed)) continue
      rooms[roomId] = placed
        .map((p, i) => sanitizePlaced(p, `${roomId}-${i}`))
        .filter((p): p is PlacedItem => p !== null)
    }
  }

  // 구매 기록은 남은 재고를 계산하는 데만 쓴다.
  // 오래된 날짜는 아무도 안 보므로 최근 며칠만 남기고 버린다 —
  // 그대로 두면 몇 달이 지나 저장소에 쓸모없는 줄이 수천 개 쌓인다.
  const purchases: Record<string, number> = {}
  if (s.purchases && typeof s.purchases === 'object') {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - PURCHASE_DAYS_KEPT)
    const oldest = cutoff.toISOString().slice(0, 10)

    for (const [key, count] of Object.entries(s.purchases as Record<string, unknown>)) {
      const n = numberOr(count, 0)
      if (n <= 0) continue
      const dayKey = key.slice(0, 10)
      if (dayKey < oldest) continue
      purchases[key] = n
    }
  }

  // 가게에서 본 것. 발견과 달리 도감 수에는 안 들어간다.
  const seen: Record<string, string> = {}
  if (s.seen && typeof s.seen === 'object') {
    for (const [id, at] of Object.entries(s.seen as Record<string, unknown>)) {
      if (!findCollectionItem(id)) continue
      // 이미 손에 넣은 것은 본 것으로 남길 필요가 없다
      if (discovered[id]) continue
      seen[id] = typeof at === 'string' ? at : new Date().toISOString()
    }
  }

  const shopVisits: Record<string, string> = {}
  if (s.shopVisits && typeof s.shopVisits === 'object') {
    for (const [shopId, at] of Object.entries(s.shopVisits as Record<string, unknown>)) {
      if (!COLLECTION_SHOP_IDS.includes(shopId as never)) continue
      if (typeof at === 'string') shopVisits[shopId] = at
    }
  }

  // 걸어둔 방 공기. 아직 안 열린 것이 저장돼 있으면 조용히 비운다.
  const roomEffects: Record<string, HomeEffectId | null> = {}
  if (s.roomEffects && typeof s.roomEffects === 'object') {
    for (const [roomId, effectId] of Object.entries(s.roomEffects as Record<string, unknown>)) {
      if (!findRoom(roomId)) continue
      roomEffects[roomId] =
        typeof effectId === 'string' && HOME_EFFECT_IDS.includes(effectId as HomeEffectId)
          ? (effectId as HomeEffectId)
          : null
    }
  }

  return {
    discovered,
    owned,
    roomEffects,
    wishlist: Array.isArray(s.wishlist)
      ? [...new Set(s.wishlist.filter((v): v is string => typeof v === 'string' && !!findCollectionItem(v)))]
      : [],
    rooms,
    currentRoomId: findRoom(s.currentRoomId as string) ? (s.currentRoomId as RoomId) : 'MY_ROOM',
    purchases,
    seen,
    shopVisits,
    claimedDeliveries: Array.isArray(s.claimedDeliveries)
      ? [...new Set(s.claimedDeliveries.filter((v): v is string => typeof v === 'string'))].slice(
          -DELIVERIES_KEPT,
        )
      : [],
    discoveredRecipeIds: Array.isArray(s.discoveredRecipeIds)
      ? [...new Set(s.discoveredRecipeIds.filter((v): v is string => typeof v === 'string'))]
      : [],
    claimedMilestones: Array.isArray(s.claimedMilestones)
      ? [...new Set(s.claimedMilestones.filter((v): v is number => typeof v === 'number'))]
      : [],
    claimedSetIds: Array.isArray(s.claimedSetIds)
      ? [...new Set(s.claimedSetIds.filter((v): v is string => typeof v === 'string'))]
      : [],
    earnedTrophyIds: Array.isArray(s.earnedTrophyIds)
      ? [...new Set(s.earnedTrophyIds.filter((v): v is string => typeof v === 'string'))]
      : [],
  }
}

function sanitizePlaced(raw: unknown, fallbackId: string): PlacedItem | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>

  const itemId = typeof p.itemId === 'string' ? p.itemId : null
  if (!itemId || !findCollectionItem(itemId)) return null

  const clamp = (v: unknown, fallback: number) => {
    const n = typeof v === 'number' && Number.isFinite(v) ? v : fallback
    return Math.min(100, Math.max(0, Math.round(n * 10) / 10))
  }

  return {
    uid: typeof p.uid === 'string' ? p.uid : fallbackId,
    itemId,
    x: clamp(p.x, 50),
    y: clamp(p.y, 50),
    scale: typeof p.scale === 'number' && p.scale >= 0.5 && p.scale <= 1.6 ? p.scale : 1,
    flipped: p.flipped === true,
  }
}

/** 분야별 완료 수. 예전 저장본에는 없어서 지금 남아 있는 퀘스트에서 센다. */
export function backfillCategoryCompleted(state: AppState, raw: unknown): CategoryStats {
  if (raw && typeof raw === 'object') {
    const source = raw as Record<string, unknown>
    const hasAny = CATEGORIES.some((c) => typeof source[c] === 'number')
    if (hasAny) {
      return CATEGORIES.reduce((acc, c) => {
        acc[c] = numberOr(source[c], 0)
        return acc
      }, {} as CategoryStats)
    }
  }

  // 지운 퀘스트는 셀 방법이 없다. 그건 그대로 인정하고 남은 것만 센다 —
  // 0 에서 시작하는 것보다는 훨씬 실제에 가깝다.
  const counts = CATEGORIES.reduce((acc, c) => {
    acc[c] = 0
    return acc
  }, {} as CategoryStats)

  for (const quest of state.quests) {
    if (quest.completed) counts[quest.category] += 1
  }
  return counts
}

/** 업데이트하고 처음 열었을 때 주는 선물. 한 번만 준다. */
export const WELCOME_GIFT = {
  itemId: 'favorite_mug',
  coins: 50,
  message: '다음 모험에 쓸 작은 선물이야 ✨',
}

export interface GiftResult {
  state: AppState
  given: boolean
}

/**
 * 벌이를 세 배로 올리기 전에 한 퀘스트들의 몫.
 *
 * 옛 표(5/10/20)로 받은 사람은 새 표(15/30/60)와 차이만큼 덜 받았다.
 * 보통 난이도 기준 차이가 20 이라 퀘스트 하나당 20 으로 잡는다.
 * 난이도별로 정확히 되짚으려면 지운 퀘스트까지 알아야 하는데 그건 알 수 없다.
 */
export const COIN_REBALANCE_PER_QUEST = 20

export interface RebalanceResult {
  state: AppState
  coins: number
}

/**
 * 밸런스를 고치기 전에 쌓아둔 몫을 한 번 채워준다.
 *
 * coinRebalanceGiven 플래그로 막는다. 두 번 열어도 두 번 주지 않는다.
 * 한 번도 안 한 사람에게는 줄 것이 없으니 조용히 넘어간다.
 */
export function grantCoinRebalance(state: AppState): RebalanceResult {
  if (state.coinRebalanceGiven) return { state, coins: 0 }

  const done = Math.max(0, state.user.totalCompletedQuests)
  const coins = done * COIN_REBALANCE_PER_QUEST

  return {
    state: {
      ...state,
      coinRebalanceGiven: true,
      user: { ...state.user, coins: state.user.coins + coins },
    },
    coins,
  }
}

/**
 * Welcome Gift.
 *
 * welcomeGiftGiven 플래그로 막는다. 새로 시작하는 사람에게도 한 번 준다 —
 * 빈 가방으로 시작하면 이 시스템이 있는지도 모른 채 지나간다.
 */
export function grantWelcomeGift(state: AppState, now: Date = new Date()): GiftResult {
  if (state.welcomeGiftGiven) return { state, given: false }

  const already = state.inventory.some((e) => e.itemId === WELCOME_GIFT.itemId)
  const inventory = already
    ? state.inventory
    : [
        ...state.inventory,
        {
          itemId: WELCOME_GIFT.itemId,
          quantity: 1,
          obtainedAt: now.toISOString(),
          source: 'Welcome Gift',
        },
      ]

  return {
    state: {
      ...state,
      welcomeGiftGiven: true,
      inventory,
      user: { ...state.user, coins: state.user.coins + WELCOME_GIFT.coins },
    },
    given: true,
  }
}


/**
 * 얻어둔 캐릭터 모습.
 *
 * 모르는 id 는 버린다 (모습 이름을 바꿨을 수 있다).
 * 기본 모습은 늘 들어 있다 — 저장된 목록이 비었거나 깨져 있어도
 * 입을 게 하나도 없는 상태가 되면 안 된다.
 */
export function sanitizeOwnedSkins(raw: unknown): SkinId[] {
  const known = new Set<string>(SKIN_IDS)
  const saved = Array.isArray(raw)
    ? raw.filter((v): v is SkinId => typeof v === 'string' && known.has(v))
    : []

  return [...new Set<SkinId>([...defaultOwnedSkinIds(), ...saved])]
}

/**
 * 지금 입고 있는 모습.
 *
 * 안 가진 것이나 모르는 것이 저장돼 있으면 기본으로 돌린다.
 * 그림이 없어서 빈 자리가 뜨는 것보다는 기본 모습이 서 있는 게 낫다.
 */
export function sanitizeSelectedSkin(raw: unknown, ownedRaw: unknown): SkinId {
  const owned = sanitizeOwnedSkins(ownedRaw)
  if (typeof raw === 'string' && owned.includes(raw as SkinId)) return raw as SkinId
  return DEFAULT_SKIN_ID
}

/**
 * 발견 층을 읽어들인다.
 *
 * 진행도는 여기 없다 — 전부 기존 기록에서 다시 센다.
 * 그래서 이 업데이트를 켜는 순간 예전 기록이 그대로 반영되고,
 * 따로 backfill 하는 코드가 필요 없다.
 *
 * 여기 있는 건 "무엇을 이미 봤는지 · 받았는지" 뿐이다.
 */
export function sanitizeDiscovery(raw: unknown): DiscoveryState {
  const empty = emptyDiscovery()
  if (!raw || typeof raw !== 'object') return empty
  const d = raw as Record<string, unknown>

  const ids = (value: unknown, ok: (id: string) => boolean): string[] =>
    Array.isArray(value)
      ? [...new Set(value.filter((v): v is string => typeof v === 'string' && ok(v)))]
      : []

  const isAuto = (id: string) => AUTO_COLLECTION_IDS.includes(id as never)
  const isSecret = (id: string) => SECRET_IDS.includes(id as never)

  // 동료. 없어진 아이가 저장돼 있으면 조용히 버린다.
  const companions: DiscoveryState['companions'] = {}
  if (d.companions && typeof d.companions === 'object') {
    for (const [id, value] of Object.entries(d.companions as Record<string, unknown>)) {
      if (!COMPANION_IDS.includes(id as never)) continue
      if (!value || typeof value !== 'object') continue
      const c = value as Record<string, unknown>
      companions[id] = {
        friendship: numberOr(c.friendship, 0),
        metAt: typeof c.metAt === 'string' ? c.metAt : new Date().toISOString(),
        lastPlayedOn: typeof c.lastPlayedOn === 'string' ? c.lastPlayedOn : null,
      }
    }
  }

  // 같이 다니던 아이가 없어졌으면 비운다
  const activeId = typeof d.activeCompanionId === 'string' ? d.activeCompanionId : null
  const activeCompanionId =
    activeId && companions[activeId] ? (activeId as DiscoveryState['activeCompanionId']) : null

  const hintLevels: Record<string, number> = {}
  if (d.hintLevels && typeof d.hintLevels === 'object') {
    for (const [id, level] of Object.entries(d.hintLevels as Record<string, unknown>)) {
      if (!findCollectionItem(id)) continue
      const n = numberOr(level, 0)
      if (n > 0) hintLevels[id] = Math.min(3, n)
    }
  }

  return {
    revealedCollectionIds: ids(d.revealedCollectionIds, isAuto),
    claimedCollectionIds: ids(d.claimedCollectionIds, isAuto),
    foundSecretIds: ids(d.foundSecretIds, isSecret),
    hintedSecretIds: ids(d.hintedSecretIds, isSecret),
    readChapterIds: ids(d.readChapterIds, (id) => findChapter(id) !== null),
    companions,
    activeCompanionId,
    hintLevels,
    seenNoteKeys: Array.isArray(d.seenNoteKeys)
      ? d.seenNoteKeys.filter((v): v is string => typeof v === 'string').slice(-200)
      : [],
  }
}


/**
 * 작은 정원을 읽어들인다.
 *
 * 레벨 · 경험치 · 밭 개수 · 발견한 작물은 여기 없다.
 * 전부 거둔 기록에서 다시 센다 — 그래서 나중에 필요 경험치를 손봐도
 * 저장된 값과 어긋나지 않고, 따로 채워 넣는 코드도 필요 없다.
 *
 * 심어둔 것은 무슨 일이 있어도 지우지 않는다.
 * 몇 달 만에 열어도 그때 심어둔 건 다 자란 채로 서 있어야 한다.
 */
export function sanitizeGarden(raw: unknown): GardenState {
  const empty = emptyGarden()
  if (!raw || typeof raw !== 'object') return empty
  const g = raw as Record<string, unknown>

  // 밭은 늘 여덟 칸이다. 몇 칸까지 쓸 수 있는지는 레벨에서 계산한다.
  const savedPlots = Array.isArray(g.plots) ? g.plots : []
  const plots: GardenPlot[] = emptyPlots().map((fallback, i) => {
    const saved = savedPlots[i]
    if (!saved || typeof saved !== 'object') return fallback
    const p = saved as Record<string, unknown>

    const id = typeof p.id === 'string' && p.id ? p.id : fallback.id
    const crop = typeof p.cropId === 'string' ? findCrop(p.cropId) : null
    const plantedAt = typeof p.plantedAt === 'string' ? p.plantedAt : null
    const readyAt = typeof p.readyAt === 'string' ? p.readyAt : null

    // 셋 중 하나라도 없으면 빈 칸으로 본다. 반쯤 남은 기록으로
    // "언제 다 자라는지 모르는 작물" 을 만들지 않는다.
    if (!crop || !plantedAt || !readyAt) return { id }
    if (Number.isNaN(new Date(plantedAt).getTime())) return { id }
    if (Number.isNaN(new Date(readyAt).getTime())) return { id }

    return { id, cropId: crop.id, plantedAt, readyAt }
  })

  const harvestedCropCounts: Record<string, number> = {}
  if (g.harvestedCropCounts && typeof g.harvestedCropCounts === 'object') {
    for (const [cropId, count] of Object.entries(g.harvestedCropCounts as Record<string, unknown>)) {
      // 없어진 작물이 저장돼 있으면 조용히 버린다
      if (!findCrop(cropId)) continue
      const n = Math.floor(numberOr(count, 0))
      if (n > 0) harvestedCropCounts[cropId] = n
    }
  }

  return {
    unlockedAt: typeof g.unlockedAt === 'string' ? g.unlockedAt : null,
    tutorialSeenAt: typeof g.tutorialSeenAt === 'string' ? g.tutorialSeenAt : null,
    plots: plots.slice(0, MAX_PLOTS),
    harvestedCropCounts,
    plantedCount: Math.max(0, Math.floor(numberOr(g.plantedCount, 0))),
    // 첫 씨앗을 이미 준 희귀 작물. 없어진 작물이 적혀 있으면 조용히 버린다.
    rareSeedsGiven: Array.isArray(g.rareSeedsGiven)
      ? [
          ...new Set(
            g.rareSeedsGiven.filter(
              (v): v is string => typeof v === 'string' && findCrop(v) !== null,
            ),
          ),
        ]
      : [],
  }
}

/**
 * 모험 에너지.
 *
 * 저장된 값이 한도를 넘어 있으면 한도로 맞춘다.
 * 한도 자체는 저장된 값을 믿지 않고 지금 값으로 덮는다 —
 * 나중에 한도를 올리면 예전 저장에도 그대로 반영돼야 한다.
 */
export function sanitizeEnergy(raw: unknown): number {
  return Math.max(0, Math.min(MAX_ADVENTURE_ENERGY, Math.floor(numberOr(raw, 0))))
}


/**
 * 작은 부엌을 읽어들인다.
 *
 * 무엇을 알고 있는지는 여기 없다. 정원 기록에서 다시 센다 —
 * 그래서 조건을 나중에 손봐도 어긋나지 않고, 이 업데이트를 처음 켜는
 * 사람에게 그동안 거둔 것이 그대로 반영된다.
 *
 * 만든 횟수는 절대 지우지 않는다. 한 번 만들어본 요리는
 * 무슨 일이 있어도 계속 아는 것으로 남아야 한다.
 */
export function sanitizeKitchen(raw: unknown): KitchenState {
  const empty = emptyKitchen()
  if (!raw || typeof raw !== 'object') return empty
  const k = raw as Record<string, unknown>

  const cookedRecipeCounts: Record<string, number> = {}
  if (k.cookedRecipeCounts && typeof k.cookedRecipeCounts === 'object') {
    for (const [id, count] of Object.entries(k.cookedRecipeCounts as Record<string, unknown>)) {
      // 없어진 레시피가 저장돼 있으면 조용히 버린다
      if (!findKitchenRecipe(id)) continue
      const n = Math.floor(numberOr(count, 0))
      if (n > 0) cookedRecipeCounts[id] = n
    }
  }

  const favoriteRecipeIds = Array.isArray(k.favoriteRecipeIds)
    ? [
        ...new Set(
          k.favoriteRecipeIds.filter(
            (v): v is string => typeof v === 'string' && findKitchenRecipe(v) !== null,
          ),
        ),
      ]
    : []

  return {
    unlockedAt: typeof k.unlockedAt === 'string' ? k.unlockedAt : null,
    tutorialSeenAt: typeof k.tutorialSeenAt === 'string' ? k.tutorialSeenAt : null,
    cookedRecipeCounts,
    favoriteRecipeIds,
  }
}
