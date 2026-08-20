/**
 * 퀘스트 완료 기록.
 * 체크인과 같은 방식으로, Supabase 설정이 있으면 원격 / 없으면 localStorage.
 */
import { hasSupabaseConfig } from './env'
import { supabase } from './supabase'

export const QUESTS_TABLE = 'daily_quests'

/** date(YYYY-MM-DD) → 완료한 퀘스트 id 목록 */
export type QuestLog = Record<string, string[]>

const LOCAL_KEY = 'life-os:quests:v1'

function readLocal(): QuestLog {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as QuestLog) : {}
  } catch {
    return {}
  }
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase!.auth.getSession()
  return data.session?.user.id ?? null
}

export const questRepository = {
  async list(): Promise<QuestLog> {
    if (!hasSupabaseConfig || !supabase) return readLocal()

    const userId = await currentUserId()
    if (!userId) return {}

    const { data, error } = await supabase
      .from(QUESTS_TABLE)
      .select('date, quest_ids')
      .eq('user_id', userId)

    if (error) throw new Error(error.message)
    const log: QuestLog = {}
    ;(data as { date: string; quest_ids: string[] }[]).forEach((row) => {
      log[row.date] = row.quest_ids ?? []
    })
    return log
  },

  async setForDate(date: string, questIds: string[]): Promise<void> {
    if (!hasSupabaseConfig || !supabase) {
      const log = readLocal()
      log[date] = questIds
      localStorage.setItem(LOCAL_KEY, JSON.stringify(log))
      return
    }

    const userId = await currentUserId()
    if (!userId) throw new Error('로그인이 필요해요.')

    const { error } = await supabase
      .from(QUESTS_TABLE)
      .upsert(
        { user_id: userId, date, quest_ids: questIds, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,date' },
      )

    if (error) throw new Error(error.message)
  },
}
