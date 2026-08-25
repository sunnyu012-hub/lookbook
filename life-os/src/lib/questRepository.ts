/**
 * LEGACY — Life OS 1.x 의 Quest 기록. 읽기 전용이다.
 *
 * Life OS 2.0 에서 Quest 는 사라졌지만 이미 쌓인 기록은 지우지 않는다.
 * Life Balance · Life Tree · XP · Archive 의 과거 값이 여기서 나오기 때문이다.
 * 지우면 사용자가 보던 숫자가 소급해서 줄어든다.
 *
 * 쓰기 함수(setForDate / save / remove)는 일부러 뺐다.
 * 새 Quest 기록이 생기면 "사라진 기능" 이 조용히 되살아나는 셈이라 그렇게 두지 않는다.
 * 데이터 자체는 Supabase 의 daily_quests · custom_quests 와
 * localStorage 의 life-os:quests:v2 · life-os:custom-quests:v1 에 그대로 있다.
 */
import type { CustomQuestRow } from '@/types'
import { hasSupabaseConfig } from './env'
import { supabase } from './supabase'
import { currentUserId, currentUserIdOrNull, localCollection } from './repositories/base'
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


}
