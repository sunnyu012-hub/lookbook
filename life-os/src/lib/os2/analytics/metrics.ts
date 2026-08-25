/**
 * 5A — 무엇을 재는가.
 *
 * 화면마다 "mood 평균" 을 다시 짜지 않으려고 여기 한 곳에 모았다.
 * 어디서 온 값인지(source), 어느 눈금인지(scale), 높은 게 좋은 건지(higherIsBetter)를
 * 여기서만 정한다.
 *
 * Quick Log 와 Daily Check-in 을 한 줄로 합치지 않는다 (계획서 3).
 *   Quick Log      순간의 상태. 하루에 여러 개
 *   Daily Check-in 하루 전체의 구조화된 상태. 하루 한 개
 * 눈금이 같아도(둘 다 1~5) 뜻이 달라서, 섞으면 무엇을 본 건지 알 수 없게 된다.
 */
import type { Checkin } from '@/types'
import type { QuickLog } from '../types'
import type { Sample } from './stats'

export type MetricSource = 'quickLog' | 'checkin'

export type MetricKey =
  | 'mood'
  | 'energy'
  | 'focus'
  | 'fatigue'
  | 'checkinMood'
  | 'checkinEnergy'
  | 'checkinFocus'
  | 'checkinFatigue'
  | 'sleepDuration'
  | 'sleepQuality'

export interface MetricDef {
  key: MetricKey
  source: MetricSource
  /** 화면에 쓰는 이름 */
  label: string
  /** 눈금 — [최소, 최대] */
  scale: [number, number]
  /**
   * 높은 값이 나은 쪽인가.
   * 피로도는 높을수록 힘든 것이라 false 다. 화살표 방향을 여기서만 정한다.
   */
  higherIsBetter: boolean
  /** 이만큼은 있어야 숫자를 보여 준다 */
  minSample: number
  /** 며칠에 걸쳐 있어야 하는가 */
  minDays: number
  /** 화면 표기 */
  format: (value: number) => string
}

const oneDecimal = (value: number) => value.toFixed(1)
const hours = (value: number) => `${value.toFixed(1)}시간`

export const METRICS: Record<MetricKey, MetricDef> = {
  mood: {
    key: 'mood',
    source: 'quickLog',
    label: '기분',
    scale: [1, 5],
    higherIsBetter: true,
    minSample: 5,
    minDays: 3,
    format: oneDecimal,
  },
  energy: {
    key: 'energy',
    source: 'quickLog',
    label: '기운',
    scale: [1, 5],
    higherIsBetter: true,
    minSample: 5,
    minDays: 3,
    format: oneDecimal,
  },
  focus: {
    key: 'focus',
    source: 'quickLog',
    label: '집중',
    scale: [1, 5],
    higherIsBetter: true,
    minSample: 5,
    minDays: 3,
    format: oneDecimal,
  },
  fatigue: {
    key: 'fatigue',
    source: 'quickLog',
    label: '피로',
    scale: [1, 5],
    higherIsBetter: false,
    minSample: 5,
    minDays: 3,
    format: oneDecimal,
  },

  // ── Daily Check-in 쪽. 이름을 따로 둬서 섞이지 않게 한다
  checkinMood: {
    key: 'checkinMood',
    source: 'checkin',
    label: '기분 (하루 기록)',
    scale: [1, 5],
    higherIsBetter: true,
    minSample: 5,
    minDays: 5,
    format: oneDecimal,
  },
  checkinEnergy: {
    key: 'checkinEnergy',
    source: 'checkin',
    label: '기운 (하루 기록)',
    scale: [1, 5],
    higherIsBetter: true,
    minSample: 5,
    minDays: 5,
    format: oneDecimal,
  },
  checkinFocus: {
    key: 'checkinFocus',
    source: 'checkin',
    label: '집중 (하루 기록)',
    scale: [1, 5],
    higherIsBetter: true,
    minSample: 5,
    minDays: 5,
    format: oneDecimal,
  },
  checkinFatigue: {
    key: 'checkinFatigue',
    source: 'checkin',
    label: '피로 (하루 기록)',
    scale: [1, 5],
    higherIsBetter: false,
    minSample: 5,
    minDays: 5,
    format: oneDecimal,
  },
  sleepDuration: {
    key: 'sleepDuration',
    source: 'checkin',
    label: '수면 시간',
    scale: [0, 12],
    higherIsBetter: true,
    minSample: 5,
    minDays: 5,
    format: hours,
  },
  sleepQuality: {
    key: 'sleepQuality',
    source: 'checkin',
    label: '잠의 질',
    scale: [1, 5],
    higherIsBetter: true,
    minSample: 5,
    minDays: 5,
    format: oneDecimal,
  },
}

export const METRIC_LIST = Object.values(METRICS)

/** Quick Log 화면에서 다루는 것들 */
export const QUICK_LOG_METRICS: MetricKey[] = ['mood', 'energy', 'focus', 'fatigue']

export const isQuickLogMetric = (key: MetricKey) => METRICS[key].source === 'quickLog'

// ─────────────────────────────────────────────
// 값 꺼내기
//
// 없는 값을 0으로 세지 않는다 (계획서 52).
// energy 를 안 적은 기록이 "기운 0" 이 되면 평균이 통째로 무너진다.
// 그래서 undefined 는 표본에서 빠질 뿐, 0 이 되지 않는다.
// ─────────────────────────────────────────────

const numeric = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

export function valueOfLog(log: QuickLog, key: MetricKey): number | null {
  switch (key) {
    case 'mood':
      return numeric(log.mood)
    case 'energy':
      return numeric(log.energy)
    case 'focus':
      return numeric(log.focus)
    case 'fatigue':
      return numeric(log.fatigue)
    default:
      return null
  }
}

export function valueOfCheckin(checkin: Checkin, key: MetricKey): number | null {
  switch (key) {
    case 'checkinMood':
      return numeric(checkin.mood)
    case 'checkinEnergy':
      // Check-in 에는 energy 칸이 따로 없다. 사회적 에너지로 대신하지 않는다 —
      // 뜻이 다른 값을 이름만 같다고 끌어다 쓰면 그 분석은 거짓말이 된다
      return null
    case 'checkinFocus':
      return numeric(checkin.focus)
    case 'checkinFatigue':
      return numeric(checkin.fatigue)
    case 'sleepDuration':
      return numeric(checkin.sleepHours)
    case 'sleepQuality':
      return numeric(checkin.sleepQuality)
    default:
      return null
  }
}

/** Quick Log 목록에서 이 metric 의 표본을 뽑는다 */
export function samplesFromLogs(logs: readonly QuickLog[], key: MetricKey): Sample[] {
  const out: Sample[] = []
  for (const log of logs) {
    const value = valueOfLog(log, key)
    if (value === null) continue
    out.push({ value, date: log.date, sourceId: log.id })
  }
  return out
}

export function samplesFromCheckins(checkins: readonly Checkin[], key: MetricKey): Sample[] {
  const out: Sample[] = []
  for (const checkin of checkins) {
    const value = valueOfCheckin(checkin, key)
    if (value === null) continue
    out.push({ value, date: checkin.date, sourceId: checkin.id })
  }
  return out
}
