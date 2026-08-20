/**
 * Quest Master — 오늘 뭘 할지 골라 주는 쪽.
 *
 * 규칙
 *   · 오늘 모드와 오늘 적어 둔 이벤트를 보고 비중을 바꾼다. 감추지는 않는다.
 *     (HOME 을 잘 안 한다고 HOME 을 없애 버리면 영영 안 하게 된다)
 *   · 에너지가 높다고 무리한 운동을 권하지 않는다.
 *   · 반복 퀘스트는 하루 몇 번까지만 XP 를 준다. 그 뒤로도 기록은 되지만 XP 는 0.
 */
import type { EnergyMode } from '@/types'
import { QUEST_BY_ID, QUEST_POOL } from './pool'
import { XP_BY_DIFFICULTY, questXp, type Difficulty, type Quest, type QuestCategory } from './types'

// ─────────────────────────────────────────────
// 완료 기록
// ─────────────────────────────────────────────

/** questId → 오늘 몇 번 했는지 */
export type Completions = Record<string, number>

export interface DayQuests {
  /** 오늘 골라 둔 퀘스트 */
  picks: string[]
  completions: Completions
}

export const emptyDay = (): DayQuests => ({ picks: [], completions: {} })

/** 반복 퀘스트가 XP 를 받는 기본 횟수 */
const DEFAULT_REPEAT_LIMIT = 3

export function xpLimitOf(quest: Quest): number {
  if (!quest.repeatable) return 1
  return quest.dailyXpLimit ?? DEFAULT_REPEAT_LIMIT
}

/** 이 퀘스트를 한 번 더 하면 XP 를 받는가 */
export function willEarnXp(quest: Quest, completions: Completions): boolean {
  return (completions[quest.id] ?? 0) < xpLimitOf(quest)
}

// ─────────────────────────────────────────────
// XP 와 콤보
// ─────────────────────────────────────────────

/** 오늘 첫 퀘스트 보너스 */
export const FIRST_QUEST_BONUS = 2

/** 콤보 — 오늘 완료 횟수가 이 수에 닿으면 한 번씩 얹어 준다 */
export const COMBO_STEPS: { at: number; bonus: number; label: string }[] = [
  { at: 5, bonus: 5, label: '5 QUEST COMBO' },
  { at: 10, bonus: 10, label: '10 QUEST COMBO' },
  { at: 15, bonus: 15, label: '15 QUEST COMBO' },
  { at: 20, bonus: 20, label: '20 QUEST COMBO' },
]

/** 오늘의 추천 하나에 붙는 배수 */
export const FEATURED_MULTIPLIER = 1.5

/** 완료 횟수의 합 */
export const totalDone = (completions: Completions) =>
  Object.values(completions).reduce((s, n) => s + n, 0)

export interface XpGain {
  base: number
  featured: boolean
  firstOfDay: boolean
  combo: { label: string; bonus: number } | null
  total: number
}

/**
 * 이 퀘스트를 지금 완료하면 XP 를 얼마나 받는지.
 * 화면에서 미리 보여 주고, 실제 적립도 같은 함수를 쓴다.
 */
export function xpFor(
  quest: Quest,
  completions: Completions,
  featuredId: string | null,
): XpGain {
  const earns = willEarnXp(quest, completions)
  const base = earns ? questXp(quest) : 0
  const featured = earns && quest.id === featuredId
  const done = totalDone(completions)
  const firstOfDay = earns && done === 0
  const next = done + 1
  const combo = earns ? (COMBO_STEPS.find((c) => c.at === next) ?? null) : null

  const total =
    Math.round(base * (featured ? FEATURED_MULTIPLIER : 1)) +
    (firstOfDay ? FIRST_QUEST_BONUS : 0) +
    (combo?.bonus ?? 0)

  return { base, featured, firstOfDay, combo, total }
}

/** 하루치 기록에서 오늘 번 XP 를 다시 계산한다 (되짚어 계산해도 같은 값이 나온다) */
export function dayXp(day: DayQuests, featuredId: string | null, all: Quest[]): number {
  const byId = new Map(all.map((q) => [q.id, q]))
  let xp = 0
  let n = 0
  for (const [id, count] of Object.entries(day.completions)) {
    const quest = byId.get(id)
    if (!quest) continue
    const paid = Math.min(count, xpLimitOf(quest))
    xp += Math.round(questXp(quest) * (id === featuredId ? FEATURED_MULTIPLIER : 1)) * paid
    n += count
  }
  if (n > 0) xp += FIRST_QUEST_BONUS
  COMBO_STEPS.forEach((c) => {
    if (n >= c.at) xp += c.bonus
  })
  return xp
}

// ─────────────────────────────────────────────
// 추천
// ─────────────────────────────────────────────

/** 모드별로 비중을 올려 주는 카테고리 */
const MODE_WEIGHTS: Record<EnergyMode, Partial<Record<QuestCategory, number>>> = {
  RECOVERY: { recovery: 3.2, care: 2.6, food: 2.2, cozy: 2.4, mind: 1.8, memory: 1.4 },
  EASY: { care: 2.2, home: 1.8, mind: 2.0, fun: 2.0, cozy: 1.8, style: 1.5, memory: 1.4 },
  NORMAL: { work: 1.8, style: 1.6, move: 1.6, life: 1.6, social: 1.5, home: 1.4, growth: 1.4 },
  POWER: { move: 1.8, work: 1.7, growth: 1.7, climbing: 1.6, life: 1.5, style: 1.4 },
}

/** 모드별로 잘 맞는 난이도 */
const MODE_DIFFICULTY: Record<EnergyMode, Partial<Record<Difficulty, number>>> = {
  RECOVERY: { tiny: 2.6, easy: 1.6, normal: 0.5, big: 0.15 },
  EASY: { tiny: 1.8, easy: 1.8, normal: 0.9, big: 0.4 },
  NORMAL: { tiny: 1.1, easy: 1.4, normal: 1.4, big: 0.9 },
  POWER: { tiny: 0.9, easy: 1.2, normal: 1.5, big: 1.3 },
}

export interface RecommendInput {
  mode: EnergyMode | null
  /** 오늘 적어 둔 이벤트 태그 */
  events: string[]
  /** 이미 골라 둔 / 완료한 퀘스트는 다시 추천하지 않는다 */
  exclude: string[]
  /** 자주 하는 카테고리 (비중만 살짝 올린다) */
  favoriteCategories?: QuestCategory[]
  /** 직접 만든 퀘스트도 후보에 넣는다 */
  custom?: Quest[]
  /** 같은 날에는 같은 추천이 나오도록 하는 씨앗 */
  seed: number
}

/** 씨앗 기반 난수 — 새로고침해도 오늘 추천이 흔들리지 않게 */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export function scoreQuest(quest: Quest, input: RecommendInput): number {
  const mode = input.mode ?? 'EASY'
  let score = 1

  score *= MODE_WEIGHTS[mode][quest.category] ?? 1
  score *= MODE_DIFFICULTY[mode][quest.difficulty] ?? 1

  // 퀘스트가 스스로 밝힌 궁합
  if (quest.modes?.includes(mode)) score *= 1.6
  if (quest.events?.some((e) => input.events.includes(e))) score *= 2.4

  // 오늘 이벤트에 따라 결이 맞는 카테고리를 올려 준다
  const has = (t: string) => input.events.includes(t)
  if (has('클라이밍')) {
    if (quest.category === 'climbing') score *= 2.2
    if (quest.category === 'recovery') score *= 1.5
  }
  if (has('데이트')) {
    if (quest.category === 'love' || quest.category === 'memory') score *= 2.0
  }
  if (has('야근') || has('바쁜 날')) {
    if (quest.category === 'recovery' || quest.category === 'cozy') score *= 1.9
    if (quest.difficulty === 'tiny') score *= 1.5
    if (quest.difficulty === 'big') score *= 0.3
  }
  if (has('집콕') || has('휴일')) {
    if (quest.category === 'home' || quest.category === 'cozy' || quest.category === 'fun') score *= 1.7
  }
  if (has('근육통') || has('피곤함') || has('두통')) {
    if (quest.category === 'move' || quest.category === 'climbing') score *= 0.25
    if (quest.category === 'recovery' || quest.category === 'care') score *= 1.8
  }

  if (input.favoriteCategories?.includes(quest.category)) score *= 1.25

  return score
}

/** 오늘의 추천 — 카테고리가 한쪽으로 쏠리지 않게 고른다 */
export function recommend(input: RecommendInput, count = 5): Quest[] {
  const exclude = new Set(input.exclude)
  const pool = [...QUEST_POOL, ...(input.custom ?? [])].filter((q) => !exclude.has(q.id))
  const rand = rng(input.seed)

  const scored = pool
    .map((q) => ({ quest: q, weight: scoreQuest(q, input) * (0.75 + rand() * 0.5) }))
    .sort((a, b) => b.weight - a.weight)

  const picked: Quest[] = []
  const used = new Map<QuestCategory, number>()

  for (const { quest } of scored) {
    if (picked.length >= count) break
    // 같은 카테고리는 기본 2개까지
    const n = used.get(quest.category) ?? 0
    if (n >= 2) continue
    picked.push(quest)
    used.set(quest.category, n + 1)
  }

  return picked
}

/** 오늘의 추천 하나 (XP 1.5배) */
export function featuredOf(picks: string[]): string | null {
  return picks[0] ?? null
}

/** 1~5분이면 끝나는 것들 — "XP 조금만 더" 를 위한 목록 */
export function quickXpQuests(exclude: string[] = [], limit = 24): Quest[] {
  const skip = new Set(exclude)
  return QUEST_POOL.filter((q) => q.difficulty === 'tiny' && !skip.has(q.id)).slice(0, limit)
}

export function searchQuests(query: string, custom: Quest[] = []): Quest[] {
  const q = query.trim()
  if (!q) return []
  return [...QUEST_POOL, ...custom].filter((quest) => quest.title.includes(q))
}

export const questById = (id: string, custom: Quest[] = []): Quest | undefined =>
  QUEST_BY_ID[id] ?? custom.find((q) => q.id === id)

export { XP_BY_DIFFICULTY }
