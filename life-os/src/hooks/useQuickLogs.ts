/**
 * Quick Log 상태.
 *
 * 저장 순서가 이 파일의 핵심이다.
 *   1. 기록을 먼저 저장한다
 *   2. 사진이 있으면 그 다음에 올린다
 *   3. 사진이 실패해도 기록은 이미 저장돼 있다
 * 사진 때문에 "지금 기분" 이 날아가면 안 된다. 기록이 항상 사진보다 우선이다.
 *
 * 자동 태깅도 같은 자리에 있다. 붙이는 건 저장 직전이고,
 * 실패하면 태그 없이 그냥 저장한다 (lib/os2/tagging/apply.ts).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { QuickLog, QuickLogInput } from '@/lib/os2/types'
import { quickLogRepository } from '@/lib/repositories/quickLog'
import { myTagRepository } from '@/lib/repositories/myTag'
import {
  PhotoError,
  compressImage,
  photoPathFor,
  removePhoto,
  uploadPhoto,
} from '@/lib/os2/photo'
import { withTags } from '@/lib/os2/tagging'
import { newId } from '@/lib/repositories/base'
import { todayKey } from '@/lib/date'
import type { AuthState } from './useSession'

export interface SaveResult {
  log: QuickLog
  /** 기록은 저장됐지만 사진만 못 올린 경우 — 화면에서 가볍게 알려 준다 */
  photoWarning: string | null
}

export function useQuickLogs(authState: AuthState = 'local', myTagNames: readonly string[] = []) {
  const [logs, setLogs] = useState<QuickLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /** 저장 버튼 연타로 같은 기록이 두 번 생기지 않게 */
  const saving = useRef(false)

  const ready = authState === 'local' || authState === 'signed-in'

  const refresh = useCallback(() => {
    if (!ready) return
    quickLogRepository
      .list()
      .then((next) => {
        setLogs(next)
        setError(null)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '기록을 불러오지 못했어요.'))
      .finally(() => setLoading(false))
  }, [ready])

  useEffect(() => {
    refresh()
  }, [refresh])

  /** 사진 한 장을 줄여서 올리고 경로를 돌려준다. 실패는 던지지 않고 문구로 돌려준다 */
  const putPhoto = useCallback(
    async (log: QuickLog, file: File): Promise<{ path?: string; warning?: string }> => {
      try {
        const blob = await compressImage(file)
        const path = photoPathFor(log.userId, log.id, new Date(log.loggedAt))
        await uploadPhoto(blob, path)
        await quickLogRepository.attachPhoto(log.id, path)
        return { path }
      } catch (e) {
        return {
          warning:
            e instanceof PhotoError ? e.userMessage : '사진만 올리지 못했어요. 기록은 저장됐어요.',
        }
      }
    },
    [],
  )

  const createLog = useCallback(
    async (input: QuickLogInput, photo?: File | null): Promise<SaveResult | null> => {
      if (saving.current) return null
      saving.current = true

      try {
        // 사진 경로에 로그 id 가 들어가므로 id 를 먼저 정한다
        const id = newId()
        const log = await quickLogRepository.create(withTags(input, { myTagNames }), id)

        // 태그 사용 횟수는 곁다리다. 실패해도 저장은 이미 끝났다
        void myTagRepository.touch(input.myTagIds ?? []).catch(() => undefined)

        let saved = log
        let photoWarning: string | null = null

        if (photo) {
          const { path, warning } = await putPhoto(log, photo)
          if (path) saved = { ...log, photoPath: path }
          photoWarning = warning ?? null
        }

        setLogs((prev) => [saved, ...prev])
        setError(null)
        return { log: saved, photoWarning }
      } catch (e) {
        setError(e instanceof Error ? e.message : '기록을 저장하지 못했어요.')
        throw e
      } finally {
        saving.current = false
      }
    },
    [putPhoto, myTagNames],
  )

  const updateLog = useCallback(
    async (
      id: string,
      input: QuickLogInput,
      photo?: File | null,
    ): Promise<SaveResult | null> => {
      if (saving.current) return null
      saving.current = true

      try {
        const previous = logs.find((l) => l.id === id)?.lifeTags
        const log = await quickLogRepository.update(
          id,
          withTags(input, { myTagNames, previous }),
        )
        void myTagRepository.touch(input.myTagIds ?? []).catch(() => undefined)

        let saved = log
        let photoWarning: string | null = null

        if (photo) {
          const { path, warning } = await putPhoto(log, photo)
          if (path) saved = { ...log, photoPath: path }
          photoWarning = warning ?? null
        }

        setLogs((prev) => prev.map((l) => (l.id === id ? saved : l)))
        setError(null)
        return { log: saved, photoWarning }
      } catch (e) {
        setError(e instanceof Error ? e.message : '기록을 고치지 못했어요.')
        throw e
      } finally {
        saving.current = false
      }
    },
    [putPhoto, myTagNames, logs],
  )

  /** Inspector 에서 태그만 고칠 때 — 본문·사진은 건드리지 않는다 */
  const saveLifeTags = useCallback(
    async (id: string, lifeTags: QuickLog['lifeTags']) => {
      const next = lifeTags ?? []
      // 화면을 먼저 바꾸고 저장한다. 태그 하나 누를 때마다 기다리게 하지 않는다
      setLogs((prev) => prev.map((l) => (l.id === id ? { ...l, lifeTags: next } : l)))
      try {
        await quickLogRepository.setLifeTags(id, next)
      } catch (e) {
        setError(e instanceof Error ? e.message : '태그를 저장하지 못했어요.')
        refresh()
      }
    },
    [refresh],
  )

  const removeLog = useCallback(async (id: string) => {
    const target = logs.find((l) => l.id === id)

    // 사진을 먼저 지운다. 실패해도 기록 삭제는 그대로 진행한다 —
    // 파일 하나 남는 것보다 기록이 안 지워지는 게 나쁘다
    if (target?.photoPath) void removePhoto(target.photoPath)

    await quickLogRepository.remove(id)
    setLogs((prev) => prev.filter((l) => l.id !== id))
  }, [logs])

  const byDate = useMemo(() => {
    const map = new Map<string, QuickLog[]>()
    for (const log of logs) map.set(log.date, [...(map.get(log.date) ?? []), log])
    // 하루 안에서는 시간순
    for (const [, list] of map) list.sort((a, b) => (a.loggedAt < b.loggedAt ? -1 : 1))
    return map
  }, [logs])

  const logsFor = useCallback((date: string) => byDate.get(date) ?? [], [byDate])

  const todayLogs = useMemo(() => byDate.get(todayKey()) ?? [], [byDate])

  return {
    logs,
    byDate,
    todayLogs,
    logsFor,
    loading,
    error,
    createLog,
    updateLog,
    saveLifeTags,
    removeLog,
    refresh,
  }
}

export type QuickLogStore = ReturnType<typeof useQuickLogs>
