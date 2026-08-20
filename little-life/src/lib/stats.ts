import type { Category, Quest } from '@/types'
import { CATEGORIES } from '@/types'
import { isThisWeek, isToday } from './date'

export type CategoryExp = Record<Category, number>

function emptyCategoryExp(): CategoryExp {
  return CATEGORIES.reduce((acc, c) => {
    acc[c] = 0
    return acc
  }, {} as CategoryExp)
}

/** 완료된 퀘스트만 카테고리별로 EXP 를 모은다. */
export function categoryExp(quests: Quest[]): CategoryExp {
  const result = emptyCategoryExp()
  for (const q of quests) {
    if (q.completed) result[q.category] += q.exp
  }
  return result
}

export interface QuestStats {
  totalCompleted: number
  weekCompleted: number
  todayTotal: number
  todayCompleted: number
}

export function questStats(quests: Quest[], now: Date = new Date()): QuestStats {
  let totalCompleted = 0
  let weekCompleted = 0
  let todayTotal = 0
  let todayCompleted = 0

  for (const q of quests) {
    if (q.completed && q.completedAt) {
      totalCompleted += 1
      if (isThisWeek(q.completedAt, now)) weekCompleted += 1
    }
    // 오늘 만든 퀘스트, 또는 오늘 완료한 퀘스트를 "오늘의 퀘스트" 로 본다.
    if (isTodayQuest(q, now)) {
      todayTotal += 1
      if (q.completed) todayCompleted += 1
    }
  }

  return { totalCompleted, weekCompleted, todayTotal, todayCompleted }
}

/**
 * 오늘 화면에 보여줄 퀘스트인지.
 *
 * 어제 만들고 아직 안 한 퀘스트도 계속 보여준다.
 * 며칠 쉬었다 돌아와도 자연스럽게 이어지게 하려는 의도이고,
 * "안 한 날" 을 굳이 세지 않기 위해서다.
 */
export function isTodayQuest(quest: Quest, now: Date = new Date()): boolean {
  if (!quest.completed) return true
  return quest.completedAt ? isToday(quest.completedAt, now) : false
}

/** 미완료가 위로, 완료는 아래로. 같은 그룹 안에서는 최근에 만든 것이 위로. */
export function sortQuests(quests: Quest[]): Quest[] {
  return [...quests].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    if (a.completed && b.completed) {
      return (b.completedAt ?? '').localeCompare(a.completedAt ?? '')
    }
    return b.createdAt.localeCompare(a.createdAt)
  })
}
