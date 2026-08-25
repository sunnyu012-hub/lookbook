import type { Category } from './index'
import type { Rarity } from './rpg'

/**
 * 작은 정원.
 *
 * 도시 공원 뒤에 숨어 있는 개인 정원이다. 농장 경영 게임이 아니다.
 *
 * 이 층에는 다음이 없고, 앞으로도 넣지 않는다:
 * 물 주기 · 시듦 · 썩음 · 연속 출석 · 안 들어오면 손해.
 * 며칠을 안 봐도 심어둔 건 그대로 자라 있고, 아무것도 죽지 않는다.
 *
 * 저장하는 건 "무엇을 심었고 무엇을 몇 번 거뒀는지" 뿐이다.
 * 레벨 · 경험치 · 밭 개수 · 발견한 작물 · 지금 다 자랐는지는
 * 전부 그 두 가지에서 계산한다 (lib/garden/derive.ts).
 * 저장해두면 나중에 값을 손봤을 때 저장된 값과 어긋난다.
 */

// ── 작물 ────────────────────────────────────────────────

export const CROP_IDS = [
  'strawberry',
  'tomato',
  'potato',
  'basil',
  'lavender',
  'carrot',
  'pumpkin',
  'tiny_mushroom',
  // 아직 씨앗이 돌지 않는 것들. 도감에 ??? 로 자리만 있다.
  'star_flower',
  'moon_herb',
  'dream_strawberry',
  'golden_strawberry',
] as const
export type CropId = (typeof CROP_IDS)[number]

export interface CropDef {
  id: CropId
  name: string
  /**
   * 이모지 한 글자.
   *
   * 그림이 들어오기 전까지 자리를 지킨다. 도시 사람들과 동료도 이모지로
   * 서 있어서 (npcs.ts 의 avatar) 나란히 뒀을 때 결이 어긋나지 않는다.
   */
  icon: string
  rarity: Rarity
  /** 다 자라는 데 걸리는 시간 */
  growthSeconds: number
  /** 이 작물의 씨앗 아이템 */
  seedItemId: string
  /** 거뒀을 때 손에 들어오는 아이템 */
  harvestItemId: string
  harvestMin: number
  harvestMax: number
  /** 한 줄. */
  description: string
  tags: string[]
  /**
   * 씨앗이 지금 돌고 있는지.
   *
   * false 면 퀘스트에서 씨앗이 나오지 않는다. 도감에는 자리만 있다 —
   * 아직 만날 방법이 없는 것을 "언젠가" 로 남겨두는 자리다.
   */
  seedAvailable: boolean
  /** 이 분야 퀘스트에서 씨앗이 조금 더 잘 나온다. 강제는 아니다. */
  seedBias?: Category[]
  /** 거두기 전에는 도감에서 이름도 감춘다 */
  hiddenUntilDiscovered?: boolean
}

// ── 밭 ──────────────────────────────────────────────────

/**
 * 밭 한 칸. 저장된다.
 *
 * readyAt 을 심는 순간 굳혀둔다. 퀘스트의 exp 를 굳혀두는 것과 같은 이유다 —
 * 나중에 자라는 시간을 손봐도 이미 심어둔 것의 약속은 흔들리지 않아야 한다.
 * 퀘스트로 받은 성장 단축도 여기서 readyAt 을 앞당기는 것으로 끝난다.
 */
export interface GardenPlot {
  id: string
  cropId?: CropId
  /** ISO */
  plantedAt?: string
  /** ISO. 이 시각이 지나면 거둘 수 있다. */
  readyAt?: string
}

/** 저장되는 정원의 전부 */
export interface GardenState {
  /** 정원을 찾은 시각. 아직 못 찾았으면 null. */
  unlockedAt: string | null
  /** 첫 안내를 본 시각. 두 번 띄우지 않으려고 둔다. */
  tutorialSeenAt: string | null
  /** 밭 여덟 칸. 그중 몇 칸을 쓸 수 있는지는 레벨에서 계산한다. */
  plots: GardenPlot[]
  /** cropId → 거둔 횟수. 경험치도 레벨도 발견 여부도 여기서 나온다. */
  harvestedCropCounts: Record<string, number>
  /** 지금까지 심은 횟수. 되돌아가지 않는 기록이다. */
  plantedCount: number
}

// ── 화면에서 보는 모양 ──────────────────────────────────

/**
 * LOCKED  — 정원이 더 넓어지면 열리는 칸
 * EMPTY   — 심을 수 있다
 * GROWING — 자라는 중
 * READY   — 거둘 수 있다
 */
export type PlotState = 'LOCKED' | 'EMPTY' | 'GROWING' | 'READY'

/** 0 씨앗 · 1 싹 · 2 어린 것 · 3 다 큰 것 · 4 거둘 때 */
export type GrowthStage = 0 | 1 | 2 | 3 | 4

export interface GardenPlotView {
  plot: GardenPlot
  index: number
  state: PlotState
  crop: CropDef | null
  stage: GrowthStage
  /** 0~1 */
  progress: number
  /** 다 자랄 때까지 남은 초. 다 자랐으면 0. */
  remainingSeconds: number
}

export interface GardenView {
  unlocked: boolean
  level: number
  xp: number
  /** 다음 단계까지 필요한 경험치. 마지막 단계면 null. */
  nextLevelXp: number | null
  plotsUnlocked: number
  plots: GardenPlotView[]
  readyCount: number
  growingCount: number
  /** 거둬본 작물 수 */
  discoveredCount: number
  /** 도감에 자리가 있는 작물 수 */
  totalCrops: number
}

/** 씨앗 가방 한 줄 */
export interface SeedStock {
  crop: CropDef
  count: number
}
