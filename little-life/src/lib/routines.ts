import type { Quest, RepeatRule, Routine } from '@/types'
import { toDayKey, todayKey } from './date'
import { expForDifficulty } from './difficulty'
import { normalizeTitle } from './suggest'

/**
 * 반복 퀘스트.
 *
 * Routine 은 조리법이고, 하루에 한 번 거기서 Quest 가 만들어진다.
 *
 * 못 한 날을 따라가며 몰아서 만들어주지 않는다.
 * 3일 만에 열었다고 밀린 퀘스트 3개가 쌓여 있으면 그것만으로 앱을 닫게 된다.
 * 오늘 것만 만든다.
 */

/** 0 = 월요일 … 6 = 일요일. 주의 시작을 월요일로 보는 앱 전체 규칙과 맞춘다. */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

export const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

/** 오늘 이 규칙에 해당하는 날인지 */
export function matchesToday(rule: RepeatRule, now: Date = new Date()): boolean {
  const day = weekdayIndex(now)

  switch (rule.kind) {
    case 'daily':
      return true
    case 'weekdays':
      return day <= 4 // 월~금
    case 'days':
      return rule.days.includes(day)
  }
}

/** "매일", "평일", "월·수·금" 처럼 사람이 읽는 문구 */
export function describeRule(rule: RepeatRule): string {
  switch (rule.kind) {
    case 'daily':
      return '매일'
    case 'weekdays':
      return '평일'
    case 'days': {
      if (rule.days.length === 0) return '안 함'
      const sorted = [...rule.days].sort((a, b) => a - b)
      return sorted.map((d) => WEEKDAY_LABELS[d]).join('·')
    }
  }
}

/** 규칙이 실제로 언젠가 돌긴 하는지 (요일을 하나도 안 고른 경우 걸러내기) */
export function isUsableRule(rule: RepeatRule): boolean {
  return rule.kind !== 'days' || rule.days.length > 0
}

export interface SpawnResult {
  quests: Quest[]
  routines: Routine[]
}

/**
 * 오늘 만들어야 할 반복 퀘스트를 만든다.
 *
 * 만들 게 없으면 null 을 준다 — 그래야 호출한 쪽이 괜히 저장을 다시 하지 않는다.
 */
export function spawnDueQuests(
  routines: Routine[],
  quests: Quest[],
  now: Date = new Date(),
  makeId: () => string = () => crypto.randomUUID(),
): SpawnResult | null {
  const today = todayKey(now)

  // 이미 오늘 목록에 있는 제목은 다시 만들지 않는다.
  // 직접 같은 걸 만들어 뒀을 수도 있다.
  const openTitles = new Set(
    quests.filter((q) => !q.completed).map((q) => normalizeTitle(q.title)),
  )
  // 오늘 이미 완료한 것도 다시 띄우지 않는다
  const doneToday = new Set(
    quests
      .filter((q) => q.completed && q.completedAt && toDayKey(q.completedAt) === today)
      .map((q) => normalizeTitle(q.title)),
  )

  const created: Quest[] = []
  let changed = false

  const nextRoutines = routines.map((routine) => {
    if (routine.paused) return routine
    if (routine.lastSpawnedOn === today) return routine
    if (!isUsableRule(routine.rule)) return routine
    if (!matchesToday(routine.rule, now)) return routine

    changed = true
    const key = normalizeTitle(routine.title)

    // 날짜만 찍어두고 넘어가는 경우 — 같은 게 이미 있으면 굳이 또 만들지 않는다
    if (!openTitles.has(key) && !doneToday.has(key)) {
      openTitles.add(key)
      created.push({
        id: makeId(),
        title: routine.title,
        category: routine.category,
        difficulty: routine.difficulty,
        exp: expForDifficulty(routine.difficulty),
        completed: false,
        createdAt: now.toISOString(),
        completedAt: null,
        routineId: routine.id,
      })
    }

    return { ...routine, lastSpawnedOn: today }
  })

  if (!changed) return null
  return { quests: created, routines: nextRoutines }
}
