import { useCallback, useEffect, useState } from 'react'
import type { Preferences } from '@/types'
import { DEFAULT_PREFERENCES, preferencesRepository } from '@/lib/repositories/preferences'
import type { ScoreContext } from '@/lib/scoring'
import type { AuthState } from './useSession'

/** 개인 설정. 점수 계산에 쓰는 목표치도 여기서 나온다. */
export function usePreferences(authState: AuthState = 'local') {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const ready = authState === 'local' || authState === 'signed-in'

  const refresh = useCallback(async () => {
    if (!ready) return
    try {
      setError(null)
      setPrefs(await preferencesRepository.get())
    } catch (e) {
      setError(e instanceof Error ? e.message : '설정을 불러오지 못했어요.')
    } finally {
      setLoading(false)
    }
  }, [ready])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const save = useCallback(async (next: Preferences) => {
    const saved = await preferencesRepository.save(next)
    setPrefs(saved)
    return saved
  }, [])

  const scoreContext: ScoreContext = {
    sleepGoalHours: prefs.sleepGoalHours,
    waterGoalMl: prefs.waterGoalMl,
  }

  return { prefs, scoreContext, loading, error, save, refresh }
}

export type PreferencesStore = ReturnType<typeof usePreferences>
