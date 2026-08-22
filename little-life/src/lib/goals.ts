import type { AppState, Category } from '@/types'
import { CATEGORY_LABEL } from '@/lib/labels'
import { pickSome } from '@/lib/city/seed'
import { weekDayKeys, weekKey } from '@/lib/date'

/**
 * 이번 주 목표 세 개.
 *
 * 도감 240개는 목표가 되기엔 너무 멀다. "언젠가 다 모은다" 는 오늘 뭘 할지
 * 하나도 알려주지 않는다. 그래서 손에 잡히는 걸 매주 세 개만 내놓는다.
 *
 * 목표 자체는 저장하지 않는다 — 그 주 월요일 날짜를 씨앗으로 계산한다.
 * 진행도도 저장하지 않는다 — 이미 쌓고 있는 기록(dailyLog · 도감 · 산 것)에서 센다.
 * 저장하는 건 "이 목표의 보상을 받았다" 하나뿐이다.
 *
 * 못 채워도 아무 일도 일어나지 않는다. 다음 주가 되면 새 목표가 온다.
 * 연속 기록도 없고, 못 했다고 말하지도 않는다.
 */

export type GoalKind = 'QUESTS' | 'DAYS' | 'CATEGORY_DAYS' | 'DISCOVER' | 'BUY'

export interface WeeklyGoal {
  /** 그 주 안에서만 쓰는 id. 보상 받은 기록은 `${weekKey}:${id}` 로 남는다. */
  id: string
  kind: GoalKind
  label: string
  /** 채우면 받는 코인 */
  coins: number
  target: number
  category?: Category
}

/** 고를 수 있는 목표들. 매주 여기서 셋을 뽑는다. */
const POOL: WeeklyGoal[] = [
  { id: 'q8', kind: 'QUESTS', label: '퀘스트 8개 끝내기', coins: 150, target: 8 },
  { id: 'q15', kind: 'QUESTS', label: '퀘스트 15개 끝내기', coins: 260, target: 15 },
  { id: 'd4', kind: 'DAYS', label: '나흘 열어보기', coins: 160, target: 4 },
  { id: 'd6', kind: 'DAYS', label: '엿새 열어보기', coins: 280, target: 6 },
  { id: 'find3', kind: 'DISCOVER', label: '처음 보는 물건 3개 만나기', coins: 180, target: 3 },
  { id: 'find6', kind: 'DISCOVER', label: '처음 보는 물건 6개 만나기', coins: 320, target: 6 },
  { id: 'buy2', kind: 'BUY', label: '가게에서 2개 사기', coins: 140, target: 2 },
  { id: 'buy4', kind: 'BUY', label: '가게에서 4개 사기', coins: 240, target: 4 },
]

/** 카테고리 목표는 여섯 갈래를 다 만들어두고 그중 하나가 뽑히게 한다 */
const CATEGORY_GOALS: WeeklyGoal[] = (
  ['LIFE', 'WORK', 'BODY', 'PLAY', 'MIND', 'HEART'] as Category[]
).map((category) => ({
  id: `cat_${category.toLowerCase()}`,
  kind: 'CATEGORY_DAYS' as const,
  // 몇 개가 아니라 며칠이다. 하루에 몰아서 하는 것보다 사흘에 나눠 하는 게 낫다.
  label: `${CATEGORY_LABEL[category]} 쪽으로 사흘`,
  coins: 200,
  target: 3,
  category,
}))

/** 이번 주 목표 셋. 같은 주라면 몇 번을 불러도 같다. */
export function weeklyGoals(now: Date = new Date()): WeeklyGoal[] {
  const week = weekKey(now)
  // 결이 겹치지 않게 두 개는 일반에서, 하나는 카테고리에서 뽑는다
  const general = pickSome(POOL, 2, `${week}:goals`)
  const category = pickSome(CATEGORY_GOALS, 1, `${week}:goalCategory`)
  return [...general, ...category]
}

/** 보상을 받았는지 기록할 때 쓰는 키 */
export function goalKey(goal: WeeklyGoal, now: Date = new Date()): string {
  return `${weekKey(now)}:${goal.id}`
}

// ── 진행도 ──────────────────────────────────────────────

function questsThisWeek(state: AppState, days: string[]): number {
  return days.reduce((sum, key) => sum + (state.dailyLog[key]?.completed ?? 0), 0)
}

function daysTouched(state: AppState, days: string[]): number {
  return days.filter((key) => (state.dailyLog[key]?.completed ?? 0) > 0).length
}

function categoryDays(state: AppState, days: string[], category: Category): number {
  return days.filter((key) => (state.dailyLog[key]?.byCategory[category] ?? 0) > 0).length
}

function discoveredThisWeek(state: AppState, days: Set<string>): number {
  return Object.values(state.collection.discovered).filter((iso) => days.has(iso.slice(0, 10)))
    .length
}

function boughtThisWeek(state: AppState, days: Set<string>): number {
  let count = 0
  for (const [key, n] of Object.entries(state.collection.purchases)) {
    if (days.has(key.slice(0, 10))) count += n
  }
  return count
}

export interface GoalProgress {
  goal: WeeklyGoal
  now: number
  done: boolean
  /** 이미 받아간 보상인지 */
  claimed: boolean
}

export function goalProgress(
  state: AppState,
  goal: WeeklyGoal,
  now: Date = new Date(),
): GoalProgress {
  const days = weekDayKeys(now)
  const daySet = new Set(days)

  let value = 0
  switch (goal.kind) {
    case 'QUESTS':
      value = questsThisWeek(state, days)
      break
    case 'DAYS':
      value = daysTouched(state, days)
      break
    case 'CATEGORY_DAYS':
      value = goal.category ? categoryDays(state, days, goal.category) : 0
      break
    case 'DISCOVER':
      value = discoveredThisWeek(state, daySet)
      break
    case 'BUY':
      value = boughtThisWeek(state, daySet)
      break
  }

  return {
    goal,
    now: Math.min(value, goal.target),
    done: value >= goal.target,
    claimed: state.claimedWeeklyGoals.includes(goalKey(goal, now)),
  }
}

export function weeklyProgress(state: AppState, now: Date = new Date()): GoalProgress[] {
  return weeklyGoals(now).map((goal) => goalProgress(state, goal, now))
}

/** 지금 받아갈 수 있는 것 */
export function claimableGoals(state: AppState, now: Date = new Date()): GoalProgress[] {
  return weeklyProgress(state, now).filter((p) => p.done && !p.claimed)
}
