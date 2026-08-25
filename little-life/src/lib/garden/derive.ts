import type {
  AppState,
  Category,
  CropDef,
  CropId,
  GardenPlot,
  GardenPlotView,
  GardenState,
  GardenView,
  GrowthStage,
  PlotState,
  Rarity,
  SeedStock,
} from '@/types'
import { addItem, ownedCount, spendItems } from '@/lib/collection/progress'
import {
  CROPS,
  GARDEN_DEW_ITEM_ID,
  GARDEN_DEW_SECONDS,
  findCrop,
} from './crops'

/**
 * 정원의 계산.
 *
 * 여기 있는 건 거의 다 계산이다. 레벨도 경험치도 밭 개수도 저장하지 않는다.
 * "무엇을 몇 번 거뒀는지" 하나에서 전부 나온다 —
 * 그래야 나중에 필요 경험치를 손봐도 저장된 값과 어긋나지 않고,
 * 이 업데이트를 처음 켜는 사람에게 따로 채워 넣는 코드가 필요 없다.
 *
 * 그리고 이 파일에는 다음이 없다:
 * 물 주기 · 시듦 · 죽음 · 되돌아가는 진행도.
 * 며칠을 안 봐도 심어둔 것은 그대로 서서 기다린다.
 */

/** 밭은 여덟 칸까지 넓어진다 */
export const MAX_PLOTS = 8

/** 거뒀을 때 쌓이는 경험치 */
export const XP_BY_RARITY: Record<Rarity, number> = {
  COMMON: 1,
  RARE: 2,
  EPIC: 4,
  LEGENDARY: 8,
}

export interface GardenLevelDef {
  level: number
  /** 이만큼 쌓이면 이 단계 */
  needXp: number
  plots: number
}

export const GARDEN_LEVELS: GardenLevelDef[] = [
  { level: 1, needXp: 0, plots: 4 },
  { level: 2, needXp: 20, plots: 6 },
  { level: 3, needXp: 60, plots: MAX_PLOTS },
]

export const MAX_GARDEN_LEVEL = GARDEN_LEVELS[GARDEN_LEVELS.length - 1].level

// ── 빈 정원 ─────────────────────────────────────────────

export function emptyPlots(): GardenPlot[] {
  return Array.from({ length: MAX_PLOTS }, (_, i) => ({ id: `plot-${i + 1}` }))
}

export function emptyGarden(): GardenState {
  return {
    unlockedAt: null,
    tutorialSeenAt: null,
    plots: emptyPlots(),
    harvestedCropCounts: {},
    plantedCount: 0,
  }
}

// ── 레벨 ────────────────────────────────────────────────

/** 거둔 기록에서 그대로 센다 */
export function gardenXp(garden: GardenState): number {
  let xp = 0
  for (const [cropId, count] of Object.entries(garden.harvestedCropCounts)) {
    const crop = findCrop(cropId)
    if (!crop) continue
    xp += XP_BY_RARITY[crop.rarity] * Math.max(0, count)
  }
  return xp
}

export function gardenLevel(xp: number): number {
  let level = 1
  for (const def of GARDEN_LEVELS) {
    if (xp >= def.needXp) level = def.level
  }
  return level
}

export function plotsForLevel(level: number): number {
  const def = GARDEN_LEVELS.find((d) => d.level === level)
  return def?.plots ?? GARDEN_LEVELS[0].plots
}

/** 다음 단계까지 필요한 경험치. 마지막 단계면 null. */
export function nextLevelXp(level: number): number | null {
  const next = GARDEN_LEVELS.find((d) => d.level === level + 1)
  return next?.needXp ?? null
}

/** 거둬본 작물 — 따로 저장하지 않고 거둔 기록에서 센다 */
export function discoveredCropIds(garden: GardenState): CropId[] {
  return CROPS.filter((c) => (garden.harvestedCropCounts[c.id] ?? 0) > 0).map((c) => c.id)
}

export function harvestedTotal(garden: GardenState): number {
  return Object.values(garden.harvestedCropCounts).reduce((sum, n) => sum + Math.max(0, n), 0)
}

// ── 해금 ────────────────────────────────────────────────

/**
 * 정원을 찾는 조건.
 *
 * 둘 다 이미 쌓여 있는 기록에서 센다. 되돌아가지 않는 값이라
 * "며칠 쉬었더니 조건이 도로 멀어졌다" 가 생길 수 없다.
 *
 * 초록 공원은 이 도시에서 몸과 마음 쪽 일을 하러 가는 동네다.
 * 거기 몇 번 다녀온 사람에게 그 너머가 보이는 게 자연스럽다.
 */
export const GARDEN_UNLOCK = {
  /** 초록 공원 평판 — 그 동네에서 뭔가 하면 쌓인다 (한 번에 1~3) */
  parkReputation: 6,
  /** 생활 · 몸 · 마음 퀘스트를 합쳐서 */
  quietQuests: 10,
  quietCategories: ['LIFE', 'BODY', 'MIND'] as Category[],
}

export function unlockProgress(state: AppState): number {
  const park = (state.reputation.GREEN_PARK ?? 0) / GARDEN_UNLOCK.parkReputation
  const quiet =
    GARDEN_UNLOCK.quietCategories.reduce((sum, c) => sum + (state.categoryCompleted[c] ?? 0), 0) /
    GARDEN_UNLOCK.quietQuests

  // 평균이 아니라 제일 덜 온 것. 하나를 채웠다고 다 온 것처럼 보이면 안 된다.
  return Math.max(0, Math.min(1, Math.min(park, quiet)))
}

export function canUnlockGarden(state: AppState): boolean {
  return unlockProgress(state) >= 1
}

export function isGardenUnlocked(state: AppState): boolean {
  return state.garden.unlockedAt !== null
}

/**
 * 조건을 채웠으면 정원을 연다.
 *
 * 여는 것뿐이다. 씨앗도 안내도 여기서 주지 않는다 —
 * 그건 처음 들어갔을 때 (enterGarden) 한다.
 */
export function applyGardenUnlock(
  state: AppState,
  now: Date = new Date(),
): { state: AppState; opened: boolean } {
  if (isGardenUnlocked(state) || !canUnlockGarden(state)) return { state, opened: false }

  return {
    state: { ...state, garden: { ...state.garden, unlockedAt: now.toISOString() } },
    opened: true,
  }
}

// ── 밭 ──────────────────────────────────────────────────

export function plotsUnlocked(garden: GardenState): number {
  return plotsForLevel(gardenLevel(gardenXp(garden)))
}

function stageFor(progress: number): GrowthStage {
  if (progress >= 1) return 4
  if (progress >= 0.75) return 3
  if (progress >= 0.4) return 2
  if (progress >= 0.1) return 1
  return 0
}

export function plotView(
  plot: GardenPlot,
  index: number,
  openPlots: number,
  now: Date = new Date(),
): GardenPlotView {
  const crop = plot.cropId ? findCrop(plot.cropId) : null

  // 심어둔 게 있으면 잠긴 칸이어도 계속 자라고 거둘 수 있다.
  // 값을 손봐서 밭이 줄어드는 일이 생겨도 심어둔 걸 잃지 않게.
  if (!crop || !plot.plantedAt || !plot.readyAt) {
    return {
      plot,
      index,
      state: index < openPlots ? 'EMPTY' : ('LOCKED' as PlotState),
      crop: null,
      stage: 0,
      progress: 0,
      remainingSeconds: 0,
    }
  }

  const planted = new Date(plot.plantedAt).getTime()
  const ready = new Date(plot.readyAt).getTime()
  const span = Math.max(1, ready - planted)
  const progress = Math.max(0, Math.min(1, (now.getTime() - planted) / span))
  const remaining = Math.max(0, Math.ceil((ready - now.getTime()) / 1000))

  return {
    plot,
    index,
    state: remaining === 0 ? 'READY' : 'GROWING',
    crop,
    stage: stageFor(progress),
    progress,
    remainingSeconds: remaining,
  }
}

export function gardenView(state: AppState, now: Date = new Date()): GardenView {
  const garden = state.garden
  const xp = gardenXp(garden)
  const level = gardenLevel(xp)
  const open = plotsForLevel(level)
  const plots = garden.plots.map((plot, i) => plotView(plot, i, open, now))

  return {
    unlocked: isGardenUnlocked(state),
    level,
    xp,
    nextLevelXp: nextLevelXp(level),
    plotsUnlocked: open,
    plots,
    readyCount: plots.filter((p) => p.state === 'READY').length,
    growingCount: plots.filter((p) => p.state === 'GROWING').length,
    discoveredCount: discoveredCropIds(garden).length,
    totalCrops: CROPS.length,
  }
}

/** 지금 거둘 수 있는 것이 몇 개인지 — 홈에서 한 줄 띄우는 데 쓴다 */
export function readyCount(state: AppState, now: Date = new Date()): number {
  if (!isGardenUnlocked(state)) return 0
  return state.garden.plots.filter((p) => plotView(p, 0, MAX_PLOTS, now).state === 'READY').length
}

// ── 씨앗 가방 ───────────────────────────────────────────

/** 지금 가진 씨앗. 0개인 것은 빼고 준다. */
export function seedStock(state: AppState): SeedStock[] {
  return CROPS.map((crop) => ({ crop, count: ownedCount(state.collection, crop.seedItemId) }))
    .filter((s) => s.count > 0)
    .sort((a, b) => a.crop.growthSeconds - b.crop.growthSeconds)
}

export function seedCount(state: AppState, cropId: string): number {
  const crop = findCrop(cropId)
  return crop ? ownedCount(state.collection, crop.seedItemId) : 0
}

export function dewCount(state: AppState): number {
  return ownedCount(state.collection, GARDEN_DEW_ITEM_ID)
}

// ── 심기 ────────────────────────────────────────────────

export type PlantResult =
  | { ok: true; crop: CropDef }
  | { ok: false; reason: 'LOCKED' | 'BUSY' | 'NO_SEED' | 'UNKNOWN' }

/**
 * 씨앗 하나를 심는다.
 *
 * readyAt 을 여기서 굳혀둔다. 나중에 자라는 시간을 손봐도
 * 이미 심어둔 것의 약속은 흔들리지 않아야 한다.
 */
export function plantSeed(
  state: AppState,
  plotIndex: number,
  cropId: string,
  now: Date = new Date(),
): { state: AppState; result: PlantResult } {
  const crop = findCrop(cropId)
  if (!crop) return { state, result: { ok: false, reason: 'UNKNOWN' } }

  const plot = state.garden.plots[plotIndex]
  if (!plot) return { state, result: { ok: false, reason: 'UNKNOWN' } }
  if (plotIndex >= plotsUnlocked(state.garden)) {
    return { state, result: { ok: false, reason: 'LOCKED' } }
  }
  if (plot.cropId) return { state, result: { ok: false, reason: 'BUSY' } }

  const spent = spendItems(state.collection, [{ itemId: crop.seedItemId, count: 1 }])
  if (!spent) return { state, result: { ok: false, reason: 'NO_SEED' } }

  const readyAt = new Date(now.getTime() + crop.growthSeconds * 1000)
  const plots = state.garden.plots.map((p, i) =>
    i === plotIndex
      ? { id: p.id, cropId: crop.id, plantedAt: now.toISOString(), readyAt: readyAt.toISOString() }
      : p,
  )

  return {
    state: {
      ...state,
      collection: spent,
      garden: { ...state.garden, plots, plantedCount: state.garden.plantedCount + 1 },
    },
    result: { ok: true, crop },
  }
}

// ── 거두기 ──────────────────────────────────────────────

export type HarvestResult =
  | { ok: true; crop: CropDef; count: number; isNew: boolean; leveledUp: number | null }
  | { ok: false; reason: 'EMPTY' | 'NOT_READY' | 'UNKNOWN' }

/**
 * 다 자란 것을 거둔다.
 *
 * 거두고 나면 그 칸은 빈다. 저절로 다시 심지 않는다 —
 * 무엇을 심을지는 사람이 고르는 게 이 정원의 거의 유일한 선택이다.
 */
export function harvestPlot(
  state: AppState,
  plotIndex: number,
  now: Date = new Date(),
  rng: () => number = Math.random,
): { state: AppState; result: HarvestResult } {
  const plot = state.garden.plots[plotIndex]
  if (!plot) return { state, result: { ok: false, reason: 'UNKNOWN' } }

  const view = plotView(plot, plotIndex, MAX_PLOTS, now)
  if (!view.crop) return { state, result: { ok: false, reason: 'EMPTY' } }
  if (view.state !== 'READY') return { state, result: { ok: false, reason: 'NOT_READY' } }

  const crop = view.crop
  const span = crop.harvestMax - crop.harvestMin + 1
  const count = Math.min(crop.harvestMax, crop.harvestMin + Math.floor(rng() * span))

  let collection = state.collection
  let isNew = false
  for (let i = 0; i < count; i += 1) {
    const added = addItem(collection, crop.harvestItemId, now)
    collection = added.collection
    if (added.isNew) isNew = true
  }

  const before = gardenLevel(gardenXp(state.garden))
  const garden: GardenState = {
    ...state.garden,
    plots: state.garden.plots.map((p, i) => (i === plotIndex ? { id: p.id } : p)),
    harvestedCropCounts: {
      ...state.garden.harvestedCropCounts,
      [crop.id]: (state.garden.harvestedCropCounts[crop.id] ?? 0) + 1,
    },
  }
  const after = gardenLevel(gardenXp(garden))

  return {
    state: { ...state, collection, garden },
    result: { ok: true, crop, count, isNew, leveledUp: after > before ? after : null },
  }
}

// ── 이슬 ────────────────────────────────────────────────

export type DewResult = { ok: true; seconds: number } | { ok: false; reason: 'NO_DEW' | 'NOT_GROWING' }

/**
 * 이슬 한 방울로 밭 하나를 30분 앞당긴다.
 *
 * 쓰라고 재촉하지 않는다. 안 쓰고 모아둬도 아무 손해가 없다.
 */
export function useDew(
  state: AppState,
  plotIndex: number,
  now: Date = new Date(),
): { state: AppState; result: DewResult } {
  const plot = state.garden.plots[plotIndex]
  if (!plot?.readyAt) return { state, result: { ok: false, reason: 'NOT_GROWING' } }

  const view = plotView(plot, plotIndex, MAX_PLOTS, now)
  if (view.state !== 'GROWING') return { state, result: { ok: false, reason: 'NOT_GROWING' } }

  const spent = spendItems(state.collection, [{ itemId: GARDEN_DEW_ITEM_ID, count: 1 }])
  if (!spent) return { state, result: { ok: false, reason: 'NO_DEW' } }

  return {
    state: {
      ...state,
      collection: spent,
      garden: { ...state.garden, plots: shiftReady(state.garden.plots, plotIndex, GARDEN_DEW_SECONDS) },
    },
    result: { ok: true, seconds: GARDEN_DEW_SECONDS },
  }
}

/** 한 칸의 readyAt 을 seconds 만큼 앞당긴다 (음수면 뒤로 민다) */
export function shiftReady(plots: GardenPlot[], index: number, seconds: number): GardenPlot[] {
  return plots.map((p, i) => {
    if (i !== index || !p.readyAt || !p.plantedAt) return p
    // 심은 시각보다 앞으로는 못 간다. 심자마자 다 자란 것으로 만들지 않는다.
    const planted = new Date(p.plantedAt).getTime()
    const next = Math.max(planted + 1000, new Date(p.readyAt).getTime() - seconds * 1000)
    return { ...p, readyAt: new Date(next).toISOString() }
  })
}
