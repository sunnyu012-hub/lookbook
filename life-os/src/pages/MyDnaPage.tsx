/**
 * MY DNA — 지금까지 관찰된 나의 패턴.
 *
 * 이 화면이 하지 않는 것들:
 *   진행 막대 · "3개 더 남았어요" · XP · streak · 해금 조건 숫자
 *   그리고 "당신은 저녁형 인간입니다" 같은 규정.
 *
 * 잠긴 칸은 ??? 로만 보인다. 조건을 보여 주는 순간
 * 사용자는 자기를 알려고가 아니라 칸을 열려고 기록하게 된다.
 */
import { Fragment, useMemo, useState } from 'react'
import type { Checkin } from '@/types'
import type { MyTag, QuickLog } from '@/lib/os2/types'
import { useDna } from '@/hooks/useDna'
import {
  FAMILY_LABEL,
  PERCEPTION_LABEL,
  STATE_ICON,
  STATE_LABEL,
  STATE_SENTENCE,
  getDna,
  previewLocked,
  type FoundCard,
  type UserPerception,
} from '@/lib/os2/dna'
import { RARE_BY_ID } from '@/lib/os2/dna/registry/rare'
import { TITLE_MAX, type PersonalCard } from '@/lib/os2/dna/personal'
import { METRICS, displayNameOf } from '@/lib/os2/dna/labels'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { icons } from '@/lib/pixelAssets'
import { haptic } from '@/hooks/useHaptic'
import { cn } from '@/lib/cn'

interface Props {
  logs: QuickLog[]
  checkins: Checkin[]
  myTags: MyTag[]
  onClose: () => void
}

export function MyDnaPage({ logs, checkins, myTags, onClose }: Props) {
  const dna = useDna({ logs, checkins, myTags })
  const [openCard, setOpenCard] = useState<string | null>(null)
  const [openFamily, setOpenFamily] = useState<string | null>(null)

  const { view } = dna
  const empty = view.foundCount === 0

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
            My DNA
          </h1>
          <p className="plabel mt-1.5">
            {view.foundCount} / {view.totalCount} 발견
          </p>
        </div>
      </header>

      {empty ? (
        <PixelPanel title="아직 알아가는 중" icon={icons.mood}>
          <p className="text-[13px] leading-relaxed text-inkdim">
            Life OS가 기록을 조금씩 읽고 있어요.
            <br />
            시간이 지나면 여기에 하나씩 나타날 거예요.
          </p>
          <p className="mt-2 text-[11.5px] leading-relaxed text-inkfaint">
            무엇이 열릴지는 미리 알려 드리지 않아요. 기록을 위해 기록하게 되니까요.
          </p>
        </PixelPanel>
      ) : (
        <p className="px-1 text-[12.5px] leading-relaxed text-inkdim">
          지금까지의 기록에서 관찰된 것들이에요. 사람은 바뀌니까, 여기 있는 것도 바뀔 수 있어요.
        </p>
      )}

      {/* 발견된 Rare — 없으면 영역째 없다 */}
      {view.rare.length > 0 && (
        <PixelPanel title="드물게 만나는 것" icon={icons.xp} sparkle>
          <div className="space-y-2">
            {view.rare.map((card) => (
              <DnaCard
                key={card.defId}
                card={card}
                rare
                open={openCard === card.defId}
                onToggle={() => {
                  haptic()
                  setOpenCard((v) => (v === card.defId ? null : card.defId))
                }}
                onPerception={(p) => void dna.setPerception(card.defId, p)}
              />
            ))}
          </div>
        </PixelPanel>
      )}

      {/* 나만의 발견 — 48개와 따로 센다 */}
      {(dna.personal.cards.length > 0 || dna.personal.hidden.length > 0) && (
        <PixelPanel title="나만의 발견" icon={icons.log} sparkle>
          <p className="mb-2 px-0.5 text-[11.5px] leading-relaxed text-inkfaint">
            48개 목록에는 없지만, 남긴 기록에서만 나온 조합이에요.
          </p>
          <div className="space-y-2">
            {dna.personal.cards.map((card) => (
              <PersonalDnaCard
                key={card.fingerprint}
                card={card}
                open={openCard === card.fingerprint}
                onToggle={() => {
                  haptic()
                  setOpenCard((v) => (v === card.fingerprint ? null : card.fingerprint))
                }}
                onPatch={(patch) => void dna.patchPersonal(card.fingerprint, patch)}
              />
            ))}
          </div>

          {/* 접어 둔 것은 지운 게 아니다. 언제든 다시 펼 수 있다 */}
          {dna.personal.hidden.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {dna.personal.hidden.map((card) => (
                <button
                  key={card.fingerprint}
                  type="button"
                  onClick={() => {
                    haptic()
                    void dna.patchPersonal(card.fingerprint, { hidden: false })
                  }}
                  className="press flex min-h-[44px] w-full items-center gap-2 rounded-px3 border-[1.5px] border-dashed border-border bg-ivory px-2.5 text-left text-[12px] text-inkfaint"
                >
                  <span className="flex-1 truncate">{card.title}</span>
                  <span className="font-pixel text-[9px] uppercase">다시 펴기</span>
                </button>
              ))}
            </div>
          )}
        </PixelPanel>
      )}

      {/* 달라지고 있는 것 */}
      {dna.shifts.length > 0 && (
        <PixelPanel title="달라지는 중" icon={icons.log}>
          {dna.shifts.slice(0, 3).map((shift) => (
            <div
              key={`${shift.fromDefId}>${shift.toDefId}`}
              className="rounded-px3 border-[1.5px] border-border bg-cream px-2.5 py-2"
            >
              <p className="text-[12.5px] leading-relaxed text-inkdim">{shift.summary}</p>
              <p className="mt-1.5 text-[11.5px] text-inkfaint">
                {nameOf(shift.fromDefId)} → {nameOf(shift.toDefId)}
              </p>
            </div>
          ))}
        </PixelPanel>
      )}

      {/* Family 별로 */}
      {view.families.map((family) => {
        const expanded = openFamily === family.family
        const locked = expanded ? family.lockedBasic : previewLocked(family)

        return (
          <PixelPanel
            key={family.family}
            title={FAMILY_LABEL[family.family]}
            icon={icons.mood}
            right={
              <span className="font-pixel text-[9px] uppercase text-inkfaint">
                {family.found.length}
                {family.lockedBasic.length + family.hiddenRemaining > 0 && (
                  <span> · +{family.lockedBasic.length + family.hiddenRemaining}</span>
                )}
              </span>
            }
          >
            <div className="space-y-2">
              {family.found.map((card) => (
                <DnaCard
                  key={card.defId}
                  card={card}
                  open={openCard === card.defId}
                  onToggle={() => {
                    haptic()
                    setOpenCard((v) => (v === card.defId ? null : card.defId))
                  }}
                  onPerception={(p) => void dna.setPerception(card.defId, p)}
                />
              ))}

              {locked.map((card) => (
                <LockedDnaCard key={card.defId} icon={card.icon} teaser={card.teaser} />
              ))}

              {/* 이름도 개수도 아닌, 있다는 사실만 */}
              {family.hiddenRemaining > 0 && (
                <p className="px-1 pt-0.5 text-[11.5px] text-inkfaint">
                  + 아직 알려지지 않은 DNA {family.hiddenRemaining}개
                </p>
              )}

              {family.lockedBasic.length > locked.length && (
                <button
                  type="button"
                  onClick={() => {
                    haptic()
                    setOpenFamily(family.family)
                  }}
                  className="press min-h-[44px] w-full rounded-px3 border-[1.5px] border-dashed border-border bg-ivory font-pixel text-[9.5px] uppercase text-inkfaint"
                >
                  더 보기
                </button>
              )}
            </div>
          </PixelPanel>
        )
      })}

      <p className="px-1 pb-2 text-[11px] leading-relaxed text-inkfaint">
        여기 있는 건 전부 남긴 기록에서 센 것이에요. 무엇이 무엇을 만들었는지는 알 수 없어요.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────

const nameOf = (defId: string) =>
  getDna(defId)?.displayName ?? RARE_BY_ID.get(defId)?.displayName ?? defId

function DnaCard({
  card,
  rare,
  open,
  onToggle,
  onPerception,
}: {
  card: FoundCard
  rare?: boolean
  open: boolean
  onToggle: () => void
  onPerception: (p: UserPerception | null) => void
}) {
  const [why, setWhy] = useState(false)
  const changing = card.state === 'CHANGING'

  return (
    <div
      className={cn(
        'rounded-px3 border-[1.5px]',
        rare ? 'border-butterdeep bg-buttersoft' : changing ? 'border-border bg-cream' : 'border-mintdeep bg-mintsoft',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="press flex min-h-[44px] w-full items-start gap-2.5 px-2.5 py-2.5 text-left"
      >
        <span aria-hidden className="text-[20px] leading-none">
          {card.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-1.5">
            <b className="text-[14px]">{card.displayName}</b>
            <span aria-label={STATE_LABEL[card.state]} className="text-[11px]">
              {STATE_ICON[card.state]}
            </span>
            {card.userPerception === 'agree' && (
              <span className="font-pixel text-[8.5px] uppercase text-mintdeep">
                ✓ 나 같아요
              </span>
            )}
          </span>
          <span className="mt-1 block text-[12.5px] leading-relaxed text-inkdim">
            {card.description}
          </span>
          {card.children && card.children.length > 0 && (
            <span className="mt-1.5 flex flex-wrap gap-1">
              {card.children.slice(0, 4).map((child) => (
                <span
                  key={child}
                  className="rounded-full border-[1.5px] border-border bg-ivory px-2 py-0.5 text-[11px] text-inkdim"
                >
                  {child}
                </span>
              ))}
            </span>
          )}
        </span>
        <span aria-hidden className="font-pixel text-[12px] text-inkfaint">
          {open ? '⌄' : '›'}
        </span>
      </button>

      {open && (
        <div className="border-t border-dashed border-border px-2.5 py-2.5">
          <p className="text-[12.5px] leading-relaxed text-inkdim">
            {STATE_SENTENCE[card.state]}
          </p>

          {card.evidence && (
            <p className="mt-1.5 text-[11.5px] text-inkfaint">
              {card.evidence.periodFrom.slice(5)} ~ {card.evidence.periodTo.slice(5)} ·
              기록 {card.evidence.sampleCount}개 · {card.evidence.distinctDays}일
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              haptic()
              setWhy((v) => !v)
            }}
            aria-expanded={why}
            className="press mt-2 min-h-[44px] w-full text-left text-[11.5px] text-skydeep underline decoration-dotted"
          >
            {why ? '근거 숨기기' : '왜 이렇게 분석했어요?'}
          </button>

          {why && card.evidence && <Evidence evidence={card.evidence} />}

          <div className="mt-2">
            <p className="plabel mb-1.5">어떠세요?</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(PERCEPTION_LABEL) as UserPerception[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    haptic()
                    onPerception(card.userPerception === p ? null : p)
                  }}
                  aria-pressed={card.userPerception === p}
                  className={cn(
                    'press min-h-[44px] rounded-px3 border-[1.5px] px-2.5 text-[12px]',
                    card.userPerception === p
                      ? 'border-pinkdeep bg-pinksoft text-pinkdeep'
                      : 'border-border bg-ivory text-inkdim',
                  )}
                >
                  {PERCEPTION_LABEL[p]}
                </button>
              ))}
            </div>
            {card.userPerception === 'disagree' && (
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-inkfaint">
                기록에서는 이렇게 보였지만, 다르게 느끼신다는 것도 같이 남겨 둘게요.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Evidence({ evidence }: { evidence: NonNullable<FoundCard['evidence']> }) {
  const metric = METRICS[evidence.metric]
  const fmt = (v: number) => metric?.format(v) ?? v.toFixed(1)

  return (
    <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11.5px] text-inkfaint">
      <dt>기간</dt>
      <dd className="text-inkdim">
        {evidence.periodFrom} ~ {evidence.periodTo} ({evidence.durationDays}일)
      </dd>
      <dt>{metric?.label ?? evidence.metric}</dt>
      <dd className="text-inkdim">
        {fmt(evidence.observed)} · 비교 {fmt(evidence.baseline)}
      </dd>
      <dt>차이</dt>
      <dd className="text-inkdim">
        {evidence.effectSize > 0 ? '+' : ''}
        {evidence.effectSize.toFixed(2)}
      </dd>
      {evidence.adjustedDifference !== undefined && (
        <>
          <dt>같은 조건끼리</dt>
          <dd className="text-inkdim">
            {evidence.adjustedDifference > 0 ? '+' : ''}
            {evidence.adjustedDifference.toFixed(2)}
            {evidence.adjustedOn && (
              <span className="text-inkfaint"> ({evidence.adjustedOn})</span>
            )}
          </dd>
        </>
      )}
      <dt>표본</dt>
      <dd className="text-inkdim">
        기록 {evidence.sampleCount}개 · 비교 {evidence.baselineSampleCount}개 ·{' '}
        {evidence.distinctDays}일
      </dd>
      <dt>중앙값</dt>
      <dd className="text-inkdim">{fmt(evidence.median)}</dd>
      <dt>되풀이</dt>
      <dd className="text-inkdim">{Math.round(evidence.consistency * 100)}%</dd>
      {evidence.relatedTags.length > 0 && (
        <>
          <dt>관련</dt>
          <dd className="text-inkdim">
            {evidence.relatedTags.slice(0, 5).map(displayNameOf).join(', ')}
          </dd>
        </>
      )}
      <dt>판</dt>
      <dd className="font-pixel text-[9px]">
        a{evidence.analysisVersion} t{evidence.taxonomyVersion} r{evidence.ruleVersion} d
        {evidence.discoveryRuleVersion}
      </dd>
    </dl>
  )
}

/**
 * 나만의 발견 한 장.
 *
 * 48개 카드와 다른 점 셋.
 *   · 이름 밑에 실제 조각을 언제나 같이 보여 준다 (이름은 근거가 아니다)
 *   · 이름을 AI 가 지었으면 그렇다고 밝힌다
 *   · 사용자가 이름을 고칠 수 있고, 접어 둘 수 있다
 */
function PersonalDnaCard({
  card,
  open,
  onToggle,
  onPatch,
}: {
  card: PersonalCard
  open: boolean
  onToggle: () => void
  onPatch: (patch: { userTitle?: string; hidden?: boolean; userPerception?: UserPerception }) => void
}) {
  const [why, setWhy] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(card.userTitle ?? card.title)

  return (
    <div className="rounded-px3 border-[1.5px] border-skydeep bg-skysoft">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="press flex min-h-[44px] w-full items-start gap-2.5 px-2.5 py-2.5 text-left"
      >
        <span aria-hidden className="text-[20px] leading-none">
          ✨
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-1.5">
            <b className="text-[14px]">{card.title}</b>
            <span aria-label={STATE_LABEL[card.state]} className="text-[11px]">
              {STATE_ICON[card.state]}
            </span>
          </span>
          {/* 이름 밑에는 언제나 실제 조각이 붙는다 */}
          <span className="mt-1.5 flex flex-wrap gap-1">
            {card.contexts.map((context) => (
              <span
                key={`${context.kind}:${context.key}`}
                className="rounded-full border-[1.5px] border-border bg-ivory px-2 py-0.5 text-[11px] text-inkdim"
              >
                {context.label}
              </span>
            ))}
          </span>
          <span className="mt-1.5 block text-[12.5px] leading-relaxed text-inkdim">
            {card.description}
          </span>
        </span>
        <span aria-hidden className="font-pixel text-[12px] text-inkfaint">
          {open ? '⌄' : '›'}
        </span>
      </button>

      {open && (
        <div className="border-t border-dashed border-border px-2.5 py-2.5">
          <p className="text-[12.5px] leading-relaxed text-inkdim">
            {STATE_SENTENCE[card.state]}
          </p>

          {card.aiNamed && (
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-inkfaint">
              이름은 AI가 지었어요. 숫자와 근거는 앱이 직접 센 것이에요.
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              haptic()
              setWhy((v) => !v)
            }}
            aria-expanded={why}
            className="press mt-2 min-h-[44px] w-full text-left text-[11.5px] text-skydeep underline decoration-dotted"
          >
            {why ? '근거 숨기기' : '왜 이렇게 분석했어요?'}
          </button>

          {why && (
            <div className="mt-1.5">
              <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11.5px] text-inkfaint">
                <dt>겹쳤을 때</dt>
                <dd className="text-inkdim">
                  {card.combinationEffect > 0 ? '+' : ''}
                  {card.combinationEffect.toFixed(2)}
                </dd>
                {/* 조각 하나씩만 봤을 때와 나란히 둔다 — 조합이 무엇을 더했는지 */}
                {card.componentEffects.map((component) => (
                  <Fragment key={component.label}>
                    <dt>{component.label}만</dt>
                    <dd className="text-inkdim">
                      {component.effect > 0 ? '+' : ''}
                      {component.effect.toFixed(2)}
                    </dd>
                  </Fragment>
                ))}
              </dl>
              {card.evidence && <Evidence evidence={card.evidence} />}
            </div>
          )}

          {/* 이름 고치기 */}
          {renaming ? (
            <div className="mt-2 flex gap-1.5">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, TITLE_MAX))}
                aria-label="이 발견의 이름"
                maxLength={TITLE_MAX}
                className="min-h-[44px] min-w-0 flex-1 rounded-px3 border-[1.5px] border-border bg-ivory px-2.5 text-[13px]"
              />
              <button
                type="button"
                onClick={() => {
                  haptic()
                  onPatch({ userTitle: draft.trim() || undefined })
                  setRenaming(false)
                }}
                className="press min-h-[44px] rounded-px3 border-[1.5px] border-mintdeep bg-mintsoft px-2.5 font-pixel text-[9.5px] uppercase text-mintdeep"
              >
                저장
              </button>
            </div>
          ) : (
            <div className="mt-2 flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  haptic()
                  setDraft(card.userTitle ?? card.title)
                  setRenaming(true)
                }}
                className="press min-h-[44px] flex-1 rounded-px3 border-[1.5px] border-border bg-ivory text-[12px] text-inkdim"
              >
                이름 바꾸기
              </button>
              <button
                type="button"
                onClick={() => {
                  haptic()
                  onPatch({ hidden: true })
                }}
                className="press min-h-[44px] flex-1 rounded-px3 border-[1.5px] border-border bg-ivory text-[12px] text-inkdim"
              >
                접어 두기
              </button>
            </div>
          )}

          <div className="mt-2">
            <p className="plabel mb-1.5">어떠세요?</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(PERCEPTION_LABEL) as UserPerception[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    haptic()
                    onPatch({ userPerception: card.userPerception === p ? undefined : p })
                  }}
                  aria-pressed={card.userPerception === p}
                  className={cn(
                    'press min-h-[44px] rounded-px3 border-[1.5px] px-2.5 text-[12px]',
                    card.userPerception === p
                      ? 'border-pinkdeep bg-pinksoft text-pinkdeep'
                      : 'border-border bg-ivory text-inkdim',
                  )}
                >
                  {PERCEPTION_LABEL[p]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** 아직인 BASIC — 이름도 조건도 없다 */
function LockedDnaCard({ icon, teaser }: { icon: string; teaser: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-px3 border-[1.5px] border-dashed border-border bg-ivory px-2.5 py-2.5">
      <span aria-hidden className="text-[18px] leading-none opacity-40">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-pixel text-[13px] text-inkfaint">???</span>
        <span className="mt-1 block text-[12px] leading-relaxed text-inkfaint">{teaser}</span>
      </span>
    </div>
  )
}

/** LIFE 화면에 들어갈 한 줄 */
export function MyDnaPreview({
  logs,
  checkins,
  myTags,
  onOpen,
}: {
  logs: QuickLog[]
  checkins: Checkin[]
  myTags: MyTag[]
  onOpen: () => void
}) {
  const dna = useDna({ logs, checkins, myTags })
  const found = dna.view.foundCount

  const personal = dna.personal.cards.length

  const line = useMemo(() => {
    // 나만의 발견은 48 안에 세지 않는다. 세면 48이 거짓말이 된다
    const mine = personal > 0 ? ` · 나만의 발견 ${personal}개` : ''
    if (found === 0) return `Life OS가 기록을 알아가는 중이에요${mine}`
    return `${found} / ${dna.view.totalCount} 발견${mine}`
  }, [found, personal, dna.view.totalCount])

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
        <span className="ptitle block normal-case">My DNA</span>
        <span className="mt-1 block text-[12px] text-inkdim">{line}</span>
      </span>
      <span aria-hidden className="font-pixel text-[13px] text-inkfaint">
        ›
      </span>
    </button>
  )
}
