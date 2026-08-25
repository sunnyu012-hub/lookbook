/**
 * 5E — 가라앉았다가 돌아오기까지.
 *
 * 기운이 바닥난 뒤 평소로 돌아오는 데 얼마나 걸리는지 잰다.
 *
 * 조심할 것 두 가지.
 *
 * 하나. 연속으로 낮게 적은 것을 각각 세면 안 된다 (계획서 42).
 * 18시 1, 19시 1, 20시 2 는 세 번 무너진 게 아니라 한 번 길게 이어진 것이다.
 *
 * 둘. 평균을 딱 넘는 순간을 회복이라고 하면 너무 예민하다 (계획서 40).
 * 평균에서 조금 못 미쳐도 돌아온 것으로 본다.
 *
 * 그리고 이건 "회복력" 점수가 아니다. 걸린 시간을 적을 뿐이고, 빠르면 좋다고 말하지 않는다.
 */
import type { QuickLog } from '../types'
import { METRICS, valueOfLog, type MetricKey } from './metrics'
import { median, mean, round } from './stats'
import { inWindow, type AnalysisWindow } from './windows'

/** 이 아래면 가라앉은 것으로 본다 */
export const LOW_THRESHOLD = 2

/** 평균에서 이만큼 못 미쳐도 돌아온 것으로 본다 */
export const RECOVERY_TOLERANCE = 0.3

/** 이만큼 안에 다시 낮아지면 같은 일로 묶는다 */
export const EPISODE_GAP_HOURS = 6

/** 이보다 오래 못 돌아오면 그 사이에 다른 일이 너무 많다 */
export const MAX_TRACK_HOURS = 72

export interface RecoveryEpisode {
  metric: MetricKey
  /** 가라앉기 시작한 시각 */
  startedAt: string
  startDate: string
  /** 가장 낮았던 값 */
  lowest: number
  /** 이 일에 묶인 기록 수 */
  logCount: number
  /** 평소로 돌아온 시각. 아직이면 null */
  recoveredAt: string | null
  /** 걸린 시간. 아직 안 돌아왔으면 null */
  hours: number | null
}

export interface RecoveryAnalysis {
  metric: MetricKey
  metricLabel: string
  baseline: number
  target: number
  episodes: RecoveryEpisode[]
  /** 돌아온 것만 */
  recovered: RecoveryEpisode[]
  meanHours: number | null
  medianHours: number | null
  enough: boolean
}

/** 이 정도는 있어야 평균 회복 시간을 말할 수 있다 */
export const MIN_EPISODES = 3

export interface RecoveryInput {
  logs: readonly QuickLog[]
  window: AnalysisWindow
  metric: MetricKey
  threshold?: number
}

export function analyzeRecovery(input: RecoveryInput): RecoveryAnalysis {
  const metric = METRICS[input.metric]
  const low = input.threshold ?? LOW_THRESHOLD

  const points = input.logs
    .filter((log) => inWindow(log.date, input.window))
    .map((log) => ({ log, value: valueOfLog(log, input.metric) }))
    .filter((p): p is { log: QuickLog; value: number } => p.value !== null)
    .sort((a, b) => (a.log.loggedAt < b.log.loggedAt ? -1 : 1))

  const baseline = round(mean(points.map((p) => p.value)))
  const target = round(baseline - RECOVERY_TOLERANCE)

  const episodes: RecoveryEpisode[] = []
  let current: RecoveryEpisode | null = null
  let lastLowAt: number | null = null

  for (const { log, value } of points) {
    const at = new Date(log.loggedAt).getTime()

    if (value <= low) {
      const continues =
        current !== null
        && lastLowAt !== null
        && (at - lastLowAt) / 3_600_000 <= EPISODE_GAP_HOURS

      if (continues && current) {
        current.lowest = Math.min(current.lowest, value)
        current.logCount += 1
      } else {
        if (current) episodes.push(current)
        current = {
          metric: input.metric,
          startedAt: log.loggedAt,
          startDate: log.date,
          lowest: value,
          logCount: 1,
          recoveredAt: null,
          hours: null,
        }
      }
      lastLowAt = at
      continue
    }

    // 평소 근처로 돌아왔는가
    if (current && value >= target) {
      const hours = (at - new Date(current.startedAt).getTime()) / 3_600_000
      if (hours <= MAX_TRACK_HOURS) {
        current.recoveredAt = log.loggedAt
        current.hours = round(hours, 1)
      }
      episodes.push(current)
      current = null
      lastLowAt = null
    }
  }

  if (current) episodes.push(current)

  // 너무 오래 못 돌아온 것은 시간에서 뺀다 — 그 사이 일이 너무 많다
  const recovered = episodes.filter((e) => e.hours !== null)
  const hours = recovered.map((e) => e.hours as number)

  return {
    metric: input.metric,
    metricLabel: metric.label,
    baseline,
    target,
    episodes,
    recovered,
    meanHours: hours.length ? round(mean(hours), 1) : null,
    medianHours: hours.length ? round(median(hours), 1) : null,
    enough: recovered.length >= MIN_EPISODES,
  }
}
