import { useCallback, useEffect, useState } from 'react'
import type { AuthState } from './useSession'

interface Repo<T, I> {
  list: () => Promise<T[]>
  save: (input: I) => Promise<T>
  remove: (key: string) => Promise<void>
}

/**
 * 목록 하나를 읽고 쓰는 공통 훅.
 * 체중 / Mounjaro / D-Day / 라이프 이벤트가 전부 같은 모양이라 한 곳에 모았다.
 */
export function useCollection<T, I>(
  repo: Repo<T, I>,
  authState: AuthState,
  failMessage: string,
) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const ready = authState === 'local' || authState === 'signed-in'

  const refresh = useCallback(async () => {
    if (!ready) return
    try {
      setError(null)
      setItems(await repo.list())
    } catch (e) {
      setError(e instanceof Error ? e.message : failMessage)
    } finally {
      setLoading(false)
    }
    // repo 는 모듈 싱글턴이라 참조가 바뀌지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const save = useCallback(
    async (input: I) => {
      const saved = await repo.save(input)
      await refresh()
      return saved
    },
    [refresh],
  )

  const remove = useCallback(
    async (key: string) => {
      await repo.remove(key)
      await refresh()
    },
    [refresh],
  )

  return { items, loading, error, refresh, save, remove }
}
