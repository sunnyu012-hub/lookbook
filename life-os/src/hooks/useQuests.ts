import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CustomQuestInput, CustomQuestRow, EnergyMode, Preferences } from '@/types'
import { customQuestRepository, questRepository, type QuestLog } from '@/lib/questRepository'
import { fromDateKey, todayKey } from '@/lib/date'
import {
  dayXp,
  emptyDay,
  featuredOf,
  recommend,
  xpFor,
  type Completions,
  type DayQuests,
} from '@/lib/quests/master'
import { QUEST_POOL } from '@/lib/quests/pool'
import type { Quest, QuestCategory } from '@/lib/quests/types'
import type { CapacityType } from '@/lib/wellness/capacity'
import type { LifeDomain } from '@/lib/domains'
import type { AuthState } from './useSession'

/** 사용자가 만든 퀘스트를 퀘스트 모양으로 */
const toQuest = (row: CustomQuestRow): Quest => ({
  id: row.id,
  title: row.title,
  category: row.category as QuestCategory,
  difficulty: row.difficulty,
  repeatable: row.isRepeatable,
})

/** 같은 날에는 같은 추천이 나오도록 하는 씨앗 */
const seedOf = (date: string, salt = 0) =>
  Math.abs(fromDateKey(date).getTime() / 86_400_000 + salt * 7919) | 0

interface Options {
  mode: EnergyMode | null
  events: string[]
  prefs: Preferences
  /** 오늘의 결 — 추천 비중을 옮긴다 */
  capacity?: CapacityType | null
  /** 지난 주 돌아보기에서 고른 영역 */
  focusDomains?: LifeDomain[]
}

/**
 * 퀘스트 전체 상태.
 * 오늘 화면은 오늘 것만 쓰지만, 레벨과 배지를 계산하려면 지난 기록까지 필요하다.
 */
export function useQuests(authState: AuthState = 'local', options?: Options) {
  const [log, setLog] = useState<QuestLog>({})
  const [custom, setCustom] = useState<CustomQuestRow[]>([])
  const [loading, setLoading] = useState(true)
  /** REROLL 을 누를 때마다 추천 씨앗을 바꾼다 */
  const [rerolls, setRerolls] = useState(0)

  const ready = authState === 'local' || authState === 'signed-in'
  const today = todayKey()

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
  const dayFor = useCallback((date: string): DayQuests => log[date] ?? emptyDay(), [log])
  const day = dayFor(today)

  /** 오늘 골라 둔 퀘스트가 없으면 추천으로 채운다 */
  const picks = useMemo(() => {
    if (day.picks.length > 0) return day.picks
    if (!options) return []
    return recommend(
      {
        mode: options.mode,
        capacity: options.capacity ?? null,
        focusDomains: options.focusDomains ?? [],
        events: options.events,
        exclude: Object.keys(day.completions),
        custom: customQuests,
        seed: seedOf(today, rerolls),
      },
      5,
    ).map((q) => q.id)
  }, [day, options, customQuests, today, rerolls])

  const featured = featuredOf(picks)

  const write = useCallback(
    (date: string, next: DayQuests) => {
      setLog((prev) => ({ ...prev, [date]: next }))
      void questRepository.setForDate(date, next).catch(() => undefined)
    },
    [],
  )

  /** 퀘스트 완료 — 반복 퀘스트는 횟수가 올라간다 */
  const complete = useCallback(
    (questId: string) => {
      const current = dayFor(today)
      const completions: Completions = {
        ...current.completions,
        [questId]: (current.completions[questId] ?? 0) + 1,
      }
      write(today, { picks: current.picks.length ? current.picks : picks, completions })
    },
    [dayFor, today, picks, write],
  )

  /** 완료 취소 */
  const undo = useCallback(
    (questId: string) => {
      const current = dayFor(today)
      const n = (current.completions[questId] ?? 0) - 1
      const completions = { ...current.completions }
      if (n > 0) completions[questId] = n
      else delete completions[questId]
      write(today, { ...current, picks: current.picks.length ? current.picks : picks, completions })
    },
    [dayFor, today, picks, write],
  )

  /** 오늘 목록에 퀘스트 추가 */
  const addPick = useCallback(
    (questId: string) => {
      const current = dayFor(today)
      const base = current.picks.length ? current.picks : picks
      if (base.includes(questId)) return
      write(today, { ...current, picks: [...base, questId] })
    },
    [dayFor, today, picks, write],
  )

  const removePick = useCallback(
    (questId: string) => {
      const current = dayFor(today)
      const base = current.picks.length ? current.picks : picks
      write(today, { ...current, picks: base.filter((id) => id !== questId) })
    },
    [dayFor, today, picks, write],
  )

  /** 추천을 다시 뽑는다 (횟수 제한 없음) */
  const reroll = useCallback(() => {
    const current = dayFor(today)
    setRerolls((n) => n + 1)
    // 이미 완료한 것은 남기고 고르지 않은 추천만 비운다
    write(today, { ...current, picks: [] })
  }, [dayFor, today, write])

  const addCustom = useCallback(async (input: CustomQuestInput) => {
    const saved = await customQuestRepository.save(input)
    setCustom((prev) => [saved, ...prev])
    return saved
  }, [])

  const removeCustom = useCallback(async (id: string) => {
    await customQuestRepository.remove(id)
    setCustom((prev) => prev.filter((q) => q.id !== id))
  }, [])

  const allQuests = useMemo(() => [...QUEST_POOL, ...customQuests], [customQuests])

  /** 지금까지 퀘스트로 번 XP 전체 */
  const questXp = useMemo(
    () =>
      Object.entries(log).reduce((sum, [date, d]) => {
        const f = d.picks[0] ?? null
        return sum + dayXp(d, date === today ? featured : f, allQuests)
      }, 0),
    [log, allQuests, featured, today],
  )

  /** 오늘 완료 횟수 */
  const doneCount = useMemo(
    () => Object.values(day.completions).reduce((s, n) => s + n, 0),
    [day],
  )

  /** 이 퀘스트를 지금 하면 XP 를 얼마 받는지 */
  const previewXp = useCallback(
    (quest: Quest) => xpFor(quest, day.completions, featured),
    [day, featured],
  )

  return {
    log,
    loading,
    today: day,
    picks,
    featured,
    doneCount,
    questXp,
    customQuests,
    customRows: custom,
    allQuests,
    complete,
    undo,
    addPick,
    removePick,
    reroll,
    addCustom,
    removeCustom,
    previewXp,
    countOf: (id: string) => day.completions[id] ?? 0,
  }
}

export type QuestStore = ReturnType<typeof useQuests>
