/**
 * Data & Learning — Life OS 가 나에 대해 배운 것.
 *
 * 이 화면은 자랑하는 곳이 아니다. 확인하고 끄는 곳이다.
 * 그래서 XP 도 레벨도 진행 막대도 없다 (계획서 33).
 * "8개를 배웠어요!" 대신 "이렇게 알아듣고 있어요, 틀린 건 꺼 주세요" 에 가깝게 뒀다.
 */
import { useMemo, useState } from 'react'
import type { Candidate, PersonalRule, RuleStatus } from '@/lib/os2/learning'
import { STATUS_LABEL, TIER_LABEL, judge, tierOf } from '@/lib/os2/learning'
import type { LearningStore } from '@/hooks/useLearning'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { displayNameOf, getTag } from '@/lib/os2/taxonomy'
import { icons } from '@/lib/pixelAssets'
import { haptic } from '@/hooks/useHaptic'
import { cn } from '@/lib/cn'

interface Props {
  store: LearningStore
  onClose: () => void
}

export function LearningPage({ store, onClose }: Props) {
  const [openRule, setOpenRule] = useState<string | null>(null)
  const [showCandidates, setShowCandidates] = useState(false)
  const [showMemories, setShowMemories] = useState(false)

  const learned = useMemo(
    () => store.rules.filter((r) => r.status !== 'deprecated'),
    [store.rules],
  )
  const auto = learned.filter((r) => !r.userDefined)
  const mine = learned.filter((r) => r.userDefined)

  /** 아직 못 올라간 후보 — 개수만 조용히 보여 준다 (계획서 34) */
  const waiting = useMemo(
    () => store.candidates.filter((c) => !judge(c).promote && c.agreeing >= 2),
    [store.candidates],
  )

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="돌아가기"
          className="press relative h-8 w-8 rounded-px3 border-[1.5px] border-border bg-ivory font-pixel text-[12px] shadow-hard before:absolute before:-inset-2 before:content-['']"
        >
          ‹
        </button>
        <div className="flex-1">
          <h1 className="font-pixel text-[15px] uppercase leading-none tracking-[0.04em]">
            Data & learning
          </h1>
          <p className="plabel mt-1.5">Life OS 가 배운 것</p>
        </div>
      </header>

      {learned.length === 0 ? (
        <PixelPanel title="아직 배우는 중" icon={icons.log}>
          <p className="text-[13px] leading-relaxed text-inkdim">
            분석 태그를 확인하고 고쳐 줄수록
            <br />
            Life OS 가 자주 쓰시는 표현을 조금씩 알아듣게 돼요.
          </p>
          <p className="mt-2 text-[11.5px] leading-relaxed text-inkfaint">
            지금은 사전에 있는 말만 알아들어요. 서두르지 않아도 괜찮아요.
          </p>
        </PixelPanel>
      ) : (
        <>
          {auto.length > 0 && (
            <PixelPanel title="배운 규칙" icon={icons.log} right={<Count n={auto.length} />}>
              <div className="space-y-2">
                {auto.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    open={openRule === rule.id}
                    onToggle={() => {
                      haptic()
                      setOpenRule((v) => (v === rule.id ? null : rule.id))
                    }}
                    onStatus={(status) => void store.setStatus(rule.id, status)}
                    onRemove={() => void store.removeRule(rule.id)}
                  />
                ))}
              </div>
            </PixelPanel>
          )}

          {mine.length > 0 && (
            <PixelPanel title="내가 알려준 것" icon={icons.mood} right={<Count n={mine.length} />}>
              <div className="space-y-2">
                {mine.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    open={openRule === rule.id}
                    onToggle={() => {
                      haptic()
                      setOpenRule((v) => (v === rule.id ? null : rule.id))
                    }}
                    onStatus={(status) => void store.setStatus(rule.id, status)}
                    onRemove={() => void store.removeRule(rule.id)}
                  />
                ))}
              </div>
            </PixelPanel>
          )}
        </>
      )}

      {waiting.length > 0 && (
        <div className="rounded-px4 border-[1.5px] border-border bg-ivory">
          <button
            type="button"
            onClick={() => {
              haptic()
              setShowCandidates((v) => !v)
            }}
            aria-expanded={showCandidates}
            className="press flex min-h-[44px] w-full items-center gap-2 px-3.5 py-3 text-left"
          >
            <span className="ptitle flex-1 normal-case">학습 중인 표현 {waiting.length}개</span>
            <span aria-hidden className="font-pixel text-[13px] text-inkfaint">
              {showCandidates ? '⌄' : '›'}
            </span>
          </button>

          {showCandidates && (
            <div className="space-y-2 border-t border-dashed border-border px-3.5 py-3">
              <p className="text-[11.5px] leading-relaxed text-inkfaint">
                몇 번 더 확인되면 저절로 쓰기 시작해요. 지금 확정해 두셔도 되고요.
              </p>
              {waiting.map((candidate) => (
                <CandidateRow
                  key={candidate.key}
                  candidate={candidate}
                  onPromote={() => {
                    haptic()
                    void store.promote(candidate)
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {store.memories.length > 0 && (
        <div className="rounded-px4 border-[1.5px] border-border bg-ivory">
          <button
            type="button"
            onClick={() => {
              haptic()
              setShowMemories((v) => !v)
            }}
            aria-expanded={showMemories}
            className="press flex min-h-[44px] w-full items-center gap-2 px-3.5 py-3 text-left"
          >
            <span className="ptitle flex-1 normal-case">
              세부 학습 기록 {store.memories.length}개
            </span>
            <span aria-hidden className="font-pixel text-[13px] text-inkfaint">
              {showMemories ? '⌄' : '›'}
            </span>
          </button>

          {showMemories && (
            <div className="space-y-1.5 border-t border-dashed border-border px-3.5 py-3">
              <p className="text-[11.5px] leading-relaxed text-inkfaint">
                똑같은 문장이 다시 나오면 고쳐 두신 대로 붙여요.
              </p>
              {store.memories.slice(0, 30).map((memory) => (
                <div
                  key={memory.id}
                  className="flex items-start gap-2 rounded-px3 border-[1.5px] border-border bg-cream px-2.5 py-2"
                >
                  <span className="flex-1 text-[12px] leading-relaxed text-inkdim">
                    “{memory.normalizedText.slice(0, 40)}
                    {memory.normalizedText.length > 40 ? '…' : ''}”
                    <span className="mt-1 block text-[11px] text-inkfaint">
                      {memory.addTagIds.map(displayNameOf).join(', ')}
                      {memory.suppressTagIds.length > 0 && (
                        <span> · 빼기 {memory.suppressTagIds.map(displayNameOf).join(', ')}</span>
                      )}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void store.removeMemory(memory.id)}
                    aria-label="이 기억 지우기"
                    className="press min-h-[44px] shrink-0 px-2 font-pixel text-[10px] uppercase text-inkfaint"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="px-1 pb-2 text-[11px] leading-relaxed text-inkfaint">
        여기 있는 건 전부 직접 고쳐 주신 것에서 나왔어요. Life OS 가 혼자 지어낸 건 없어요.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────

const Count = ({ n }: { n: number }) => (
  <span className="font-pixel text-[9.5px] uppercase text-inkfaint">{n}</span>
)

function RuleCard({
  rule,
  open,
  onToggle,
  onStatus,
  onRemove,
}: {
  rule: PersonalRule
  open: boolean
  onToggle: () => void
  onStatus: (status: RuleStatus) => void
  onRemove: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const tier = tierOf(rule)
  const tagId = rule.targetTagId ?? rule.suppressedTagId ?? ''
  const paused = rule.status === 'paused'

  return (
    <div
      className={cn(
        'rounded-px3 border-[1.5px]',
        paused ? 'border-border bg-cream' : 'border-skydeep bg-skysoft',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="press flex min-h-[44px] w-full items-start gap-2 px-2.5 py-2 text-left"
      >
        <span className="flex-1">
          <span className={cn('block text-[13px]', paused && 'text-inkfaint')}>
            “{rule.trigger}”
            <span className="text-inkdim"> → </span>
            <b>{displayNameOf(tagId)}</b>
            {rule.type === 'suppress' && <span className="text-inkdim"> 빼기</span>}
          </span>
          <span className="mt-1 block text-[11px] text-inkfaint">
            {contextLabel(rule)} · {TIER_LABEL[tier]}
            {paused && ` · ${STATUS_LABEL.paused}`}
          </span>
        </span>
        <span aria-hidden className="font-pixel text-[12px] text-inkfaint">
          {open ? '⌄' : '›'}
        </span>
      </button>

      {open && (
        <div className="border-t border-dashed border-border px-2.5 py-2">
          <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11.5px] text-inkdim">
            <dt className="text-inkfaint">확인</dt>
            <dd>
              {rule.correctionCount}회 · {rule.distinctDays}일에 걸쳐
            </dd>
            {rule.conflictCount > 0 && (
              <>
                <dt className="text-inkfaint">반대</dt>
                <dd>{rule.conflictCount}회</dd>
              </>
            )}
            <dt className="text-inkfaint">마지막</dt>
            <dd>{shortDate(rule.lastMatchedAt ?? rule.lastCorrectedAt ?? rule.updatedAt)}</dd>
            <dt className="text-inkfaint">상태</dt>
            <dd>{STATUS_LABEL[rule.status]}</dd>
          </dl>

          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => {
                haptic()
                onStatus(paused ? 'active' : 'paused')
              }}
              className="press min-h-[44px] flex-1 rounded-px3 border-[1.5px] border-border bg-ivory font-pixel text-[9.5px] uppercase text-inkdim"
            >
              {paused ? '다시 쓰기' : '잠시 끄기'}
            </button>
            <button
              type="button"
              onClick={() => {
                haptic()
                setConfirming(true)
              }}
              className="press min-h-[44px] rounded-px3 border-[1.5px] border-border bg-ivory px-3 font-pixel text-[9.5px] uppercase text-inkfaint"
            >
              지우기
            </button>
          </div>

          {confirming && (
            <div className="mt-2 rounded-px3 border-[1.5px] border-pinkdeep bg-pinksoft px-2.5 py-2">
              <p className="text-[12px] text-ink">이 규칙을 아주 지울까요?</p>
              <div className="mt-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="press min-h-[44px] flex-1 rounded-px3 border-[1.5px] border-border bg-ivory font-pixel text-[9.5px] uppercase text-inkdim"
                >
                  그냥 두기
                </button>
                <button
                  type="button"
                  onClick={onRemove}
                  className="press min-h-[44px] flex-1 rounded-px3 border-[1.5px] border-pinkdeep bg-pink font-pixel text-[9.5px] uppercase text-white"
                >
                  지우기
                </button>
              </div>
            </div>
          )}

          <details className="mt-2">
            <summary className="cursor-pointer list-none py-1 text-[11px] text-inkfaint underline decoration-dotted">
              자세히
            </summary>
            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 font-pixel text-[9px] text-inkfaint">
              <dt>TYPE</dt>
              <dd>{rule.type}</dd>
              <dt>TAG</dt>
              <dd className="break-all">{tagId}</dd>
              <dt>SCORE</dt>
              <dd>{rule.confidence.toFixed(2)}</dd>
              <dt>SPEC</dt>
              <dd>{rule.specificity}</dd>
              <dt>VER</dt>
              <dd>
                tax {rule.taxonomyVersion} / rule {rule.ruleVersion}
              </dd>
            </dl>
          </details>
        </div>
      )}
    </div>
  )
}

function CandidateRow({
  candidate,
  onPromote,
}: {
  candidate: Candidate
  onPromote: () => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-px3 border-[1.5px] border-dashed border-border bg-cream px-2.5 py-2">
      <span className="flex-1 text-[12.5px] text-inkdim">
        “{candidate.trigger}” → {displayNameOf(candidate.tagId)}?
        <span className="mt-0.5 block text-[11px] text-inkfaint">
          {candidate.agreeing}회 확인
        </span>
      </span>
      <button
        type="button"
        onClick={onPromote}
        className="press min-h-[44px] shrink-0 rounded-px3 border-[1.5px] border-mintdeep bg-mint px-2.5 font-pixel text-[9px] uppercase text-ink"
      >
        이렇게 기억
      </button>
    </div>
  )
}

/** 문맥을 사람 말로 — 영문 태그 id 를 그대로 내보내지 않는다 */
function contextLabel(rule: PersonalRule): string {
  const lifeTags = rule.context.lifeTagIds ?? []
  if (lifeTags.length) {
    const names = lifeTags.map((id) => {
      const tag = getTag(id)
      return tag ? tag.displayName : id
    })
    return `${names.join(' · ')} 문맥에서`
  }
  if (rule.context.myTagIds?.length) return '내 태그가 달린 기록에서'
  return '어디서나'
}

const shortDate = (iso: string | null) => {
  if (!iso) return '-'
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return '-'
  const days = Math.floor((Date.now() - at.getTime()) / 86_400_000)
  if (days <= 0) return '오늘'
  if (days === 1) return '어제'
  if (days < 30) return `${days}일 전`
  return `${Math.floor(days / 30)}달 전`
}

/** ME 화면에 들어갈 한 줄 요약 */
export function LearningPreview({
  store,
  onOpen,
}: {
  store: LearningStore
  onOpen: () => void
}) {
  const active = store.rules.filter((r) => r.status === 'active').length
  const learning = store.candidates.filter((c) => !judge(c).promote && c.agreeing >= 2).length

  return (
    <button
      type="button"
      onClick={() => {
        haptic()
        onOpen()
      }}
      className="press flex min-h-[44px] w-full items-center gap-2 text-left"
    >
      <span className="flex-1">
        <span className="ptitle block normal-case">Life OS 가 배운 것</span>
        <span className="mt-1 block text-[12px] text-inkdim">
          {active > 0
            ? `내 표현 ${active}개를 알아들어요`
            : '아직 배우는 중이에요'}
          {learning > 0 && <span className="text-inkfaint"> · 학습 중 {learning}</span>}
        </span>
      </span>
      <span aria-hidden className="font-pixel text-[13px] text-inkfaint">
        ›
      </span>
    </button>
  )
}
