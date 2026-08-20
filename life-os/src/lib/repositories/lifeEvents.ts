/** 타임라인에 직접 적어 두는 사건. 하루에 여러 건 있을 수 있다. */
import type { LifeEvent, LifeEventInput } from '@/types'
import { supabase } from '../supabase'
import { LOCAL_USER_ID } from '../env'
import { currentUserId, localCollection, newId, nowIso } from './base'

export const LIFE_EVENTS_TABLE = 'life_events'

interface LifeEventRow {
  id: string
  user_id: string
  date: string
  title: string
  category: LifeEvent['category']
  detail: string | null
  mood: number | null
  created_at: string
  updated_at: string
}

const rowTo = (r: LifeEventRow): LifeEvent => ({
  id: r.id,
  userId: r.user_id,
  date: r.date,
  title: r.title,
  category: r.category,
  detail: r.detail,
  mood: (r.mood ?? null) as LifeEvent['mood'],
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const local = localCollection<LifeEvent>('life-os:life-events:v1')
const byDateDesc = (a: LifeEvent, b: LifeEvent) =>
  a.date < b.date ? 1 : a.date > b.date ? -1 : a.createdAt < b.createdAt ? 1 : -1

export const lifeEventRepository = {
  async list(limit = 500): Promise<LifeEvent[]> {
    if (!supabase) return local.all().sort(byDateDesc).slice(0, limit)

    const userId = await currentUserId()
    const { data, error } = await supabase
      .from(LIFE_EVENTS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit)

    if (error) throw new Error(error.message)
    return (data as LifeEventRow[]).map(rowTo)
  },

  async save(input: LifeEventInput & { id?: string }): Promise<LifeEvent> {
    if (!supabase) {
      const items = local.all()
      const existing = input.id ? items.find((e) => e.id === input.id) : undefined
      const next: LifeEvent = {
        ...input,
        detail: input.detail?.trim() || null,
        mood: input.mood ?? null,
        id: existing?.id ?? newId(),
        userId: existing?.userId ?? LOCAL_USER_ID,
        createdAt: existing?.createdAt ?? nowIso(),
        updatedAt: nowIso(),
      }
      local.write([...items.filter((e) => e.id !== next.id), next])
      return next
    }

    const userId = await currentUserId()
    const payload = {
      ...(input.id ? { id: input.id } : {}),
      user_id: userId,
      date: input.date,
      title: input.title.trim(),
      category: input.category,
      detail: input.detail?.trim() || null,
      mood: input.mood ?? null,
      updated_at: nowIso(),
    }
    const { data, error } = await supabase.from(LIFE_EVENTS_TABLE).upsert(payload).select().single()
    if (error) throw new Error(error.message)
    return rowTo(data as LifeEventRow)
  },

  async remove(id: string): Promise<void> {
    if (!supabase) {
      local.write(local.all().filter((e) => e.id !== id))
      return
    }
    const userId = await currentUserId()
    const { error } = await supabase
      .from(LIFE_EVENTS_TABLE)
      .delete()
      .eq('user_id', userId)
      .eq('id', id)
    if (error) throw new Error(error.message)
  },
}
