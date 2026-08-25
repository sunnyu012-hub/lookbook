/**
 * 통계 도구 — 순수 계산만.
 *
 * 여기 있는 함수는 판단하지 않는다. 평균이 높다고 좋다고 말하지 않고,
 * 차이가 크다고 의미 있다고 말하지 않는다. 숫자를 만들 뿐이다.
 *
 * 통계 라이브러리를 새로 넣지 않는다. 필요한 건 전부 몇 줄이면 된다.
 */

/** 값 하나 — 언제 어느 기록에서 나왔는지를 함께 들고 다닌다 */
export interface Sample {
  value: number
  /** 로컬 YYYY-MM-DD. 며칠에 걸친 값인지 세려고 */
  date: string
  /** 근거를 되짚을 때 쓴다 */
  sourceId?: string
}

export interface Stats {
  count: number
  /** 값이 나온 날짜 수 — 하루에 몰린 20개와 스무 날의 20개는 다르다 */
  distinctDays: number
  mean: number
  median: number
  min: number
  max: number
  /** 표본 표준편차 (n-1) */
  stdev: number
  variance: number
}

export const EMPTY_STATS: Stats = {
  count: 0,
  distinctDays: 0,
  mean: 0,
  median: 0,
  min: 0,
  max: 0,
  stdev: 0,
  variance: 0,
}

export const mean = (xs: readonly number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((sum, x) => sum + x, 0) / xs.length

export function median(xs: readonly number[]): number {
  if (xs.length === 0) return 0
  const sorted = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** 표본 분산 (n-1). 값이 하나뿐이면 흔들림을 말할 수 없으므로 0 */
export function variance(xs: readonly number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  return xs.reduce((sum, x) => sum + (x - m) ** 2, 0) / (xs.length - 1)
}

export const stdev = (xs: readonly number[]): number => Math.sqrt(variance(xs))

export function describe(samples: readonly Sample[]): Stats {
  if (!samples.length) return EMPTY_STATS
  const values = samples.map((s) => s.value)
  return {
    count: values.length,
    distinctDays: new Set(samples.map((s) => s.date)).size,
    mean: mean(values),
    median: median(values),
    min: Math.min(...values),
    max: Math.max(...values),
    stdev: stdev(values),
    variance: variance(values),
  }
}

// ─────────────────────────────────────────────
// 날짜 무게
//
// 어떤 날은 기록이 스무 개고 어떤 날은 하나다.
// 그대로 평균 내면 기록을 많이 남긴 하루가 분석을 통째로 끌고 간다.
// 그래서 날짜별로 먼저 평균을 낸 뒤 그 평균들을 다시 평균한다.
// ─────────────────────────────────────────────

export type Weighting = 'log' | 'day'

/** 같은 날 값을 하나로 접는다 */
export function byDay(samples: readonly Sample[]): Sample[] {
  const groups = new Map<string, number[]>()
  for (const sample of samples) {
    groups.set(sample.date, [...(groups.get(sample.date) ?? []), sample.value])
  }
  return [...groups]
    .map(([date, values]) => ({ date, value: mean(values) }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

export const weighted = (samples: readonly Sample[], how: Weighting): Sample[] =>
  how === 'day' ? byDay(samples) : [...samples]

export const describeWeighted = (samples: readonly Sample[], how: Weighting): Stats => {
  const folded = weighted(samples, how)
  const stats = describe(folded)
  // 날짜로 접어도 "원래 몇 개였는지" 는 잃지 않는다 — 화면에 표본을 보여 줘야 하기 때문
  return { ...stats, distinctDays: new Set(samples.map((s) => s.date)).size }
}

// ─────────────────────────────────────────────
// 관계
//
// 상관은 인과가 아니다. 이 파일에서 나오는 r 은 "같이 움직였다" 이상을 말하지 않는다.
// 화면에서도 계수를 그대로 보여 주지 않고 말로 바꿔서 보여 준다 (wording.ts).
// ─────────────────────────────────────────────

export interface Pair {
  x: number
  y: number
  date: string
}

/** 피어슨 상관계수. 표본이 모자라거나 한쪽이 전혀 안 움직이면 null */
export function correlation(pairs: readonly Pair[]): number | null {
  if (pairs.length < 3) return null

  const xs = pairs.map((p) => p.x)
  const ys = pairs.map((p) => p.y)
  const mx = mean(xs)
  const my = mean(ys)

  let top = 0
  let left = 0
  let right = 0
  for (const { x, y } of pairs) {
    top += (x - mx) * (y - my)
    left += (x - mx) ** 2
    right += (y - my) ** 2
  }

  if (left === 0 || right === 0) return null
  return top / Math.sqrt(left * right)
}

/** 소수 자리 정리 — 화면과 스냅샷이 같은 값을 보게 */
export const round = (value: number, digits = 2): number => {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
