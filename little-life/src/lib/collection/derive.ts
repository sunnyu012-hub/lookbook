import type { AppState, DiscoveryResult } from '@/types'
import { isNightOpen } from '@/lib/rpg/time'
import { addItem, discoveredCount, completedSetIds, newMilestones, newTrophies, unclaimedSets } from './progress'
import { claimableGoals, goalKey } from '@/lib/goals'
import { pendingGrants } from './grants'
import { findCollectionItem } from './catalog'
import { gardenLevel, gardenXp } from '@/lib/garden/derive'

/**
 * 가진 것이 바뀔 때마다 따라오는 것들.
 *
 * 세트 완성 · 트로피 · 도감 보상 · 평판이나 사람이 주는 물건은
 * 어느 화면에서 눌렀든 똑같이 일어나야 한다. 그래서 한군데 모아두고,
 * 물건이 오갈 수 있는 동작 뒤에 이걸 한 번 지난다.
 *
 * 한 번으로 안 끝날 수 있다 — 물건 하나가 세트를 완성하고,
 * 그 세트가 트로피를 부르고, 그 트로피가 또 도감을 채운다.
 * 그래서 더 변할 게 없을 때까지 몇 바퀴 돈다 (최대 5바퀴).
 */

export interface DerivedResult {
  state: AppState
  /** 이번에 처음 만난 것들 */
  discoveries: DiscoveryResult[]
  /** 화면에 한 줄로 알려줄 것들 */
  notes: string[]
}

const MAX_ROUNDS = 5

export function applyCollectionDerived(
  state: AppState,
  now: Date = new Date(),
  night: boolean = isNightOpen(now),
): DerivedResult {
  let current = state
  const discoveries: DiscoveryResult[] = []
  const notes: string[] = []

  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    let changed = false

    // 1. 평판 · 사람 · 비밀이 주는 것
    const grants = pendingGrants({
      collection: current.collection,
      reputation: current.reputation,
      friendship: friendshipMap(current),
      night,
    })
    for (const grant of grants) {
      const result = addItem(current.collection, grant.itemId, now)
      current = { ...current, collection: result.collection }
      if (result.isNew) discoveries.push({ itemId: grant.itemId, isNew: true, source: grant.source })
      changed = true
    }

    // 2. 완성한 세트의 보상
    for (const set of unclaimedSets(current.collection)) {
      let collection = { ...current.collection, claimedSetIds: [...current.collection.claimedSetIds, set.id] }
      let coins = current.user.coins

      for (const reward of set.rewards) {
        if (reward.kind === 'COIN') coins += reward.amount
        if (reward.kind === 'RECIPE' && !collection.discoveredRecipeIds.includes(reward.recipeId)) {
          collection = {
            ...collection,
            discoveredRecipeIds: [...collection.discoveredRecipeIds, reward.recipeId],
          }
        }
        if (reward.kind === 'ITEM') {
          const added = addItem(collection, reward.itemId, now)
          collection = added.collection
          if (added.isNew) {
            discoveries.push({ itemId: reward.itemId, isNew: true, source: `${set.name} 완성` })
          }
        }
      }

      current = { ...current, collection, user: { ...current.user, coins } }
      notes.push(`${set.name} 완성 ✦`)
      changed = true
    }

    // 3. 트로피
    const trophies = newTrophies(current.collection, {
      totalCompletedQuests: current.user.totalCompletedQuests,
      categoryCompleted: current.categoryCompleted,
      bossClears: current.bossClears,
      completedSetIds: completedSetIds(current.collection),
      discoveredCount: discoveredCount(current.collection),
      // 정원을 못 찾았으면 0 — 정원 트로피는 후보에도 안 든다
      gardenLevel: current.garden.unlockedAt ? gardenLevel(gardenXp(current.garden)) : 0,
    })
    for (const trophy of trophies) {
      const added = addItem(current.collection, trophy.itemId, now)
      current = {
        ...current,
        collection: {
          ...added.collection,
          earnedTrophyIds: [...added.collection.earnedTrophyIds, trophy.id],
        },
      }
      if (added.isNew) {
        discoveries.push({ itemId: trophy.itemId, isNew: true, source: '트로피' })
      }
      notes.push(`${trophy.name} — 트로피가 생겼어`)
      changed = true
    }

    // 4. 도감을 채우다 만나는 자리
    for (const milestone of newMilestones(current.collection)) {
      current = {
        ...current,
        user: { ...current.user, coins: current.user.coins + milestone.coins },
        collection: {
          ...current.collection,
          claimedMilestones: [...current.collection.claimedMilestones, milestone.count],
        },
      }
      notes.push(`${milestone.message} · 🪙 +${milestone.coins}`)
      changed = true
    }

    // 5. 이번 주 목표
    // 버튼을 하나 더 누르게 하지 않는다. 채운 순간 들어온다.
    for (const { goal } of claimableGoals(current, now)) {
      current = {
        ...current,
        user: { ...current.user, coins: current.user.coins + goal.coins },
        claimedWeeklyGoals: [...current.claimedWeeklyGoals, goalKey(goal, now)],
      }
      notes.push(`이번 주 목표 · ${goal.label} · 🪙 +${goal.coins}`)
      changed = true
    }

    if (!changed) break
  }

  return { state: current, discoveries, notes }
}

function friendshipMap(state: AppState): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [id, npc] of Object.entries(state.npcs)) out[id] = npc.friendship
  return out
}

/** 방금 얻은 것들을 연출용으로 정리한다 */
export function describeDiscovery(itemId: string): string {
  return findCollectionItem(itemId)?.nameKo ?? itemId
}
