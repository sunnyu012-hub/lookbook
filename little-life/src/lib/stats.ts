import type { Category, CategoryStats, DailyLog, Quest } from '@/types'
import { CATEGORIES } from '@/types'
import { isToday, todayKey, weekDayKeys } from './date'

export function emptyCategoryStats(): CategoryStats {
  return CATEGORIES.reduce((acc, c) => {
    acc[c] = 0
    return acc
  }, {} as CategoryStats)
}

export interface TodaySummary {
  completed: number
  earnedExp: number
}

export function todaySummary(log: DailyLog, now: Date = new Date()): TodaySummary {
  const entry = log[todayKey(now)]
  return { completed: entry?.completed ?? 0, earnedExp: entry?.exp ?? 0 }
}

/**
 * 오늘 실제로 받은 것.
 *
 * dailyLog 에도 완료 수와 EXP 가 쌓이지만 그건 **보너스 붙기 전 값**이라
 * 화면에 뜬 "+21 EXP" 와 숫자가 안 맞는다. 완료한 퀘스트에는 그때 실제로
 * 받은 값이 quest.reward 로 굳어 있으니 그걸 그대로 센다.
 *
 * 이걸 위해 저장 필드를 새로 만들지 않았다 — 이미 되돌리기용으로 적어두던 값이다.
 * 몬스터·보스를 넘겨서 받은 몫은 여기 안 들어온다. 오늘 **퀘스트로** 받은 것이다.
 */
export interface TodayResults {
  completed: number
  exp: number
  coins: number
}

export function todayResults(quests: Quest[], now: Date = new Date()): TodayResults {
  let completed = 0
  let exp = 0
  let coins = 0

  for (const quest of quests) {
    if (!quest.completed || !quest.completedAt) continue
    if (!isToday(quest.completedAt, now)) continue
    completed += 1
    exp += quest.reward?.exp ?? quest.exp
    coins += quest.reward?.coins ?? 0
  }

  return { completed, exp, coins }
}

export function weekCompletedCount(log: DailyLog, now: Date = new Date()): number {
  return weekDayKeys(now).reduce((sum, key) => sum + (log[key]?.completed ?? 0), 0)
}

/** 이번 주 카테고리별 EXP. 주간 한 줄 인사이트가 이걸 본다. */
export function weekCategoryExp(log: DailyLog, now: Date = new Date()): CategoryStats {
  const result = emptyCategoryStats()
  for (const key of weekDayKeys(now)) {
    const byCategory = log[key]?.byCategory
    if (!byCategory) continue
    for (const c of CATEGORIES) {
      result[c] += byCategory[c] ?? 0
    }
  }
  return result
}

/**
 * 오늘 화면에 보여줄 퀘스트인지.
 *
 * 어제 만들고 아직 안 한 퀘스트도 계속 보여준다.
 * 며칠 쉬었다 돌아와도 자연스럽게 이어지게 하려는 의도이고,
 * "안 한 날" 을 굳이 세지 않기 위해서다.
 */
export function isTodayQuest(quest: Quest, now: Date = new Date()): boolean {
  // 내일로 미뤄둔 건 그날이 올 때까지 보이지 않는다
  if (quest.snoozedUntil && quest.snoozedUntil > todayKey(now)) return false
  if (!quest.completed) return true
  return quest.completedAt ? isToday(quest.completedAt, now) : false
}

/** 최근에 만든 것이 위로. */
export function sortByNewest(quests: Quest[]): Quest[] {
  return [...quests].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** 최근에 완료한 것이 위로. */
export function sortByRecentlyCompleted(quests: Quest[]): Quest[] {
  return [...quests].sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
}

export function filterByCategory(quests: Quest[], category: Category | 'ALL'): Quest[] {
  return category === 'ALL' ? quests : quests.filter((q) => q.category === category)
}
