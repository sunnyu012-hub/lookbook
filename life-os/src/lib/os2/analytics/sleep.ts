/**
 * 5E — 잠과 다음 날.
 *
 * 짝짓는 규칙 하나를 정해 두고 끝까지 그것만 쓴다 (계획서 35).
 *   D일 Check-in 의 수면  →  D+1일의 상태
 *   D+1 의 상태는 그날 오전(dawn·morning·afternoon) Quick Log 평균을 먼저 본다.
 *   그런 기록이 없으면 D+1 Check-in 값을 쓴다.
 *
 * 오전을 먼저 보는 이유는, 저녁쯤 되면 그날 있었던 일이 잠보다 더 크게 작용하기 때문이다.
 *
 * 그리고 이 파일은 "잠이 모자라서 집중이 안 됐다" 고 말하지 않는다.
 * "짧게 잔 다음 날 집중이 낮게 기록됐다" 까지만 말한다.
 */
import type { Checkin } from '@/types'
import type { QuickLog } from '../types'
import { ANALYSIS_VERSION, TAXONOMY_VERSION } from '../versions'
import { TAGGING_RULE_VERSION } from '../tagging/engine'
import { METRICS, valueOfCheckin, valueOfLog, type MetricKey } from './metrics'
import { confidenceOf, dataQuality, MIN_COMPARISON } from './confidence'
import type { AnalysisResult } from './result'
import { correlation, describe, mean, round, type Pair, type Sample } from './stats'
import { inWindow, shiftDate, type AnalysisWindow } from './windows'

/** 다음 날 상태를 볼 때 먼저 보는 시간대 */
const FIRST_HALF = new Set(['dawn', 'morning', 'afternoon'])

export interface SleepPair {
  /** 잠을 잔 날 */
  date: string
  /** 다음 날 */
  nextDate: string
  hours: number
  quality: number | null
  /** 다음 날 상태 */
  value: number
  /** 어디서 온 값인지 — 근거로 남긴다 */
  from: 'quickLog' | 'checkin'
}

export interface SleepInput {
  checkins: readonly Checkin[]
  logs: readonly QuickLog[]
  window: AnalysisWindow
  /** 다음 날 무엇을 볼 것인가 */
  metric: MetricKey
}

/** 하루의 잠과 다음 날 상태를 짝짓는다 */
export function pairSleep(input: SleepInput): SleepPair[] {
  const logsByDate = new Map<string, QuickLog[]>()
  for (const log of input.logs) {
    logsByDate.set(log.date, [...(logsByDate.get(log.date) ?? []), log])
  }
  const checkinByDate = new Map(input.checkins.map((c) => [c.date, c]))

  const out: SleepPair[] = []

  for (const checkin of input.checkins) {
    if (!inWindow(checkin.date, input.window)) continue

    const hours = valueOfCheckin(checkin, 'sleepDuration')
    if (hours === null) continue

    const nextDate = shiftDate(checkin.date, 1)
    const next = nextDayValue(nextDate, input.metric, logsByDate, checkinByDate)
    if (!next) continue

    out.push({
      date: checkin.date,
      nextDate,
      hours,
      quality: valueOfCheckin(checkin, 'sleepQuality'),
      value: next.value,
      from: next.from,
    })
  }

  return out.sort((a, b) => (a.date < b.date ? -1 : 1))
}

function nextDayValue(
  date: string,
  metric: MetricKey,
  logsByDate: ReadonlyMap<string, QuickLog[]>,
  checkinByDate: ReadonlyMap<string, Checkin>,
): { value: number; from: 'quickLog' | 'checkin' } | null {
  // 1순위 — 다음 날 오전 Quick Log
  const logs = logsByDate.get(date) ?? []
  const morning = logs
    .filter((log) => FIRST_HALF.has(log.dayPart))
    .map((log) => valueOfLog(log, metric))
    .filter((v): v is number => v !== null)

  if (morning.length) return { value: mean(morning), from: 'quickLog' }

  // 2순위 — 다음 날 Check-in
  const checkin = checkinByDate.get(date)
  if (!checkin) return null

  const fallback = checkinMetricFor(metric)
  if (!fallback) return null

  const value = valueOfCheckin(checkin, fallback)
  return value === null ? null : { value, from: 'checkin' }
}

/** Quick Log metric 에 대응하는 Check-in metric */
const checkinMetricFor = (metric: MetricKey): MetricKey | null => {
  switch (metric) {
    case 'mood':
      return 'checkinMood'
    case 'focus':
      return 'checkinFocus'
    case 'fatigue':
      return 'checkinFatigue'
    default:
      return null
  }
}

// ─────────────────────────────────────────────
// 수면 구간 (계획서 36)
//
// 데이터가 적으면 잘게 쪼개지 않는다. 다섯 칸으로 나눴는데 칸마다 두 개씩이면
// 다섯 개의 못 믿을 숫자가 생길 뿐이다.
// ─────────────────────────────────────────────

export interface SleepBucket {
  key: string
  label: string
  min: number
  max: number
}

const FINE_BUCKETS: SleepBucket[] = [
  { key: 'lt5', label: '5시간 미만', min: 0, max: 5 },
  { key: '5to6', label: '5~6시간', min: 5, max: 6 },
  { key: '6to7', label: '6~7시간', min: 6, max: 7 },
  { key: '7to8', label: '7~8시간', min: 7, max: 8 },
  { key: 'gte8', label: '8시간 이상', min: 8, max: 99 },
]

const COARSE_BUCKETS: SleepBucket[] = [
  { key: 'lt6', label: '6시간 미만', min: 0, max: 6 },
  { key: '6to8', label: '6~8시간', min: 6, max: 8 },
  { key: 'gte8', label: '8시간 이상', min: 8, max: 99 },
]

/** 표본을 보고 칸 수를 정한다 */
export const bucketsFor = (pairs: readonly SleepPair[]): SleepBucket[] =>
  pairs.length >= 40 ? FINE_BUCKETS : COARSE_BUCKETS

export interface SleepBucketResult extends AnalysisResult {
  bucket: SleepBucket
  meanSleep: number
}

export interface SleepAnalysis {
  metric: MetricKey
  metricLabel: string
  pairs: SleepPair[]
  buckets: SleepBucketResult[]
  /** 수면 시간과 다음 날 상태가 함께 움직였는가 */
  r: number | null
  enough: boolean
}

export function analyzeSleep(input: SleepInput): SleepAnalysis {
  const pairs = pairSleep(input)
  const buckets = bucketsFor(pairs)
  const metric = METRICS[input.metric]

  const results: SleepBucketResult[] = buckets.map((bucket) => {
    const inside = pairs.filter((p) => p.hours >= bucket.min && p.hours < bucket.max)
    const samples: Sample[] = inside.map((p) => ({ value: p.value, date: p.nextDate }))
    const stats = describe(samples)

    return {
      metric: input.metric,
      label: bucket.label,
      observed: round(stats.mean),
      sampleCount: stats.count,
      distinctDays: stats.distinctDays,
      confidence: confidenceOf(stats, metric),
      bucket,
      meanSleep: round(mean(inside.map((p) => p.hours))),
      evidence: {
        window: input.window,
        weighting: 'day',
        observed: stats,
        quality: dataQuality(stats, input.window.days),
        analysisVersion: ANALYSIS_VERSION,
        taxonomyVersion: TAXONOMY_VERSION,
        ruleVersion: TAGGING_RULE_VERSION,
      },
    }
  })

  const usable = results.filter((r) => r.confidence !== 'insufficient')
  const points: Pair[] = pairs.map((p) => ({ x: p.hours, y: p.value, date: p.date }))

  return {
    metric: input.metric,
    metricLabel: metric.label,
    pairs,
    buckets: results,
    r: pairs.length >= MIN_COMPARISON ? correlation(points) : null,
    enough: usable.length >= 2,
  }
}

/**
 * 잠의 질과 다음 날 (계획서 34).
 * 시간과 따로 본다 — 여섯 시간을 푹 잔 날과 여덟 시간을 뒤척인 날은 다르다.
 */
export function sleepQualityPairs(input: SleepInput): Pair[] {
  return pairSleep(input)
    .filter((p) => p.quality !== null)
    .map((p) => ({ x: p.quality as number, y: p.value, date: p.date }))
}
