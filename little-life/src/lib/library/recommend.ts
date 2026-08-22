import type {
  Category,
  Quest,
  QuestUsageProfile,
  Recommendation,
  RecommendReason,
  Routine,
  TimeBand,
  UsageProfiles,
} from '@/types'
import { toDayKey, todayKey } from '@/lib/date'
import { timeBand } from '@/lib/rpg/time'
import { isUsableRule, matchesToday, weekdayIndex } from '@/lib/routines'
import { normalizeTitle } from '@/lib/suggest'
import { ALL_PRESETS, QUEST_PACKS } from './packs'
import { questKeyOf } from './usage'

/**
 * 무엇을 위에 보여줄지 고른다.
 *
 * 밖으로 나가는 게 하나도 없다 — 이 기기에 쌓인 내 기록만 본다.
 * 그래서 빠르고, 오프라인에서도 되고, 쓸수록 내 생활에 맞아간다.
 *
 * 추천은 어디까지나 추천이다. 퀘스트를 저절로 만들지 않는다.
 */

export const RECOMMEND_COUNT = 6
/** 한 분야가 추천을 통째로 가져가지 않게 */
export const MAX_PER_CATEGORY = 4
/** 이 정도는 쌓여야 "내 패턴" 이라 부를 만하다 */
export const PERSONALIZED_THRESHOLD = 5

export interface RecommendContext {
  now: Date
  band: TimeBand
  /** 0 = 월요일 */
  day: number
  dayKey: string
  weekend: boolean
}

export function makeContext(now: Date = new Date()): RecommendContext {
  const day = weekdayIndex(now)
  return {
    now,
    band: timeBand(now),
    day,
    dayKey: toDayKey(now.toISOString()),
    weekend: day >= 5,
  }
}

// ── 점수 ────────────────────────────────────────────────

/**
 * 자주 추가하는 것.
 * 한 번 많이 쓴 퀘스트가 영원히 1등을 차지하지 않게 위를 막아둔다.
 */
export function frequencyScore(p: QuestUsageProfile): number {
  return Math.min(p.totalAdded * 2, 20)
}

/**
 * 실제로 끝까지 하는 것.
 * 표본이 적을 때 100% 가 과하게 반영되지 않도록 완만하게 올린다.
 */
export function completionScore(p: QuestUsageProfile): number {
  if (p.totalAdded === 0) return 0
  const rate = p.totalCompleted / p.totalAdded
  const confidence = Math.min(p.totalAdded / 5, 1)
  return rate * confidence * 15
}

/** 최근에 한 것. 너무 오래된 것은 조용히 뒤로 밀린다. */
export function recencyScore(p: QuestUsageProfile, ctx: RecommendContext): number {
  if (!p.lastCompletedAt) return 0
  const days = daysBetween(p.lastCompletedAt, ctx.now)

  if (days <= 0) return 6
  if (days <= 3) return 12
  if (days <= 7) return 8
  if (days <= 14) return 4
  if (days <= 30) return 1
  return 0
}

/** 오늘과 같은 요일에 자주 했는지 */
export function weekdayScore(p: QuestUsageProfile, ctx: RecommendContext): number {
  const here = p.completedByDayOfWeek[ctx.day] ?? 0
  if (here === 0) return 0

  const total = Object.values(p.completedByDayOfWeek).reduce((a, b) => a + b, 0)
  if (total === 0) return 0

  // 이 요일에 얼마나 몰려 있는지. 골고루 했으면 특별할 게 없다.
  const share = here / total
  return Math.min(here * 3, 12) * Math.min(share * 2.5, 1)
}

/** 지금 시간대에 자주 했는지 */
export function timeOfDayScore(p: QuestUsageProfile, ctx: RecommendContext): number {
  const here = p.completedByBand[ctx.band] ?? 0
  if (here === 0) return 0

  const total = Object.values(p.completedByBand).reduce((a, b) => a + b, 0)
  if (total === 0) return 0

  const share = here / total
  return Math.min(here * 2.5, 12) * Math.min(share * 2.5, 1)
}

export function favoriteScore(p: QuestUsageProfile): number {
  return p.favorite ? 14 : 0
}

/**
 * "추천에서 덜 보기" 를 누른 만큼.
 *
 * 한 번 눌러도 눈에 띄게 내려가야 누른 보람이 있다.
 * 세 번쯤 누르면 점수가 0 아래로 떨어져 추천에서 아예 빠진다.
 */
export function dismissPenalty(p: QuestUsageProfile): number {
  return Math.min(p.dismissCount * 15, 45)
}

export interface ScoreInput {
  profile: QuestUsageProfile
  ctx: RecommendContext
  /** 오늘 아직 안 만들어진 반복이면 */
  routineDue: boolean
  /** 지금 시간대·요일에 어울리는 세트에 든 항목이면 */
  packFit: boolean
}

export function scoreProfile(input: ScoreInput): { score: number; parts: Record<string, number> } {
  const { profile: p, ctx } = input

  const parts = {
    frequency: frequencyScore(p),
    completion: completionScore(p),
    recency: recencyScore(p, ctx),
    weekday: weekdayScore(p, ctx),
    timeOfDay: timeOfDayScore(p, ctx),
    favorite: favoriteScore(p),
    routine: input.routineDue ? 30 : 0,
    context: input.packFit ? 4 : 0,
    dismiss: -dismissPenalty(p),
  }

  const score = Object.values(parts).reduce((a, b) => a + b, 0)
  return { score, parts }
}

/** 이 점수가 왜 높은지 — 가장 큰 이유 하나만 고른다 */
export function pickReason(parts: Record<string, number>): RecommendReason {
  if (parts.routine > 0) return 'ROUTINE'
  if (parts.favorite > 0 && parts.favorite >= parts.frequency) return 'FAVORITE'

  const ranked: Array<[number, RecommendReason]> = [
    [parts.weekday, 'DAY_OF_WEEK'],
    [parts.timeOfDay, 'TIME_OF_DAY'],
    [parts.recency, 'RECENT'],
    [parts.frequency, 'FREQUENT'],
  ]
  ranked.sort((a, b) => b[0] - a[0])

  return ranked[0][0] > 0 ? ranked[0][1] : 'PACK'
}

export const REASON_LABEL: Record<RecommendReason, string> = {
  ROUTINE: '↻ 반복',
  FAVORITE: '⭐ 즐겨찾기',
  DAY_OF_WEEK: '📅 이 요일에 자주',
  TIME_OF_DAY: '🌙 이 시간에 자주',
  FREQUENT: '💫 자주 하는 것',
  RECENT: '🔥 요즘 자주',
  PACK: '✨ 지금 어울려',
}

// ── 추천 만들기 ─────────────────────────────────────────

export interface RecommendInput {
  profiles: UsageProfiles
  quests: Quest[]
  routines: Routine[]
  /** 끄면 시간대 기본 추천만 나온다 */
  personalized?: boolean
  now?: Date
  count?: number
}

/**
 * 오늘 위에 올릴 것들.
 *
 * 이미 오늘 목록에 있는 것은 빼고, 남은 것을 점수순으로 정렬한다.
 * 기록이 거의 없으면 시간대에 맞는 세트에서 채운다.
 */
export function recommendQuests(input: RecommendInput): Recommendation[] {
  const ctx = makeContext(input.now ?? new Date())
  const count = input.count ?? RECOMMEND_COUNT
  const personalized = input.personalized !== false

  const taken = todayKeys(input.quests, ctx)
  const routineDueKeys = dueRoutineKeys(input.routines, input.quests, ctx)
  const packFitKeys = fittingPackKeys(ctx)

  const scored: Recommendation[] = []

  if (personalized) {
    for (const profile of Object.values(input.profiles)) {
      const key = profile.questKey
      // key 로도 제목으로도 걸러낸다. 세트에서 온 것과 직접 적은 것이
      // 같은 일을 가리키는 경우가 있다.
      if (taken.has(key) || taken.has(normalizeTitle(profile.title))) continue
      if (profile.hiddenOn === ctx.dayKey) continue

      const { score, parts } = scoreProfile({
        profile,
        ctx,
        routineDue: routineDueKeys.has(key),
        packFit: packFitKeys.has(key),
      })
      if (score <= 0) continue

      scored.push({
        questKey: key,
        title: profile.title,
        category: profile.category,
        difficulty: profile.difficulty,
        presetId: profile.presetId,
        score,
        reason: pickReason(parts),
        parts,
      })
    }
  }

  scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))

  const picked = diversify(scored, count)

  // 모자라면 지금 시간대에 어울리는 준비된 퀘스트로 채운다 (첫 사용자 포함)
  if (picked.length < count) {
    const already = new Set(picked.map((r) => r.questKey))
    for (const entry of coldStartEntries(ctx)) {
      if (picked.length >= count) break
      if (taken.has(entry.key) || already.has(entry.key)) continue
      // 다듬은 제목이 이미 오늘 목록에 있으면 그것도 중복이다
      if (taken.has(normalizeTitle(entry.preset.title))) continue

      picked.push({
        questKey: entry.key,
        title: entry.preset.title,
        category: entry.preset.category,
        difficulty: entry.preset.difficulty,
        presetId: entry.key,
        score: 0,
        reason: 'PACK',
        parts: {},
      })
      already.add(entry.key)
    }
  }

  return picked
}

/** 한 분야가 다 차지하지 않게 살짝만 섞는다. 억지로 만들지는 않는다. */
export function diversify(items: Recommendation[], count: number): Recommendation[] {
  const picked: Recommendation[] = []
  const perCategory = new Map<Category, number>()
  const skipped: Recommendation[] = []

  for (const item of items) {
    if (picked.length >= count) break
    const used = perCategory.get(item.category) ?? 0
    if (used >= MAX_PER_CATEGORY) {
      skipped.push(item)
      continue
    }
    picked.push(item)
    perCategory.set(item.category, used + 1)
  }

  // 자리가 남으면 밀어뒀던 것을 도로 채운다 — 빈칸으로 두는 것보다 낫다
  for (const item of skipped) {
    if (picked.length >= count) break
    picked.push(item)
  }
  return picked
}

/** 오늘 이미 있는 퀘스트의 key 들 (완료했든 안 했든) */
export function todayKeys(quests: Quest[], ctx: RecommendContext): Set<string> {
  const keys = new Set<string>()

  for (const quest of quests) {
    const isToday =
      !quest.completed || (quest.completedAt && toDayKey(quest.completedAt) === ctx.dayKey)
    if (!isToday) continue

    keys.add(questKeyOf(quest))
    // 준비된 퀘스트로 들어왔어도 제목이 겹치면 같은 것으로 본다
    keys.add(normalizeTitle(quest.title))
  }
  return keys
}

/** 오늘 돌아야 하는데 아직 안 만들어진 반복 */
export function dueRoutineKeys(
  routines: Routine[],
  quests: Quest[],
  ctx: RecommendContext,
): Set<string> {
  const keys = new Set<string>()
  const today = todayKey(ctx.now)

  for (const routine of routines) {
    if (routine.paused) continue
    if (routine.lastSpawnedOn === today) continue
    if (!isUsableRule(routine.rule)) continue
    if (!matchesToday(routine.rule, ctx.now)) continue

    const key = routine.sourcePresetId ?? normalizeTitle(routine.title)
    // 이미 오늘 목록에 있으면 반복으로 또 올릴 필요가 없다
    if (todayKeys(quests, ctx).has(key)) continue
    keys.add(key)
  }
  return keys
}

/** 지금 시간대·요일에 어울리는 세트의 항목들 */
export function fittingPackKeys(ctx: RecommendContext): Set<string> {
  const keys = new Set<string>()
  for (const entry of coldStartEntries(ctx)) keys.add(entry.key)
  return keys
}

/**
 * 기록이 없을 때 채워 넣는 것들.
 * 지금 시간대에 맞는 세트를 먼저, 주말이면 주말 세트도 같이 본다.
 */
export function coldStartEntries(ctx: RecommendContext) {
  const fitting = QUEST_PACKS.filter(
    (pack) =>
      (pack.bands?.includes(ctx.band) ?? false) || (ctx.weekend && pack.weekend === true),
  )
  // 시간대에 걸린 세트가 없으면 늘 무난한 것으로
  const packs = fitting.length > 0 ? fitting : QUEST_PACKS.filter((p) => p.id === 'wellness')
  const ids = new Set(packs.map((p) => p.id))
  return ALL_PRESETS.filter((e) => ids.has(e.pack.id))
}

/** 개인화가 돌기 시작했는지 — 화면 문구를 고르는 데 쓴다 */
export function hasEnoughHistory(profiles: UsageProfiles): boolean {
  const events = Object.values(profiles).reduce((sum, p) => sum + p.totalAdded, 0)
  return events >= PERSONALIZED_THRESHOLD
}

// ── 빠른 추가 ───────────────────────────────────────────

export type QuickAddKind = 'FREQUENT' | 'RECENT' | 'FAVORITE'

/** 자주 / 최근 / 즐겨찾기 목록 */
export function quickAdd(
  profiles: UsageProfiles,
  kind: QuickAddKind,
  limit = 8,
): QuestUsageProfile[] {
  const all = Object.values(profiles)

  switch (kind) {
    case 'FAVORITE':
      return all.filter((p) => p.favorite).sort((a, b) => b.totalAdded - a.totalAdded).slice(0, limit)
    case 'RECENT':
      return all
        .filter((p) => p.lastAddedAt || p.lastCompletedAt)
        .sort((a, b) => lastTouch(b).localeCompare(lastTouch(a)))
        .slice(0, limit)
    case 'FREQUENT':
      return all
        .filter((p) => p.totalAdded > 0)
        .sort((a, b) => b.totalAdded - a.totalAdded || lastTouch(b).localeCompare(lastTouch(a)))
        .slice(0, limit)
  }
}

function lastTouch(p: QuestUsageProfile): string {
  return [p.lastCompletedAt, p.lastAddedAt].filter(Boolean).sort().reverse()[0] ?? ''
}

function daysBetween(iso: string, now: Date): number {
  const then = new Date(iso)
  const ms = now.getTime() - then.getTime()
  return Math.floor(ms / 86_400_000)
}
