import type { Category, Difficulty, QuestPackDef, Routine, UsageProfiles } from '@/types'
import { normalizeTitle } from '@/lib/suggest'
import { ALL_PRESETS, QUEST_PACKS, type PresetEntry } from './packs'

/**
 * 라이브러리 검색.
 *
 * 준비된 퀘스트 · 세트 · 내가 전에 만든 것 · 반복을 한 번에 훑는다.
 * "빨래" 를 치면 집 리셋 세트도, 주말 정비 세트도, 예전에 직접 만든 것도 같이 나온다.
 */

export interface SearchHit {
  kind: 'PRESET' | 'HISTORY' | 'ROUTINE'
  key: string
  title: string
  category: Category
  difficulty: Difficulty
  presetId: string | null
  /** 어느 세트에서 왔는지 (준비된 퀘스트일 때) */
  packName?: string
  favorite?: boolean
}

export interface SearchResult {
  packs: QuestPackDef[]
  quests: SearchHit[]
}

/** 검색창 아래 붙이는 빠른 낱말 */
export const SEARCH_KEYWORDS = ['청소', '운동', '업무', '마음', '식사', '아침', '밤']

export function searchLibrary(
  query: string,
  profiles: UsageProfiles,
  routines: Routine[],
): SearchResult {
  const q = normalizeTitle(query)
  if (!q) return { packs: [], quests: [] }

  const packs = QUEST_PACKS.filter(
    (pack) =>
      normalizeTitle(pack.name).includes(q) ||
      normalizeTitle(pack.description).includes(q) ||
      pack.items.some((item) => normalizeTitle(item.title).includes(q)),
  )

  const seen = new Set<string>()
  const quests: SearchHit[] = []

  const push = (hit: SearchHit) => {
    if (seen.has(hit.key)) return
    seen.add(hit.key)
    quests.push(hit)
  }

  // 내가 실제로 써 본 것을 먼저 — 사전보다 내 기록이 늘 정확하다
  for (const p of Object.values(profiles)) {
    if (!normalizeTitle(p.title).includes(q)) continue
    push({
      kind: 'HISTORY',
      key: p.questKey,
      title: p.title,
      category: p.category,
      difficulty: p.difficulty,
      presetId: p.presetId,
      favorite: p.favorite,
    })
  }

  for (const entry of matchingPresets(q)) {
    push({
      kind: 'PRESET',
      key: entry.key,
      title: entry.preset.title,
      category: entry.preset.category,
      difficulty: entry.preset.difficulty,
      presetId: entry.key,
      packName: entry.pack.name,
    })
  }

  for (const routine of routines) {
    if (!normalizeTitle(routine.title).includes(q)) continue
    push({
      kind: 'ROUTINE',
      key: `routine:${routine.id}`,
      title: routine.title,
      category: routine.category,
      difficulty: routine.difficulty,
      presetId: routine.sourcePresetId ?? null,
    })
  }

  return { packs, quests }
}

function matchingPresets(normalizedQuery: string): PresetEntry[] {
  return ALL_PRESETS.filter((e) => normalizeTitle(e.preset.title).includes(normalizedQuery))
}
