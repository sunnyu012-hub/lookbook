/**
 * 5F — 계산 결과를 아껴 두기.
 *
 * 기록이 몇 천 개가 되면 화면 들어갈 때마다 전부 다시 셀 수 없다.
 * 그래서 계산한 것을 열쇠와 함께 저장해 두고, 열쇠가 같으면 그대로 꺼낸다.
 *
 * 열쇠에는 계산 방식의 판 번호가 들어간다.
 * 계산이 바뀌었는데 옛날 값을 그대로 보여 주면 그게 제일 나쁜 캐시다.
 */
import { ANALYSIS_VERSION, TAXONOMY_VERSION } from '../versions'
import { TAGGING_RULE_VERSION } from '../tagging/engine'
import type { MetricKey } from './metrics'
import type { AnalysisWindow } from './windows'

/** 어떤 분석인가 */
export type SnapshotKind =
  | 'rhythm'
  | 'dayType'
  | 'weekday'
  | 'context'
  | 'myTag'
  | 'sleep'
  | 'recovery'
  | 'beforeAfter'
  | 'combination'
  | 'windowChange'

export interface SnapshotKey {
  kind: SnapshotKind
  metric: MetricKey
  window: AnalysisWindow
  /** 태그 id 같은 추가 조건 */
  scope?: string
}

/**
 * 열쇠 문자열.
 *
 * 판 번호 세 개가 전부 들어간다 —
 * 사전이 바뀌어도, 태깅 규칙이 바뀌어도, 계산이 바뀌어도 다른 열쇠가 된다.
 * 그래서 "옛날 계산을 지운다" 는 절차가 따로 필요 없다. 안 맞으면 안 꺼내진다.
 */
export const keyOf = (key: SnapshotKey): string =>
  [
    'v' + ANALYSIS_VERSION,
    't' + TAXONOMY_VERSION,
    'r' + TAGGING_RULE_VERSION,
    key.kind,
    key.metric,
    key.window.key,
    key.window.from,
    key.window.to,
    key.scope ?? '-',
  ].join('|')

export interface Snapshot<T = unknown> {
  key: string
  kind: SnapshotKind
  metric: MetricKey
  scope: string | null
  periodFrom: string
  periodTo: string
  result: T
  sampleCount: number
  distinctDays: number
  analysisVersion: number
  taxonomyVersion: number
  ruleVersion: number
  /** 데이터가 바뀌어서 다시 계산해야 하는가 */
  stale: boolean
  calculatedAt: string
}

/**
 * 데이터가 바뀌었을 때 무엇을 버려야 하는가 (계획서 57, 58).
 *
 * 전부 버리지 않는다. 바뀐 날짜를 품고 있는 것만 버린다 —
 * 3월 기록을 고쳤다고 최근 7일 분석을 다시 셀 이유가 없다.
 */
export const touchesDate = (snapshot: Snapshot, date: string): boolean =>
  date >= snapshot.periodFrom && date <= snapshot.periodTo

/** 판 번호가 지금과 다른가 */
export const isOutdated = (snapshot: Snapshot): boolean =>
  snapshot.analysisVersion !== ANALYSIS_VERSION
  || snapshot.taxonomyVersion !== TAXONOMY_VERSION
  || snapshot.ruleVersion !== TAGGING_RULE_VERSION

export const isUsable = (snapshot: Snapshot): boolean => !snapshot.stale && !isOutdated(snapshot)

// ─────────────────────────────────────────────
// 메모리 캐시
//
// 한 번 켜 둔 동안만 사는 캐시. 화면을 오갈 때 다시 계산하지 않게 해 준다.
// 저장소 캐시(analysis_snapshots)는 그 다음 층이다.
// ─────────────────────────────────────────────

export class SnapshotCache {
  private store = new Map<string, Snapshot>()

  get<T>(key: SnapshotKey): T | null {
    const found = this.store.get(keyOf(key))
    if (!found || !isUsable(found)) return null
    return found.result as T
  }

  set<T>(
    key: SnapshotKey,
    result: T,
    meta: { sampleCount: number; distinctDays: number },
  ): void {
    this.store.set(keyOf(key), {
      key: keyOf(key),
      kind: key.kind,
      metric: key.metric,
      scope: key.scope ?? null,
      periodFrom: key.window.from,
      periodTo: key.window.to,
      result,
      sampleCount: meta.sampleCount,
      distinctDays: meta.distinctDays,
      analysisVersion: ANALYSIS_VERSION,
      taxonomyVersion: TAXONOMY_VERSION,
      ruleVersion: TAGGING_RULE_VERSION,
      stale: false,
      calculatedAt: new Date().toISOString(),
    })
  }

  /** 이 날짜를 품은 것만 버린다 */
  invalidateDate(date: string): number {
    let n = 0
    for (const [key, snapshot] of this.store) {
      if (touchesDate(snapshot, date)) {
        this.store.delete(key)
        n += 1
      }
    }
    return n
  }

  /**
   * 태그 사전이나 개인 규칙이 바뀌면 전부 버린다.
   * 어느 날짜가 영향을 받는지 알 수 없기 때문이다.
   */
  clear(): void {
    this.store.clear()
  }

  get size(): number {
    return this.store.size
  }

  /** 얼마나 아꼈는지 — 보고와 QA 에서 본다 */
  stats = { hit: 0, miss: 0 }

  /** 있으면 꺼내고 없으면 계산해서 넣는다 */
  memo<T>(
    key: SnapshotKey,
    compute: () => { result: T; sampleCount: number; distinctDays: number },
  ): T {
    const cached = this.get<T>(key)
    if (cached !== null) {
      this.stats.hit += 1
      return cached
    }
    this.stats.miss += 1
    const { result, sampleCount, distinctDays } = compute()
    this.set(key, result, { sampleCount, distinctDays })
    return result
  }
}
