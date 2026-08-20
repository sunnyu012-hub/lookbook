import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  NightCheckout,
  NightCheckoutInput,
  DdayEvent,
  DdayInput,
  LifeEvent,
  LifeEventInput,
  MounjaroInput,
  MounjaroLog,
  WeightInput,
  WeightLog,
} from '@/types'
import { ddayRepository } from '@/lib/repositories/dday'
import { lifeEventRepository } from '@/lib/repositories/lifeEvents'
import { mounjaroRepository } from '@/lib/repositories/mounjaro'
import { weightRepository } from '@/lib/repositories/weight'
import { nightRepository } from '@/lib/repositories/night'
import { eventRepository, type EventLog } from '@/lib/repositories/events'
import { useCollection } from './useCollection'
import type { AuthState } from './useSession'

export function useWeights(authState: AuthState = 'local') {
  const store = useCollection<WeightLog, WeightInput>(
    weightRepository,
    authState,
    '체중 기록을 불러오지 못했어요.',
  )
  const byDate = useMemo(() => new Map(store.items.map((w) => [w.date, w])), [store.items])
  return { ...store, logs: store.items, byDate }
}

export function useMounjaro(authState: AuthState = 'local') {
  const store = useCollection<MounjaroLog, MounjaroInput>(
    mounjaroRepository,
    authState,
    '투약 기록을 불러오지 못했어요.',
  )
  const byDate = useMemo(() => new Map(store.items.map((m) => [m.date, m])), [store.items])
  return { ...store, logs: store.items, byDate }
}

export function useDdays(authState: AuthState = 'local') {
  const store = useCollection<DdayEvent, DdayInput & { id?: string }>(
    ddayRepository,
    authState,
    'D-Day 를 불러오지 못했어요.',
  )
  return { ...store, ddays: store.items }
}

export function useLifeEvents(authState: AuthState = 'local') {
  const store = useCollection<LifeEvent, LifeEventInput & { id?: string }>(
    lifeEventRepository,
    authState,
    '기록을 불러오지 못했어요.',
  )
  const byDate = useMemo(() => {
    const map = new Map<string, LifeEvent[]>()
    store.items.forEach((e) => map.set(e.date, [...(map.get(e.date) ?? []), e]))
    return map
  }, [store.items])
  return { ...store, events: store.items, byDate }
}

export function useNights(authState: AuthState = 'local') {
  const store = useCollection<NightCheckout, NightCheckoutInput>(
    nightRepository,
    authState,
    '밤 기록을 불러오지 못했어요.',
  )
  const byDate = useMemo(() => new Map(store.items.map((n) => [n.date, n])), [store.items])
  return { ...store, nights: store.items, byDate }
}

/**
 * 오늘 있었던 일 태그.
 * 하루 한 행이라 다른 목록들과 모양이 달라서 따로 둔다.
 */
export function useEventTags(authState: AuthState = 'local') {
  const [log, setLog] = useState<EventLog>({})
  const [loading, setLoading] = useState(true)
  const ready = authState === 'local' || authState === 'signed-in'

  useEffect(() => {
    if (!ready) return
    let alive = true
    eventRepository
      .list()
      .then((next) => alive && setLog(next))
      .catch(() => undefined)
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [ready])

  const setForDate = useCallback((date: string, tags: string[]) => {
    // 화면을 먼저 바꾸고 저장은 뒤따라간다
    setLog((prev) => ({ ...prev, [date]: tags }))
    void eventRepository.setForDate(date, tags).catch(() => undefined)
  }, [])

  const tagsFor = useCallback((date: string) => log[date] ?? [], [log])

  return { log, tagsFor, setForDate, loading }
}

export type NightStore = ReturnType<typeof useNights>
export type EventStore = ReturnType<typeof useEventTags>
export type WeightStore = ReturnType<typeof useWeights>
export type MounjaroStore = ReturnType<typeof useMounjaro>
export type DdayStore = ReturnType<typeof useDdays>
export type LifeEventStore = ReturnType<typeof useLifeEvents>
