/** 통계 도구. 여기 있는 건 전부 "관찰된 숫자" 를 만드는 함수다 — 판단이나 조언은 하지 않는다. */

export const mean = (xs: number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length

export function stdev(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1))
}

export function median(xs: number[]): number {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

export interface Point {
  date: string
  value: number
}

/**
 * 이동평균. 값이 없는 날은 건너뛰고, 창 안에 실제로 값이 있을 때만 평균을 낸다.
 * 체중처럼 매일 재지 않는 값도 자연스럽게 이어진다.
 */
export function movingAverage(points: Point[], window: number): Point[] {
  const sorted = [...points].sort((a, b) => (a.date < b.date ? -1 : 1))
  return sorted.map((p, i) => {
    const slice = sorted.slice(Math.max(0, i - window + 1), i + 1)
    return { date: p.date, value: mean(slice.map((s) => s.value)) }
  })
}

export interface GroupComparison {
  labelA: string
  labelB: string
  meanA: number
  meanB: number
  diff: number
  nA: number
  nB: number
  /** 표본이 충분한가 — 부족하면 화면에 숫자를 내보내지 않는다 */
  enough: boolean
}

/** 두 그룹의 평균 비교. 표본이 적으면 enough=false 로 알려 준다. */
export function compareGroups(
  a: number[],
  b: number[],
  labelA: string,
  labelB: string,
  minPerGroup = 4,
): GroupComparison {
  const meanA = mean(a)
  const meanB = mean(b)
  return {
    labelA,
    labelB,
    meanA: Math.round(meanA * 10) / 10,
    meanB: Math.round(meanB * 10) / 10,
    diff: Math.round((meanA - meanB) * 10) / 10,
    nA: a.length,
    nB: b.length,
    enough: a.length >= minPerGroup && b.length >= minPerGroup,
  }
}

/** 선형 추세의 기울기 (하루당 변화량) */
export function slopePerDay(points: Point[]): number | null {
  if (points.length < 3) return null
  const base = new Date(points[0].date).getTime()
  const xs = points.map((p) => (new Date(p.date).getTime() - base) / 86_400_000)
  const ys = points.map((p) => p.value)
  const mx = mean(xs)
  const my = mean(ys)
  const denom = xs.reduce((s, x) => s + (x - mx) ** 2, 0)
  if (denom === 0) return null
  return xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / denom
}
