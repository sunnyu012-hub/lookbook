import { useEffect, useMemo, useState } from 'react'
import type { Checkin, CheckinInput } from '@/types'
import { calcEnergyScore, scoreToMode } from '@/lib/energy'

export function emptyCheckin(date: string): CheckinInput {
  return {
    date,
    sleepHours: 7,
    sleepQuality: 3,
    fatigue: 3,
    bodyPain: 0,
    mood: 3,
    focus: 3,
    appetite: 3,
    caffeineConsumed: false,
    caffeineTime: null,
    exercise: false,
    exerciseType: null,
    memo: '',
  }
}

function toInput(checkin: Checkin): CheckinInput {
  const { id: _id, userId: _u, energyScore: _e, mode: _m, createdAt: _c, updatedAt: _up, ...input } = checkin
  return { ...input, memo: input.memo ?? '' }
}

/** 체크인 폼 상태 + 입력 즉시 반영되는 점수 미리보기 */
export function useCheckinForm(date: string, existing: Checkin | null) {
  const [form, setForm] = useState<CheckinInput>(() =>
    existing ? toInput(existing) : emptyCheckin(date),
  )

  // 날짜가 바뀌거나 기존 기록이 뒤늦게 도착하면 폼을 다시 맞춘다
  useEffect(() => {
    setForm(existing ? toInput(existing) : emptyCheckin(date))
  }, [date, existing])

  const set = <K extends keyof CheckinInput>(key: K, value: CheckinInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const score = useMemo(() => calcEnergyScore(form), [form])
  const mode = useMemo(() => scoreToMode(score), [score])

  return { form, set, score, mode }
}
