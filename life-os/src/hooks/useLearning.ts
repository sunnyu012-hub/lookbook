/**
 * 개인 학습 상태.
 *
 * 이 훅에서 나는 오류는 어디로도 번지지 않는다.
 * 학습이 실패해도 기록은 이미 저장돼 있고 태그도 이미 붙어 있다 (계획서 46).
 * 그래서 여기 있는 저장 호출은 전부 catch 로 삼킨다 — 화면을 멈추지 않는다.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppliedLifeTag, QuickLog } from '@/lib/os2/types'
import type {
  Candidate,
  CorrectionEvent,
  ExactMemory,
  PersonalRule,
} from '@/lib/os2/learning'
import {
  applyReview,
  buildCandidates,
  buildMemories,
  candidateKey,
  extractCorrections,
  judge,
  learnableOnly,
  mergeMemory,
  newMemory,
  reinforce,
  sameRule,
  toRule,
} from '@/lib/os2/learning'
import {
  correctionRepository,
  memoryRepository,
  personalRuleRepository,
} from '@/lib/repositories/learning'
import { newId, nowIso } from '@/lib/repositories/base'
import { LOCAL_USER_ID } from '@/lib/env'
import type { AuthState } from './useSession'

export function useLearning(authState: AuthState = 'local') {
  const [rules, setRules] = useState<PersonalRule[]>([])
  const [corrections, setCorrections] = useState<CorrectionEvent[]>([])
  const [memories, setMemories] = useState<ExactMemory[]>([])
  const [loading, setLoading] = useState(true)

  const ready = authState === 'local' || authState === 'signed-in'

  const refresh = useCallback(() => {
    if (!ready) return
    Promise.all([
      personalRuleRepository.list().catch(() => [] as PersonalRule[]),
      correctionRepository.list().catch(() => [] as CorrectionEvent[]),
      memoryRepository.list().catch(() => [] as ExactMemory[]),
    ])
      .then(([r, c, m]) => {
        // 불러오면서 한살이를 한 번 훑는다 — 오래 안 쓰인 규칙은 조용히 힘이 빠진다
        setRules(r.map((rule) => applyReview(rule)))
        setCorrections(c)
        setMemories(m)
      })
      .finally(() => setLoading(false))
  }, [ready])

  useEffect(() => {
    refresh()
  }, [refresh])

  /** 실제로 적용되는 규칙만 */
  const active = useMemo(() => rules.filter((r) => r.status === 'active'), [rules])

  /** 아직 근거가 모자란 것들 — "학습 중인 표현" 으로 보여 준다 */
  const candidateRules = useMemo(() => rules.filter((r) => r.status === 'candidate'), [rules])

  /** 지금 모인 근거로 만들 수 있는 후보들 */
  const candidates = useMemo(
    () => buildCandidates(learnableOnly(corrections)),
    [corrections],
  )

  /**
   * Inspector 에서 태그를 고쳤을 때 부르는 자리.
   *
   * 하는 일은 세 가지다.
   *   1. 손짓을 근거로 남긴다
   *   2. 똑같은 문장 기억을 갱신한다 (한 번으로 바로)
   *   3. 후보를 다시 세어서 올라갈 게 있으면 올린다 (여러 번이 쌓여야)
   */
  const learn = useCallback(
    async (
      log: QuickLog,
      before: readonly AppliedLifeTag[],
      after: readonly AppliedLifeTag[],
      myTagNames: readonly string[] = [],
    ) => {
      try {
        const events = extractCorrections(log, before, after, { myTagNames, newId })
        if (!events.length) return

        const nextCorrections = [...events, ...corrections]
        setCorrections(nextCorrections)
        void correctionRepository.addMany(events).catch(() => undefined)

        await rememberExact(events)
        await growRules(learnableOnly(nextCorrections))
      } catch {
        // 학습이 안 돼도 기록과 태그는 그대로다
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [corrections, rules, memories],
  )

  /** 한 번의 수정을 곧바로 기억한다 */
  const rememberExact = useCallback(
    async (events: readonly CorrectionEvent[]) => {
      const inputs = buildMemories(events)
      if (!inputs.length) return

      const next = [...memories]
      for (const input of inputs) {
        const at = next.findIndex((m) => m.normalizedText === input.normalizedText)
        const merged =
          at === -1
            ? newMemory(input, { id: newId(), userId: LOCAL_USER_ID, now: nowIso() })
            : mergeMemory(next[at], input)

        if (at === -1) next.push(merged)
        else next[at] = merged

        void memoryRepository.upsert(merged).catch(() => undefined)
      }
      setMemories(next)
    },
    [memories],
  )

  /** 근거를 다시 세어서 규칙을 만들거나 키운다 */
  const growRules = useCallback(
    async (events: readonly CorrectionEvent[]) => {
      const fresh = buildCandidates(events)
      if (!fresh.length) return

      const next = [...rules]

      for (const candidate of fresh) {
        const draft = toRule(candidate)
        const existing = next.find((r) =>
          sameRule({ ...r }, { ...r, ...draft, id: r.id, userId: r.userId } as PersonalRule),
        ) ?? next.find((r) => keyOf(r) === candidate.key)

        if (existing) {
          const grown = reinforce(existing, candidate)
          if (grown.status === existing.status && grown.confidence === existing.confidence) continue
          const at = next.indexOf(existing)
          next[at] = grown
          void personalRuleRepository
            .update(existing.id, {
              status: grown.status,
              confidence: grown.confidence,
              correctionCount: grown.correctionCount,
              positiveCount: grown.positiveCount,
              negativeCount: grown.negativeCount,
              distinctDays: grown.distinctDays,
              conflictCount: grown.conflictCount,
              lastCorrectedAt: grown.lastCorrectedAt,
            })
            .catch(() => undefined)
          continue
        }

        // 아직 아무 근거도 없는 후보는 저장하지 않는다.
        // 손짓 한 번마다 규칙 행이 생기면 목록이 쓰레기로 찬다
        if (candidate.agreeing < 2 && !judge(candidate).promote) continue

        try {
          const saved = await personalRuleRepository.create(draft)
          next.push(saved)
        } catch {
          // 저장 실패는 다음 교정 때 다시 시도된다
        }
      }

      setRules(next)
    },
    [rules],
  )

  // ── 사용자가 직접 관리하는 길 ──────────────

  const setStatus = useCallback(async (id: string, status: PersonalRule['status']) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    await personalRuleRepository.update(id, { status }).catch(() => undefined)
  }, [])

  /** 후보를 사용자가 직접 승격시킨다 — 자동 조건보다 사용자 판단이 세다 (계획서 35) */
  const promote = useCallback(
    async (candidate: Candidate) => {
      const draft = toRule(candidate, { userDefined: true })
      try {
        const saved = await personalRuleRepository.create(draft)
        setRules((prev) => [...prev, saved])
        return saved
      } catch {
        return null
      }
    },
    [],
  )

  /** 사용자가 직접 만든 규칙 (계획서 36) */
  const createRule = useCallback(
    async (input: {
      trigger: string
      targetTagId: string
      myTagIds?: string[]
      lifeTagIds?: string[]
    }) => {
      const candidate: Candidate = {
        key: candidateKey('positive', input.trigger, input.targetTagId, {}),
        type: 'positive',
        trigger: input.trigger.trim(),
        normalizedTrigger: input.trigger.trim().toLowerCase(),
        tagId: input.targetTagId,
        context: {
          ...(input.myTagIds?.length ? { myTagIds: input.myTagIds } : {}),
          ...(input.lifeTagIds?.length ? { lifeTagIds: input.lifeTagIds } : {}),
          temporalContext: 'present' as const,
        },
        events: [],
        agreeing: 0,
        disagreeing: 0,
        distinctDays: 0,
        weight: 0,
      }

      return promote(candidate)
    },
    [promote],
  )

  const removeRule = useCallback(async (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id))
    await personalRuleRepository.remove(id).catch(() => undefined)
  }, [])

  const removeMemory = useCallback(async (id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id))
    await memoryRepository.remove(id).catch(() => undefined)
  }, [])

  return {
    rules,
    active,
    candidateRules,
    candidates,
    corrections,
    memories,
    loading,
    learn,
    setStatus,
    promote,
    createRule,
    removeRule,
    removeMemory,
    refresh,
  }
}

/** 저장된 규칙에서 후보 열쇠를 되만든다 */
const keyOf = (rule: PersonalRule) =>
  candidateKey(rule.type, rule.trigger, rule.targetTagId ?? rule.suppressedTagId ?? '', rule.context)

export type LearningStore = ReturnType<typeof useLearning>
