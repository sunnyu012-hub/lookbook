/**
 * DNA 정의를 짧게 쓰기 위한 도구.
 *
 * 48개를 하나씩 전부 적으면 읽을 수가 없다.
 * family·type 처럼 파일마다 같은 값은 여기서 채운다.
 */
import type { DiscoveryFamily, DiscoveryKind } from '../../types'
import type { DiscoveryDefinition } from '../types'

export type DnaSpec = Omit<DiscoveryDefinition, 'family' | 'type'> & {
  type?: DiscoveryKind
}

export const defineDna = (
  family: DiscoveryFamily,
  specs: DnaSpec[],
  defaultType: DiscoveryKind = 'BASIC',
): DiscoveryDefinition[] =>
  specs.map((spec) => ({ ...spec, family, type: spec.type ?? defaultType }))

/** 시간대 묶음 — 여러 DNA 가 같은 기준을 쓴다 */
export const MORNING = new Set(['dawn', 'morning'])
export const AFTERNOON = new Set(['afternoon'])
export const EVENING = new Set(['evening'])
export const NIGHT = new Set(['night'])
