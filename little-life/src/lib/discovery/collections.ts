import type { AppState, AutoCollectionDef, AutoCollectionView } from '@/types'
import { AREA_IDS } from '@/types'
import { isWeekend } from '@/lib/collection/shops'
import { discoveredCropIds, gardenLevel, gardenXp, harvestedTotal } from '@/lib/garden/derive'

/**
 * 앱이 나중에 알아보는 것들.
 *
 * 목표를 세우게 하는 기능이 아니다. 할 일을 하나도 더 얹지 않는다.
 * 이미 지나간 기록을 보고 "아, 요즘 이런 식으로 지냈구나" 하고
 * 뒤늦게 이름을 붙여줄 뿐이다.
 *
 * ── 진행도를 저장하지 않는다 ─────────────────────────
 *
 * 전부 이미 쌓여 있는 것에서 센다 — categoryCompleted · usageProfiles ·
 * reputation · dailyLog · npcs. 그래서 두 가지가 공짜로 따라온다:
 *
 * 하나. 이 기능을 켜는 순간 예전 기록이 그대로 반영된다.
 *      BODY 퀘스트를 이미 서른 개 한 사람은 0 부터 시작하지 않는다.
 * 둘.  나중에 조건을 바꿔도 저장된 값과 어긋날 일이 없다.
 *
 * ── 줄어들지 않는다 ─────────────────────────────────
 *
 * 며칠 쉬었다고 7/10 이 0 으로 돌아가지 않는다. 세는 값이 전부
 * "지금까지 몇 번" 이라 애초에 내려갈 수가 없다.
 * 안 하면 그냥 그 자리에 머문다. 그게 전부다.
 *
 * ── 트로피를 주지 않는다 ─────────────────────────────
 *
 * 트로피에는 이미 "그 분야 100개" 라는 조건이 붙어 있다.
 * 그걸 12개에 줘버리면 100개짜리 트로피가 영영 의미를 잃는다.
 * 그래서 여기서는 결이 맞는 평범한 물건을 준다 —
 * 어차피 이건 상 주는 기능이 아니라 이름을 붙여주는 기능이다.
 */

export const AUTO_COLLECTIONS: AutoCollectionDef[] = [
  {
    id: 'ACTIVE_DAYS',
    name: '움직인 날들',
    description: '몸을 쓴 날이 조금씩 쌓였다.',
    icon: '👟',
    condition: { kind: 'CATEGORY_QUESTS', category: 'BODY' },
    target: 12,
    revealAt: 4,
    rewardItemId: 'sneakers_c',
    hiddenUntilTriggered: true,
  },
  {
    id: 'NIGHT_OWL',
    name: '밤에 깨어 있는 사람',
    description: '도시가 조용해질 때 움직이는 편.',
    icon: '🌙',
    condition: { kind: 'BAND_QUESTS', band: 'NIGHT' },
    target: 10,
    revealAt: 3,
    rewardItemId: 'paper_lantern',
    hiddenUntilTriggered: true,
  },
  {
    id: 'HOME_KEEPER',
    name: '집을 돌본 흔적',
    description: '조금씩 집을 돌봤다.',
    icon: '🧹',
    condition: { kind: 'CATEGORY_QUESTS', category: 'LIFE' },
    target: 20,
    revealAt: 6,
    rewardItemId: 'laundry_basket',
    hiddenUntilTriggered: true,
  },
  {
    id: 'FOCUS_SEASON',
    name: '집중하던 시기',
    description: '한 가지를 오래 붙잡고 있던 때가 있었다.',
    icon: '🖋️',
    condition: { kind: 'CATEGORY_QUESTS', category: 'WORK' },
    target: 15,
    revealAt: 5,
    rewardItemId: 'sticky_notes',
    hiddenUntilTriggered: true,
  },
  {
    id: 'SOFT_DAYS',
    name: '쉬어간 날들',
    // 생산성이 낮았다는 뜻으로 읽히면 안 된다. 쉰 것도 기록이다.
    description: '쉬어가는 날도 기록에 남아 있다.',
    icon: '☁️',
    condition: { kind: 'CATEGORY_QUESTS', category: 'MIND' },
    target: 12,
    revealAt: 4,
    rewardItemId: 'warm_tea',
    hiddenUntilTriggered: true,
  },
  {
    id: 'LITTLE_EXPLORER',
    name: '여기저기 다녀본 사람',
    description: '한 동네에만 있지는 않았다.',
    icon: '🗺️',
    condition: { kind: 'AREAS_VISITED' },
    target: 4,
    revealAt: 2,
    rewardItemId: 'postcards',
    hiddenUntilTriggered: true,
  },
  {
    id: 'SOCIAL_SPARK',
    name: '사람들과 지낸 시간',
    description: '도시 사람들과 조금씩 가까워졌다.',
    icon: '💗',
    condition: { kind: 'FRIENDSHIP_TOTAL' },
    target: 40,
    revealAt: 10,
    rewardItemId: 'friend_photo',
    hiddenUntilTriggered: true,
  },
  {
    id: 'WEEKEND_WANDERER',
    name: '주말에도 나선 사람',
    description: '주말에 뭔가 한 날이 여러 번 있었다.',
    icon: '🎟️',
    condition: { kind: 'WEEKEND_DAYS' },
    target: 8,
    revealAt: 3,
    rewardItemId: 'picnic_mat',
    hiddenUntilTriggered: true,
  },
  {
    id: 'GREEN_THUMB',
    name: '손이 초록인 사람',
    description: '심어둔 것을 잊지 않고 거두러 갔다.',
    icon: '🌿',
    condition: { kind: 'CROPS_HARVESTED' },
    target: 20,
    revealAt: 3,
    rewardItemId: 'herb_pot',
    hiddenUntilTriggered: true,
  },
  {
    id: 'LITTLE_FARMER',
    name: '여러 가지를 심어본 사람',
    description: '한 가지만 심지는 않았다.',
    icon: '🧺',
    condition: { kind: 'CROPS_DISCOVERED' },
    target: 5,
    revealAt: 2,
    // 귀한 씨앗 하나. 라벤더는 일곱 시간짜리라 아무 데서나 나오지 않는다.
    rewardItemId: 'seed_lavender',
    hiddenUntilTriggered: true,
  },
  {
    id: 'GARDEN_KEEPER',
    name: '정원을 돌본 사람',
    description: '비어 있던 자리가 이제 정원이라 불릴 만해졌다.',
    icon: '🌷',
    condition: { kind: 'GARDEN_LEVEL' },
    target: 3,
    revealAt: 2,
    rewardItemId: 'lavender_pot',
    hiddenUntilTriggered: true,
  },
]

export function findAutoCollection(id: string): AutoCollectionDef | null {
  return AUTO_COLLECTIONS.find((c) => c.id === id) ?? null
}

/**
 * 지금 얼마나 왔는지.
 *
 * 전부 이미 있는 기록을 읽기만 한다. 아무것도 새로 세지 않는다.
 */
export function autoProgress(state: AppState, def: AutoCollectionDef): number {
  const c = def.condition

  switch (c.kind) {
    case 'CATEGORY_QUESTS':
      // 완료한 퀘스트를 지워도 남는 값이다. 그래서 quests 가 아니라 여기서 센다.
      return state.categoryCompleted[c.category] ?? 0

    case 'BAND_QUESTS':
      return Object.values(state.usageProfiles).reduce(
        (sum, p) => sum + (p.completedByBand[c.band] ?? 0),
        0,
      )

    case 'AREAS_VISITED':
      // 그 동네에서 뭔가 했으면 평판이 0 보다 크다
      return AREA_IDS.filter((id) => (state.reputation[id] ?? 0) > 0).length

    case 'WEEKEND_DAYS':
      return Object.entries(state.dailyLog).filter(
        ([day, stat]) => stat.completed > 0 && isWeekend(new Date(`${day}T12:00:00`)),
      ).length

    case 'FRIENDSHIP_TOTAL':
      return Object.values(state.npcs).reduce((sum, n) => sum + n.friendship, 0)

    // 정원 쪽도 저장된 값이 아니라 거둔 기록에서 센다
    case 'CROPS_HARVESTED':
      return harvestedTotal(state.garden)

    case 'CROPS_DISCOVERED':
      return discoveredCropIds(state.garden).length

    case 'GARDEN_LEVEL':
      return state.garden.unlockedAt ? gardenLevel(gardenXp(state.garden)) : 0
  }
}

/** 지금 상태로 본 자동 컬렉션 전부 */
export function autoCollectionViews(state: AppState): AutoCollectionView[] {
  return AUTO_COLLECTIONS.map((def) => {
    const now = autoProgress(state, def)
    const revealed = state.discovery.revealedCollectionIds.includes(def.id)
    return {
      def,
      now,
      done: now >= def.target,
      // 한 번 눈에 띄면 계속 보인다. 진행이 줄어서 다시 숨는 일은 없다.
      hidden: def.hiddenUntilTriggered && !revealed && now < def.revealAt,
    }
  })
}

/** 지금 막 눈에 띈 것들 (아직 알려주지 않은 것) */
export function newlyRevealed(state: AppState): AutoCollectionDef[] {
  return AUTO_COLLECTIONS.filter(
    (def) =>
      !state.discovery.revealedCollectionIds.includes(def.id) &&
      autoProgress(state, def) >= def.revealAt,
  )
}

/** 다 채웠는데 아직 못 받은 것들 */
export function claimableCollections(state: AppState): AutoCollectionDef[] {
  return AUTO_COLLECTIONS.filter(
    (def) =>
      !state.discovery.claimedCollectionIds.includes(def.id) &&
      autoProgress(state, def) >= def.target,
  )
}
