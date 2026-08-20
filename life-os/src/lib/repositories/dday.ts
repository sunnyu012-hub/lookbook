/** D-Day. 설정에서 만들어지는 항목(연애/Mounjaro/Life OS)과 사용자가 직접 추가한 항목이 함께 보인다. */
import type { DdayEvent, DdayInput } from '@/types'
import { supabase } from '../supabase'
import { LOCAL_USER_ID } from '../env'
import { currentUserId, localCollection, newId, nowIso } from './base'

export const DDAY_TABLE = 'dday_events'

interface DdayRow {
  id: string
  user_id: string
  title: string
  start_date: string
  kind: DdayEvent['kind']
  count_mode: DdayEvent['countMode']
  pinned: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

const rowTo = (r: DdayRow): DdayEvent => ({
  id: r.id,
  userId: r.user_id,
  title: r.title,
  startDate: r.start_date,
  kind: r.kind,
  countMode: r.count_mode,
  pinned: Boolean(r.pinned),
  sortOrder: r.sort_order,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const local = localCollection<DdayEvent>('life-os:ddays:v1')
const bySort = (a: DdayEvent, b: DdayEvent) =>
  Number(b.pinned) - Number(a.pinned) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0)

export const ddayRepository = {
  async list(): Promise<DdayEvent[]> {
    if (!supabase) return local.all().sort(bySort)

    const userId = await currentUserId()
    const { data, error } = await supabase
      .from(DDAY_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })

    if (error) throw new Error(error.message)
    return (data as DdayRow[]).map(rowTo).sort(bySort)
  },

  async save(input: DdayInput & { id?: string }): Promise<DdayEvent> {
    if (!supabase) {
      const items = local.all()
      const existing = input.id ? items.find((d) => d.id === input.id) : undefined
      const next: DdayEvent = {
        ...input,
        sortOrder: input.sortOrder ?? items.length,
        id: existing?.id ?? newId(),
        userId: existing?.userId ?? LOCAL_USER_ID,
        createdAt: existing?.createdAt ?? nowIso(),
        updatedAt: nowIso(),
      }
      local.write([...items.filter((d) => d.id !== next.id), next])
      return next
    }

    const userId = await currentUserId()
    const payload = {
      ...(input.id ? { id: input.id } : {}),
      user_id: userId,
      title: input.title.trim(),
      start_date: input.startDate,
      kind: input.kind,
      count_mode: input.countMode,
      pinned: input.pinned,
      sort_order: input.sortOrder ?? 0,
      updated_at: nowIso(),
    }
    const { data, error } = await supabase.from(DDAY_TABLE).upsert(payload).select().single()
    if (error) throw new Error(error.message)
    return rowTo(data as DdayRow)
  },

  async remove(id: string): Promise<void> {
    if (!supabase) {
      local.write(local.all().filter((d) => d.id !== id))
      return
    }
    const userId = await currentUserId()
    const { error } = await supabase.from(DDAY_TABLE).delete().eq('user_id', userId).eq('id', id)
    if (error) throw new Error(error.message)
  },
}
