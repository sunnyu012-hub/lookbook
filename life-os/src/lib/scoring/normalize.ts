/**
 * 정규화 — 입력값을 전부 "0~100, 높을수록 좋음" 으로 바꾼다.
 * 점수 자체는 의료적 판단이 아니라, 기록을 눈에 보이게 만드는 휴리스틱이다.
 */

export const clamp = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v))

/** 값이 실제로 들어왔는지 (0 과 false 는 값이 있는 것으로 본다) */
export function present(v: unknown): boolean {
  if (v === null || v === undefined) return false
  if (typeof v === 'number') return Number.isFinite(v)
  if (typeof v === 'string') return v.trim().length > 0
  return true
}

/** min~max 구간에서 클수록 좋음 */
export function up(v: number, min: number, max: number): number {
  if (max === min) return 50
  return clamp(((v - min) / (max - min)) * 100)
}

/** min~max 구간에서 작을수록 좋음 */
export function down(v: number, min: number, max: number): number {
  return 100 - up(v, min, max)
}

/**
 * 적정 구간이 있는 값 (수면 시간, 식사 횟수처럼 모자라도 넘쳐도 아쉬운 것).
 * lo~hi 사이는 100점, 밖으로 나가면 floor 까지 선형으로 떨어진다.
 */
export function band(
  v: number,
  lo: number,
  hi: number,
  lowSpan: number,
  highSpan: number,
  floor = 0,
): number {
  if (!Number.isFinite(v)) return floor
  if (v >= lo && v <= hi) return 100
  if (v < lo) {
    const t = (v - (lo - lowSpan)) / lowSpan
    return clamp(floor + (100 - floor) * t, floor, 100)
  }
  const t = ((lo === hi ? hi : hi) + highSpan - v) / highSpan
  return clamp(floor + (100 - floor) * t, floor, 100)
}

/** 목표치 대비 달성률 (넘겨도 100점에서 멈춘다) */
export function toGoal(v: number, goal: number): number {
  if (!Number.isFinite(v) || goal <= 0) return 0
  return clamp((v / goal) * 100)
}
