import { useCallback, useEffect, useMemo, useState } from 'react'
import { questRepository, type QuestLog } from '@/lib/questRepository'
import { xpOf } from '@/lib/quests'
import type { AuthState } from './useSession'

/**
 * 퀘스트 완료 기록 전체.
 * 오늘 화면은 오늘 것만 쓰지만, 레벨을 계산하려면 지난 기록까지 필요하다.
 */
export function useQuests(authState: AuthState = 'local') {
  const [log, setLog] = useState<QuestLog>({})
  const [loading, setLoading] = useState(true)
  const ready = authState === 'local' || authState === 'signed-in'

  useEffect(() => {
    if (!ready) return
    let alive = true
    questRepository
      .list()
      .then((next) => alive && setLog(next))
      .catch(() => undefined)
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [ready])

  const toggle = useCallback((date: string, questId: string) => {
    setLog((prev) => {
      const current = prev[date] ?? []
      const next = current.includes(questId)
        ? current.filter((id) => id !== questId)
        : [...current, questId]
      // 화면은 먼저 바꾸고 저장은 뒤따라간다 (체크가 늦게 반응하면 답답하니까)
      void questRepository.setForDate(date, next).catch(() => undefined)
      return { ...prev, [date]: next }
    })
  }, [])

  const questXp = useMemo(
    () => Object.values(log).reduce((sum, ids) => sum + xpOf(ids), 0),
    [log],
  )

  const doneFor = useCallback((date: string) => log[date] ?? [], [log])

  return { log, doneFor, toggle, questXp, loading }
}

export type QuestStore = ReturnType<typeof useQuests>
