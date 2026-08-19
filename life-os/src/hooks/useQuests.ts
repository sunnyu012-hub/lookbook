import { useCallback, useEffect, useState } from 'react'

const KEY = 'life-os:quests:v1'

type Store = Record<string, string[]>

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Store) : {}
  } catch {
    return {}
  }
}

/**
 * 퀘스트 완료 체크는 아직 서버에 저장하지 않는다 (기기 로컬).
 * XP 시스템을 붙일 때 daily_checkins 옆 테이블로 옮기면 된다.
 */
export function useQuests(date: string) {
  const [done, setDone] = useState<string[]>([])

  useEffect(() => {
    setDone(read()[date] ?? [])
  }, [date])

  const toggle = useCallback(
    (questId: string) => {
      setDone((prev) => {
        const next = prev.includes(questId)
          ? prev.filter((id) => id !== questId)
          : [...prev, questId]
        const store = read()
        store[date] = next
        localStorage.setItem(KEY, JSON.stringify(store))
        return next
      })
    },
    [date],
  )

  return { done, toggle }
}
