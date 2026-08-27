/**
 * 7F — 화면이 읽을 모양.
 *
 * 여기서 정하는 것 두 가지.
 *
 * 하나. 나만의 발견은 48개와 따로 센다 (계획서 60).
 * "19 / 48" 에 섞으면 48이 거짓말이 된다. 아예 다른 영역에 둔다.
 *
 * 둘. AI 가 붙인 이름 아래에는 언제나 실제 조각을 같이 보여 준다 (계획서 63).
 * 이름은 기억하기 좋으라고 붙인 것이지 근거가 아니다.
 * 이름만 보이면 사용자는 이름을 근거로 착각한다.
 */
import type { DiscoveryEvidenceRecord } from '../types'
import { descriptionOf, titleOf } from './safety'
import type { PersonalContext, PersonalDiscoveryRecord } from './types'

export interface PersonalCard {
  fingerprint: string
  title: string
  description: string
  /** 이름 밑에 늘 같이 보여 주는 실제 조각들 */
  contexts: PersonalContext[]
  state: PersonalDiscoveryRecord['state']
  peakState: PersonalDiscoveryRecord['peakState']
  userPerception: PersonalDiscoveryRecord['userPerception']
  userTitle?: string
  /** 이름을 AI 가 붙였는가 — 화면에 그대로 밝힌다 */
  aiNamed: boolean
  componentEffects: Array<{ label: string; effect: number }>
  /** 조합 전체의 차이 */
  combinationEffect: number
  evidence?: DiscoveryEvidenceRecord
  firstFoundAt: string | null
}

const ORDER: Record<PersonalDiscoveryRecord['state'], number> = {
  ESTABLISHED: 0,
  GROWING: 1,
  EMERGING: 2,
  CHANGING: 3,
  LOCKED: 4,
}

export function toPersonalCard(record: PersonalDiscoveryRecord): PersonalCard {
  const evidence = record.evidence[record.evidence.length - 1]
  return {
    fingerprint: record.fingerprint,
    title: titleOf(record),
    description: descriptionOf(record),
    contexts: record.contexts,
    state: record.state,
    peakState: record.peakState,
    userPerception: record.userPerception,
    userTitle: record.userTitle,
    aiNamed: record.namingStatus === 'named' && !record.userTitle,
    componentEffects: record.componentEffects,
    combinationEffect: evidence?.effectSize ?? 0,
    evidence,
    firstFoundAt: record.firstFoundAt,
  }
}

export interface PersonalView {
  cards: PersonalCard[]
  /** 사용자가 숨긴 것 — 지운 게 아니라 접어 둔 것이다 */
  hidden: PersonalCard[]
}

export function buildPersonalView(
  records: readonly PersonalDiscoveryRecord[],
): PersonalView {
  const open = records.filter((r) => r.state !== 'LOCKED')
  return {
    cards: open
      .filter((r) => !r.hidden)
      .map(toPersonalCard)
      .sort((a, b) => ORDER[a.state] - ORDER[b.state]),
    hidden: open.filter((r) => r.hidden).map(toPersonalCard),
  }
}
