/**
 * LIFE TAG 사전 — 한 곳에서 조회.
 *
 * 카테고리별 파일 19개를 여기서 하나로 합치고, 엔진이 빨리 찾을 수 있게 색인을 만든다.
 * 규칙은 전부 여기서 나온 표만 본다 — AI 호출도, 외부 사전도 없다.
 *
 * 계층에 대해:
 *   저장은 잎(leaf)만 한다. 'emotion:happiness' 를 붙였으면 'emotion:joy' 는 저장하지 않는다.
 *   대신 분석할 때 expandForAnalysis() 로 조상을 펼친다.
 *   그래야 "기쁨이 몇 번" 을 셀 때 같은 순간을 두 번 세지 않는다.
 */
import type { LifeTagDef } from '../types'
import { CATEGORY_BY_ID } from '../categories'

import { ACTIVITY_TAGS } from './activity'
import { AGENCY_TAGS } from './agency'
import { BODY_TAGS } from './body'
import { CREATIVE_TAGS } from './creative'
import { EMOTION_TAGS } from './emotion'
import { ENERGY_TAGS } from './energy'
import { ENVIRONMENT_TAGS } from './environment'
import { FOOD_TAGS } from './food'
import { MENTAL_TAGS } from './mental'
import { NOVELTY_TAGS } from './novelty'
import { OUTCOME_TAGS } from './outcome'
import { PLACE_TAGS } from './place'
import { RECOVERY_TAGS } from './recovery'
import { RELATIONSHIP_TAGS } from './relationship'
import { SOCIAL_TAGS } from './social'
import { SPORT_TAGS } from './sport'
import { STRESSOR_TAGS } from './stressor'
import { TEMPORAL_TAGS } from './temporal'
import { WORK_TAGS } from './work'

/**
 * 실제로 기록에 저장되는 태그들.
 *
 * time:* 은 빠져 있다. quick_logs 에 이미 logged_at · day_part · day_of_week 가 있어서
 * 태그로 또 저장하면 같은 사실이 두 벌 생긴다. (아래 DERIVED_TAGS)
 */
export const LIFE_TAGS: LifeTagDef[] = [
  ...EMOTION_TAGS,
  ...MENTAL_TAGS,
  ...ENERGY_TAGS,
  ...BODY_TAGS,
  ...ACTIVITY_TAGS,
  ...SPORT_TAGS,
  ...WORK_TAGS,
  ...CREATIVE_TAGS,
  ...SOCIAL_TAGS,
  ...RELATIONSHIP_TAGS,
  ...PLACE_TAGS,
  ...ENVIRONMENT_TAGS,
  ...FOOD_TAGS,
  ...RECOVERY_TAGS,
  ...OUTCOME_TAGS,
  ...STRESSOR_TAGS,
  ...NOVELTY_TAGS,
  ...AGENCY_TAGS,
]

/** 저장하지 않고 분석할 때 만들어 쓰는 태그 (시간대·요일) */
export const DERIVED_TAGS: LifeTagDef[] = [...TEMPORAL_TAGS]

/** 사전에 있는 전부 — 이름을 보여 줄 때는 이쪽을 본다 */
export const ALL_TAGS: LifeTagDef[] = [...LIFE_TAGS, ...DERIVED_TAGS]

// ─────────────────────────────────────────────
// 색인
// ─────────────────────────────────────────────

export const TAG_BY_ID: ReadonlyMap<string, LifeTagDef> = new Map(
  ALL_TAGS.map((tag) => [tag.id, tag]),
)

export const getTag = (tagId: string): LifeTagDef | undefined => TAG_BY_ID.get(tagId)

/** 영문 key 를 화면에 그대로 내보내지 않는다. 사전에 없으면 빈 문자열이 아니라 id 를 준다 */
export const displayNameOf = (tagId: string): string => TAG_BY_ID.get(tagId)?.displayName ?? tagId

/** 카테고리 한글 이름 — 화면 묶음 제목에 쓴다 */
export const categoryNameOf = (tag: LifeTagDef): string =>
  CATEGORY_BY_ID[tag.categoryId]?.ko ?? tag.categoryId

const byCategory = new Map<string, LifeTagDef[]>()
for (const tag of ALL_TAGS) {
  const list = byCategory.get(tag.categoryId)
  if (list) list.push(tag)
  else byCategory.set(tag.categoryId, [tag])
}

export const TAGS_BY_CATEGORY: ReadonlyMap<string, LifeTagDef[]> = byCategory

export const tagsInCategory = (categoryId: string): LifeTagDef[] =>
  byCategory.get(categoryId) ?? []

const childrenIndex = new Map<string, string[]>()
for (const tag of ALL_TAGS) {
  if (!tag.parentId) continue
  const list = childrenIndex.get(tag.parentId)
  if (list) list.push(tag.id)
  else childrenIndex.set(tag.parentId, [tag.id])
}

export const childrenOf = (tagId: string): string[] => childrenIndex.get(tagId) ?? []

/** 자식이 없는 태그. 저장은 원칙적으로 여기까지 내려간 것이 좋다 */
export const isLeaf = (tagId: string): boolean => !childrenIndex.has(tagId)

export const LEAF_TAGS: LifeTagDef[] = LIFE_TAGS.filter((tag) => isLeaf(tag.id))

// ─────────────────────────────────────────────
// 계층 이동
// ─────────────────────────────────────────────

/**
 * 위로 올라가며 조상 id 를 모은다. 가까운 조상부터.
 * 사전이 잘못 엮여서 고리가 생겨도 멈추도록 방문한 곳을 기억한다.
 */
export function getAncestors(tagId: string): string[] {
  const out: string[] = []
  const seen = new Set<string>([tagId])
  let cursor = TAG_BY_ID.get(tagId)?.parentId ?? null
  while (cursor && !seen.has(cursor)) {
    out.push(cursor)
    seen.add(cursor)
    cursor = TAG_BY_ID.get(cursor)?.parentId ?? null
  }
  return out
}

export function isDescendantOf(tagId: string, ancestorId: string): boolean {
  if (tagId === ancestorId) return false
  return getAncestors(tagId).includes(ancestorId)
}

/**
 * 분석용으로 펼친다 — 붙은 태그 + 그 조상 전부.
 *
 * 'emotion:happiness' 하나만 저장돼 있어도 "기쁨" 통계에 잡히게 하려는 것.
 * 중복은 제거되므로 같은 기록이 두 번 세어지지 않는다.
 */
export function expandForAnalysis(tagIds: readonly string[]): string[] {
  const out = new Set<string>()
  for (const id of tagIds) {
    out.add(id)
    for (const ancestor of getAncestors(id)) out.add(ancestor)
  }
  return [...out]
}

/**
 * 같은 줄기에 있는 것끼리는 제일 아래만 남긴다.
 * joy 와 happiness 가 같이 붙었으면 happiness 만 저장한다 — 같은 말을 두 번 하지 않으려고.
 */
export function collapseToLeaves(tagIds: readonly string[]): string[] {
  const set = new Set(tagIds)
  return [...set].filter((id) => ![...set].some((other) => isDescendantOf(other, id)))
}

// ─────────────────────────────────────────────
// 검사
//
// 태그가 300개가 넘으면 사람 눈으로는 오타를 못 잡는다.
// 테스트에서 이 함수를 돌려서 사전이 깨졌는지 본다.
// ─────────────────────────────────────────────

export interface TaxonomyProblem {
  kind: 'duplicate-id' | 'unknown-category' | 'unknown-parent' | 'cycle' | 'bad-confidence' | 'no-display-name'
  tagId: string
  detail: string
}

export function validateTaxonomy(tags: readonly LifeTagDef[] = ALL_TAGS): TaxonomyProblem[] {
  const problems: TaxonomyProblem[] = []
  const seen = new Set<string>()
  const index = new Map(tags.map((t) => [t.id, t]))

  for (const tag of tags) {
    if (seen.has(tag.id)) {
      problems.push({ kind: 'duplicate-id', tagId: tag.id, detail: '같은 id 가 두 번 정의됐다' })
    }
    seen.add(tag.id)

    if (!CATEGORY_BY_ID[tag.categoryId]) {
      problems.push({ kind: 'unknown-category', tagId: tag.id, detail: tag.categoryId })
    }

    if (!tag.displayName.trim()) {
      problems.push({ kind: 'no-display-name', tagId: tag.id, detail: '한글 이름이 비어 있다' })
    }

    if (tag.defaultConfidence <= 0 || tag.defaultConfidence > 1) {
      problems.push({ kind: 'bad-confidence', tagId: tag.id, detail: String(tag.defaultConfidence) })
    }

    // 카테고리를 넘는 부모는 일부러 둔 것이다.
    // sport:climbing 의 부모는 activity:exercise 다 — "운동을 몇 번 했나" 를 셀 때
    // 클라이밍·러닝·요가가 전부 한 곳으로 모여야 하기 때문이다.
    // 그래서 부모가 있느냐만 본다.
    if (tag.parentId && !index.has(tag.parentId)) {
      problems.push({ kind: 'unknown-parent', tagId: tag.id, detail: tag.parentId })
    }
  }

  // 고리 찾기 — a 의 부모가 b, b 의 부모가 a 같은 경우
  for (const tag of tags) {
    const walked = new Set<string>([tag.id])
    let cursor = tag.parentId ?? null
    while (cursor) {
      if (walked.has(cursor)) {
        problems.push({ kind: 'cycle', tagId: tag.id, detail: `${cursor} 에서 돈다` })
        break
      }
      walked.add(cursor)
      cursor = index.get(cursor)?.parentId ?? null
    }
  }

  return problems
}

/**
 * 이름으로 태그 찾기 — Inspector 에서 "다른 태그 추가" 할 때.
 * 한글 이름과 별칭만 본다. 영문 key 로는 찾지 않는다 — 사용자가 그걸 알 이유가 없다.
 */
export function searchTags(query: string, limit = 24): LifeTagDef[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const hit = (tag: LifeTagDef) =>
    tag.displayName.toLowerCase().includes(q)
    || (tag.aliases ?? []).some((a) => a.toLowerCase().includes(q))
    || (tag.description ?? '').toLowerCase().includes(q)

  return LIFE_TAGS.filter(hit)
    .sort((a, b) => a.displayName.length - b.displayName.length)
    .slice(0, limit)
}

/** 보고용 숫자 */
export const taxonomyStats = () => ({
  stored: LIFE_TAGS.length,
  derived: DERIVED_TAGS.length,
  leaves: LEAF_TAGS.length,
  categories: byCategory.size,
  byCategory: Object.fromEntries([...byCategory].map(([id, list]) => [id, list.length])),
})
