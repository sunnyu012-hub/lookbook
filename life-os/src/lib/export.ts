/**
 * 내보내기 — 지금까지 적은 것 전부를 파일 하나로.
 *
 * 왜 필요한가: 기록이 안 보이는 순간 제일 무서운 건 "없어졌나" 다.
 * 손에 파일이 하나 있으면 그 걱정이 없어진다. 내 기록은 내 것이어야 한다.
 *
 * 두 가지로 낸다.
 *   · JSON — 전부 그대로. 나중에 되돌리거나 옮길 때 쓴다.
 *   · CSV  — 하루 한 줄. 엑셀·구글시트에서 바로 열린다.
 */
import type {
  Checkin,
  DdayEvent,
  LifeEvent,
  MounjaroLog,
  NightCheckout,
  Preferences,
  WeeklyReset,
  WeightLog,
} from '@/types'
import type { DayQuests } from './quests/master'
import { questById } from './quests/master'
import { questTitle, type Quest } from './quests/types'
import { todayKey } from './date'

/** 형식이 바뀌면 올린다. 나중에 읽는 쪽이 판단할 수 있게 */
export const EXPORT_VERSION = 1

export interface ExportInput {
  checkins: Checkin[]
  nights: NightCheckout[]
  weights: WeightLog[]
  mounjaro: MounjaroLog[]
  lifeEvents: LifeEvent[]
  ddays: DdayEvent[]
  eventLog: Record<string, string[]>
  questLog: Record<string, DayQuests>
  customQuests: Quest[]
  weeklyResets: WeeklyReset[]
  prefs: Preferences
}

export interface LifeOsExport extends ExportInput {
  app: 'life-os'
  version: number
  exportedAt: string
  counts: Record<string, number>
}

export function buildExport(input: ExportInput, now = new Date()): LifeOsExport {
  return {
    app: 'life-os',
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    counts: countsOf(input),
    ...input,
  }
}

export function countsOf(input: ExportInput): Record<string, number> {
  return {
    checkins: input.checkins.length,
    nights: input.nights.length,
    weights: input.weights.length,
    mounjaro: input.mounjaro.length,
    lifeEvents: input.lifeEvents.length,
    ddays: input.ddays.length,
    eventDays: Object.keys(input.eventLog).length,
    questDays: Object.keys(input.questLog).length,
    customQuests: input.customQuests.length,
    weeklyResets: input.weeklyResets.length,
  }
}

export const totalRecords = (counts: Record<string, number>) =>
  Object.values(counts).reduce((a, b) => a + b, 0)

export const exportJson = (data: LifeOsExport) => JSON.stringify(data, null, 2)

// ─────────────────────────────────────────────
// CSV — 하루 한 줄
// ─────────────────────────────────────────────

const CSV_COLUMNS = [
  'date',
  'energy',
  'mode',
  'recovery',
  'body',
  'mind',
  'fuel',
  'sleep_hours',
  'sleep_quality',
  'fatigue',
  'body_pain',
  'mood',
  'focus',
  'stress',
  'appetite',
  'meals',
  'exercise',
  'exercise_minutes',
  'outdoor',
  'weight_kg',
  'mounjaro_mg',
  'event_tags',
  'quests_done',
  'quest_titles',
  'highlight',
  'memo',
  'context_note',
  'night_satisfaction',
  'night_best',
  'night_hardest',
  'night_diary',
  'life_events',
] as const

/** 값에 쉼표·따옴표·줄바꿈이 있어도 깨지지 않게 */
function cell(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'Y' : 'N'
  const s = String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function exportCsv(input: ExportInput): string {
  const byDate = <T extends { date: string }>(list: T[]) =>
    new Map(list.map((item) => [item.date, item]))

  const nights = byDate(input.nights)
  const weights = byDate(input.weights)
  const mounjaro = byDate(input.mounjaro)

  const lifeByDate = new Map<string, LifeEvent[]>()
  for (const e of input.lifeEvents) {
    lifeByDate.set(e.date, [...(lifeByDate.get(e.date) ?? []), e])
  }

  // 하루라도 뭔가 적힌 날은 전부 한 줄로 낸다
  const dates = [
    ...new Set([
      ...input.checkins.map((c) => c.date),
      ...input.nights.map((n) => n.date),
      ...input.weights.map((w) => w.date),
      ...input.mounjaro.map((m) => m.date),
      ...input.lifeEvents.map((e) => e.date),
      ...Object.keys(input.eventLog),
      ...Object.keys(input.questLog),
    ]),
  ].sort((a, b) => (a < b ? 1 : -1))

  const partner = input.prefs.partnerName
  const rows = dates.map((date) => {
    const c = input.checkins.find((x) => x.date === date)
    const n = nights.get(date)
    const day = input.questLog[date]
    const done = day ? Object.entries(day.completions).filter(([, k]) => k > 0) : []

    const titles = done
      .map(([id, k]) => {
        const quest = questById(id, input.customQuests)
        if (!quest) return null
        const name = questTitle(quest, partner)
        return k > 1 ? `${name} x${k}` : name
      })
      .filter(Boolean)
      .join(' · ')

    const values: Record<(typeof CSV_COLUMNS)[number], unknown> = {
      date,
      energy: c?.energyScore,
      mode: c?.mode,
      recovery: c?.recoveryScore,
      body: c?.bodyScore,
      mind: c?.mindScore,
      fuel: c?.fuelScore,
      sleep_hours: c?.sleepHours,
      sleep_quality: c?.sleepQuality,
      fatigue: c?.fatigue,
      body_pain: c?.bodyPain,
      mood: c?.mood,
      focus: c?.focus,
      stress: c?.stress,
      appetite: c?.appetite,
      meals: c?.mealsCount,
      exercise: c?.exercise,
      exercise_minutes: c?.exerciseMinutes,
      outdoor: c?.outdoor,
      weight_kg: weights.get(date)?.weightKg,
      mounjaro_mg: mounjaro.get(date)?.doseMg,
      event_tags: (input.eventLog[date] ?? []).join(' · '),
      quests_done: done.reduce((s, [, k]) => s + k, 0) || '',
      quest_titles: titles,
      highlight: c?.highlight,
      memo: c?.memo,
      context_note: c?.contextNote,
      night_satisfaction: n?.daySatisfaction,
      night_best: n?.bestThing,
      night_hardest: n?.hardestThing,
      night_diary: n?.diary,
      life_events: (lifeByDate.get(date) ?? []).map((e) => e.title).join(' · '),
    }

    return CSV_COLUMNS.map((k) => cell(values[k])).join(',')
  })

  // 엑셀이 한글을 깨뜨리지 않게 BOM 을 앞에 붙인다
  return `﻿${[CSV_COLUMNS.join(','), ...rows].join('\n')}\n`
}

// ─────────────────────────────────────────────
// 파일로 건네주기
// ─────────────────────────────────────────────

export const exportFileName = (kind: 'json' | 'csv', date = todayKey()) =>
  `life-os-${date}.${kind}`

export type ShareResult = 'shared' | 'downloaded' | 'copied' | 'failed'

/**
 * 아이폰 PWA 에서는 <a download> 가 잘 안 먹어서 공유 시트를 먼저 시도한다.
 * 그다음 일반 다운로드, 마지막으로 클립보드 복사까지 준비해 둔다.
 */
export async function shareFile(
  name: string,
  content: string,
  mime: string,
): Promise<ShareResult> {
  const file = new File([content], name, { type: mime })

  const nav = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean
    share?: (data: { files?: File[]; title?: string }) => Promise<void>
  }

  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: name })
      return 'shared'
    } catch (err) {
      // 사용자가 공유 시트를 닫은 것뿐이면 다른 방법을 또 띄우지 않는다
      if (err instanceof DOMException && err.name === 'AbortError') return 'failed'
    }
  }

  try {
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    // 눌린 직후 바로 지우면 사파리에서 저장이 취소된다
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    return 'downloaded'
  } catch {
    // 계속
  }

  try {
    await navigator.clipboard.writeText(content)
    return 'copied'
  } catch {
    return 'failed'
  }
}
