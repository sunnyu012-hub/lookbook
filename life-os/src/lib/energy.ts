/**
 * Energy Score — 단순 휴리스틱.
 * 의료적 판단이나 진단을 위한 점수가 아니다. 기록을 눈에 보이게 만드는 용도.
 * 가중치·정규화 함수만 이 파일에서 고치면 앱 전체에 반영된다.
 */
import type { CheckinInput, EnergyMode } from '@/types'

export const WEIGHTS = {
  sleep: 0.3,
  fatigue: 0.25,
  body: 0.15,
  focus: 0.15,
  mood: 0.1,
  sleepQuality: 0.05,
} as const

const clamp = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v))

/** 1~5 값을 0~100 으로 (5가 좋음) */
const scaleUp = (v: number) => clamp(((v - 1) / 4) * 100)

/** 1~5 값을 0~100 으로 (1이 좋음 — 피로도처럼 낮을수록 좋은 값) */
const scaleDown = (v: number) => clamp(((5 - v) / 4) * 100)

/** 0~5 통증을 0~100 으로 (0이 좋음) */
const painScore = (v: number) => clamp(((5 - v) / 5) * 100)

/**
 * 수면 시간 점수.
 * 7~9시간을 100점으로 두고, 부족할수록 가파르게 / 과할수록 완만하게 깎는다.
 */
export function sleepHoursScore(hours: number): number {
  if (!Number.isFinite(hours) || hours <= 0) return 0
  if (hours >= 7 && hours <= 9) return 100
  if (hours < 7) return clamp(((hours - 3) / 4) * 100) // 3h → 0, 7h → 100
  return clamp(100 - (hours - 9) * 12, 45, 100) // 과수면은 가볍게 감점
}

export interface EnergyBreakdown {
  sleep: number
  fatigue: number
  body: number
  focus: number
  mood: number
  sleepQuality: number
}

export function energyBreakdown(input: CheckinInput): EnergyBreakdown {
  return {
    sleep: sleepHoursScore(input.sleepHours),
    fatigue: scaleDown(input.fatigue),
    body: painScore(input.bodyPain),
    focus: scaleUp(input.focus),
    mood: scaleUp(input.mood),
    sleepQuality: scaleUp(input.sleepQuality),
  }
}

/** 0~100 정수 */
export function calcEnergyScore(input: CheckinInput): number {
  const b = energyBreakdown(input)
  const total =
    b.sleep * WEIGHTS.sleep +
    b.fatigue * WEIGHTS.fatigue +
    b.body * WEIGHTS.body +
    b.focus * WEIGHTS.focus +
    b.mood * WEIGHTS.mood +
    b.sleepQuality * WEIGHTS.sleepQuality
  return Math.round(clamp(total))
}

export function scoreToMode(score: number): EnergyMode {
  if (score < 40) return 'RECOVERY'
  if (score < 60) return 'EASY'
  if (score < 80) return 'NORMAL'
  return 'POWER'
}

export interface ModeMeta {
  key: EnergyMode
  label: string
  glyph: string
  headline: string
  body: string
  /** tailwind 클래스에서 쓰는 색 이름 */
  color: string
  hex: string
}

export const MODE_META: Record<EnergyMode, ModeMeta> = {
  RECOVERY: {
    key: 'RECOVERY',
    label: 'RECOVERY MODE',
    glyph: '🌙',
    headline: '몸이 꽤 지쳐 있어요.',
    body: '오늘은 회복을 우선해보세요.',
    color: 'recovery',
    hex: '#8B7CF6',
  },
  EASY: {
    key: 'EASY',
    label: 'EASY MODE',
    glyph: '🍃',
    headline: '여력이 많지는 않아요.',
    body: '가볍게, 무리하지 않는 하루로.',
    color: 'easy',
    hex: '#45D0C0',
  },
  NORMAL: {
    key: 'NORMAL',
    label: 'NORMAL MODE',
    glyph: '☀️',
    headline: '평소만큼의 컨디션이에요.',
    body: '계획한 일을 그대로 밀고 가도 좋아요.',
    color: 'normal',
    hex: '#F4C25E',
  },
  POWER: {
    key: 'POWER',
    label: 'POWER MODE',
    glyph: '⚡',
    headline: '에너지가 충분해요.',
    body: '미뤄둔 큰 일을 오늘 꺼내보세요.',
    color: 'power',
    hex: '#C8F04A',
  },
}

export const modeMeta = (mode: EnergyMode) => MODE_META[mode]
export const modeOf = (score: number) => MODE_META[scoreToMode(score)]
