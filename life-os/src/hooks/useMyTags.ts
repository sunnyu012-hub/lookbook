/**
 * My Tag 상태.
 *
 * 태그 저장이 실패해도 Quick Log 저장을 막지 않는다 —
 * 그래서 여기서 나는 오류는 화면을 멈추지 않고 문구로만 남는다.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { MyTag } from '@/lib/os2/types'
import { isActive, myTagRepository, sameName, sortTags } from '@/lib/repositories/myTag'
import type { AuthState } from './useSession'

export function useMyTags(authState: AuthState = 'local') {
  const [tags, setTags] = useState<MyTag[]>([])
  const [loading, setLoading] = useState(true)

  const ready = authState === 'local' || authState === 'signed-in'

  const refresh = useCallback(() => {
    if (!ready) return
    myTagRepository
      .list()
      .then(setTags)
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [ready])

  useEffect(() => {
    refresh()
  }, [refresh])

  /** 화면에 보여 줄 태그 — 보관·병합된 건 빼고 자주 쓰는 순 */
  const active = useMemo(() => sortTags(tags.filter(isActive)), [tags])

  const byId = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])

  /**
   * 합쳐진 태그를 따라간다. 과거 기록의 태그 id 는 안 고치고
   * 읽을 때만 옮겨 준다 — 기록을 나중에 뜯어고치지 않기 위해서다.
   */
  const resolve = useCallback(
    (id: string): MyTag | null => {
      let tag = byId.get(id) ?? null
      let hops = 0
      while (tag?.mergedIntoId && hops < 8) {
        tag = byId.get(tag.mergedIntoId) ?? null
        hops += 1
      }
      return tag
    },
    [byId],
  )

  const nameOf = useCallback((id: string) => resolve(id)?.name ?? null, [resolve])

  /** 이미 있으면 그걸 돌려준다. 같은 이름이 두 개 생기면 통계가 갈라진다 */
  const create = useCallback(
    async (name: string): Promise<MyTag | null> => {
      const trimmed = name.trim()
      if (!trimmed) return null

      const existing = active.find((t) => sameName(t.name, trimmed))
      if (existing) return existing

      try {
        const tag = await myTagRepository.create({ name: trimmed })
        setTags((prev) => (prev.some((t) => t.id === tag.id) ? prev : [...prev, tag]))
        return tag
      } catch {
        return null
      }
    },
    [active],
  )

  const toggleFavorite = useCallback(async (id: string) => {
    setTags((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isFavorite: !t.isFavorite } : t)),
    )
    const current = tags.find((t) => t.id === id)
    if (!current) return
    void myTagRepository.update(id, { isFavorite: !current.isFavorite }).catch(() => refresh())
  }, [tags, refresh])

  const archive = useCallback(async (id: string) => {
    setTags((prev) => prev.filter((t) => t.id !== id))
    await myTagRepository.archive(id).catch(() => refresh())
  }, [refresh])

  /** 검색 — 없으면 자주 쓰는 순 그대로 */
  const search = useCallback(
    (query: string) => {
      const q = query.trim().toLocaleLowerCase()
      if (!q) return active
      return active.filter((t) => t.name.toLocaleLowerCase().includes(q))
    },
    [active],
  )

  const favorites = useMemo(() => active.filter((t) => t.isFavorite), [active])
  const recent = useMemo(
    () => [...active].filter((t) => t.lastUsedAt).slice(0, 8),
    [active],
  )

  return {
    tags,
    active,
    favorites,
    recent,
    loading,
    byId,
    resolve,
    nameOf,
    create,
    toggleFavorite,
    archive,
    search,
    refresh,
  }
}

export type MyTagStore = ReturnType<typeof useMyTags>
