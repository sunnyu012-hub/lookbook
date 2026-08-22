import type {
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
  Stats,
} from '@/types'
import {
  AREA_IDS,
  CATEGORIES,
  CLASS_IDS,
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
import { findRoom } from '@/lib/collection/rooms'

/**
 * 저장된 데이터를 지금 버전으로 끌어올린다.
 *
 * 원칙 하나: 기존 기록은 절대 지우지 않는다.
 * 없는 항목만 기본값으로 채우고, 있는 값은 손대지 않는다.
 */

export const STATE_VERSION = 8

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

  const purchases: Record<string, number> = {}
  if (s.purchases && typeof s.purchases === 'object') {
    for (const [key, count] of Object.entries(s.purchases as Record<string, unknown>)) {
      const n = numberOr(count, 0)
      if (n > 0) purchases[key] = n
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
