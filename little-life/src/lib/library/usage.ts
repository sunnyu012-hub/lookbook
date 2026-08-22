import type {
  BandCounts,
  Category,
  DayCounts,
  Difficulty,
  Quest,
  QuestUsageProfile,
  TimeBand,
  UsageProfiles,
} from '@/types'
import { TIME_BANDS } from '@/types'
import { toDayKey } from '@/lib/date'
import { timeBand } from '@/lib/rpg/time'
import { weekdayIndex } from '@/lib/routines'
import { normalizeTitle } from '@/lib/suggest'

/**
 * 사용 기록.
 *
 * 완료 기록 전체를 매번 다시 훑지 않는다. 퀘스트를 추가하거나 완료할 때
 * 해당 항목의 숫자만 하나씩 올린다. 퀘스트가 몇 천 개가 되어도
 * 추가 화면이 느려지지 않는다.
 */

/** 최근 완료일은 이만큼만 들고 있는다. 더 있어도 추천에 쓰이지 않는다. */
export const RECENT_DATES_KEPT = 30

export function emptyBandCounts(): BandCounts {
  return TIME_BANDS.reduce((acc, band) => {
    acc[band] = 0
    return acc
  }, {} as BandCounts)
}

export function emptyDayCounts(): DayCounts {
  return { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
}

export interface ProfileSeed {
  questKey: string
  title: string
  category: Category
  difficulty: Difficulty
  presetId?: string | null
  packId?: string | null
}

export function emptyProfile(seed: ProfileSeed): QuestUsageProfile {
  return {
    questKey: seed.questKey,
    title: seed.title,
    category: seed.category,
    difficulty: seed.difficulty,
    presetId: seed.presetId ?? null,
    sourcePackIds: seed.packId ? [seed.packId] : [],
    totalAdded: 0,
    totalCompleted: 0,
    lastAddedAt: null,
    lastCompletedAt: null,
    addedByDayOfWeek: emptyDayCounts(),
    addedByBand: emptyBandCounts(),
    completedByDayOfWeek: emptyDayCounts(),
    completedByBand: emptyBandCounts(),
    recentCompletionDates: [],
    favorite: false,
    dismissCount: 0,
    hiddenOn: null,
  }
}

/**
 * 이 퀘스트를 무엇으로 묶어 셀지.
 *
 * 준비된 퀘스트는 고유 id 로 묶어서 제목을 살짝 바꿔도 같은 것으로 본다.
 * 직접 만든 것은 다듬은 제목으로 묶는다. "물 마시기" 와 "물 챙겨 마시기" 를
 * 억지로 합치지는 않는다 — 사람이 다르게 적었으면 다른 뜻일 수 있다.
 */
export function questKeyOf(quest: Pick<Quest, 'title' | 'sourcePresetId'>): string {
  return quest.sourcePresetId ?? normalizeTitle(quest.title)
}

function bump(profiles: UsageProfiles, seed: ProfileSeed): QuestUsageProfile {
  const found = profiles[seed.questKey]
  if (found) {
    // 세트에서 다시 들어왔으면 출처만 더해둔다
    if (seed.packId && !found.sourcePackIds.includes(seed.packId)) {
      return { ...found, sourcePackIds: [...found.sourcePackIds, seed.packId] }
    }
    return { ...found }
  }
  return emptyProfile(seed)
}

/** 퀘스트를 하나 추가했을 때 */
export function recordAdded(
  profiles: UsageProfiles,
  seed: ProfileSeed,
  now: Date = new Date(),
): UsageProfiles {
  const p = bump(profiles, seed)
  const band = timeBand(now)
  const day = weekdayIndex(now)

  return {
    ...profiles,
    [seed.questKey]: {
      ...p,
      // 제목·분야는 최근 것으로 맞춰둔다. 고쳐서 쓰는 경우가 있다.
      title: seed.title,
      category: seed.category,
      difficulty: seed.difficulty,
      totalAdded: p.totalAdded + 1,
      lastAddedAt: now.toISOString(),
      addedByDayOfWeek: { ...p.addedByDayOfWeek, [day]: (p.addedByDayOfWeek[day] ?? 0) + 1 },
      addedByBand: { ...p.addedByBand, [band]: p.addedByBand[band] + 1 },
    },
  }
}

/** 퀘스트를 완료했을 때 */
export function recordCompleted(
  profiles: UsageProfiles,
  seed: ProfileSeed,
  now: Date = new Date(),
): UsageProfiles {
  const p = bump(profiles, seed)
  const band = timeBand(now)
  const day = weekdayIndex(now)
  const dayKey = toDayKey(now.toISOString())

  const dates = [dayKey, ...p.recentCompletionDates.filter((d) => d !== dayKey)].slice(
    0,
    RECENT_DATES_KEPT,
  )

  return {
    ...profiles,
    [seed.questKey]: {
      ...p,
      title: seed.title,
      category: seed.category,
      difficulty: seed.difficulty,
      totalCompleted: p.totalCompleted + 1,
      lastCompletedAt: now.toISOString(),
      completedByDayOfWeek: {
        ...p.completedByDayOfWeek,
        [day]: (p.completedByDayOfWeek[day] ?? 0) + 1,
      },
      completedByBand: { ...p.completedByBand, [band]: p.completedByBand[band] + 1 },
      recentCompletionDates: dates,
    },
  }
}

/**
 * 완료를 되돌렸을 때.
 *
 * 되돌리기로 숫자만 불어나면 추천이 엉뚱해진다. 그때 올린 만큼만 정확히 내린다.
 * 완료했던 시각을 넘겨야 어느 요일·시간대에서 뺄지 알 수 있다.
 */
export function reverseCompleted(
  profiles: UsageProfiles,
  questKey: string,
  completedAt: string | null,
): UsageProfiles {
  const p = profiles[questKey]
  if (!p) return profiles

  const at = completedAt ? new Date(completedAt) : null
  const band: TimeBand | null = at ? timeBand(at) : null
  const day = at ? weekdayIndex(at) : null
  const dayKey = completedAt ? toDayKey(completedAt) : null

  return {
    ...profiles,
    [questKey]: {
      ...p,
      totalCompleted: Math.max(0, p.totalCompleted - 1),
      completedByDayOfWeek:
        day === null
          ? p.completedByDayOfWeek
          : { ...p.completedByDayOfWeek, [day]: Math.max(0, (p.completedByDayOfWeek[day] ?? 0) - 1) },
      completedByBand:
        band === null
          ? p.completedByBand
          : { ...p.completedByBand, [band]: Math.max(0, p.completedByBand[band] - 1) },
      recentCompletionDates: dayKey
        ? p.recentCompletionDates.filter((d) => d !== dayKey)
        : p.recentCompletionDates,
    },
  }
}

/** ★ 즐겨찾기 */
export function toggleFavorite(profiles: UsageProfiles, seed: ProfileSeed): UsageProfiles {
  const p = bump(profiles, seed)
  return { ...profiles, [seed.questKey]: { ...p, favorite: !p.favorite } }
}

/** "추천에서 덜 보기" */
export function recordDismiss(profiles: UsageProfiles, seed: ProfileSeed): UsageProfiles {
  const p = bump(profiles, seed)
  return { ...profiles, [seed.questKey]: { ...p, dismissCount: p.dismissCount + 1 } }
}

/** "오늘은 숨기기" — 내일이면 다시 나온다 */
export function hideForToday(
  profiles: UsageProfiles,
  seed: ProfileSeed,
  now: Date = new Date(),
): UsageProfiles {
  const p = bump(profiles, seed)
  return { ...profiles, [seed.questKey]: { ...p, hiddenOn: toDayKey(now.toISOString()) } }
}

/**
 * 지난 기록으로 프로필을 처음 채운다.
 *
 * 업데이트하고 바로 추천이 돌게 하려는 것이다. 앱을 처음 쓰는 것처럼
 * 다시 시작하게 두면 이미 몇 달 쓴 사람에게 아무 소용이 없다.
 */
export function backfillProfiles(quests: Quest[]): UsageProfiles {
  let profiles: UsageProfiles = {}

  // 오래된 것부터 넣어야 lastAddedAt / recentCompletionDates 가 제대로 쌓인다
  const ordered = [...quests].sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  for (const quest of ordered) {
    const seed: ProfileSeed = {
      questKey: questKeyOf(quest),
      title: quest.title,
      category: quest.category,
      difficulty: quest.difficulty,
      presetId: quest.sourcePresetId ?? null,
      packId: quest.sourcePackId ?? null,
    }
    profiles = recordAdded(profiles, seed, new Date(quest.createdAt))
    if (quest.completed && quest.completedAt) {
      profiles = recordCompleted(profiles, seed, new Date(quest.completedAt))
    }
  }

  return profiles
}
