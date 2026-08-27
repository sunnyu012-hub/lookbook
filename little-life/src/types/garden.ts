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
   * 씨앗이 처음부터 돌고 있는지.
   *
   * false 면 찾기 전까지는 퀘스트에서도 안 나오고 심을 수도 없다.
   * 찾고 나면 (discovery 조건을 채우면) 그때부터 돈다.
   */
  seedAvailable: boolean
  /**
   * 찾아야 만나는 것.
   *
   * 조건은 전부 이미 쌓여 있는 기록에서 센다 — 정원 단계 · 거둔 가짓수 ·
   * 특정 작물을 몇 번 거뒀는지 · 밤에 끝낸 퀘스트 수.
   * 그래서 이 업데이트를 켜는 순간 그동안의 기록이 그대로 반영된다.
   */
  discovery?: RareDiscovery
  /** 이 분야 퀘스트에서 씨앗이 조금 더 잘 나온다. 강제는 아니다. */
  seedBias?: Category[]
  /** 거두기 전에는 도감에서 이름도 감춘다 */
  hiddenUntilDiscovered?: boolean
}

/** 희귀 작물을 찾는 조건 하나 */
export type RareCondition =
  /** 정원이 이만큼 넓어지면 */
  | { kind: 'GARDEN_LEVEL'; level: number }
  /** 서로 다른 작물을 이만큼 거뒀으면 */
  | { kind: 'CROPS_DISCOVERED'; count: number }
  /** 이 작물을 이만큼 거뒀으면 */
  | { kind: 'CROP_HARVESTED'; cropId: CropId; count: number }
  /** 밤에 끝낸 퀘스트가 이만큼이면 */
  | { kind: 'NIGHT_QUESTS'; count: number }
  /**
   * 서로 다른 요리를 이만큼 만들어봤으면.
   *
   * "알게 된 요리" 가 아니라 "만들어본 요리" 를 본다. 부엌 쪽 계산을
   * 들여오면 정원 ↔ 부엌이 서로를 부르게 되고, 그건 언제 터져도
   * 이상하지 않은 구조다. 만든 횟수는 저장된 값이라 그냥 읽으면 된다.
   */
  | { kind: 'RECIPES_COOKED'; count: number }

export interface RareDiscovery {
  /** 전부 만족하면 찾는다 */
  conditions: RareCondition[]
  /** 찾은 순간의 한 줄 */
  reveal: string
  /**
   * 찾고 나서 퀘스트에서 씨앗이 다시 나올 확률 (%).
   *
   * 한 번 주고 끝내지 않는다 — 한 번 심으면 다시는 못 보는 작물은
   * 발견이 아니라 박제다.
   */
  reseedChance: number
  /** 밤에 끝낸 퀘스트에서만 다시 나오는지 */
  nightOnly?: boolean
}

/**
 * 같은 작물에서 아주 가끔 나오는 다른 것.
 *
 * 씨앗을 따로 심는 게 아니라, 거둘 때 섞여 나온다.
 */
export interface CropVariant {
  id: string
  /** 어느 작물을 거둘 때 나오는지 */
  baseCropId: CropId
  /** 나오는 작물 (그 자체도 CropDef 다) */
  cropId: CropId
  /** 기본 확률 (%) */
  chance: number
  /** 정원 단계가 이만큼이면 조금 더 (%p) */
  levelBonus: { level: number; add: number }
  /** 이만큼 거뒀으면 조금 더 (%p) */
  harvestBonus: { count: number; add: number }
  /**
   * 이만큼 거뒀는데도 못 봤으면 다음에 반드시 나온다.
   *
   * 운이 나빠서 영영 못 보는 일을 만들지 않는다.
   * 이 값도 저장하지 않는다 — 거둔 기록에서 그대로 센다.
   */
  pityAt: number
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
  /**
   * 첫 씨앗을 이미 받은 희귀 작물.
   *
   * 찾았는지 자체는 저장하지 않는다 (조건에서 계산한다).
   * 여기 있는 건 "처음 한 번을 이미 줬는지" 뿐이라 두 번 줄 수가 없다.
   */
  rareSeedsGiven: string[]
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
