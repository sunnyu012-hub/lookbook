/** 밤에 하루를 닫는 기록. 하루 한 건 (user_id + date). */
import type { NightCheckout, NightCheckoutInput, Scale5 } from '@/types'
import { supabase } from '../supabase'
import { LOCAL_USER_ID } from '../env'
import { currentUserId, localCollection, nowIso, num } from './base'

export const NIGHT_TABLE = 'night_checkouts'

interface NightRow {
  user_id: string
  date: string
  actual_energy: number | null
  day_satisfaction: number | null
  actual_mood: number | null
  actual_body: number | null
  actual_stress: number | null
  best_thing: string | null
  hardest_thing: string | null
  diary: string | null
  created_at: string
  updated_at: string
}

const s5 = (v: number | null) => (v === null ? null : (v as Scale5))

const rowTo = (r: NightRow): NightCheckout => ({
  userId: r.user_id,
  date: r.date,
  actualEnergy: s5(num(r.actual_energy)),
  daySatisfaction: s5(num(r.day_satisfaction)),
  actualMood: s5(num(r.actual_mood)),
  actualBody: s5(num(r.actual_body)),
  actualStress: s5(num(r.actual_stress)),
  bestThing: r.best_thing,
  hardestThing: r.hardest_thing,
  diary: r.diary,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const text = (v: string | null | undefined) => {
  const t = v?.trim()
  return t ? t : null
}

const local = localCollection<NightCheckout>('life-os:nights:v1')
const byDateDesc = (a: { date: string }, b: { date: string }) => (a.date < b.date ? 1 : -1)

export const nightRepository = {
  async list(limit = 400): Promise<NightCheckout[]> {
    if (!supabase) return local.all().sort(byDateDesc).slice(0, limit)

    const userId = await currentUserId()
    const { data, error } = await supabase
      .from(NIGHT_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit)

    if (error) throw new Error(error.message)
    return (data as NightRow[]).map(rowTo)
  },

  async save(input: NightCheckoutInput): Promise<NightCheckout> {
    if (!supabase) {
      const items = local.all()
      const existing = items.find((n) => n.date === input.date)
      const next: NightCheckout = {
        ...input,
        bestThing: text(input.bestThing),
        hardestThing: text(input.hardestThing),
        diary: text(input.diary),
        userId: existing?.userId ?? LOCAL_USER_ID,
        createdAt: existing?.createdAt ?? nowIso(),
        updatedAt: nowIso(),
      }
      local.write([...items.filter((n) => n.date !== input.date), next])
      return next
    }

    const userId = await currentUserId()
    const { data, error } = await supabase
      .from(NIGHT_TABLE)
      .upsert(
        {
          user_id: userId,
          date: input.date,
          actual_energy: input.actualEnergy ?? null,
          day_satisfaction: input.daySatisfaction ?? null,
          actual_mood: input.actualMood ?? null,
          actual_body: input.actualBody ?? null,
          actual_stress: input.actualStress ?? null,
          best_thing: text(input.bestThing),
          hardest_thing: text(input.hardestThing),
          diary: text(input.diary),
          updated_at: nowIso(),
        },
        { onConflict: 'user_id,date' },
      )
      .select()
      .single()

    if (error) throw new Error(error.message)
    return rowTo(data as NightRow)
  },

  async remove(date: string): Promise<void> {
    if (!supabase) {
      local.write(local.all().filter((n) => n.date !== date))
      return
    }
    const userId = await currentUserId()
    const { error } = await supabase
      .from(NIGHT_TABLE)
      .delete()
      .eq('user_id', userId)
      .eq('date', date)
    if (error) throw new Error(error.message)
  },
}
