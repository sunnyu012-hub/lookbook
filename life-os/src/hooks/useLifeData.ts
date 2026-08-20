import { useMemo } from 'react'
import type {
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

export type WeightStore = ReturnType<typeof useWeights>
export type MounjaroStore = ReturnType<typeof useMounjaro>
export type DdayStore = ReturnType<typeof useDdays>
export type LifeEventStore = ReturnType<typeof useLifeEvents>
