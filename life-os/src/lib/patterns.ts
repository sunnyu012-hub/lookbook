/**
 * DISCOVERED — 저장된 기록에서만 뽑아내는 패턴.
 * 표본이 부족하면 아예 만들지 않는다. 상관을 인과처럼 말하지 않는다 (문구에 '~한 날은' 만 쓴다).
 */
import type { Checkin } from '@/types'
import type { IconName } from './sprites.generated'

export interface Pattern {
  id: string
  /** 라틴 라벨 (픽셀 폰트) */
  title: string
  icon: IconName
  kind: 'buff' | 'debuff'
  /** 한 줄 설명 */
  body: string
  /** 표본 수 — 화면에 같이 보여줘서 과신하지 않게 한다 */
  sample: string
}

/** 두 집단을 비교하려면 각각 이만큼은 있어야 한다 */
export const MIN_GROUP = 4

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

function compare(a: Checkin[], b: Checkin[], pick: (c: Checkin) => number) {
  if (a.length < MIN_GROUP || b.length < MIN_GROUP) return null
  return { diff: avg(a.map(pick)) - avg(b.map(pick)), aCount: a.length, bCount: b.length }
}

/** HH:MM 을 분으로 */
const minutes = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function findPatterns(checkins: Checkin[]): Pattern[] {
  const out: Pattern[] = []

  // 1. 잘 잔 날 vs 아닌 날
  const slept = compare(
    checkins.filter((c) => c.sleepHours >= 7),
    checkins.filter((c) => c.sleepHours < 7),
    (c) => c.energyScore,
  )
  if (slept && Math.abs(slept.diff) >= 5) {
    const up = slept.diff > 0
    out.push({
      id: 'sleep',
      title: up ? 'GOOD SLEEP BUFF' : 'SLEEP PATTERN',
      icon: 'bed',
      kind: up ? 'buff' : 'debuff',
      body: up
        ? `7시간 이상 잔 날은 ENERGY 가 평균 ${Math.round(slept.diff)} 높았어요.`
        : `7시간 이상 잔 날의 ENERGY 가 오히려 평균 ${Math.abs(Math.round(slept.diff))} 낮았어요.`,
      sample: `${slept.aCount}일 vs ${slept.bCount}일`,
    })
  }

  // 2. 운동한 날 vs 안 한 날
  const moved = compare(
    checkins.filter((c) => c.exercise),
    checkins.filter((c) => !c.exercise),
    (c) => c.energyScore,
  )
  if (moved && Math.abs(moved.diff) >= 5) {
    const up = moved.diff > 0
    out.push({
      id: 'exercise',
      title: up ? 'MOVE BUFF' : 'MOVE PATTERN',
      icon: 'shoe',
      kind: up ? 'buff' : 'debuff',
      body: up
        ? `운동한 날은 ENERGY 가 평균 ${Math.round(moved.diff)} 높았어요.`
        : `운동한 날의 ENERGY 가 평균 ${Math.abs(Math.round(moved.diff))} 낮았어요.`,
      sample: `${moved.aCount}일 vs ${moved.bCount}일`,
    })
  }

  // 3. 늦은 카페인 — 그날 밤 수면 질과 함께 본다
  const late = compare(
    checkins.filter((c) => c.caffeineConsumed && c.caffeineTime && minutes(c.caffeineTime) >= 15 * 60),
    checkins.filter((c) => !c.caffeineConsumed || !c.caffeineTime || minutes(c.caffeineTime) < 15 * 60),
    (c) => c.sleepQuality,
  )
  if (late && late.diff <= -0.5) {
    out.push({
      id: 'late-caffeine',
      title: 'LATE COFFEE DEBUFF',
      icon: 'coffee',
      kind: 'debuff',
      body: `오후 3시 이후에 카페인을 마신 날은 수면 질이 평균 ${Math.abs(late.diff).toFixed(1)} 낮게 기록됐어요.`,
      sample: `${late.aCount}일 vs ${late.bCount}일`,
    })
  }

  return out
}
