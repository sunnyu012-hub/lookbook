/**
 * Life OS 2.0 — 버전.
 *
 * 분석 알고리즘과 태그 사전은 앞으로 계속 바뀐다.
 * 예전 버전으로 계산된 결과를 나중에 알아볼 수 있어야, 재계산할지 그냥 둘지 판단할 수 있다.
 *
 * 지금은 숫자만 박아 둔다. 실제 마이그레이션 로직은 필요해질 때 붙인다.
 */

/** 저장 형태(테이블·필드 구조)가 바뀌면 올린다 */
export const SCHEMA_VERSION = 1

/** 통계 계산 방식이 바뀌면 올린다. AnalysisSnapshot·DiscoveryEvidence 에 박힌다 */
export const ANALYSIS_VERSION = 1

/** LIFE TAG 사전이 바뀌면 올린다. 태그가 붙은 기록이 어느 사전으로 붙었는지 남긴다 */
export const TAXONOMY_VERSION = 1

export interface Versioned {
  schemaVersion: number
}

/** 기록에 지금 버전을 찍어 준다 */
export const stamp = <T extends object>(value: T): T & Versioned => ({
  ...value,
  schemaVersion: SCHEMA_VERSION,
})
