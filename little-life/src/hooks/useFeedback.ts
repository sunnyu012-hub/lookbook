import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CompleteResult } from '@/types'

export interface ExpToast {
  id: string
  amount: number
}

export interface Feedback {
  expToasts: ExpToast[]
  levelUp: number | null
  /** 퀘스트 완료 결과를 그대로 넘기면 알맞은 피드백을 띄운다. */
  celebrate: (result: CompleteResult) => void
}

const EXP_TOAST_MS = 1100
const LEVEL_UP_MS = 1800

/** +20 EXP 뜨는 것과 LEVEL UP! 오버레이를 관리한다. */
export function useFeedback(): Feedback {
  const [expToasts, setExpToasts] = useState<ExpToast[]>([])
  const [levelUp, setLevelUp] = useState<number | null>(null)
  const timers = useRef<number[]>([])

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t))
    },
    [],
  )

  const celebrate = useCallback((result: CompleteResult) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setExpToasts((prev) => [...prev, { id, amount: result.gainedExp }])
    timers.current.push(
      window.setTimeout(() => {
        setExpToasts((prev) => prev.filter((t) => t.id !== id))
      }, EXP_TOAST_MS),
    )

    if (result.leveledUp) {
      // EXP 숫자가 먼저 뜨고 나서 레벨업이 겹치도록 살짝 미룬다.
      timers.current.push(
        window.setTimeout(() => {
          setLevelUp(result.newLevel)
          timers.current.push(window.setTimeout(() => setLevelUp(null), LEVEL_UP_MS))
        }, 320),
      )
    }
  }, [])

  return useMemo(() => ({ expToasts, levelUp, celebrate }), [expToasts, levelUp, celebrate])
}
