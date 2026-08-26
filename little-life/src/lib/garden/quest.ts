import type { AppState, Category, CropDef, Difficulty, GardenPlot } from '@/types'
import { GARDEN_DEW_ITEM_ID, PLANTABLE_CROPS, RARE_CROPS } from './crops'
import { MAX_PLOTS, isGardenUnlocked, isRareFound, plotView, shiftReady } from './derive'

/**
 * 퀘스트와 정원 사이.
 *
 * ── 기존 보상 계산을 건드리지 않는다 ────────────────────
 *
 * EXP · 코인 · 장비 드롭 · 재료 드롭은 하나도 손대지 않는다.
 * 여기 있는 건 전부 그 위에 따로 얹히는 굴림이다.
 * 씨앗이 안 나와도 원래 받던 것은 그대로 다 받는다.
 *
 * ── 정원이 현실의 숙제를 정하지 않는다 ──────────────────
 *
 * 분야별 기울기는 아주 약하다. 어떤 씨앗도 특정 분야에서만
 * 나오지 않는다. "라벤더를 얻으려면 마음 퀘스트를 해야 한다" 가
 * 되는 순간, 정원이 오늘 뭘 할지를 고르기 시작한다.
 */

// ── 모험 에너지 ─────────────────────────────────────────

/**
 * 퀘스트를 끝내면 조금씩 쌓이는 것.
 *
 * 지금은 쓰는 곳이 없다. 앞으로 들어올 광산·던전 같은 곁가지가
 * 이걸 쓴다. 퀘스트를 하는 데도, 정원이 자라는 데도 필요하지 않다 —
 * 에너지가 0이어도 오늘 할 수 있는 일은 하나도 줄지 않는다.
 */
export const MAX_ADVENTURE_ENERGY = 10

export const ENERGY_BY_DIFFICULTY: Record<Difficulty, number> = {
  EASY: 1,
  NORMAL: 1,
  HARD: 2,
}

export const ENERGY_BOSS = 3

/** 넘치는 만큼은 버린다. 실제로 오른 양을 돌려준다 — 되돌릴 때 그만큼만 뺀다. */
export function gainEnergy(current: number, amount: number, max = MAX_ADVENTURE_ENERGY): number {
  return Math.max(0, Math.min(max, current + amount)) - current
}

// ── 씨앗 드롭 ───────────────────────────────────────────

/**
 * 퀘스트에서 씨앗이 나올 확률 (%).
 *
 * 처음 잡았던 20/20/30 은 실제로 도는 퀘스트를 안 본 숫자였다.
 * 준비된 목록 142개 중 119개가 쉬움이라, 추천으로 뜨는 건 사실상
 * 전부 20% 굴림이다. 하루 세 개를 해도 씨앗이 이틀에 하나꼴이고,
 * 채석장까지 열일곱 날이 걸렸다. 만들어둔 걸 아무도 못 보는 속도다.
 *
 * 쉬움만 올리면 보통이 쉬움보다 못해진다 — 그래서 같이 올린다.
 * 순서(쉬움 = 보통 < 어려움 < 보스)는 원래 모양 그대로다.
 */
export const SEED_CHANCE: Record<Difficulty, number> = {
  EASY: 35,
  NORMAL: 35,
  HARD: 45,
}

export const SEED_CHANCE_BOSS = 60

/** 아침 이슬이 나올 확률 (%). 아주 가끔이다. */
export const DEW_CHANCE = 4

/**
 * 이 분야에서 나올 씨앗 하나.
 *
 * 분야가 맞는 씨앗의 무게를 두 배로 준다. 그뿐이다 —
 * 맞지 않는 씨앗도 얼마든지 나온다.
 */
export function pickSeedCrop(category: Category, rng: () => number = Math.random): CropDef | null {
  const pool = PLANTABLE_CROPS
  if (pool.length === 0) return null

  const weights = pool.map((c) => (c.seedBias?.includes(category) ? 2 : 1))
  const total = weights.reduce((a, b) => a + b, 0)
  let roll = rng() * total

  for (let i = 0; i < pool.length; i += 1) {
    roll -= weights[i]
    if (roll < 0) return pool[i]
  }
  return pool[pool.length - 1]
}

export interface SeedDropOptions {
  category: Category
  difficulty: Difficulty
  /** 보스를 넘었을 때 */
  boss?: boolean
  /** 밤에 끝냈는지. 밤에만 다시 나오는 씨앗이 있다. */
  night?: boolean
  rng?: () => number
}

/**
 * 찾아낸 희귀 씨앗이 다시 나올 기회.
 *
 * 한 번 주고 끝내지 않는다 — 한 번 심으면 다시는 못 보는 작물은
 * 발견이 아니라 박제다. 확률은 낮지만 없지는 않다.
 */
function rollRareSeed(
  state: AppState,
  night: boolean,
  rng: () => number,
): string | null {
  for (const crop of RARE_CROPS) {
    if (!crop.discovery) continue
    if (!isRareFound(state, crop)) continue
    if (crop.discovery.nightOnly && !night) continue
    if (rng() * 100 < crop.discovery.reseedChance) return crop.seedItemId
  }
  return null
}

/**
 * 퀘스트 하나를 끝냈을 때 나오는 정원 물건.
 *
 * 정원을 아직 못 찾았으면 아무것도 안 나온다 —
 * 쓸 데 없는 씨앗이 가방에 먼저 쌓여 있으면 그건 힌트가 아니라 잡동사니다.
 */
export function rollGardenDrops(state: AppState, options: SeedDropOptions): string[] {
  if (!isGardenUnlocked(state)) return []

  const { category, difficulty, boss = false, night = false, rng = Math.random } = options
  const out: string[] = []

  const chance = boss ? SEED_CHANCE_BOSS : SEED_CHANCE[difficulty]
  if (rng() * 100 < chance) {
    const crop = pickSeedCrop(category, rng)
    if (crop) out.push(crop.seedItemId)
  }

  if (rng() * 100 < DEW_CHANCE) out.push(GARDEN_DEW_ITEM_ID)

  // 이미 찾아낸 희귀 씨앗은 아주 가끔 다시 나온다
  const rare = rollRareSeed(state, night, rng)
  if (rare) out.push(rare)

  return out
}

// ── 성장 보너스 ─────────────────────────────────────────

/**
 * 퀘스트를 끝내면 자라는 중인 것들이 조금 앞당겨진다.
 *
 * 어디까지나 덤이다. 퀘스트를 안 해도 작물은 제 시간에 다 자란다.
 * 이걸 놓쳤다고 손해 보는 건 아무것도 없다.
 */
export const GROWTH_BONUS_SECONDS: Record<Difficulty, number> = {
  EASY: 5 * 60,
  NORMAL: 10 * 60,
  HARD: 15 * 60,
}

export const GROWTH_BONUS_BOSS = 30 * 60

/** 되돌릴 때 정확히 반대로 돌리려고 남기는 기록 */
export interface GrowthBonusApplied {
  plotId: string
  /** 이때 그 칸에 심겨 있던 것. 그 사이 거두고 다시 심었으면 되돌리지 않는다. */
  plantedAt: string
  seconds: number
}

/**
 * 자라는 중인 밭 전부를 seconds 만큼 앞당긴다.
 *
 * 다 자란 칸은 건드리지 않는다 — 이미 기다림이 끝난 것을 더 앞당길 일은 없다.
 */
export function applyGrowthBonus(
  state: AppState,
  seconds: number,
  now: Date = new Date(),
): { state: AppState; applied: GrowthBonusApplied[] } {
  if (!isGardenUnlocked(state) || seconds <= 0) return { state, applied: [] }

  const applied: GrowthBonusApplied[] = []
  let plots: GardenPlot[] = state.garden.plots

  state.garden.plots.forEach((plot, index) => {
    if (plotView(plot, index, MAX_PLOTS, now).state !== 'GROWING') return
    if (!plot.plantedAt) return
    plots = shiftReady(plots, index, seconds)
    applied.push({ plotId: plot.id, plantedAt: plot.plantedAt, seconds })
  })

  if (applied.length === 0) return { state, applied: [] }
  return { state: { ...state, garden: { ...state.garden, plots } }, applied }
}

/**
 * 앞당겼던 것을 도로 민다.
 *
 * 그 사이 거두고 다시 심은 칸은 건너뛴다 (plantedAt 이 다르다).
 * 이미 끝난 기다림을 다시 늘리지 않는다.
 */
export function revertGrowthBonus(state: AppState, applied: GrowthBonusApplied[]): AppState {
  if (applied.length === 0) return state

  let plots = state.garden.plots
  for (const record of applied) {
    const index = plots.findIndex((p) => p.id === record.plotId)
    if (index < 0) continue
    if (plots[index].plantedAt !== record.plantedAt) continue
    plots = shiftReady(plots, index, -record.seconds)
  }

  return { ...state, garden: { ...state.garden, plots } }
}
