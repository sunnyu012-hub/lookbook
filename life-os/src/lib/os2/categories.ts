/**
 * LIFE TAG 카테고리.
 *
 * Phase 3 에서 200~300개 태그 사전을 만든다. 여기는 그 태그들이 들어갈 서랍만 정의한다.
 * 카테고리를 코드 곳곳에 하드코딩하지 않으려고 한 곳에 모아 뒀다 —
 * 서랍이 늘어나도 이 파일만 고치면 된다.
 */
import type { TagCategory } from './types'

export const TAG_CATEGORIES: TagCategory[] = [
  { id: 'emotion', displayName: 'Emotion', ko: '감정', description: '기쁨 · 불안 · 뿌듯함 같은 감정 자체', sortOrder: 1 },
  { id: 'mental', displayName: 'Mental State', ko: '마음 상태', description: '집중 · 산만 · 압도됨 같은 정신적 상태', sortOrder: 2 },
  { id: 'energy', displayName: 'Energy', ko: '에너지', description: '기운이 나는지 빠지는지', sortOrder: 3 },
  { id: 'body', displayName: 'Body', ko: '몸', description: '몸의 감각 · 통증 · 컨디션', sortOrder: 4 },
  { id: 'activity', displayName: 'Activity', ko: '활동', description: '무엇을 했는가', sortOrder: 5 },
  { id: 'work', displayName: 'Work', ko: '일', description: '업무의 종류와 결', sortOrder: 6 },
  { id: 'creativity', displayName: 'Creativity', ko: '창작', description: '만들고 짓는 일', sortOrder: 7 },
  { id: 'social', displayName: 'Social', ko: '사회적 맥락', description: '혼자인지 함께인지, 어떤 자리인지', sortOrder: 8 },
  { id: 'relationship', displayName: 'Relationship', ko: '관계', description: '누구와 있었는가', sortOrder: 9 },
  { id: 'place', displayName: 'Place', ko: '장소', description: '어디에 있었는가', sortOrder: 10 },
  { id: 'environment', displayName: 'Environment', ko: '환경', description: '시끄러운지 조용한지, 붐비는지', sortOrder: 11 },
  { id: 'food', displayName: 'Food', ko: '먹은 것', description: '식사 · 카페인 · 수분', sortOrder: 12 },
  { id: 'recovery', displayName: 'Recovery', ko: '회복', description: '쉼 · 잠 · 늘어짐', sortOrder: 13 },
  { id: 'achievement', displayName: 'Achievement', ko: '해냄', description: '완료 · 돌파 · 성취', sortOrder: 14 },
  { id: 'stressor', displayName: 'Stressor', ko: '부담', description: '마감 · 갈등 · 예상 못 한 일', sortOrder: 15 },
  { id: 'novelty', displayName: 'Novelty', ko: '새로움', description: '처음 해보는 것 · 새 장소', sortOrder: 16 },
  { id: 'agency', displayName: 'Agency', ko: '주도권', description: '내가 고른 일인가 떠맡은 일인가', sortOrder: 17 },
  { id: 'temporal', displayName: 'Temporal', ko: '시간', description: '시간대 · 요일 · 계절 같은 시간 맥락', sortOrder: 18 },
]

export const CATEGORY_BY_ID: Record<string, TagCategory> = Object.fromEntries(
  TAG_CATEGORIES.map((c) => [c.id, c]),
)

export const isKnownCategory = (id: string) => id in CATEGORY_BY_ID

/** 'emotion:joy' → { categoryId: 'emotion', key: 'joy' } */
export function parseTagId(tagId: string): { categoryId: string; key: string } | null {
  const at = tagId.indexOf(':')
  if (at <= 0 || at === tagId.length - 1) return null
  return { categoryId: tagId.slice(0, at), key: tagId.slice(at + 1) }
}

export const makeTagId = (categoryId: string, key: string) => `${categoryId}:${key}`
