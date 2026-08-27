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
 *
 * ── 한 칸씩 준다 ────────────────────────────────────
 *
 * 처음에는 다 채워야 줬다. 그러면 한 주에 몰아서 못 한 사람은
 * 늘 0원이고, 월요일마다 없던 일이 된다. 안 와도 괜찮다고 해놓고
 * 주간 목표만 주 단위 숙제였다.
 *
 * 그래서 한 칸 올라갈 때마다 그만큼 준다. 다섯 개 중 셋을 했으면
 * 셋만큼 받는다. 못 채운 게 손해가 아니게 된다.
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

/**
 * 고를 수 있는 목표들. 매주 여기서 셋을 뽑는다.
 *
 * "나흘 열어보기" 는 무슨 말인지 안 와닿는다는 말을 들었다.
 * 실제로 세는 건 "퀘스트를 하나라도 끝낸 날" 이라서, 앱을 켜기만
 * 해서는 안 오른다. 재는 것과 적어둔 말이 달랐다 — 세는 대로 적는다.
 *
 * 수도 낮췄다. 퀘스트 여덟 개는 한 주에 몰아서 하는 사람 기준이었다.
 */
const POOL: WeeklyGoal[] = [
  { id: 'q5', kind: 'QUESTS', label: '퀘스트 5개 끝내기', coins: 300, target: 5 },
  { id: 'q10', kind: 'QUESTS', label: '퀘스트 10개 끝내기', coins: 500, target: 10 },
  { id: 'd3', kind: 'DAYS', label: '사흘은 뭐라도 하나 끝내기', coins: 300, target: 3 },
  { id: 'd5', kind: 'DAYS', label: '닷새는 뭐라도 하나 끝내기', coins: 500, target: 5 },
  { id: 'find2', kind: 'DISCOVER', label: '처음 보는 물건 2개 만나기', coins: 300, target: 2 },
  { id: 'find4', kind: 'DISCOVER', label: '처음 보는 물건 4개 만나기', coins: 480, target: 4 },
  { id: 'buy1', kind: 'BUY', label: '가게에서 하나 사기', coins: 200, target: 1 },
  { id: 'buy3', kind: 'BUY', label: '가게에서 3개 사기', coins: 420, target: 3 },
]

/** 카테고리 목표는 여섯 갈래를 다 만들어두고 그중 하나가 뽑히게 한다 */
const CATEGORY_GOALS: WeeklyGoal[] = (
  ['LIFE', 'WORK', 'BODY', 'PLAY', 'MIND', 'HEART'] as Category[]
).map((category) => ({
  id: `cat_${category.toLowerCase()}`,
  kind: 'CATEGORY_DAYS' as const,
  // 몇 개가 아니라 며칠이다. 하루에 몰아서 하는 것보다 나눠 하는 게 낫다.
  label: `${CATEGORY_LABEL[category]} 쪽으로 이틀`,
  coins: 320,
  target: 2,
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
  /** 여기까지 온 몫을 다 받았는지 */
  claimed: boolean
  /** 이 목표에서 지금까지 받은 코인 */
  earned: number
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

  const reached = Math.min(value, goal.target)
  return {
    goal,
    now: reached,
    done: value >= goal.target,
    // 여기까지 온 몫을 다 받았는지. 한 칸씩 주기 때문에 "다 채웠는지" 와 다르다.
    claimed:
      reached > 0 &&
      Array.from({ length: reached }, (_, i) => i + 1).every((step) =>
        state.claimedWeeklyGoals.includes(stepKey(goal, step, now)),
      ),
    /** 지금까지 받은 코인 */
    earned: Array.from({ length: reached }, (_, i) => i + 1)
      .filter((step) => state.claimedWeeklyGoals.includes(stepKey(goal, step, now)))
      .reduce((sum, step) => sum + stepCoins(goal, step), 0),
  }
}

export function weeklyProgress(state: AppState, now: Date = new Date()): GoalProgress[] {
  return weeklyGoals(now).map((goal) => goalProgress(state, goal, now))
}

/**
 * 한 칸 올라갈 때마다 받는 몫.
 *
 * 나머지는 마지막 칸에 붙인다 — 다 채웠는데 적힌 수보다 덜 받으면
 * 그건 손해 본 것처럼 보인다.
 */
export function stepCoins(goal: WeeklyGoal, step: number): number {
  const each = Math.floor(goal.coins / goal.target)
  return step >= goal.target ? goal.coins - each * (goal.target - 1) : each
}

/** `${그 주 월요일}:${목표id}#${몇 칸째}` */
export function stepKey(goal: WeeklyGoal, step: number, now: Date = new Date()): string {
  return `${weekKey(now)}:${goal.id}#${step}`
}

export interface GoalStepClaim {
  goal: WeeklyGoal
  /** 이번에 올라간 칸들 */
  steps: number[]
  coins: number
  /** 이걸로 다 채웠는지 */
  completed: boolean
}

/**
 * 지금 받아갈 수 있는 것.
 *
 * 다 채우기를 기다리지 않는다. 한 칸이라도 올라갔으면 그만큼 준다 —
 * 한 주에 몰아서 못 하는 사람이 늘 0원인 구조를 없애려는 것이다.
 *
 * 한 목표에서 여러 칸이 한꺼번에 올라갈 수 있으니(퀘스트를 몰아 끝냈다면)
 * 목표별로 묶어서 돌려준다. 알림이 세 줄씩 뜨면 그건 축하가 아니라 소음이다.
 */
export function claimableGoals(state: AppState, now: Date = new Date()): GoalStepClaim[] {
  const out: GoalStepClaim[] = []

  for (const { goal, now: value } of weeklyProgress(state, now)) {
    const steps: number[] = []
    let coins = 0
    for (let step = 1; step <= value; step += 1) {
      if (state.claimedWeeklyGoals.includes(stepKey(goal, step, now))) continue
      steps.push(step)
      coins += stepCoins(goal, step)
    }
    if (steps.length === 0) continue
    out.push({ goal, steps, coins, completed: value >= goal.target })
  }

  return out
}
