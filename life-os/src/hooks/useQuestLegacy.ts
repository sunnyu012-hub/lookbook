/**
 * LEGACY — Life OS 1.x 의 Quest 기록을 읽기만 한다.
 *
 * Life OS 2.0 에서 Quest 는 사라졌다. 하지만 이미 쌓인 완료 기록은 남는다.
 *   · Life Balance 의 과거 분포
 *   · Life Tree 의 이미 열린 가지
 *   · XP 총합과 레벨
 *   · Archive 의 지난 기록
 * 이걸 안 읽으면 사용자가 보던 숫자가 소급해서 줄어든다. 그건 손실로 느껴진다.
 *
 * 그래서 읽기만 남기고 쓰기(complete/undo/addCustom/추천)는 전부 뺐다.
 * 새 Quest 기록은 더 이상 생기지 않는다.
 */
import { useEffect, useMemo, useState } from 'react'
import type { CustomQuestRow } from '@/types'
import { customQuestRepository, questRepository, type QuestLog } from '@/lib/questRepository'
import { dayXp, featuredOf, type DayQuests } from '@/lib/quests/master'
import { QUEST_POOL } from '@/lib/quests/pool'
import type { Quest, QuestCategory } from '@/lib/quests/types'
import type { AuthState } from './useSession'

const toQuest = (row: CustomQuestRow): Quest => ({
  id: row.id,
  title: row.title,
  category: row.category as QuestCategory,
  difficulty: row.difficulty,
  repeatable: row.isRepeatable,
})

export function useQuestLegacy(authState: AuthState = 'local') {
  const [log, setLog] = useState<QuestLog>({})
  const [custom, setCustom] = useState<CustomQuestRow[]>([])
  const [loading, setLoading] = useState(true)

  const ready = authState === 'local' || authState === 'signed-in'

  useEffect(() => {
    if (!ready) return
    let alive = true
    Promise.all([
      questRepository.list().catch(() => ({}) as QuestLog),
      customQuestRepository.list().catch(() => [] as CustomQuestRow[]),
    ])
      .then(([nextLog, nextCustom]) => {
        if (!alive) return
        setLog(nextLog)
        setCustom(nextCustom)
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [ready])

  const customQuests = useMemo(() => custom.map(toQuest), [custom])
  const allQuests = useMemo(() => [...QUEST_POOL, ...customQuests], [customQuests])

  /** 지난 기록에서 번 XP 전부. 레벨이 뒤로 가지 않게 그대로 이어 준다 */
  const questXp = useMemo(
    () =>
      Object.values(log).reduce(
        (sum, day: DayQuests) => sum + dayXp(day, featuredOf(day.picks), allQuests),
        0,
      ),
    [log, allQuests],
  )

  /** 지금까지 완료한 총 횟수 (배지가 쓴다) */
  const doneTotal = useMemo(
    () =>
      Object.values(log).reduce(
        (sum, day) => sum + Object.values(day.completions).reduce((s, n) => s + n, 0),
        0,
      ),
    [log],
  )

  /** 남아 있는 기록이 하나라도 있는가 — 화면에서 "지난 기록" 을 보여줄지 정한다 */
  const hasHistory = doneTotal > 0

  return { log, customQuests, questXp, doneTotal, hasHistory, loading }
}

export type QuestLegacyStore = ReturnType<typeof useQuestLegacy>
