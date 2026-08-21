import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AppState, CompleteResult, DayStat, Quest, QuestDraft, Routine } from '@/types'
import { createDefaultState } from '@/store/defaultState'
import { repository } from '@/store/localStorage'
import { applyExp } from '@/lib/level'
import { expForDifficulty } from '@/lib/difficulty'
import { todayKey } from '@/lib/date'
import { isUsableRule, matchesToday, spawnDueQuests } from '@/lib/routines'
import { createId } from '@/lib/id'

interface GameState {
  ready: boolean
  state: AppState
  addQuest: (draft: QuestDraft) => Quest | null
  completeQuest: (id: string) => CompleteResult | null
  deleteQuest: (id: string) => void
  renameUser: (name: string) => void
  toggleRoutinePause: (id: string) => void
  deleteRoutine: (id: string) => void
}

/** 오늘 칸에 완료 기록을 한 건 더한다. */
function bumpDailyLog(state: AppState, quest: Quest): AppState['dailyLog'] {
  const key = todayKey()
  const prev: DayStat = state.dailyLog[key] ?? { completed: 0, exp: 0, byCategory: {} }

  return {
    ...state.dailyLog,
    [key]: {
      completed: prev.completed + 1,
      exp: prev.exp + quest.exp,
      byCategory: {
        ...prev.byCategory,
        [quest.category]: (prev.byCategory[quest.category] ?? 0) + quest.exp,
      },
    },
  }
}

/**
 * 앱의 단일 상태 소스.
 *
 * 상태 변경 로직을 전부 여기 모아둬서, 나중에 zustand 나 Supabase 로
 * 옮기더라도 화면 컴포넌트는 손대지 않아도 되게 했다.
 *
 * 다음 상태는 setState 안에서가 아니라 stateRef 를 읽어 밖에서 계산한다.
 * completeQuest 가 "몇 EXP 를 줬고 레벨이 올랐는지" 를 호출한 쪽에 돌려줘야
 * +EXP / LEVEL UP 연출을 띄울 수 있는데, 업데이터 함수는 언제 실행될지
 * 보장되지 않아서 그 안에서 값을 꺼내면 비어 있을 때가 생긴다.
 */
export function useGameState(): GameState {
  // 저장된 게 없을 때 쓸 첫 실행 상태. 아래 effect 에서도 참조해야 해서 ref 로 들고 있는다.
  const defaults = useRef<AppState | null>(null)
  if (defaults.current === null) defaults.current = createDefaultState()

  const [state, setState] = useState<AppState>(defaults.current)
  const stateRef = useRef<AppState>(defaults.current)
  const [ready, setReady] = useState(false)
  // 첫 로드가 끝나기 전에 기본값을 저장해버리면 기존 기록을 덮어쓴다.
  const loaded = useRef(false)

  /** 모든 상태 변경은 여기를 지난다. ref 를 먼저 갱신해 연속 클릭에도 최신값을 본다. */
  const commit = useCallback((next: AppState) => {
    stateRef.current = next
    setState(next)
  }, [])

  useEffect(() => {
    let alive = true
    repository.load().then((saved) => {
      if (!alive) return
      if (saved) {
        commit(saved)
      } else if (defaults.current) {
        // 첫 실행이면 샘플 데이터를 그 자리에서 저장해 둔다.
        // 안 그러면 사용자가 뭔가 하기 전까지 저장이 안 돼서,
        // 앱을 다시 열 때마다 샘플 퀘스트가 새로 만들어진다.
        void repository.save(defaults.current)
      }
      loaded.current = true
      setReady(true)
    })
    return () => {
      alive = false
    }
  }, [commit])

  useEffect(() => {
    if (!loaded.current) return
    void repository.save(state)
  }, [state])

  /** 오늘 몫의 반복 퀘스트를 만든다. */
  const runSpawn = useCallback(() => {
    const prev = stateRef.current
    const result = spawnDueQuests(prev.routines, prev.quests, new Date(), createId)
    if (!result) return

    commit({
      ...prev,
      quests: [...result.quests, ...prev.quests],
      routines: result.routines,
    })
  }, [commit])

  /**
   * 앱을 열 때 한 번, 그리고 켜둔 채로 날짜가 바뀌었다가 다시 볼 때 한 번 더.
   * 홈 화면에 추가해두면 며칠씩 안 닫고 두는 경우가 많다.
   */
  useEffect(() => {
    if (!ready) return
    runSpawn()

    const onVisible = () => {
      if (document.visibilityState === 'visible') runSpawn()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [ready, runSpawn])

  /**
   * 퀘스트를 만든다.
   *
   * 반복 규칙이 있으면 원본(Routine)도 같이 만든다.
   * 오늘 해당하는 요일이 아니면 오늘 것은 만들지 않고 원본만 남긴다 —
   * 토요일에 "평일 반복" 을 만들었다고 토요일에 퀘스트가 생기면 안 된다.
   */
  const addQuest = useCallback(
    (draft: QuestDraft): Quest | null => {
      const prev = stateRef.current
      const now = new Date()
      const title = draft.title.trim()
      const repeat = draft.repeat && isUsableRule(draft.repeat) ? draft.repeat : null

      // 원본 id 를 먼저 만들어 둬야 오늘 몫에도 같은 id 를 붙일 수 있다.
      // 안 그러면 첫날 퀘스트만 반복과 연결되지 않는다.
      const routineId = repeat ? createId() : null
      const dueToday = !repeat || matchesToday(repeat, now)

      const quest: Quest | null = dueToday
        ? {
            id: createId(),
            title,
            category: draft.category,
            difficulty: draft.difficulty,
            exp: expForDifficulty(draft.difficulty),
            completed: false,
            createdAt: now.toISOString(),
            completedAt: null,
            ...(routineId ? { routineId } : {}),
          }
        : null

      const routines = repeat
        ? [
            {
              id: routineId!,
              title,
              category: draft.category,
              difficulty: draft.difficulty,
              rule: repeat,
              createdAt: now.toISOString(),
              // 오늘 몫을 방금 만들었으니 오늘은 또 만들지 않게 찍어둔다
              lastSpawnedOn: dueToday ? todayKey(now) : null,
              paused: false,
            } satisfies Routine,
            ...prev.routines,
          ]
        : prev.routines

      if (quest) {
        commit({ ...prev, quests: [quest, ...prev.quests], routines })
      } else {
        commit({ ...prev, routines })
      }
      return quest
    },
    [commit],
  )

  const completeQuest = useCallback(
    (id: string): CompleteResult | null => {
      const prev = stateRef.current
      const target = prev.quests.find((q) => q.id === id)
      if (!target || target.completed) return null

      const outcome = applyExp(prev.user.level, prev.user.currentExp, target.exp)

      commit({
        ...prev,
        user: {
          ...prev.user,
          level: outcome.level,
          currentExp: outcome.currentExp,
          totalExp: prev.user.totalExp + target.exp,
          totalCompletedQuests: prev.user.totalCompletedQuests + 1,
        },
        quests: prev.quests.map((q) =>
          q.id === id ? { ...q, completed: true, completedAt: new Date().toISOString() } : q,
        ),
        categoryStats: {
          ...prev.categoryStats,
          [target.category]: prev.categoryStats[target.category] + target.exp,
        },
        dailyLog: bumpDailyLog(prev, target),
      })

      return {
        gainedExp: target.exp,
        leveledUp: outcome.leveledUp,
        newLevel: outcome.level,
      }
    },
    [commit],
  )

  /**
   * 퀘스트만 목록에서 지운다.
   *
   * 이미 받은 EXP·통계·기록은 손대지 않는다. 한 번 한 일을 나중에 빼앗지 않으려는 것이고,
   * 통계를 quests 에서 유도하지 않고 따로 쌓아둔 이유이기도 하다.
   */
  const deleteQuest = useCallback(
    (id: string) => {
      const prev = stateRef.current
      commit({ ...prev, quests: prev.quests.filter((q) => q.id !== id) })
    },
    [commit],
  )

  const toggleRoutinePause = useCallback(
    (id: string) => {
      const prev = stateRef.current
      commit({
        ...prev,
        routines: prev.routines.map((r) => (r.id === id ? { ...r, paused: !r.paused } : r)),
      })
    },
    [commit],
  )

  /** 반복만 지운다. 오늘 이미 만들어진 퀘스트는 그대로 둔다 — 이미 내 오늘 몫이다. */
  const deleteRoutine = useCallback(
    (id: string) => {
      const prev = stateRef.current
      commit({ ...prev, routines: prev.routines.filter((r) => r.id !== id) })
    },
    [commit],
  )

  const renameUser = useCallback(
    (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      const prev = stateRef.current
      commit({ ...prev, user: { ...prev.user, name: trimmed } })
    },
    [commit],
  )

  return useMemo(
    () => ({
      ready,
      state,
      addQuest,
      completeQuest,
      deleteQuest,
      renameUser,
      toggleRoutinePause,
      deleteRoutine,
    }),
    [
      ready,
      state,
      addQuest,
      completeQuest,
      deleteQuest,
      renameUser,
      toggleRoutinePause,
      deleteRoutine,
    ],
  )
}
