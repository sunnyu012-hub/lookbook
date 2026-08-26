import type { AppState, QuarryFind, QuarrySpotDef, QuarrySpotView, QuarryState } from '@/types'
import { addItem, isDiscovered } from '@/lib/collection/progress'
import { craftedKinds } from '@/lib/collection/progress'
import { harvestedTotal } from '@/lib/garden/derive'
import { todayKey } from '@/lib/date'
import { timeBand } from '@/lib/rpg/time'
import { seededRandom } from '@/lib/city/seed'
import { MINERALS, findMineral } from './minerals'
import { AMBIENT, NIGHT_BONUS, QUARRY_SPOTS } from './spots'

/**
 * 채석장 계산 층.
 *
 * 정원·부엌과 같은 규칙을 따른다 — 셀 수 있는 것은 저장하지 않는다.
 * 발견 여부도, 진행도도, 오늘 몇 번 남았는지도 전부 기록에서 나온다.
 */

/** 하루에 살펴볼 수 있는 횟수 */
export const DAILY_ATTEMPTS = 3

export function emptyQuarry(): QuarryState {
  return {
    unlockedAt: null,
    tutorialSeenAt: null,
    attemptsOn: null,
    attempts: 0,
    foundMineralCounts: {},
    blockedPathSeen: false,
  }
}

// ── 찾기 ────────────────────────────────────────────────

/**
 * 채석장이 열리는 조건.
 *
 * 새 조건을 만들지 않았다. 이미 쌓여 있는 두 기록 중 하나만 넘으면 된다 —
 * 정원에서 열 번 거뒀거나, 작업실에서 세 가지를 만들어봤거나.
 * 둘 다 이 업데이트 전에 하던 일이라, 켜는 순간 이미 해온 사람에게는 바로 열린다.
 *
 * 하루의 네 번째 이야기(HARU_4)가 "공원 바깥쪽 돌이 많은 길" 을 말해둔 그 자리다.
 */
export const QUARRY_UNLOCK = { harvested: 10, crafted: 3 } as const

export function unlockProgress(state: AppState): number {
  const byGarden = harvestedTotal(state.garden) / QUARRY_UNLOCK.harvested
  const byCraft = craftedKinds(state.collection) / QUARRY_UNLOCK.crafted
  return Math.max(0, Math.min(1, Math.max(byGarden, byCraft)))
}

export function canUnlockQuarry(state: AppState): boolean {
  return unlockProgress(state) >= 1
}

export function isQuarryUnlocked(state: AppState): boolean {
  return state.quarry.unlockedAt !== null
}

/** 조건을 채웠으면 길을 연다. 여는 것뿐이다 — 안내는 처음 들어갔을 때 한다. */
export function applyQuarryUnlock(
  state: AppState,
  now: Date = new Date(),
): { state: AppState; opened: boolean } {
  if (isQuarryUnlocked(state) || !canUnlockQuarry(state)) return { state, opened: false }
  return {
    state: { ...state, quarry: { ...state.quarry, unlockedAt: now.toISOString() } },
    opened: true,
  }
}

// ── 오늘 몫 ─────────────────────────────────────────────

/**
 * 오늘 몇 번 남았는지.
 *
 * 날짜가 바뀌면 저절로 3 이 된다 — 타이머를 돌리지 않는다.
 * 적어둔 날짜가 오늘이 아니면 그 기록은 어제 것이라 세지 않는다.
 */
export function attemptsLeft(state: AppState, now: Date = new Date()): number {
  const today = todayKey(now)
  if (state.quarry.attemptsOn !== today) return DAILY_ATTEMPTS
  return Math.max(0, DAILY_ATTEMPTS - state.quarry.attempts)
}

export function canExplore(state: AppState, now: Date = new Date()): boolean {
  return isQuarryUnlocked(state) && attemptsLeft(state, now) > 0
}

// ── 무엇이 나올까 ───────────────────────────────────────

/**
 * 한 번 굴린다.
 *
 * 무게가 큰 것이 자주 나온다. 밤에는 몇몇이 조금 더 잘 보인다 —
 * 낮에 못 얻는 것은 하나도 없다. 시간 때문에 영영 못 만나는 게 있으면
 * 그건 놀러 오는 곳이 아니라 알람을 맞춰야 하는 곳이 된다.
 */
export function rollDrop(spot: QuarrySpotDef, night: boolean, rng: () => number): string {
  const weights = spot.drops.map((d) => {
    const favored = night && spot.nightFavored?.includes(d.itemId)
    return favored ? d.weight * NIGHT_BONUS : d.weight
  })
  const total = weights.reduce((sum, w) => sum + w, 0)

  let roll = rng() * total
  for (let i = 0; i < spot.drops.length; i += 1) {
    roll -= weights[i]
    if (roll < 0) return spot.drops[i].itemId
  }
  // 부동소수점 때문에 끝까지 왔으면 마지막 것
  return spot.drops[spot.drops.length - 1].itemId
}

export type ExploreResult =
  | { ok: true; state: AppState; find: QuarryFind }
  | { ok: false; reason: 'LOCKED' | 'NO_ATTEMPTS' | 'UNKNOWN' }

/**
 * 한 자리를 살펴본다.
 *
 * 늘 무언가 하나는 나온다. 오늘 몫을 썼는데 빈손으로 끝나는 경우는 없다.
 * 씨앗은 날짜·자리·몇 번째인지로 만든다 — 새로고침해도 같은 결과가 나오고,
 * 마음에 안 든다고 새로 고쳐서 다시 굴릴 수가 없다.
 */
export function explore(
  state: AppState,
  spotId: string,
  now: Date = new Date(),
  rng?: () => number,
): ExploreResult {
  if (!isQuarryUnlocked(state)) return { ok: false, reason: 'LOCKED' }

  const spot = QUARRY_SPOTS.find((s) => s.id === spotId)
  if (!spot) return { ok: false, reason: 'UNKNOWN' }

  const today = todayKey(now)
  const used = state.quarry.attemptsOn === today ? state.quarry.attempts : 0
  if (used >= DAILY_ATTEMPTS) return { ok: false, reason: 'NO_ATTEMPTS' }

  const random = rng ?? seededRandom(`${today}:${spotId}:${used}`)
  const night = timeBand(now) === 'NIGHT'
  const itemId = rollDrop(spot, night, random)

  const added = addItem(state.collection, itemId, now)
  const counts = { ...state.quarry.foundMineralCounts }
  counts[itemId] = (counts[itemId] ?? 0) + 1

  // 곁들이는 한 줄. 결과를 바꾸지 않는다.
  const flavor = random() < 0.4 ? AMBIENT[Math.floor(random() * AMBIENT.length)] : null

  return {
    ok: true,
    state: {
      ...state,
      collection: added.collection,
      quarry: {
        ...state.quarry,
        attemptsOn: today,
        attempts: used + 1,
        foundMineralCounts: counts,
      },
    },
    find: { itemId, mineral: findMineral(itemId), isNew: added.isNew, flavor },
  }
}

// ── 얼마나 모았나 ───────────────────────────────────────

/** 만나본 광물. 저장하지 않는다 — 캔 기록에서 센다. */
export function discoveredMineralIds(state: AppState): string[] {
  return MINERALS.filter(
    (m) =>
      (state.quarry.foundMineralCounts[m.id] ?? 0) > 0 || isDiscovered(state.collection, m.id),
  ).map((m) => m.id)
}

/** 지금까지 캔 횟수 전부 */
export function minedTotal(quarry: QuarryState): number {
  return Object.values(quarry.foundMineralCounts).reduce((sum, n) => sum + Math.max(0, n), 0)
}

/** 만나본 것 중 가장 귀한 것 */
export function rarestFound(state: AppState) {
  const order = { COMMON: 0, RARE: 1, EPIC: 2, LEGENDARY: 3, SECRET: 4 } as const
  const found = discoveredMineralIds(state)
    .map((id) => findMineral(id))
    .filter((m): m is NonNullable<typeof m> => m !== null)
  if (found.length === 0) return null
  return found.reduce((best, m) => (order[m.rarity] > order[best.rarity] ? m : best))
}

/** 이 자리에서 아직 못 만난 게 남아 있는지 (몇 개인지는 안 알려준다) */
export function spotViews(state: AppState): QuarrySpotView[] {
  const seen = new Set(discoveredMineralIds(state))
  return QUARRY_SPOTS.map((def) => ({
    def,
    hasUnseen: def.drops.some((d) => !seen.has(d.itemId)),
  }))
}

export interface QuarryView {
  spots: QuarrySpotView[]
  found: number
  total: number
  left: number
  night: boolean
  rarest: ReturnType<typeof rarestFound>
}

export function quarryView(state: AppState, now: Date = new Date()): QuarryView {
  return {
    spots: spotViews(state),
    found: discoveredMineralIds(state).length,
    total: MINERALS.length,
    left: attemptsLeft(state, now),
    night: timeBand(now) === 'NIGHT',
    rarest: rarestFound(state),
  }
}

// ── 다음 이야기 ─────────────────────────────────────────

export const STRANGE_FRAGMENT_ID = 'mineral_strange_fragment'

/**
 * 이상한 돌조각을 만난 적이 있는지.
 *
 * 따로 깃발을 세우지 않는다 — 캔 기록에 있으면 만난 것이다.
 * 다음 이야기(Update E)는 이 함수만 보면 된다.
 */
export function strangeFragmentFound(state: AppState): boolean {
  return (state.quarry.foundMineralCounts[STRANGE_FRAGMENT_ID] ?? 0) > 0
}

/** 막힌 길을 들여다본 적이 있는지 */
export function blockedPathSeen(state: AppState): boolean {
  return state.quarry.blockedPathSeen
}

/** 다음 이야기가 시작될 준비가 됐는지 (Update E 가 읽는다) */
export function oldKeyStoryHintFound(state: AppState): boolean {
  return strangeFragmentFound(state)
}
