/**
 * MY DNA 저장소.
 *
 * 지키는 것 둘.
 *
 * 하나. Evidence 는 덮어쓰지 않는다. 언제나 더한다 (계획서 102).
 * 결론은 바뀌어도 "그때 왜 열렸는가" 는 남아야 한다.
 *
 * 둘. 여기서 나는 오류가 Quick Log 저장을 막지 않는다 (계획서 71).
 * DNA 는 곁다리다. 기록이 먼저다.
 */
import type { DiscoveryFamily, DiscoveryKind, DiscoveryState } from '../os2/types'
import type {
  DiscoveryEvidenceRecord,
  DiscoveryRecord,
  ShiftRecord,
  UserPerception,
} from '../os2/dna/types'
import { SCHEMA_VERSION } from '../os2/versions'
import { supabase } from '../supabase'
import { LOCAL_USER_ID } from '../env'
import { currentUserId, localCollection, newId, nowIso } from './base'

export const DISCOVERIES_TABLE = 'discoveries'
export const EVIDENCE_TABLE = 'discovery_evidence'
export const SHIFTS_TABLE = 'dna_shifts'

interface DiscoveryRow {
  id: string
  user_id: string
  def_id: string | null
  kind: string
  family: string
  display_name: string
  state: string
  peak_state: string | null
  user_perception: string | null
  first_found_at: string | null
  state_changed_at: string | null
  last_evaluated_at: string | null
  children: string[] | null
}

const rowTo = (r: DiscoveryRow, evidence: DiscoveryEvidenceRecord[]): DiscoveryRecord => ({
  defId: r.def_id ?? r.id,
  type: r.kind as DiscoveryKind,
  family: r.family as DiscoveryFamily,
  state: r.state as DiscoveryState,
  peakState: (r.peak_state ?? r.state) as DiscoveryState,
  firstDiscoveredAt: r.first_found_at,
  stateChangedAt: r.state_changed_at,
  lastEvaluatedAt: r.last_evaluated_at ?? nowIso(),
  userPerception: (r.user_perception ?? undefined) as UserPerception | undefined,
  evidence,
  children: r.children?.length ? r.children : undefined,
})

const localRecords = localCollection<DiscoveryRecord>('life-os:dna:v1')
const localShifts = localCollection<ShiftRecord>('life-os:dna-shifts:v1')

export const dnaRepository = {
  async list(): Promise<DiscoveryRecord[]> {
    if (!supabase) return localRecords.all()

    const userId = await currentUserId()
    const [{ data: rows, error }, { data: ev }] = await Promise.all([
      supabase.from(DISCOVERIES_TABLE).select('*').eq('user_id', userId),
      supabase
        .from(EVIDENCE_TABLE)
        .select('*')
        .eq('user_id', userId)
        .order('calculated_at', { ascending: true }),
    ])

    if (error) throw new Error(error.message)

    const byDef = new Map<string, DiscoveryEvidenceRecord[]>()
    for (const row of (ev ?? []) as Array<Record<string, unknown>>) {
      const defId = String(row.def_id ?? '')
      if (!defId) continue
      byDef.set(defId, [...(byDef.get(defId) ?? []), evidenceFrom(row)])
    }

    return (rows as DiscoveryRow[]).map((r) => rowTo(r, byDef.get(r.def_id ?? '') ?? []))
  },

  /**
   * 평가 결과를 저장한다.
   * 결론은 덮어쓰고, 근거는 새로 생긴 것만 더한다.
   */
  async save(records: readonly DiscoveryRecord[], displayNameOf: (id: string) => string): Promise<void> {
    if (!supabase) {
      // 로컬에서는 통째로 갈아 끼운다. 근거는 record 안에 이미 쌓여 있다
      localRecords.write([...records])
      return
    }

    const userId = await currentUserId()

    // 열린 것만 저장한다. 48개를 전부 행으로 만들면 대부분 LOCKED 인 쓰레기가 쌓인다
    const open = records.filter((r) => r.state !== 'LOCKED')
    if (!open.length) return

    const { error } = await supabase.from(DISCOVERIES_TABLE).upsert(
      open.map((r) => ({
        user_id: userId,
        def_id: r.defId,
        kind: r.type,
        family: r.family,
        display_name: displayNameOf(r.defId),
        state: r.state,
        peak_state: r.peakState,
        user_perception: r.userPerception ?? null,
        first_found_at: r.firstDiscoveredAt,
        state_changed_at: r.stateChangedAt,
        last_evaluated_at: r.lastEvaluatedAt,
        children: r.children ?? [],
        schema_version: SCHEMA_VERSION,
      })),
      { onConflict: 'user_id,def_id' },
    )
    if (error) throw new Error(error.message)
  },

  /** 근거는 더하기만 한다 */
  async addEvidence(rows: readonly DiscoveryEvidenceRecord[]): Promise<void> {
    if (!rows.length) return
    if (!supabase) return

    const userId = await currentUserId()
    const { data: found } = await supabase
      .from(DISCOVERIES_TABLE)
      .select('id, def_id')
      .eq('user_id', userId)

    const idByDef = new Map(
      ((found ?? []) as Array<{ id: string; def_id: string }>).map((r) => [r.def_id, r.id]),
    )

    const payload = rows
      .filter((r) => idByDef.has(r.defId))
      .map((r) => ({
        user_id: userId,
        discovery_id: idByDef.get(r.defId),
        def_id: r.defId,
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
        confidence: Math.min(1, Math.max(0, r.consistency)),
        analysis_version: r.analysisVersion,
        taxonomy_version: r.taxonomyVersion,
        rule_version: r.ruleVersion,
        discovery_rule_version: r.discoveryRuleVersion,
        schema_version: SCHEMA_VERSION,
        calculated_at: r.evaluatedAt,
      }))

    if (!payload.length) return
    const { error } = await supabase.from(EVIDENCE_TABLE).insert(payload)
    if (error) throw new Error(error.message)
  },

  /** 사용자가 느낀 것 — 통계는 건드리지 않는다 */
  async setPerception(defId: string, perception: UserPerception | null): Promise<void> {
    if (!supabase) {
      localRecords.write(
        localRecords.all().map((r) =>
          r.defId === defId ? { ...r, userPerception: perception ?? undefined } : r,
        ),
      )
      return
    }

    const userId = await currentUserId()
    const { error } = await supabase
      .from(DISCOVERIES_TABLE)
      .update({ user_perception: perception })
      .eq('user_id', userId)
      .eq('def_id', defId)

    if (error) throw new Error(error.message)
  },

  async listShifts(): Promise<ShiftRecord[]> {
    if (!supabase) return localShifts.all()

    const userId = await currentUserId()
    const { data, error } = await supabase
      .from(SHIFTS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('observed_at', { ascending: false })

    if (error) throw new Error(error.message)
    return ((data ?? []) as Array<Record<string, unknown>>).map(shiftFrom)
  },

  async addShifts(shifts: readonly ShiftRecord[], discoveryIdOf: (defId: string) => string | null): Promise<void> {
    if (!shifts.length) return

    if (!supabase) {
      const known = new Set(localShifts.all().map((s) => `${s.fromDefId}>${s.toDefId}`))
      const fresh = shifts.filter((s) => !known.has(`${s.fromDefId}>${s.toDefId}`))
      if (fresh.length) localShifts.write([...localShifts.all(), ...fresh])
      return
    }

    const userId = await currentUserId()
    const payload = shifts
      .map((s) => ({
        user_id: userId,
        discovery_id: discoveryIdOf(s.fromDefId),
        from_def_id: s.fromDefId,
        to_def_id: s.toDefId,
        from_state: 'ESTABLISHED',
        to_state: 'CHANGING',
        summary: s.summary,
        previous_effect: s.previousPeriod.effect,
        recent_effect: s.recentPeriod.effect,
        observed_at: s.detectedAt,
        schema_version: SCHEMA_VERSION,
      }))
      .filter((row) => row.discovery_id)

    if (!payload.length) return
    const { error } = await supabase.from(SHIFTS_TABLE).insert(payload)
    if (error) throw new Error(error.message)
  },
}

const num = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || fallback

function evidenceFrom(row: Record<string, unknown>): DiscoveryEvidenceRecord {
  return {
    discoveryId: String(row.discovery_id ?? ''),
    defId: String(row.def_id ?? ''),
    childLabel: (row.child_label as string) ?? undefined,
    periodFrom: String(row.period_from ?? ''),
    periodTo: String(row.period_to ?? ''),
    metric: (row.metric as DiscoveryEvidenceRecord['metric']) ?? 'mood',
    observed: num(row.observed_value),
    baseline: num(row.baseline),
    effectSize: num(row.effect_size),
    adjustedObserved: row.adjusted_observed == null ? undefined : num(row.adjusted_observed),
    adjustedDifference: row.adjusted_difference == null ? undefined : num(row.adjusted_difference),
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
    state: ((row.state as string) ?? 'EMERGING') as DiscoveryState,
    analysisVersion: num(row.analysis_version, 1),
    taxonomyVersion: num(row.taxonomy_version, 1),
    ruleVersion: num(row.rule_version, 1),
    discoveryRuleVersion: num(row.discovery_rule_version, 1),
    evaluatedAt: String(row.calculated_at ?? ''),
  }
}

function shiftFrom(row: Record<string, unknown>): ShiftRecord {
  return {
    fromDefId: String(row.from_def_id ?? ''),
    toDefId: String(row.to_def_id ?? ''),
    detectedAt: String(row.observed_at ?? ''),
    summary: String(row.summary ?? ''),
    previousPeriod: { from: '', to: '', effect: num(row.previous_effect) },
    recentPeriod: { from: '', to: '', effect: num(row.recent_effect) },
  }
}

export { newId, LOCAL_USER_ID }
