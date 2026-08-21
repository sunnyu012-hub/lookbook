import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CompleteResult } from '@/types'
import type { CharacterMood } from '@/components/character/types'

export interface ExpToast {
  id: string
  amount: number
}

export interface Feedback {
  expToasts: ExpToast[]
  levelUp: number | null
  /** 캐릭터가 지금 지어야 할 표정 */
  mood: CharacterMood
  toast: string | null
  toastAction: { label: string; onClick: () => void } | null
  /** 퀘스트 완료 결과를 그대로 넘기면 알맞은 피드백을 띄운다. */
  celebrate: (result: CompleteResult) => void
  notify: (message: string, action?: { label: string; onClick: () => void }) => void
}

const EXP_TOAST_MS = 1200
const QUEST_CLEAR_MS = 1000
const LEVEL_UP_DELAY_MS = 340
const LEVEL_UP_MS = 1600
const TOAST_MS = 1800

/** +EXP, LEVEL UP, 캐릭터 표정, 안내 토스트를 한군데서 관리한다. */
export function useFeedback(): Feedback {
  const [expToasts, setExpToasts] = useState<ExpToast[]>([])
  const [levelUp, setLevelUp] = useState<number | null>(null)
  const [mood, setMood] = useState<CharacterMood>('idle')
  const [toast, setToast] = useState<string | null>(null)
  const [toastAction, setToastAction] = useState<Feedback['toastAction']>(null)
  const timers = useRef<number[]>([])

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }, [])

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t))
    },
    [],
  )

  const celebrate = useCallback(
    (result: CompleteResult) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      setExpToasts((prev) => [...prev, { id, amount: result.gainedExp }])
      later(() => setExpToasts((prev) => prev.filter((t) => t.id !== id)), EXP_TOAST_MS)

      setMood('questClear')

      if (result.leveledUp) {
        // EXP 숫자가 먼저 뜨고 나서 레벨업이 겹치도록 살짝 미룬다.
        later(() => {
          setMood('levelUp')
          setLevelUp(result.newLevel)
          later(() => {
            setLevelUp(null)
            setMood('idle')
          }, LEVEL_UP_MS)
        }, LEVEL_UP_DELAY_MS)
      } else {
        later(() => {
          // 그 사이 레벨업이 시작됐다면 표정을 덮어쓰지 않는다.
          setMood((current) => (current === 'questClear' ? 'idle' : current))
        }, QUEST_CLEAR_MS)
      }
    },
    [later],
  )

  const notify = useCallback(
    (message: string, action?: { label: string; onClick: () => void }) => {
      setToast(message)
      setToastAction(action ?? null)
      later(() => {
        setToast((current) => (current === message ? null : current))
        setToastAction(null)
      }, TOAST_MS)
    },
    [later],
  )

  return useMemo(
    () => ({ expToasts, levelUp, mood, toast, toastAction, celebrate, notify }),
    [expToasts, levelUp, mood, toast, toastAction, celebrate, notify],
  )
}
