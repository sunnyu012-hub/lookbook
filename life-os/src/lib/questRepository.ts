/**
 * 퀘스트 기록.
 *
 * 하루 한 행에 세 가지를 담는다.
 *   picks       그날 골라 둔 퀘스트
 *   completions 퀘스트별 완료 횟수 (반복 퀘스트 때문에 횟수가 필요하다)
 *   questIds    예전 컬럼 — 되돌릴 수 있게 계속 채운다
 */
import type { CustomQuestInput, CustomQuestRow } from '@/types'
import { hasSupabaseConfig, LOCAL_USER_ID } from './env'
import { supabase } from './supabase'
import { currentUserId, currentUserIdOrNull, localCollection, newId, nowIso } from './repositories/base'
import type { Completions, DayQuests } from './quests/master'

export const QUESTS_TABLE = 'daily_quests'
export const CUSTOM_QUESTS_TABLE = 'custom_quests'

/** date(YYYY-MM-DD) → 그날의 퀘스트 상태 */
export type QuestLog = Record<string, DayQuests>

const LOCAL_KEY = 'life-os:quests:v2'
/** v1 은 완료한 id 목록만 있었다 */
const LEGACY_KEY = 'life-os:quests:v1'

function readLocal(): QuestLog {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (raw) return JSON.parse(raw) as QuestLog
    // 예전 기록을 새 모양으로 옮긴다 (지우지 않는다)
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (!legacy) return {}
    const old = JSON.parse(legacy) as Record<string, string[]>
    const log: QuestLog = {}
    Object.entries(old).forEach(([date, ids]) => {
      log[date] = { picks: ids, completions: Object.fromEntries(ids.map((id) => [id, 1])) }
    })
    return log
  } catch {
    return {}
  }
}

const writeLocal = (log: QuestLog) => localStorage.setItem(LOCAL_KEY, JSON.stringify(log))

interface QuestRow {
  date: string
  quest_ids: string[] | null
  picks: string[] | null
  completions: Completions | null
}

export const questRepository = {
  async list(): Promise<QuestLog> {
    if (!hasSupabaseConfig || !supabase) return readLocal()

    const userId = await currentUserIdOrNull()
    if (!userId) return {}

    const { data, error } = await supabase
      .from(QUESTS_TABLE)
      .select('date, quest_ids, picks, completions')
      .eq('user_id', userId)

    if (error) throw new Error(error.message)

    const log: QuestLog = {}
    ;(data as QuestRow[]).forEach((row) => {
      const ids = row.quest_ids ?? []
      log[row.date] = {
        picks: row.picks?.length ? row.picks : ids,
        // 예전 행에는 completions 가 없다 — 완료한 id 를 1회로 본다
        completions:
          row.completions && Object.keys(row.completions).length > 0
            ? row.completions
            : Object.fromEntries(ids.map((id) => [id, 1])),
      }
    })
    return log
  },

  async setForDate(date: string, day: DayQuests): Promise<void> {
    if (!hasSupabaseConfig || !supabase) {
      const log = readLocal()
      log[date] = day
      writeLocal(log)
      return
    }

    const userId = await currentUserId()
    const questIds = Object.keys(day.completions).filter((id) => (day.completions[id] ?? 0) > 0)

    const { error } = await supabase.from(QUESTS_TABLE).upsert(
      {
        user_id: userId,
        date,
        quest_ids: questIds,
        picks: day.picks,
        completions: day.completions,
        updated_at: nowIso(),
      },
      { onConflict: 'user_id,date' },
    )

    if (error) throw new Error(error.message)
  },
}

// ─────────────────────────────────────────────
// 직접 만든 퀘스트
// ─────────────────────────────────────────────
const localCustom = localCollection<CustomQuestRow>('life-os:custom-quests:v1')

interface CustomRow {
  id: string
  user_id: string
  title: string
  category: string
  difficulty: CustomQuestRow['difficulty']
  is_repeatable: boolean
  created_at: string
}

const rowToCustom = (r: CustomRow): CustomQuestRow => ({
  id: r.id,
  userId: r.user_id,
  title: r.title,
  category: r.category,
  difficulty: r.difficulty,
  isRepeatable: r.is_repeatable,
  createdAt: r.created_at,
})

export const customQuestRepository = {
  async list(): Promise<CustomQuestRow[]> {
    if (!supabase) return localCustom.all()

    const userId = await currentUserId()
    const { data, error } = await supabase
      .from(CUSTOM_QUESTS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data as CustomRow[]).map(rowToCustom)
  },

  async save(input: CustomQuestInput): Promise<CustomQuestRow> {
    if (!supabase) {
      const next: CustomQuestRow = {
        ...input,
        id: `custom-${newId()}`,
        userId: LOCAL_USER_ID,
        createdAt: nowIso(),
      }
      localCustom.write([next, ...localCustom.all()])
      return next
    }

    const userId = await currentUserId()
    const { data, error } = await supabase
      .from(CUSTOM_QUESTS_TABLE)
      .insert({
        user_id: userId,
        title: input.title.trim(),
        category: input.category,
        difficulty: input.difficulty,
        is_repeatable: input.isRepeatable,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return rowToCustom(data as CustomRow)
  },

  async remove(id: string): Promise<void> {
    if (!supabase) {
      localCustom.write(localCustom.all().filter((q) => q.id !== id))
      return
    }
    const userId = await currentUserId()
    const { error } = await supabase
      .from(CUSTOM_QUESTS_TABLE)
      .delete()
      .eq('user_id', userId)
      .eq('id', id)
    if (error) throw new Error(error.message)
  },
}
