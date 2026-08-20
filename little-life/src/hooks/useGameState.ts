import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AppState, CompleteResult, Quest, QuestDraft } from '@/types'
import { createDefaultState } from '@/store/defaultState'
import { repository } from '@/store/localStorage'
import { applyExp } from '@/lib/level'
import { expForDifficulty } from '@/lib/difficulty'
import { createId } from '@/lib/id'

interface GameState {
  ready: boolean
  state: AppState
  addQuest: (draft: QuestDraft) => Quest
  completeQuest: (id: string) => CompleteResult | null
  deleteQuest: (id: string) => void
  renameUser: (name: string) => void
}

/**
 * 앱의 단일 상태 소스.
 *
 * 상태 변경 로직을 전부 여기 모아둬서, 나중에 zustand 나 Supabase 로
 * 옮기더라도 화면 컴포넌트는 손대지 않아도 되게 했다.
 */
export function useGameState(): GameState {
  const [state, setState] = useState<AppState>(() => createDefaultState())
  const [ready, setReady] = useState(false)
  // 첫 로드가 끝나기 전에 기본값을 저장해버리면 기존 기록을 덮어쓴다.
  const loaded = useRef(false)

  useEffect(() => {
    let alive = true
    repository.load().then((saved) => {
      if (!alive) return
      if (saved) setState(saved)
      loaded.current = true
      setReady(true)
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!loaded.current) return
    void repository.save(state)
  }, [state])

  const addQuest = useCallback((draft: QuestDraft): Quest => {
    const quest: Quest = {
      id: createId(),
      title: draft.title.trim(),
      category: draft.category,
      difficulty: draft.difficulty,
      exp: expForDifficulty(draft.difficulty),
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
    }
    setState((prev) => ({ ...prev, quests: [quest, ...prev.quests] }))
    return quest
  }, [])

  const completeQuest = useCallback((id: string): CompleteResult | null => {
    // setState 밖으로 결과를 꺼내야 화면에서 +EXP 애니메이션을 띄울 수 있다.
    let result: CompleteResult | null = null

    setState((prev) => {
      const target = prev.quests.find((q) => q.id === id)
      if (!target || target.completed) return prev

      const outcome = applyExp(prev.user.level, prev.user.currentExp, target.exp)
      result = {
        gainedExp: target.exp,
        leveledUp: outcome.leveledUp,
        newLevel: outcome.level,
      }

      return {
        ...prev,
        user: {
          ...prev.user,
          level: outcome.level,
          currentExp: outcome.currentExp,
          totalExp: prev.user.totalExp + target.exp,
        },
        quests: prev.quests.map((q) =>
          q.id === id ? { ...q, completed: true, completedAt: new Date().toISOString() } : q,
        ),
      }
    })

    return result
  }, [])

  /**
   * 삭제해도 이미 받은 EXP 는 돌려받지 않는다.
   * 한 번 한 일을 나중에 빼앗는 앱은 만들지 않는다.
   */
  const deleteQuest = useCallback((id: string) => {
    setState((prev) => ({ ...prev, quests: prev.quests.filter((q) => q.id !== id) }))
  }, [])

  const renameUser = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setState((prev) => ({ ...prev, user: { ...prev.user, name: trimmed } }))
  }, [])

  return useMemo(
    () => ({ ready, state, addQuest, completeQuest, deleteQuest, renameUser }),
    [ready, state, addQuest, completeQuest, deleteQuest, renameUser],
  )
}
