import type { CollectionState, NpcId, Reputation } from '@/types'
import { reputationLevelNumber } from '@/lib/city/reputation'
import { CATALOG } from './catalog'
import { completedSetIds, isDiscovered, ownedCount, discoveredCount } from './progress'

/**
 * 사는 것도 만드는 것도 아닌, 그냥 어느 날 손에 들어오는 것들.
 *
 * 조건을 만족했는지는 저장하지 않고 상태를 볼 때마다 확인한다.
 * 이미 발견한 건 다시 주지 않으니 두 번 들어올 일도 없다.
 */

/** 아이템 표에 친밀도를 안 적었을 때의 기본값 */
export const NPC_GIFT_FRIENDSHIP = 30

export interface GrantContext {
  collection: CollectionState
  reputation: Reputation
  friendship: Record<string, number>
  /** 지금이 밤인지 — 밤에만 만날 수 있는 것이 있다 */
  night: boolean
}

/**
 * 비밀 물건의 조건.
 *
 * 화면 어디에도 적지 않는다. 도감에는 ??? 로만 남는다.
 * 알려주는 순간 그건 체크리스트가 되고, 체크리스트는 숙제가 된다.
 */
const SECRETS: Record<string, (ctx: GrantContext) => boolean> = {
  // 방을 충분히 채우고 나면 서랍장 하나가 늘어 있다
  secret_drawer: (ctx) =>
    Object.values(ctx.collection.rooms).some((placed) => placed.length >= 20),

  // 식물을 여덟 종 넘게 기르는 사람의 방에, 밤에만
  night_flower: (ctx) =>
    ctx.night &&
    CATALOG.filter((i) => i.category === 'PLANT' && ownedCount(ctx.collection, i.id) > 0).length >= 8,

  // 도감이 150개를 넘은 어느 밤
  sleeping_star: (ctx) => ctx.night && discoveredCount(ctx.collection) >= 150,

  // 달을 다 모으고 Moon Globe 까지 받은 뒤
  little_moon: (ctx) =>
    completedSetIds(ctx.collection).includes('moon_collector') &&
    ownedCount(ctx.collection, 'moon_globe') > 0,
}

/**
 * 지금 받을 수 있게 된 것들.
 * 평판 · 사람 · 비밀 세 갈래를 한 번에 본다.
 */
export function pendingGrants(ctx: GrantContext): Array<{ itemId: string; source: string }> {
  const out: Array<{ itemId: string; source: string }> = []

  for (const item of CATALOG) {
    if (isDiscovered(ctx.collection, item.id)) continue

    for (const source of item.acquisitionSources) {
      if (source.kind === 'REPUTATION') {
        const level = reputationLevelNumber(ctx.reputation[source.areaId] ?? 0)
        if (level >= source.level) {
          out.push({ itemId: item.id, source: '동네 사람들이 챙겨준 것' })
          break
        }
      }

      if (source.kind === 'NPC') {
        const need = source.friendship || NPC_GIFT_FRIENDSHIP
        if ((ctx.friendship[source.npcId as NpcId] ?? 0) >= need) {
          out.push({ itemId: item.id, source: '누가 준 것' })
          break
        }
      }

      if (source.kind === 'SECRET') {
        const check = SECRETS[item.id]
        if (check && check(ctx)) {
          out.push({ itemId: item.id, source: '어느 날 거기 있던 것' })
          break
        }
      }
    }
  }

  return out
}
