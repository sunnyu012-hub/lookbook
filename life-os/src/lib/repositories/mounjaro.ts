/**
 * Mounjaro 투약 기록.
 *
 * 이 앱은 의료 앱이 아니다. 여기 저장되는 건 "내가 언제 맞았는지 적어 둔 메모" 일 뿐이고,
 * 앱은 용량을 계산하거나 바꾸라고 말하지 않는다.
 */
import type { MounjaroInput, MounjaroLog } from '@/types'
import { supabase } from '../supabase'
import { LOCAL_USER_ID } from '../env'
import { currentUserId, localCollection, newId, nowIso } from './base'

export const MOUNJARO_TABLE = 'mounjaro_logs'

interface MounjaroRow {
  id: string
  user_id: string
  date: string
  dose_mg: number
  injection_site: string | null
  taken_at: string | null
  side_effects: string[] | null
  note: string | null
  created_at: string
  updated_at: string
}

const rowTo = (r: MounjaroRow): MounjaroLog => ({
  id: r.id,
  userId: r.user_id,
  date: r.date,
  doseMg: Number(r.dose_mg),
  injectionSite: r.injection_site,
  takenAt: r.taken_at,
  sideEffects: r.side_effects ?? [],
  note: r.note,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const local = localCollection<MounjaroLog>('life-os:mounjaro:v1')
const byDateDesc = (a: { date: string }, b: { date: string }) => (a.date < b.date ? 1 : -1)

export const mounjaroRepository = {
  async list(limit = 300): Promise<MounjaroLog[]> {
    if (!supabase) return local.all().sort(byDateDesc).slice(0, limit)

    const userId = await currentUserId()
    const { data, error } = await supabase
      .from(MOUNJARO_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit)

    if (error) throw new Error(error.message)
    return (data as MounjaroRow[]).map(rowTo)
  },

  async save(input: MounjaroInput): Promise<MounjaroLog> {
    if (!supabase) {
      const items = local.all()
      const existing = items.find((m) => m.date === input.date)
      const next: MounjaroLog = {
        ...input,
        injectionSite: input.injectionSite ?? null,
        takenAt: input.takenAt ?? null,
        sideEffects: input.sideEffects ?? [],
        note: input.note?.trim() || null,
        id: existing?.id ?? newId(),
        userId: existing?.userId ?? LOCAL_USER_ID,
        createdAt: existing?.createdAt ?? nowIso(),
        updatedAt: nowIso(),
      }
      local.write([...items.filter((m) => m.date !== input.date), next])
      return next
    }

    const userId = await currentUserId()
    const { data, error } = await supabase
      .from(MOUNJARO_TABLE)
      .upsert(
        {
          user_id: userId,
          date: input.date,
          dose_mg: input.doseMg,
          injection_site: input.injectionSite?.trim() || null,
          taken_at: input.takenAt || null,
          side_effects: input.sideEffects ?? [],
          note: input.note?.trim() || null,
          updated_at: nowIso(),
        },
        { onConflict: 'user_id,date' },
      )
      .select()
      .single()

    if (error) throw new Error(error.message)
    return rowTo(data as MounjaroRow)
  },

  async remove(date: string): Promise<void> {
    if (!supabase) {
      local.write(local.all().filter((m) => m.date !== date))
      return
    }
    const userId = await currentUserId()
    const { error } = await supabase
      .from(MOUNJARO_TABLE)
      .delete()
      .eq('user_id', userId)
      .eq('date', date)
    if (error) throw new Error(error.message)
  },
}
