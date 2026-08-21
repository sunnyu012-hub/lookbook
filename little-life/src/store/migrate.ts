import type {
  AppState,
  AreaId,
  Battle,
  Category,
  ClassId,
  EquippedItems,
  InventoryEntry,
  Rarity,
  Stats,
} from '@/types'
import { AREA_IDS, CLASS_IDS, EQUIP_SLOTS, RARITIES, STAT_KEYS } from '@/types'
import { findBattleDef, findItem } from '@/lib/rpg/content'

/**
 * 저장된 데이터를 지금 버전으로 끌어올린다.
 *
 * 원칙 하나: 기존 기록은 절대 지우지 않는다.
 * 없는 항목만 기본값으로 채우고, 있는 값은 손대지 않는다.
 */

export const STATE_VERSION = 3

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
