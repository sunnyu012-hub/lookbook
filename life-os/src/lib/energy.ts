/**
 * Energy Score — 단순 휴리스틱.
 * 의료적 판단이나 진단을 위한 점수가 아니다. 기록을 눈에 보이게 만드는 용도.
 * 가중치·정규화 함수만 이 파일에서 고치면 앱 전체에 반영된다.
 */
import type { CheckinInput, EnergyMode } from '@/types'
import type { IconName } from './sprites.generated'
import { CHARACTER_STATES } from './sprites.generated'

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
  /** 화면에 그대로 찍는 라틴 라벨 (픽셀 폰트용) */
  label: string
  icon: IconName
  /** 게임 말투의 짧은 한 줄 */
  message: string
  /** 캐릭터 스프라이트 시트의 상태 이름 */
  sprite: (typeof CHARACTER_STATES)[number]
  hex: string
  /** 패널 배경으로 쓰는 옅은 색 */
  soft: string
}

export const MODE_META: Record<EnergyMode, ModeMeta> = {
  RECOVERY: {
    key: 'RECOVERY',
    label: 'RECOVERY',
    icon: 'moon',
    message: '오늘은 HP 회복이 우선이에요.',
    sprite: 'recovery',
    hex: '#9A8AD1',
    soft: '#EDE9FA',
  },
  EASY: {
    key: 'EASY',
    label: 'EASY',
    icon: 'sprout',
    message: '천천히 움직여도 충분한 하루!',
    sprite: 'easy',
    hex: '#7A9E74',
    soft: '#E8F1E5',
  },
  NORMAL: {
    key: 'NORMAL',
    label: 'NORMAL',
    icon: 'sun',
    message: '평범하지만 좋은 모험의 날.',
    sprite: 'normal',
    hex: '#7FB3D8',
    soft: '#E4F1F9',
  },
  POWER: {
    key: 'POWER',
    label: 'POWER',
    icon: 'bolt',
    message: '에너지가 가득 찼어요!',
    sprite: 'power',
    hex: '#E0B34E',
    soft: '#FBF0D5',
  },
}

export const modeMeta = (mode: EnergyMode) => MODE_META[mode]
export const modeOf = (score: number) => MODE_META[scoreToMode(score)]
