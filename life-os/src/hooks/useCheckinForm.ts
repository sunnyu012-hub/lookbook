import { useEffect, useMemo, useState } from 'react'
import type { Checkin, CheckinInput, EntryMode } from '@/types'
import { scoreCheckin, type ScoreContext } from '@/lib/scoring'

/** 새 기록은 전부 비워 둔 채로 시작한다 — 적은 것만 점수에 들어간다 */
export function emptyCheckin(date: string, entryMode: EntryMode = 'quick'): CheckinInput {
  return { date, entryMode, tags: [], memo: '' }
}

function toInput(checkin: Checkin): CheckinInput {
  const {
    id: _id,
    userId: _u,
    energyScore: _e,
    mode: _m,
    recoveryScore: _r,
    bodyScore: _b,
    mindScore: _mi,
    fuelScore: _f,
    confidence: _c2,
    createdAt: _c,
    updatedAt: _up,
    ...input
  } = checkin
  return { ...input, memo: input.memo ?? '' }
}

/** 체크인 폼 상태 + 입력 즉시 반영되는 점수 미리보기 */
export function useCheckinForm(date: string, existing: Checkin | null, ctx?: ScoreContext) {
  const [form, setForm] = useState<CheckinInput>(() =>
    existing ? toInput(existing) : emptyCheckin(date),
  )

  // 날짜가 바뀌거나 기존 기록이 뒤늦게 도착하면 폼을 다시 맞춘다
  useEffect(() => {
    setForm(existing ? toInput(existing) : emptyCheckin(date))
  }, [date, existing])

  const set = <K extends keyof CheckinInput>(key: K, value: CheckinInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const setMode = (entryMode: EntryMode) => setForm((prev) => ({ ...prev, entryMode }))

  const result = useMemo(() => scoreCheckin(form, ctx), [form, ctx])

  return { form, set, setMode, result, score: result.overall, mode: result.mode }
}
