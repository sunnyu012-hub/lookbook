/**
 * 6C — 화면이 읽을 모양으로 정리.
 *
 * 여기서 정하는 것 두 가지.
 *
 * 하나. 무엇을 보여 주고 무엇을 숨기는가.
 *   BASIC 은 잠겨 있어도 ??? 칸이 보인다. 이름과 조건은 숨긴다.
 *   HIDDEN 은 칸조차 안 보인다. "아직 알려지지 않은 DNA 3개" 로만.
 *   RARE 는 발견 전에는 존재 자체를 숨긴다.
 *
 * 둘. 진행 상황을 절대 보여 주지 않는다 (계획서 32).
 *   "7 / 10 기록", "80% 완료", "3개 더 남았어요" 전부 금지다.
 *   그걸 보여 주는 순간 사용자는 해금하려고 기록하게 된다.
 */
import type { DiscoveryFamily } from '../types'
import { BASE_COUNT, BASE_DNA, getDna } from './registry'
import { RARE_BY_ID } from './registry/rare'
import { FAMILY_LABEL, FAMILY_ORDER, type DiscoveryRecord } from './types'

export interface FamilyView {
  family: DiscoveryFamily
  label: string
  /** 열린 것 */
  found: FoundCard[]
  /** 아직인 BASIC — 이름 없이 ??? 로 */
  lockedBasic: LockedCard[]
  /** 아직인 HIDDEN 은 수만 */
  hiddenRemaining: number
}

export interface FoundCard {
  defId: string
  displayName: string
  icon: string
  description: string
  state: DiscoveryRecord['state']
  peakState: DiscoveryRecord['peakState']
  children?: string[]
  userPerception?: DiscoveryRecord['userPerception']
  firstDiscoveredAt: string | null
  /** 가장 최근 근거 */
  evidence?: DiscoveryRecord['evidence'][number]
}

export interface LockedCard {
  defId: string
  icon: string
  /** 조건은 절대 적지 않는다 */
  teaser: string
}

export interface CollectionView {
  /** "18 / 48" 의 18 */
  foundCount: number
  /** 48 */
  totalCount: number
  families: FamilyView[]
  /** 발견된 것만. 없으면 빈 배열이고 화면에서 영역째 숨긴다 */
  rare: FoundCard[]
  shiftCount: number
}

const DEFAULT_TEASER = '아직 알아가는 중이에요.'

export function buildView(records: readonly DiscoveryRecord[]): CollectionView {
  const byId = new Map(records.map((r) => [r.defId, r]))
  const isFound = (id: string) => (byId.get(id)?.state ?? 'LOCKED') !== 'LOCKED'

  const families: FamilyView[] = FAMILY_ORDER.map((family) => {
    const defs = BASE_DNA.filter((d) => d.family === family)

    const found: FoundCard[] = []
    const lockedBasic: LockedCard[] = []
    let hiddenRemaining = 0

    for (const def of defs) {
      const record = byId.get(def.id)
      if (record && record.state !== 'LOCKED') {
        found.push(toCard(def.id, record))
        continue
      }
      if (def.type === 'HIDDEN') {
        hiddenRemaining += 1
        continue
      }
      lockedBasic.push({
        defId: def.id,
        icon: def.icon,
        teaser: def.teaser ?? DEFAULT_TEASER,
      })
    }

    return {
      family,
      label: FAMILY_LABEL[family],
      found: found.sort(byState),
      lockedBasic,
      hiddenRemaining,
    }
  })

  const rare = records
    .filter((r) => RARE_BY_ID.has(r.defId) && r.state !== 'LOCKED')
    .map((r) => toCard(r.defId, r))
    .sort(byState)

  return {
    // RARE 는 48 에 세지 않는다
    foundCount: BASE_DNA.filter((d) => isFound(d.id)).length,
    totalCount: BASE_COUNT,
    families,
    rare,
    shiftCount: 0,
  }
}

function toCard(defId: string, record: DiscoveryRecord): FoundCard {
  const def = getDna(defId) ?? RARE_BY_ID.get(defId)
  return {
    defId,
    displayName: def?.displayName ?? defId,
    icon: def?.icon ?? '·',
    description: def?.description ?? '',
    state: record.state,
    peakState: record.peakState,
    children: record.children,
    userPerception: record.userPerception,
    firstDiscoveredAt: record.firstDiscoveredAt,
    evidence: record.evidence[record.evidence.length - 1],
  }
}

/** 자리 잡은 것 → 반복되는 중 → 보이기 시작 → 달라지는 중 (계획서 51) */
const ORDER: Record<DiscoveryRecord['state'], number> = {
  ESTABLISHED: 0,
  GROWING: 1,
  EMERGING: 2,
  CHANGING: 3,
  LOCKED: 4,
}

const byState = (a: FoundCard, b: FoundCard) => ORDER[a.state] - ORDER[b.state]

/**
 * 첫 화면에 48개 ??? 를 한꺼번에 보여 주지 않는다 (계획서 86).
 * family 마다 두 칸까지만 미리 보여 주고 나머지는 안에서 본다.
 */
export const previewLocked = (family: FamilyView, take = 2): LockedCard[] =>
  family.lockedBasic.slice(0, take)
