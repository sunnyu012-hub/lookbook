/** 주간 돌아보기. 한 주 한 건 (user_id + week_start). */
import type { WeeklyReset, WeeklyResetInput } from '@/types'
import { supabase } from '../supabase'
import { LOCAL_USER_ID } from '../env'
import { currentUserId, localCollection, nowIso, num } from './base'
import { MAX_FOCUS_DOMAINS } from '../analytics/weeklyReset'

export const WEEKLY_TABLE = 'weekly_resets'

interface WeeklyRow {
  user_id: string
  week_start: string
  week_end: string
  avg_energy: number | null
  avg_sleep: number | null
  good_text: string | null
  hard_text: string | null
  more_text: string | null
  focus_domains: string[] | null
  created_at: string
  updated_at: string
}

const rowTo = (r: WeeklyRow): WeeklyReset => ({
  userId: r.user_id,
  weekStart: r.week_start,
  weekEnd: r.week_end,
  avgEnergy: num(r.avg_energy),
  avgSleep: num(r.avg_sleep),
  goodText: r.good_text,
  hardText: r.hard_text,
  moreText: r.more_text,
  focusDomains: r.focus_domains ?? [],
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const text = (v: string | null | undefined) => {
  const t = v?.trim()
  return t ? t : null
}

/** 최대 2개까지만 저장한다 — 화면에서도 막지만 여기서 한 번 더 자른다 */
const focus = (v: string[] | null | undefined) => (v ?? []).slice(0, MAX_FOCUS_DOMAINS)

const local = localCollection<WeeklyReset>('life-os:weekly:v1')
const byStartDesc = (a: { weekStart: string }, b: { weekStart: string }) =>
  a.weekStart < b.weekStart ? 1 : -1

export interface WeeklySaveInput extends WeeklyResetInput {
  avgEnergy?: number | null
  avgSleep?: number | null
}

export const weeklyResetRepository = {
  async list(limit = 200): Promise<WeeklyReset[]> {
    if (!supabase) return local.all().sort(byStartDesc).slice(0, limit)

    const userId = await currentUserId()
    const { data, error } = await supabase
      .from(WEEKLY_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('week_start', { ascending: false })
      .limit(limit)

    if (error) throw new Error(error.message)
    return (data as WeeklyRow[]).map(rowTo)
  },

  async save(input: WeeklySaveInput): Promise<WeeklyReset> {
    if (!supabase) {
      const items = local.all()
      const existing = items.find((r) => r.weekStart === input.weekStart)
      const next: WeeklyReset = {
        weekStart: input.weekStart,
        weekEnd: input.weekEnd,
        avgEnergy: input.avgEnergy ?? null,
        avgSleep: input.avgSleep ?? null,
        goodText: text(input.goodText),
        hardText: text(input.hardText),
        moreText: text(input.moreText),
        focusDomains: focus(input.focusDomains),
        userId: existing?.userId ?? LOCAL_USER_ID,
        createdAt: existing?.createdAt ?? nowIso(),
        updatedAt: nowIso(),
      }
      local.write([...items.filter((r) => r.weekStart !== input.weekStart), next])
      return next
    }

    const userId = await currentUserId()
    const { data, error } = await supabase
      .from(WEEKLY_TABLE)
      .upsert(
        {
          user_id: userId,
          week_start: input.weekStart,
          week_end: input.weekEnd,
          avg_energy: input.avgEnergy ?? null,
          avg_sleep: input.avgSleep ?? null,
          good_text: text(input.goodText),
          hard_text: text(input.hardText),
          more_text: text(input.moreText),
          focus_domains: focus(input.focusDomains),
          updated_at: nowIso(),
        },
        { onConflict: 'user_id,week_start' },
      )
      .select()
      .single()

    if (error) throw new Error(error.message)
    return rowTo(data as WeeklyRow)
  },

  async remove(weekStart: string): Promise<void> {
    if (!supabase) {
      local.write(local.all().filter((r) => r.weekStart !== weekStart))
      return
    }
    const userId = await currentUserId()
    const { error } = await supabase
      .from(WEEKLY_TABLE)
      .delete()
      .eq('user_id', userId)
      .eq('week_start', weekStart)
    if (error) throw new Error(error.message)
  },
}
