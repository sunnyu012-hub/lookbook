/**
 * 개인 학습 저장소 — 규칙 · 교정 근거 · 똑같은 문장 기억.
 *
 * 세 가지 모두 아주 개인적인 기록이다. 어떤 말을 쓰고 무엇을 고쳤는지가 다 들어 있다.
 * 그래서 언제나 user_id 로 걸러서 보내고, RLS 가 서버에서 한 번 더 막는다.
 *
 * 그리고 이 저장소에서 나는 오류는 Quick Log 저장을 막지 않는다 (계획서 46).
 * 우선순위는 항상 기록 > 태깅 > 학습이다.
 */
import type {
  CorrectionEvent,
  ExactMemory,
  PersonalRule,
  PersonalRuleInput,
  RuleContext,
  RuleStatus,
  RuleType,
} from '../os2/learning/types'
import type { CorrectionContext, CorrectionKind } from '../os2/learning/types'
import type { DayOfWeek, DayPart, TemporalContext } from '../os2/types'
import { SCHEMA_VERSION } from '../os2/versions'
import { supabase } from '../supabase'
import { LOCAL_USER_ID } from '../env'
import { currentUserId, localCollection, newId, nowIso } from './base'

export const RULES_TABLE = 'user_tag_rules'
export const CORRECTIONS_TABLE = 'tag_corrections'
export const MEMORIES_TABLE = 'exact_tag_memories'

// ─────────────────────────────────────────────
// 개인 규칙
// ─────────────────────────────────────────────

interface RuleRow {
  id: string
  user_id: string
  rule_type: string
  status: string
  trigger: string
  normalized_trigger: string | null
  resulting_tag_id: string | null
  suppressed_tag_id: string | null
  context: RuleContext | null
  correction_count: number
  positive_count: number
  negative_count: number
  distinct_days: number
  conflict_count: number
  confidence: number
  specificity: number
  user_defined: boolean
  last_matched_at: string | null
  last_corrected_at: string | null
  taxonomy_version: number | null
  rule_version: number | null
  schema_version: number
  created_at: string
  updated_at: string
}

const ruleFrom = (r: RuleRow): PersonalRule => ({
  id: r.id,
  userId: r.user_id,
  type: r.rule_type as RuleType,
  status: r.status as RuleStatus,
  trigger: r.trigger,
  normalizedTrigger: r.normalized_trigger ?? r.trigger,
  targetTagId: r.resulting_tag_id,
  suppressedTagId: r.suppressed_tag_id,
  context: r.context ?? {},
  correctionCount: r.correction_count,
  positiveCount: r.positive_count,
  negativeCount: r.negative_count,
  distinctDays: r.distinct_days,
  conflictCount: r.conflict_count,
  confidence: Number(r.confidence),
  specificity: r.specificity,
  userDefined: r.user_defined,
  lastMatchedAt: r.last_matched_at,
  lastCorrectedAt: r.last_corrected_at,
  taxonomyVersion: r.taxonomy_version ?? 1,
  ruleVersion: r.rule_version ?? 1,
  schemaVersion: r.schema_version ?? SCHEMA_VERSION,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const ruleTo = (rule: PersonalRuleInput, userId: string) => ({
  user_id: userId,
  rule_type: rule.type,
  status: rule.status,
  trigger: rule.trigger,
  normalized_trigger: rule.normalizedTrigger,
  resulting_tag_id: rule.targetTagId,
  suppressed_tag_id: rule.suppressedTagId,
  context: rule.context,
  correction_count: rule.correctionCount,
  positive_count: rule.positiveCount,
  negative_count: rule.negativeCount,
  distinct_days: rule.distinctDays,
  conflict_count: rule.conflictCount,
  confidence: rule.confidence,
  specificity: rule.specificity,
  user_defined: rule.userDefined,
  last_matched_at: rule.lastMatchedAt,
  last_corrected_at: rule.lastCorrectedAt,
  taxonomy_version: rule.taxonomyVersion,
  rule_version: rule.ruleVersion,
  // enabled 는 004 에 있던 컬럼이다. status 와 뜻이 겹치므로 같이 맞춰 둔다
  enabled: rule.status === 'active',
  schema_version: SCHEMA_VERSION,
  updated_at: nowIso(),
})

const localRules = localCollection<PersonalRule>('life-os:personal-rules:v1')

export const personalRuleRepository = {
  async list(): Promise<PersonalRule[]> {
    if (!supabase) return localRules.all()

    const userId = await currentUserId()
    const { data, error } = await supabase
      .from(RULES_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('confidence', { ascending: false })

    if (error) throw new Error(error.message)
    return (data as RuleRow[]).map(ruleFrom)
  },

  async create(input: PersonalRuleInput): Promise<PersonalRule> {
    if (!supabase) {
      const at = nowIso()
      const rule: PersonalRule = {
        ...input,
        id: newId(),
        userId: LOCAL_USER_ID,
        schemaVersion: SCHEMA_VERSION,
        createdAt: at,
        updatedAt: at,
      }
      localRules.write([...localRules.all(), rule])
      return rule
    }

    const userId = await currentUserId()
    const { data, error } = await supabase
      .from(RULES_TABLE)
      .insert(ruleTo(input, userId))
      .select()
      .single()

    if (error) throw new Error(error.message)
    return ruleFrom(data as RuleRow)
  },

  async update(id: string, patch: Partial<PersonalRule>): Promise<void> {
    if (!supabase) {
      localRules.write(
        localRules.all().map((r) => (r.id === id ? { ...r, ...patch, updatedAt: nowIso() } : r)),
      )
      return
    }

    const userId = await currentUserId()
    const row: Record<string, unknown> = { updated_at: nowIso() }
    if (patch.status !== undefined) {
      row.status = patch.status
      row.enabled = patch.status === 'active'
    }
    if (patch.confidence !== undefined) row.confidence = patch.confidence
    if (patch.correctionCount !== undefined) row.correction_count = patch.correctionCount
    if (patch.positiveCount !== undefined) row.positive_count = patch.positiveCount
    if (patch.negativeCount !== undefined) row.negative_count = patch.negativeCount
    if (patch.distinctDays !== undefined) row.distinct_days = patch.distinctDays
    if (patch.conflictCount !== undefined) row.conflict_count = patch.conflictCount
    if (patch.lastMatchedAt !== undefined) row.last_matched_at = patch.lastMatchedAt
    if (patch.lastCorrectedAt !== undefined) row.last_corrected_at = patch.lastCorrectedAt
    if (patch.userDefined !== undefined) row.user_defined = patch.userDefined
    if (patch.context !== undefined) row.context = patch.context

    const { error } = await supabase
      .from(RULES_TABLE)
      .update(row)
      .eq('user_id', userId)
      .eq('id', id)

    if (error) throw new Error(error.message)
  },

  /**
   * 진짜로 지운다.
   *
   * 보통은 deprecated 로 물러나게 두는 게 낫지만 (계획서 26),
   * "이건 완전히 잘못 배운 거다" 라고 사용자가 말할 길은 있어야 한다.
   */
  async remove(id: string): Promise<void> {
    if (!supabase) {
      localRules.write(localRules.all().filter((r) => r.id !== id))
      return
    }

    const userId = await currentUserId()
    const { error } = await supabase.from(RULES_TABLE).delete().eq('user_id', userId).eq('id', id)
    if (error) throw new Error(error.message)
  },
}

// ─────────────────────────────────────────────
// 교정 근거
// ─────────────────────────────────────────────

interface CorrectionRow {
  id: string
  user_id: string
  quick_log_id: string | null
  kind: string
  tag_id: string
  text: string | null
  normalized_text: string
  matched_text: string | null
  source_rule_id: string | null
  context: Partial<CorrectionContext> | null
  date: string
  schema_version: number
  created_at: string
}

const correctionFrom = (r: CorrectionRow): CorrectionEvent => ({
  id: r.id,
  userId: r.user_id,
  quickLogId: r.quick_log_id ?? '',
  kind: r.kind as CorrectionKind,
  tagId: r.tag_id,
  text: r.text ?? '',
  normalizedText: r.normalized_text,
  matchedText: r.matched_text,
  sourceRuleId: r.source_rule_id,
  context: {
    myTagIds: r.context?.myTagIds ?? [],
    myTagNames: r.context?.myTagNames ?? [],
    lifeTagIds: r.context?.lifeTagIds ?? [],
    dayPart: (r.context?.dayPart ?? 'morning') as DayPart,
    dayOfWeek: (r.context?.dayOfWeek ?? 0) as DayOfWeek,
    temporalContext: (r.context?.temporalContext ?? 'present') as TemporalContext,
  },
  date: r.date,
  createdAt: r.created_at,
  schemaVersion: r.schema_version ?? SCHEMA_VERSION,
})

const localCorrections = localCollection<CorrectionEvent>('life-os:tag-corrections:v1')

/** 근거를 무한정 쌓지 않는다. 최근 것부터 이만큼만 본다 */
export const CORRECTION_LIMIT = 1000

export const correctionRepository = {
  async list(limit = CORRECTION_LIMIT): Promise<CorrectionEvent[]> {
    if (!supabase) {
      return localCorrections
        .all()
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .slice(0, limit)
    }

    const userId = await currentUserId()
    const { data, error } = await supabase
      .from(CORRECTIONS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw new Error(error.message)
    return (data as CorrectionRow[]).map(correctionFrom)
  },

  async addMany(events: readonly CorrectionEvent[]): Promise<void> {
    if (!events.length) return

    if (!supabase) {
      localCorrections.write([...localCorrections.all(), ...events])
      return
    }

    const userId = await currentUserId()
    const { error } = await supabase.from(CORRECTIONS_TABLE).insert(
      events.map((e) => ({
        user_id: userId,
        quick_log_id: e.quickLogId || null,
        kind: e.kind,
        tag_id: e.tagId,
        text: e.text || null,
        normalized_text: e.normalizedText,
        matched_text: e.matchedText,
        source_rule_id: e.sourceRuleId,
        context: e.context,
        date: e.date,
        schema_version: SCHEMA_VERSION,
      })),
    )

    if (error) throw new Error(error.message)
  },
}

// ─────────────────────────────────────────────
// 똑같은 문장 기억
// ─────────────────────────────────────────────

interface MemoryRow {
  id: string
  user_id: string
  normalized_text: string
  add_tag_ids: string[] | null
  suppress_tag_ids: string[] | null
  use_count: number
  last_used_at: string | null
  schema_version: number
  created_at: string
  updated_at: string
}

const memoryFrom = (r: MemoryRow): ExactMemory => ({
  id: r.id,
  userId: r.user_id,
  normalizedText: r.normalized_text,
  addTagIds: r.add_tag_ids ?? [],
  suppressTagIds: r.suppress_tag_ids ?? [],
  useCount: r.use_count,
  lastUsedAt: r.last_used_at,
  schemaVersion: r.schema_version ?? SCHEMA_VERSION,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const localMemories = localCollection<ExactMemory>('life-os:exact-memories:v1')

export const memoryRepository = {
  async list(): Promise<ExactMemory[]> {
    if (!supabase) return localMemories.all()

    const userId = await currentUserId()
    const { data, error } = await supabase
      .from(MEMORIES_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data as MemoryRow[]).map(memoryFrom)
  },

  /** 같은 문장이 이미 있으면 덮어쓴다 — 나중 판단이 이긴다 */
  async upsert(memory: ExactMemory): Promise<void> {
    if (!supabase) {
      const items = localMemories.all()
      const at = items.findIndex((m) => m.normalizedText === memory.normalizedText)
      if (at === -1) localMemories.write([...items, memory])
      else localMemories.write(items.map((m, i) => (i === at ? memory : m)))
      return
    }

    const userId = await currentUserId()
    const { error } = await supabase.from(MEMORIES_TABLE).upsert(
      {
        user_id: userId,
        normalized_text: memory.normalizedText,
        add_tag_ids: memory.addTagIds,
        suppress_tag_ids: memory.suppressTagIds,
        use_count: memory.useCount,
        last_used_at: memory.lastUsedAt,
        schema_version: SCHEMA_VERSION,
        updated_at: nowIso(),
      },
      { onConflict: 'user_id,normalized_text' },
    )

    if (error) throw new Error(error.message)
  },

  async remove(id: string): Promise<void> {
    if (!supabase) {
      localMemories.write(localMemories.all().filter((m) => m.id !== id))
      return
    }

    const userId = await currentUserId()
    const { error } = await supabase.from(MEMORIES_TABLE).delete().eq('user_id', userId).eq('id', id)
    if (error) throw new Error(error.message)
  },
}
