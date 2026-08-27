/**
 * 나만의 발견 저장소.
 *
 * 48개 DNA 저장소와 같은 규칙을 지킨다.
 *   · 근거는 덮어쓰지 않고 더한다
 *   · 여기서 나는 오류가 Quick Log 저장을 막지 않는다
 *
 * 여기만의 규칙이 하나 더 있다.
 *   · 사용자가 고친 이름과 숨김은 재평가로 지워지지 않는다 (계획서 68, 70)
 */
import type { DiscoveryState } from '../os2/types'
import type { MetricKey } from '../os2/analytics'
import type { DiscoveryEvidenceRecord, UserPerception } from '../os2/dna/types'
import type {
  NamingStatus,
  PersonalContext,
  PersonalDiscoveryRecord,
} from '../os2/dna/personal/types'
import { PERSONAL_RULE_VERSION } from '../os2/dna/personal/types'
import { SCHEMA_VERSION } from '../os2/versions'
import { supabase } from '../supabase'
import { currentUserId, localCollection, localObject, nowIso } from './base'

export const PERSONAL_TABLE = 'personal_discoveries'
export const PERSONAL_EVIDENCE_TABLE = 'personal_discovery_evidence'
export const NAMING_USAGE_TABLE = 'personal_naming_usage'

const localRecords = localCollection<PersonalDiscoveryRecord>('life-os:personal-dna:v1')
const localUsage = localObject<{ month: string; used: number }>('life-os:naming-usage:v1')

const num = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || fallback

// ─────────────────────────────────────────────

function rowTo(
  row: Record<string, unknown>,
  evidence: DiscoveryEvidenceRecord[],
): PersonalDiscoveryRecord {
  const state = String(row.state ?? 'LOCKED') as DiscoveryState
  return {
    fingerprint: String(row.fingerprint ?? ''),
    metric: String(row.metric ?? 'mood') as MetricKey,
    direction: num(row.direction, 1) >= 0 ? 1 : -1,
    contexts: (row.contexts as PersonalContext[]) ?? [],
    state,
    peakState: (String(row.peak_state ?? state) || state) as DiscoveryState,
    novelty: num(row.novelty),
    generatedTitle: (row.generated_title as string) ?? undefined,
    generatedDescription: (row.generated_description as string) ?? undefined,
    userTitle: (row.user_title as string) ?? undefined,
    namingStatus: (String(row.naming_status ?? 'pending') as NamingStatus),
    namingNote: (row.naming_note as string) ?? undefined,
    hidden: Boolean(row.hidden),
    userPerception: (row.user_perception ?? undefined) as UserPerception | undefined,
    componentEffects:
      (row.component_effects as Array<{ label: string; effect: number }>) ?? [],
    evidence,
    firstFoundAt: (row.first_found_at as string) ?? null,
    stateChangedAt: (row.state_changed_at as string) ?? null,
    lastEvaluatedAt: (row.last_evaluated_at as string) ?? nowIso(),
  }
}

function evidenceFrom(row: Record<string, unknown>): DiscoveryEvidenceRecord {
  return {
    discoveryId: String(row.personal_discovery_id ?? ''),
    defId: String(row.fingerprint ?? ''),
    childLabel: (row.child_label as string) ?? undefined,
    periodFrom: String(row.period_from ?? ''),
    periodTo: String(row.period_to ?? ''),
    metric: (row.metric as MetricKey) ?? 'mood',
    observed: num(row.observed_value),
    baseline: num(row.baseline),
    effectSize: num(row.effect_size),
    adjustedObserved: row.adjusted_observed == null ? undefined : num(row.adjusted_observed),
    adjustedDifference:
      row.adjusted_difference == null ? undefined : num(row.adjusted_difference),
    adjustedOn: (row.adjusted_on as string) ?? undefined,
    sampleCount: num(row.sample_count),
    baselineSampleCount: num(row.comparison_sample_count),
    distinctDays: num(row.distinct_days),
    durationDays: num(row.duration_days),
    consistency: num(row.consistency),
    mean: num(row.mean_value),
    median: num(row.median_value),
    relatedTags: (row.life_tag_ids as string[]) ?? [],
    weighting: ((row.weighting as string) ?? 'day') as DiscoveryEvidenceRecord['weighting'],
    state: (String(row.state ?? 'EMERGING') as DiscoveryState),
    analysisVersion: num(row.analysis_version, 1),
    taxonomyVersion: num(row.taxonomy_version, 1),
    ruleVersion: num(row.rule_version, 1),
    discoveryRuleVersion: num(row.discovery_rule_version, 1),
    evaluatedAt: String(row.calculated_at ?? ''),
  }
}

// ─────────────────────────────────────────────

export const personalDiscoveryRepository = {
  async list(): Promise<PersonalDiscoveryRecord[]> {
    if (!supabase) return localRecords.all()

    const userId = await currentUserId()
    const [{ data: rows, error }, { data: ev }] = await Promise.all([
      supabase.from(PERSONAL_TABLE).select('*').eq('user_id', userId),
      supabase
        .from(PERSONAL_EVIDENCE_TABLE)
        .select('*')
        .eq('user_id', userId)
        .order('calculated_at', { ascending: true }),
    ])
    if (error) throw new Error(error.message)

    const byFingerprint = new Map<string, DiscoveryEvidenceRecord[]>()
    for (const row of (ev ?? []) as Array<Record<string, unknown>>) {
      const key = String(row.fingerprint ?? '')
      if (!key) continue
      byFingerprint.set(key, [...(byFingerprint.get(key) ?? []), evidenceFrom(row)])
    }

    return ((rows ?? []) as Array<Record<string, unknown>>).map((row) =>
      rowTo(row, byFingerprint.get(String(row.fingerprint ?? '')) ?? []),
    )
  },

  async save(records: readonly PersonalDiscoveryRecord[]): Promise<void> {
    if (!supabase) {
      localRecords.write([...records])
      return
    }

    // 열린 것만 저장한다. LOCKED 로 내려간 것도 근거를 들고 있으니 같이 남긴다
    const keep = records.filter((r) => r.state !== 'LOCKED' || r.evidence.length > 0)
    if (!keep.length) return

    const userId = await currentUserId()
    const { error } = await supabase.from(PERSONAL_TABLE).upsert(
      keep.map((r) => ({
        user_id: userId,
        fingerprint: r.fingerprint,
        metric: r.metric,
        direction: r.direction,
        contexts: r.contexts,
        state: r.state,
        peak_state: r.peakState,
        novelty: r.novelty,
        generated_title: r.generatedTitle ?? null,
        generated_description: r.generatedDescription ?? null,
        user_title: r.userTitle ?? null,
        naming_status: r.namingStatus,
        naming_note: r.namingNote ?? null,
        hidden: Boolean(r.hidden),
        user_perception: r.userPerception ?? null,
        component_effects: r.componentEffects,
        first_found_at: r.firstFoundAt,
        state_changed_at: r.stateChangedAt,
        last_evaluated_at: r.lastEvaluatedAt,
        personal_rule_version: PERSONAL_RULE_VERSION,
        schema_version: SCHEMA_VERSION,
      })),
      { onConflict: 'user_id,fingerprint' },
    )
    if (error) throw new Error(error.message)
  },

  /** 근거는 더하기만 한다 */
  async addEvidence(rows: readonly DiscoveryEvidenceRecord[]): Promise<void> {
    if (!rows.length || !supabase) return

    const userId = await currentUserId()
    const { data: found } = await supabase
      .from(PERSONAL_TABLE)
      .select('id, fingerprint')
      .eq('user_id', userId)

    const idByFingerprint = new Map(
      ((found ?? []) as Array<{ id: string; fingerprint: string }>).map((r) => [
        r.fingerprint,
        r.id,
      ]),
    )

    const payload = rows.map((r) => ({
      user_id: userId,
      personal_discovery_id: idByFingerprint.get(r.defId) ?? null,
      fingerprint: r.defId,
      child_label: r.childLabel ?? null,
      metric: r.metric,
      state: r.state,
      period_from: r.periodFrom,
      period_to: r.periodTo,
      sample_count: r.sampleCount,
      comparison_sample_count: r.baselineSampleCount,
      distinct_days: r.distinctDays,
      duration_days: r.durationDays,
      baseline: r.baseline,
      observed_value: r.observed,
      effect_size: r.effectSize,
      adjusted_observed: r.adjustedObserved ?? null,
      adjusted_difference: r.adjustedDifference ?? null,
      adjusted_on: r.adjustedOn ?? null,
      mean_value: r.mean,
      median_value: r.median,
      consistency: r.consistency,
      life_tag_ids: r.relatedTags,
      weighting: r.weighting,
      analysis_version: r.analysisVersion,
      taxonomy_version: r.taxonomyVersion,
      rule_version: r.ruleVersion,
      discovery_rule_version: r.discoveryRuleVersion,
      personal_rule_version: PERSONAL_RULE_VERSION,
      schema_version: SCHEMA_VERSION,
      calculated_at: r.evaluatedAt,
    }))

    const { error } = await supabase.from(PERSONAL_EVIDENCE_TABLE).insert(payload)
    if (error) throw new Error(error.message)
  },

  /** 사용자가 고치는 것들 — 통계는 건드리지 않는다 */
  async patch(
    fingerprint: string,
    patch: Partial<
      Pick<PersonalDiscoveryRecord, 'userTitle' | 'hidden' | 'userPerception'>
    >,
  ): Promise<void> {
    if (!supabase) {
      localRecords.write(
        localRecords
          .all()
          .map((r) => (r.fingerprint === fingerprint ? { ...r, ...patch } : r)),
      )
      return
    }

    const columns: Record<string, unknown> = {}
    if ('userTitle' in patch) columns.user_title = patch.userTitle ?? null
    if ('hidden' in patch) columns.hidden = Boolean(patch.hidden)
    if ('userPerception' in patch) columns.user_perception = patch.userPerception ?? null
    if (!Object.keys(columns).length) return

    const userId = await currentUserId()
    const { error } = await supabase
      .from(PERSONAL_TABLE)
      .update(columns)
      .eq('user_id', userId)
      .eq('fingerprint', fingerprint)

    if (error) throw new Error(error.message)
  },

  // ── 이번 달에 몇 번 불렀나 ──

  async readUsage(month: string): Promise<{ month: string; used: number }> {
    if (!supabase) return localUsage.read() ?? { month, used: 0 }

    const userId = await currentUserId()
    const { data } = await supabase
      .from(NAMING_USAGE_TABLE)
      .select('month, used')
      .eq('user_id', userId)
      .eq('month', month)
      .maybeSingle()

    return { month, used: num(data?.used) }
  },

  async writeUsage(usage: { month: string; used: number }): Promise<void> {
    if (!supabase) {
      localUsage.write(usage)
      return
    }

    const userId = await currentUserId()
    await supabase
      .from(NAMING_USAGE_TABLE)
      .upsert(
        { user_id: userId, month: usage.month, used: usage.used, updated_at: nowIso() },
        { onConflict: 'user_id,month' },
      )
  },
}
