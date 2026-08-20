/** 오늘 있었던 일 태그. 하루 한 행, 태그는 문자열 배열. */
import type { DayEvents } from '@/types'
import { supabase } from '../supabase'
import { currentUserId, localObject, nowIso } from './base'

export const EVENTS_TABLE = 'daily_events'

/** date → 태그 목록 */
export type EventLog = Record<string, string[]>

const local = localObject<EventLog>('life-os:events:v1')

export const eventRepository = {
  async list(): Promise<EventLog> {
    if (!supabase) return local.read() ?? {}

    const userId = await currentUserId()
    const { data, error } = await supabase
      .from(EVENTS_TABLE)
      .select('date, tags')
      .eq('user_id', userId)

    if (error) throw new Error(error.message)
    const log: EventLog = {}
    ;(data as DayEvents[]).forEach((row) => {
      log[row.date] = row.tags ?? []
    })
    return log
  },

  async setForDate(date: string, tags: string[]): Promise<void> {
    if (!supabase) {
      const log = local.read() ?? {}
      log[date] = tags
      local.write(log)
      return
    }

    const userId = await currentUserId()
    const { error } = await supabase
      .from(EVENTS_TABLE)
      .upsert({ user_id: userId, date, tags, updated_at: nowIso() }, { onConflict: 'user_id,date' })

    if (error) throw new Error(error.message)
  },
}
