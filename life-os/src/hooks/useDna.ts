/**
 * MY DNA 상태.
 *
 * 평가는 무겁다. 화면을 그릴 때마다 48개를 다 돌리지 않는다 (계획서 48, 105).
 * 기록이 실제로 바뀌었을 때만 한 번 돈다.
 *
 * 그리고 여기서 나는 오류는 어디로도 번지지 않는다.
 * DNA 가 안 열려도 기록은 그대로다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Checkin } from '@/types'
import type { MyTag, QuickLog } from '@/lib/os2/types'
import {
  ALL_DNA,
  applyChanging,
  buildView,
  evaluateCollection,
  evaluationWindow,
  getDna,
  type CollectionResult,
  type DiscoveryRecord,
  type ShiftRecord,
  type UserPerception,
} from '@/lib/os2/dna'
import { RARE_BY_ID } from '@/lib/os2/dna/registry/rare'
import { todayKeyOf } from '@/lib/os2/dna/util'
import { dnaRepository } from '@/lib/repositories/dna'
import type { AuthState } from './useSession'

export interface DnaInput {
  logs: readonly QuickLog[]
  checkins: readonly Checkin[]
  myTags: readonly MyTag[]
  authState?: AuthState
}

export function useDna({ logs, checkins, myTags, authState = 'local' }: DnaInput) {
  const [stored, setStored] = useState<DiscoveryRecord[]>([])
  const [shifts, setShifts] = useState<ShiftRecord[]>([])
  const [loading, setLoading] = useState(true)
  const saved = useRef(new Set<string>())

  const ready = authState === 'local' || authState === 'signed-in'

  useEffect(() => {
    if (!ready) return
    Promise.all([
      dnaRepository.list().catch(() => [] as DiscoveryRecord[]),
      dnaRepository.listShifts().catch(() => [] as ShiftRecord[]),
    ])
      .then(([records, found]) => {
        setStored(records)
        setShifts(found)
      })
      .finally(() => setLoading(false))
  }, [ready])

  /** 기록이 바뀌었는지 알아보는 가벼운 지문 */
  const fingerprint = useMemo(() => {
    if (!logs.length) return '-'
    let latest = ''
    for (const log of logs) if (log.updatedAt > latest) latest = log.updatedAt
    return `${logs.length}:${checkins.length}:${latest}`
  }, [logs, checkins])

  const result: CollectionResult = useMemo(() => {
    const today = todayKeyOf()
    const window = evaluationWindow(logs, today)

    try {
      const evaluated = evaluateCollection(
        { logs, checkins, myTags, window, today },
        { previous: stored },
      )
      return applyChanging(evaluated, { logs, checkins, myTags, window, today }, stored)
    } catch {
      // 평가가 통째로 실패해도 화면은 뜬다
      return {
        records: stored,
        shifts: [],
        newlyFound: [],
        upgraded: [],
        evaluatedAt: new Date().toISOString(),
        failed: [],
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint, myTags, stored])

  // 평가 결과를 저장한다. 실패해도 화면은 그대로 돈다
  useEffect(() => {
    if (loading || !ready) return
    const key = `${result.evaluatedAt}:${result.records.filter((r) => r.state !== 'LOCKED').length}`
    if (saved.current.has(key)) return
    saved.current.add(key)

    const open = result.records.filter((r) => r.state !== 'LOCKED')
    if (!open.length) return

    void dnaRepository
      .save(open, (id) => getDna(id)?.displayName ?? RARE_BY_ID.get(id)?.displayName ?? id)
      .then(() => {
        const fresh = open.flatMap((r) =>
          r.evidence.filter((e) => e.evaluatedAt === result.evaluatedAt),
        )
        return dnaRepository.addEvidence(fresh)
      })
      .catch(() => undefined)
  }, [result, loading, ready])

  const view = useMemo(() => buildView(result.records), [result.records])

  const setPerception = useCallback(
    async (defId: string, perception: UserPerception | null) => {
      setStored((prev) =>
        prev.map((r) =>
          r.defId === defId ? { ...r, userPerception: perception ?? undefined } : r,
        ),
      )
      await dnaRepository.setPerception(defId, perception).catch(() => undefined)
    },
    [],
  )

  return {
    view,
    records: result.records,
    shifts: [...shifts, ...result.shifts],
    newlyFound: result.newlyFound,
    upgraded: result.upgraded,
    failed: result.failed,
    loading,
    setPerception,
    definitions: ALL_DNA,
  }
}

export type DnaStore = ReturnType<typeof useDna>
