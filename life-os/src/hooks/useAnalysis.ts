/**
 * 분석 상태.
 *
 * 계산은 전부 lib/os2/analytics 의 순수 함수가 한다. 여기서는 언제 다시 계산할지만 정한다.
 *
 * 다시 계산하는 때 (계획서 57):
 *   기록이 늘거나 바뀌거나 지워졌을 때 · 태그를 고쳤을 때 · Check-in 이 바뀌었을 때
 *   그리고 계산 방식·사전·규칙의 판 번호가 바뀌었을 때 (열쇠에 판 번호가 들어 있다)
 *
 * 화면을 그리는 동안 무거운 계산을 반복하지 않는다 (계획서 84).
 */
import { useCallback, useMemo, useRef } from 'react'
import type { Checkin } from '@/types'
import type { MyTag, QuickLog } from '@/lib/os2/types'
import {
  DEFAULT_WINDOW,
  SnapshotCache,
  analyzeRecovery,
  analyzeSleep,
  buildRhythm,
  compareWindows,
  contextResults,
  earliestDate,
  makeWindow,
  myTagResults,
  previousWindow,
  rankContexts,
  twoWay,
  type MetricKey,
  type WindowKey,
} from '@/lib/os2/analytics'

export interface AnalysisInput {
  logs: readonly QuickLog[]
  checkins: readonly Checkin[]
  myTags: readonly MyTag[]
  windowKey?: WindowKey
  metric?: MetricKey
}

export function useAnalysis({
  logs,
  checkins,
  myTags,
  windowKey = DEFAULT_WINDOW,
  metric = 'mood',
}: AnalysisInput) {
  /** 한 번 켜 둔 동안 사는 캐시. 화면을 오갈 때 다시 계산하지 않게 */
  const cache = useRef(new SnapshotCache())

  // 기록이 바뀌면 그 날짜를 품은 계산만 버린다
  const fingerprint = useMemo(
    () => `${logs.length}:${checkins.length}:${myTags.length}:${stamp(logs)}`,
    [logs, checkins, myTags],
  )

  const window = useMemo(
    () => makeWindow(windowKey, { earliest: earliestDate(logs) }),
    [windowKey, logs],
  )

  const rhythm = useMemo(
    () => cache.current.memo(
      { kind: 'rhythm', metric, window },
      () => {
        const result = buildRhythm({ logs, window })
        return {
          result,
          sampleCount: logs.length,
          distinctDays: result.activeDays,
        }
      },
    ),
    // fingerprint 가 바뀌면 데이터가 바뀐 것이다
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [logs, window, metric, fingerprint],
  )

  const contexts = useMemo(
    () => cache.current.memo(
      { kind: 'context', metric, window },
      () => {
        const result = contextResults({ logs, window, metric })
        return {
          result,
          sampleCount: result.reduce((n, r) => n + r.sampleCount, 0),
          distinctDays: result.reduce((n, r) => Math.max(n, r.distinctDays), 0),
        }
      },
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [logs, window, metric, fingerprint],
  )

  const ranked = useMemo(() => rankContexts(contexts), [contexts])

  const tags = useMemo(
    () => cache.current.memo(
      { kind: 'myTag', metric, window },
      () => {
        const result = myTagResults({ logs, window, metric, myTags })
        return {
          result,
          sampleCount: result.reduce((n, r) => n + r.sampleCount, 0),
          distinctDays: result.reduce((n, r) => Math.max(n, r.distinctDays), 0),
        }
      },
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [logs, myTags, window, metric, fingerprint],
  )

  const sleep = useMemo(
    () => cache.current.memo(
      { kind: 'sleep', metric, window },
      () => {
        const result = analyzeSleep({ checkins, logs, window, metric })
        return {
          result,
          sampleCount: result.pairs.length,
          distinctDays: new Set(result.pairs.map((p) => p.date)).size,
        }
      },
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [checkins, logs, window, metric, fingerprint],
  )

  const recovery = useMemo(
    () => cache.current.memo(
      { kind: 'recovery', metric: 'energy', window },
      () => {
        const result = analyzeRecovery({ logs, window, metric: 'energy' })
        return {
          result,
          sampleCount: result.episodes.length,
          distinctDays: new Set(result.episodes.map((e) => e.startDate)).size,
        }
      },
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [logs, window, fingerprint],
  )

  const change = useMemo(() => {
    const before = previousWindow(window)
    if (!before) return null
    return compareWindows({ logs, metric }, window, before)
  }, [logs, window, metric])

  /** Phase 6 이 읽을 재료. 화면에는 아직 안 쓴다 */
  const combinations = useCallback(
    () => twoWay({ logs, window, metric }),
    [logs, window, metric],
  )

  /** 기록 하나가 바뀌었을 때 */
  const invalidateDate = useCallback((date: string) => {
    cache.current.invalidateDate(date)
  }, [])

  /** 사전이나 개인 규칙이 바뀌었을 때 — 어느 날짜가 걸릴지 알 수 없다 */
  const invalidateAll = useCallback(() => {
    cache.current.clear()
  }, [])

  return {
    window,
    metric,
    rhythm,
    contexts,
    ranked,
    tags,
    sleep,
    recovery,
    change,
    combinations,
    invalidateDate,
    invalidateAll,
    cacheStats: cache.current.stats,
  }
}

/** 기록이 바뀌었는지 알아보는 아주 가벼운 지문 */
const stamp = (logs: readonly QuickLog[]): string => {
  if (!logs.length) return '-'
  let latest = ''
  for (const log of logs) if (log.updatedAt > latest) latest = log.updatedAt
  return latest
}

export type AnalysisStore = ReturnType<typeof useAnalysis>
