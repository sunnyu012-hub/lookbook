import type { CollectionRarity } from './collection'

/**
 * 오래된 채석장.
 *
 * ── 정원과 무엇이 다른가 ───────────────────────────────
 *
 * 정원은 심어두고 기다리는 곳이다. 채석장은 그날 가서 들춰보는 곳이다.
 * 그래서 자라는 시간도, 밭도, 돌보는 일도 없다. 하루에 몇 번,
 * 궁금한 데를 골라 살펴보는 게 전부다.
 *
 * ── 안 가면 손해인 것을 만들지 않는다 ──────────────────
 *
 * 오늘 몫을 안 써도 잃는 게 없다. 연속으로 와야 붙는 것도 없고,
 * 며칠 안 왔다고 되돌아가는 것도 없다. 이 앱의 다른 곳과 같은 규칙이다 —
 * 생각날 때 한 번 들르는 자리지 매일 해야 하는 숙제가 아니다.
 */

export const QUARRY_SPOT_IDS = [
  'ROCK_CREVICE',
  'LOW_CLIFF',
  'STONE_PILE',
  'OLD_WORKSHOP',
  'INNER_PATH',
] as const
export type QuarrySpotId = (typeof QUARRY_SPOT_IDS)[number]

export interface QuarrySpotDef {
  id: QuarrySpotId
  name: string
  icon: string
  /** 고르기 전에 보이는 한 줄 */
  teaser: string
  /**
   * 여기서 나올 수 있는 것. 무게가 클수록 자주 나온다.
   *
   * 표에만 적는다 — 화면 코드가 확률을 알면, 나중에 균형을 손볼 때
   * 데이터와 화면이 서로 다른 말을 하게 된다.
   */
  drops: Array<{ itemId: string; weight: number }>
  /** 밤에 조금 더 잘 나오는 것 */
  nightFavored?: string[]
}

export interface MineralDef {
  id: string
  name: string
  icon: string
  rarity: CollectionRarity
  description: string
  /** 도감에서 아직 못 만났을 때 흘리는 한 줄 */
  hint: string
}

/** 저장되는 채석장의 전부 */
export interface QuarryState {
  /** 채석장을 찾은 시각. 아직 못 찾았으면 null. */
  unlockedAt: string | null
  /** 첫 안내를 본 시각. 두 번 띄우지 않으려고 둔다. */
  tutorialSeenAt: string | null
  /** 오늘 몇 번 살펴봤는지. 날짜가 바뀌면 저절로 0 이 된다. */
  attemptsOn: string | null
  attempts: number
  /**
   * 무엇을 몇 번 캤는지.
   *
   * 발견 여부도 진행도도 전부 여기서 센다. 따로 적어두지 않는다 —
   * 두 군데 적으면 언젠가 어긋난다. (정원의 harvestedCropCounts 와 같다)
   */
  foundMineralCounts: Record<string, number>
  /** 막힌 길을 들여다본 적이 있는지. 다음 이야기가 여기서 시작한다. */
  blockedPathSeen: boolean
}

/** 화면에서 보는 탐색 자리 하나 */
export interface QuarrySpotView {
  def: QuarrySpotDef
  /** 여기서 아직 못 만난 것이 남아 있는지 (수는 안 알려준다) */
  hasUnseen: boolean
}

/** 한 번 살펴본 결과 */
export interface QuarryFind {
  itemId: string
  mineral: MineralDef | null
  /** 처음 만난 것인지 */
  isNew: boolean
  /** 곁들여 나온 한 줄. 없으면 null */
  flavor: string | null
}
