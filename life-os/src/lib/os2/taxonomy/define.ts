/**
 * 태그 정의를 짧게 쓰기 위한 도구.
 *
 * 태그가 250개쯤 되기 때문에 하나하나 전체 필드를 적으면 읽을 수가 없다.
 * 카테고리·id·source·version 처럼 뻔한 건 여기서 채운다.
 */
import type { LifeTagDef } from '../types'
import { TAXONOMY_VERSION } from '../versions'

/** 정의할 때 실제로 쓰는 모양 — 뻔한 필드는 뺐다 */
export type TagSpec = Omit<
  LifeTagDef,
  'id' | 'categoryId' | 'source' | 'taxonomyVersion' | 'key' | 'defaultConfidence'
> & {
  key: string
  /** 안 적으면 DEFAULT_CONFIDENCE */
  defaultConfidence?: number
}

/**
 * 기본 신뢰도.
 * Phase 3 은 정확도를 먼저 본다 — 애매하면 안 붙이는 쪽이 낫다.
 */
export const DEFAULT_CONFIDENCE = 0.75

/** 한 카테고리의 태그들을 한 번에 만든다 */
export function defineTags(categoryId: string, specs: TagSpec[]): LifeTagDef[] {
  return specs.map((spec) => ({
    ...spec,
    id: `${categoryId}:${spec.key}`,
    categoryId,
    source: 'builtin' as const,
    defaultConfidence: spec.defaultConfidence ?? DEFAULT_CONFIDENCE,
    taxonomyVersion: TAXONOMY_VERSION,
  }))
}

/** 같은 카테고리 안의 상위 태그를 가리킬 때 */
export const parent = (categoryId: string, key: string) => `${categoryId}:${key}`
