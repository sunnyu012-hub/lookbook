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
import {
  buildPersonalView,
  defaultNamingService,
  evaluatePersonal,
  monthOf,
  namePending,
  type PersonalDiscoveryRecord,
  type PersonalResult,
} from '@/lib/os2/dna/personal'
import { todayKeyOf } from '@/lib/os2/dna/util'
import { dnaRepository } from '@/lib/repositories/dna'
import { personalDiscoveryRepository } from '@/lib/repositories/personalDiscovery'
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
  const [personalStored, setPersonalStored] = useState<PersonalDiscoveryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const saved = useRef(new Set<string>())
  const personalSaved = useRef(new Set<string>())
  /** 이번 세션에서 이름을 부르려고 시도한 발견 — 같은 것을 두 번 부르지 않는다 */
  const naming = useRef(new Set<string>())

  const ready = authState === 'local' || authState === 'signed-in'

  useEffect(() => {
    if (!ready) return
    Promise.all([
      dnaRepository.list().catch(() => [] as DiscoveryRecord[]),
      dnaRepository.listShifts().catch(() => [] as ShiftRecord[]),
      personalDiscoveryRepository.list().catch(() => [] as PersonalDiscoveryRecord[]),
    ])
      .then(([records, found, personal]) => {
        setStored(records)
        setShifts(found)
        setPersonalStored(personal)
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

  // ─────────────────────────────────────────────
  // 나만의 발견 (Phase 7)
  //
  // 48개 평가가 끝난 뒤에 돈다. 그래야 "이미 말한 이야기" 를 알 수 있다.
  // 여기서 터져도 위의 48개와 기록은 그대로다.
  // ─────────────────────────────────────────────
  const personal: PersonalResult = useMemo(() => {
    const today = todayKeyOf()
    const window = evaluationWindow(logs, today)
    const nameOf = new Map(myTags.map((t) => [t.id, t.name]))

    try {
      return evaluatePersonal(
        { logs, checkins, myTags, window, today },
        {
          previous: personalStored,
          dnaRecords: result.records,
          myTagNameOf: (id) => nameOf.get(id),
        },
      )
    } catch {
      return {
        records: personalStored,
        newlyFound: [],
        waiting: 0,
        evaluatedAt: new Date().toISOString(),
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint, myTags, personalStored, result.records])

  /**
   * 이름 붙이기. 새로 열린 것에만, 한 번씩만.
   * 실패해도 조용히 넘어간다 — 그때는 앱이 만든 문장이 그대로 쓰인다.
   */
  useEffect(() => {
    if (loading || !ready) return

    const todo = personal.records.filter(
      (r) =>
        r.state !== 'LOCKED'
        && (r.namingStatus === 'pending' || r.namingStatus === 'skipped')
        && !naming.current.has(r.fingerprint),
    )
    if (!todo.length) return
    for (const record of todo) naming.current.add(record.fingerprint)

    const month = monthOf(new Date().toISOString())
    let cancelled = false

    void (async () => {
      const budget = await personalDiscoveryRepository
        .readUsage(month)
        .catch(() => ({ month, used: 0 }))

      const outcome = await namePending(todo, defaultNamingService(), {
        budget,
        onBudget: (next) => void personalDiscoveryRepository.writeUsage(next).catch(() => undefined),
      }).catch(() => null)

      if (cancelled || !outcome) return

      const byFingerprint = new Map(outcome.records.map((r) => [r.fingerprint, r]))
      setPersonalStored((prev) => {
        const merged = new Map(prev.map((r) => [r.fingerprint, r]))
        for (const record of personal.records) {
          merged.set(record.fingerprint, byFingerprint.get(record.fingerprint) ?? record)
        }
        return [...merged.values()]
      })
    })()

    return () => {
      cancelled = true
    }
  }, [personal, loading, ready])

  // 나만의 발견을 저장한다. 실패해도 화면은 그대로 돈다
  useEffect(() => {
    if (loading || !ready) return
    const open = personal.records.filter((r) => r.state !== 'LOCKED')
    if (!open.length) return

    const key = `${personal.evaluatedAt}:${open.length}:${open.map((r) => r.namingStatus).join('')}`
    if (personalSaved.current.has(key)) return
    personalSaved.current.add(key)

    void personalDiscoveryRepository
      .save(open)
      .then(() => {
        const fresh = open.flatMap((r) =>
          r.evidence.filter((e) => e.evaluatedAt === personal.evaluatedAt),
        )
        return personalDiscoveryRepository.addEvidence(fresh)
      })
      .catch(() => undefined)
  }, [personal, loading, ready])

  const personalView = useMemo(
    () => buildPersonalView(personal.records),
    [personal.records],
  )

  /** 사용자가 고치는 것들 — 통계는 건드리지 않는다 */
  const patchPersonal = useCallback(
    async (
      fingerprint: string,
      patch: Partial<Pick<PersonalDiscoveryRecord, 'userTitle' | 'hidden' | 'userPerception'>>,
    ) => {
      setPersonalStored((prev) => {
        const found = prev.some((r) => r.fingerprint === fingerprint)
        const base = found
          ? prev
          : [...prev, ...personal.records.filter((r) => r.fingerprint === fingerprint)]
        return base.map((r) => (r.fingerprint === fingerprint ? { ...r, ...patch } : r))
      })
      await personalDiscoveryRepository.patch(fingerprint, patch).catch(() => undefined)
    },
    [personal.records],
  )

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
    personal: personalView,
    personalRecords: personal.records,
    patchPersonal,
  }
}

export type DnaStore = ReturnType<typeof useDna>
