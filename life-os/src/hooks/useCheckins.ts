import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Checkin, CheckinInput } from '@/types'
import { todayKey } from '@/lib/date'
import { checkinRepository } from '@/lib/repository'
import type { AuthState } from './useSession'

/**
 * 앱 전체가 공유하는 체크인 컬렉션. 저장 후에는 목록을 다시 읽어 화면을 즉시 맞춘다.
 * Supabase 모드에서는 세션이 준비된 뒤에만 읽는다 (RLS 때문에 세션 없이는 빈 결과가 온다).
 */
export function useCheckins(authState: AuthState = 'local') {
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const ready = authState === 'local' || authState === 'signed-in'

  const refresh = useCallback(async () => {
    if (!ready) return
    try {
      setError(null)
      const rows = await checkinRepository.list()
      setCheckins(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : '기록을 불러오지 못했어요.')
    } finally {
      setLoading(false)
    }
  }, [ready])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const save = useCallback(
    async (input: CheckinInput) => {
      const saved = await checkinRepository.save(input)
      await refresh()
      return saved
    },
    [refresh],
  )

  const remove = useCallback(
    async (date: string) => {
      await checkinRepository.remove(date)
      await refresh()
    },
    [refresh],
  )

  const byDate = useMemo(() => new Map(checkins.map((c) => [c.date, c])), [checkins])
  const today = byDate.get(todayKey()) ?? null

  return { checkins, byDate, today, loading, error, refresh, save, remove }
}

export type CheckinsStore = ReturnType<typeof useCheckins>
