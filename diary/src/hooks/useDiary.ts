import { useCallback, useEffect, useRef, useState } from 'react'
import { collectOrphans } from '../lib/photos'
import {
  loadEntries,
  saveEntries,
  withEntry,
  withoutEntry,
} from '../lib/storage'
import { emptyEntry, type DayEntry, type Entries } from '../lib/types'

export type Diary = {
  entries: Entries
  /** 그 날짜의 기록. 없으면 빈 하루를 만들어 준다 (저장은 안 된 상태) */
  entryOf: (date: string) => DayEntry
  patch: (date: string, change: Partial<Omit<DayEntry, 'date'>>) => void
  remove: (date: string) => void
  /** 가져오기·초기화처럼 통째로 바꿀 때 */
  replaceAll: (entries: Entries) => void
  /** 마지막으로 저장에 성공한 시각. 화면에 "저장됨" 을 띄우는 데 쓴다 */
  savedAt: number | null
  /** 저장이 막혔을 때 (저장 공간이 꽉 찼거나 사생활 모드) */
  storageBlocked: boolean
}

export function useDiary(): Diary {
  const [entries, setEntries] = useState<Entries>(() => loadEntries())
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [storageBlocked, setStorageBlocked] = useState(false)
  const first = useRef(true)

  // 바뀌면 바로 저장한다. 일기 앱에 저장 버튼을 두면 쓴 걸 잃는 사람이 생긴다.
  useEffect(() => {
    const ok = saveEntries(entries)
    setStorageBlocked(!ok)
    // 켠 직후의 첫 저장은 "방금 저장됨" 이 아니다 — 사람이 아무것도 안 썼다.
    if (ok && !first.current) setSavedAt(Date.now())
    first.current = false
  }, [entries])

  // 주인 없는 사진 치우기는 켤 때 한 번만. 기록이 바뀔 때마다 돌리면
  // 방금 넣은 사진이 기록보다 먼저 보일 때 지워버릴 수 있다.
  useEffect(() => {
    const used = new Set(Object.values(loadEntries()).flatMap((entry) => entry.photos))
    void collectOrphans(used)
  }, [])

  const patch = useCallback((date: string, change: Partial<Omit<DayEntry, 'date'>>) => {
    setEntries((current) => {
      const base = current[date] ?? emptyEntry(date)
      return withEntry(current, { ...base, ...change, date })
    })
  }, [])

  const remove = useCallback((date: string) => {
    setEntries((current) => withoutEntry(current, date))
  }, [])

  const replaceAll = useCallback((next: Entries) => setEntries(next), [])

  const entryOf = useCallback(
    (date: string) => entries[date] ?? emptyEntry(date),
    [entries],
  )

  return { entries, entryOf, patch, remove, replaceAll, savedAt, storageBlocked }
}
