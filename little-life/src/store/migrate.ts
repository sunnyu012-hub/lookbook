import type {
  ActiveBuff,
  AppState,
  AreaId,
  Battle,
  Category,
  ClassId,
  EquippedItems,
  InventoryEntry,
  NpcStates,
  Rarity,
  Reputation,
  Stats,
} from '@/types'
import { AREA_IDS, CATEGORIES, CLASS_IDS, EQUIP_SLOTS, RARITIES, STAT_KEYS } from '@/types'
import { findBattleDef, findItem } from '@/lib/rpg/content'
import { NPCS, findNpc } from '@/lib/city/npcs'
import { findSkill, availableSkillPoints } from '@/lib/city/skills'
import { emptyNpcState } from '@/lib/city/friendship'
import { emptyReputation } from '@/lib/city/reputation'

/**
 * 저장된 데이터를 지금 버전으로 끌어올린다.
 *
 * 원칙 하나: 기존 기록은 절대 지우지 않는다.
 * 없는 항목만 기본값으로 채우고, 있는 값은 손대지 않는다.
 */

export const STATE_VERSION = 4

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
