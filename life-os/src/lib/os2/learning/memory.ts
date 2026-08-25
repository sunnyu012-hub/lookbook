/**
 * 똑같은 문장 기억 (계획서 8, 9).
 *
 * 규칙은 세 번을 기다리지만, 사용자의 한 번의 수정도 버리지 않는다.
 * 다만 아주 좁게만 쓴다 — 다듬은 본문이 글자 하나까지 같을 때만 꺼낸다.
 *
 * "오늘 사람 너무 많아서 힘들진 않았음" 을 고쳐 놨다면
 * 다음에 똑같은 문장이 오면 그대로 꺼내지만,
 * "오늘 콘서트 사람 너무 많아서 힘들었음" 까지 끌어다 쓰지는 않는다.
 * 그건 일반화이고, 일반화는 반복을 거쳐야 한다.
 */
import type { AppliedLifeTag } from '../types'
import type { CorrectionEvent, ExactMemory } from './types'
import { SCHEMA_VERSION } from '../versions'
import { normalizeText } from './correction'

/** 너무 짧은 문장은 기억하지 않는다 — "졸림" 하나로 다음을 전부 덮으면 곤란하다 */
export const MIN_MEMORY_LENGTH = 6

export const canRemember = (normalized: string) =>
  normalized.replace(/\s/g, '').length >= MIN_MEMORY_LENGTH

export interface MemoryInput {
  normalizedText: string
  addTagIds: string[]
  suppressTagIds: string[]
}

/**
 * 손짓들을 문장별로 모아서 기억할 모양으로 만든다.
 * 같은 문장에 대한 손짓이 여러 개면 하나로 합친다.
 */
export function buildMemories(events: readonly CorrectionEvent[]): MemoryInput[] {
  const byText = new Map<string, MemoryInput>()

  for (const event of events) {
    const key = event.normalizedText
    if (!canRemember(key)) continue

    const entry = byText.get(key) ?? { normalizedText: key, addTagIds: [], suppressTagIds: [] }

    if (event.kind === 'rejected') {
      if (!entry.suppressTagIds.includes(event.tagId)) entry.suppressTagIds.push(event.tagId)
      entry.addTagIds = entry.addTagIds.filter((id) => id !== event.tagId)
    } else {
      if (!entry.addTagIds.includes(event.tagId)) entry.addTagIds.push(event.tagId)
      entry.suppressTagIds = entry.suppressTagIds.filter((id) => id !== event.tagId)
    }

    byText.set(key, entry)
  }

  return [...byText.values()].filter((m) => m.addTagIds.length || m.suppressTagIds.length)
}

/** 두 기억을 합친다 — 나중 것이 이긴다 */
export function mergeMemory(existing: ExactMemory, next: MemoryInput): ExactMemory {
  const suppress = new Set([...existing.suppressTagIds, ...next.suppressTagIds])
  const add = new Set([...existing.addTagIds, ...next.addTagIds])

  // 나중에 붙이라고 한 것은 막기 목록에서 뺀다 (그 반대도)
  for (const id of next.addTagIds) suppress.delete(id)
  for (const id of next.suppressTagIds) add.delete(id)

  return {
    ...existing,
    addTagIds: [...add],
    suppressTagIds: [...suppress],
    updatedAt: new Date().toISOString(),
  }
}

export const newMemory = (
  input: MemoryInput,
  meta: { id: string; userId: string; now: string },
): ExactMemory => ({
  id: meta.id,
  userId: meta.userId,
  normalizedText: input.normalizedText,
  addTagIds: input.addTagIds,
  suppressTagIds: input.suppressTagIds,
  useCount: 0,
  lastUsedAt: null,
  createdAt: meta.now,
  updatedAt: meta.now,
  schemaVersion: SCHEMA_VERSION,
})

/** 이 본문에 딱 맞는 기억 찾기 */
export function findMemory(
  memories: readonly ExactMemory[],
  text: string | null | undefined,
): ExactMemory | null {
  const key = normalizeText(text)
  if (!canRemember(key)) return null
  return memories.find((m) => m.normalizedText === key) ?? null
}

/** 기억이 만든 태그 — 사용자가 직접 고른 것과 같은 무게로 둔다 */
export const memoryTag = (
  tagId: string,
  meta: { taxonomyVersion: number; ruleVersion: number; at: string },
): AppliedLifeTag => ({
  tagId,
  source: 'user',
  confidence: 1,
  userVerified: true,
  appliedAt: meta.at,
  temporalContext: 'present',
  taxonomyVersion: meta.taxonomyVersion,
  ruleVersion: meta.ruleVersion,
})
