/** 체중 기록. 하루 한 건 (user_id + date 유니크). */
import type { WeightInput, WeightLog } from '@/types'
import { supabase } from '../supabase'
import { LOCAL_USER_ID } from '../env'
import { currentUserId, localCollection, newId, nowIso, num } from './base'

export const WEIGHT_TABLE = 'weight_logs'

interface WeightRow {
  id: string
  user_id: string
  date: string
  weight_kg: number
  body_fat_pct: number | null
  muscle_kg: number | null
  note: string | null
  created_at: string
  updated_at: string
}

const rowTo = (r: WeightRow): WeightLog => ({
  id: r.id,
  userId: r.user_id,
  date: r.date,
  weightKg: Number(r.weight_kg),
  bodyFatPct: num(r.body_fat_pct),
  muscleKg: num(r.muscle_kg),
  note: r.note,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const local = localCollection<WeightLog>('life-os:weights:v1')
const byDateDesc = (a: { date: string }, b: { date: string }) => (a.date < b.date ? 1 : -1)

export const weightRepository = {
  async list(limit = 500): Promise<WeightLog[]> {
    if (!supabase) return local.all().sort(byDateDesc).slice(0, limit)

    const userId = await currentUserId()
    const { data, error } = await supabase
      .from(WEIGHT_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit)

    if (error) throw new Error(error.message)
    return (data as WeightRow[]).map(rowTo)
  },

  async save(input: WeightInput): Promise<WeightLog> {
    if (!supabase) {
      const items = local.all()
      const existing = items.find((w) => w.date === input.date)
      const next: WeightLog = {
        ...input,
        bodyFatPct: input.bodyFatPct ?? null,
        muscleKg: input.muscleKg ?? null,
        note: input.note?.trim() || null,
        id: existing?.id ?? newId(),
        userId: existing?.userId ?? LOCAL_USER_ID,
        createdAt: existing?.createdAt ?? nowIso(),
        updatedAt: nowIso(),
      }
      local.write([...items.filter((w) => w.date !== input.date), next])
      return next
    }

    const userId = await currentUserId()
    const { data, error } = await supabase
      .from(WEIGHT_TABLE)
      .upsert(
        {
          user_id: userId,
          date: input.date,
          weight_kg: input.weightKg,
          body_fat_pct: input.bodyFatPct ?? null,
          muscle_kg: input.muscleKg ?? null,
          note: input.note?.trim() || null,
          updated_at: nowIso(),
        },
        { onConflict: 'user_id,date' },
      )
      .select()
      .single()

    if (error) throw new Error(error.message)
    return rowTo(data as WeightRow)
  },

  async remove(date: string): Promise<void> {
    if (!supabase) {
      local.write(local.all().filter((w) => w.date !== date))
      return
    }
    const userId = await currentUserId()
    const { error } = await supabase
      .from(WEIGHT_TABLE)
      .delete()
      .eq('user_id', userId)
      .eq('date', date)
    if (error) throw new Error(error.message)
  },
}
