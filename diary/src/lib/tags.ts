import type { Entries } from './types'

/**
 * 미리 놓인 태그. "뭐 했는지" 를 글로 안 쓰고 손가락 한 번으로 남기는 길이다.
 * 성취 목록이 아니라 하루의 모양이라서, 쉬거나 아무것도 안 한 날도 여기 있다.
 */
export const TAG_GROUPS: { title: string; tags: string[] }[] = [
  { title: '몸', tags: ['잘 잤다', '운동', '산책', '밥', '요리', '병원', '피곤'] },
  { title: '마음', tags: ['쉼', '웃었다', '울었다', '음악', '멍때림', '기분 좋음'] },
  { title: '사람', tags: ['가족', '친구', '통화', '데이트', '모임', '혼자'] },
  { title: '할 일', tags: ['일', '공부', '회의', '집안일', '돈', '정리'] },
  { title: '재미', tags: ['책', '영화', '게임', '카페', '쇼핑', '외출', '여행'] },
]

export const PRESET_TAGS = TAG_GROUPS.flatMap((group) => group.tags)

/**
 * 태그별로 며칠에 눌렸는지. 기록에서 세기만 하고 따로 저장하지 않는다 —
 * 하루를 지우면 숫자도 같이 줄어야 맞다.
 */
export function tagCounts(entries: Entries): Map<string, number> {
  const counts = new Map<string, number>()
  for (const entry of Object.values(entries)) {
    for (const tag of new Set(entry.tags)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return counts
}

/** 많이 쓴 순, 같으면 이름 순. */
export function sortedTags(counts: Map<string, number>): { tag: string; count: number }[] {
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'ko'))
}

/**
 * 태그 고르는 칸에 보여줄 순서.
 * 자주 쓴 것 몇 개를 앞에 올리고, 나머지는 원래 묶음 순서를 지킨다.
 * 직접 만든 태그도 (기록에 남아 있으면) 같이 나온다.
 */
export function tagPalette(entries: Entries, selected: string[]): string[] {
  const counts = tagCounts(entries)
  const often = sortedTags(counts)
    .filter(({ count }) => count >= 2)
    .slice(0, 8)
    .map(({ tag }) => tag)

  const rest = [...PRESET_TAGS, ...counts.keys(), ...selected].filter(
    (tag) => !often.includes(tag),
  )
  return [...often, ...dedupe(rest)]
}

function dedupe(list: string[]): string[] {
  return [...new Set(list)]
}

/** 태그 이름 다듬기. 앞뒤 공백과 '#' 을 떼고 길이를 막는다. */
export function normalizeTag(raw: string): string {
  return raw.trim().replace(/^#+/, '').replace(/\s+/g, ' ').slice(0, 12)
}
