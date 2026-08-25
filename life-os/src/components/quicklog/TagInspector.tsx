/**
 * 분석 태그 살펴보기.
 *
 * 이 태그들은 시스템이 붙인 것이다. 내가 만든 태그(My Tag)와 섞이면 안 된다 —
 * 그래서 색도 모양도 다르게 뒀다. My Tag 는 분홍 동그라미, 분석 태그는 하늘색 네모다.
 *
 * 기본은 접혀 있다. "분석 태그 8개" 한 줄만 보이고, 궁금할 때만 연다.
 * 기록을 남길 때마다 태그를 검사하게 만들면 그건 숙제가 된다.
 *
 * 영문 key 는 평소에 안 보인다. "왜 붙었어요?" 를 눌렀을 때만 보여 준다.
 */
import { useMemo, useState } from 'react'
import type { AppliedLifeTag } from '@/lib/os2/types'
import { CATEGORY_BY_ID } from '@/lib/os2/categories'
import { TAG_CATEGORIES } from '@/lib/os2/categories'
import { getTag, searchTags } from '@/lib/os2/taxonomy'
import {
  activeTags,
  addUserTag,
  clearDecision,
  rejectTag,
  temporalLabel,
  verifyTag,
} from '@/lib/os2/tagging'
import { haptic } from '@/hooks/useHaptic'
import { cn } from '@/lib/cn'

interface Props {
  tags: AppliedLifeTag[]
  onChange: (tags: AppliedLifeTag[]) => void
}

const ORDER = new Map(TAG_CATEGORIES.map((c, i) => [c.id, i]))

export function TagInspector({ tags, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [picking, setPicking] = useState(false)
  const [detail, setDetail] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  /** 한 번이라도 고쳤으면 가벼운 안내 한 줄. "학습 완료!" 같은 건 하지 않는다 */
  const [touched, setTouched] = useState(false)

  const shown = activeTags(tags)
  const hidden = tags.length - shown.length

  const grouped = useMemo(() => {
    const map = new Map<string, AppliedLifeTag[]>()
    for (const tag of tags) {
      const categoryId = getTag(tag.tagId)?.categoryId ?? 'etc'
      map.set(categoryId, [...(map.get(categoryId) ?? []), tag])
    }
    return [...map].sort(
      ([a], [b]) => (ORDER.get(a) ?? 99) - (ORDER.get(b) ?? 99),
    )
  }, [tags])

  if (!tags.length && !picking) {
    return (
      <button
        type="button"
        onClick={() => {
          haptic()
          setOpen(true)
          setPicking(true)
        }}
        className="press flex w-full items-center gap-2 rounded-px4 border-[1.5px] border-dashed border-border bg-ivory px-3.5 py-3 text-left"
      >
        <span className="flex-1 text-[13px] text-inkfaint">붙은 분석 태그가 없어요</span>
        <span className="font-pixel text-[9.5px] uppercase text-skydeep">+ 직접 고르기</span>
      </button>
    )
  }

  return (
    <div className="rounded-px4 border-[1.5px] border-border bg-ivory">
      <button
        type="button"
        onClick={() => {
          haptic()
          setOpen((v) => !v)
        }}
        aria-expanded={open}
        className="press flex min-h-[44px] w-full items-center gap-2 px-3.5 py-3 text-left"
      >
        <span className="ptitle flex-1 normal-case">
          분석 태그 {shown.length}개
          {hidden > 0 && <span className="text-inkfaint"> · 제외 {hidden}</span>}
        </span>
        <span aria-hidden className="font-pixel text-[13px] text-inkfaint">
          {open ? '⌄' : '›'}
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-dashed border-border px-3.5 py-3">
          <p className="text-[11.5px] leading-relaxed text-inkfaint">
            글에 나온 말을 사전과 맞춰서 붙였어요. 틀린 건 빼 주세요.
          </p>

          {grouped.map(([categoryId, list]) => (
            <div key={categoryId}>
              <p className="plabel mb-1.5">{CATEGORY_BY_ID[categoryId]?.ko ?? '그 밖'}</p>
              <div className="flex flex-wrap gap-1.5">
                {list.map((tag) => (
                  <LifeTagChip
                    key={tag.tagId}
                    tag={tag}
                    active={selected === tag.tagId}
                    onClick={() => {
                      haptic()
                      setSelected((v) => (v === tag.tagId ? null : tag.tagId))
                    }}
                  />
                ))}
              </div>
            </div>
          ))}

          {selected && (
            <TagActions
              tag={tags.find((t) => t.tagId === selected)!}
              detail={detail}
              onDetail={() => setDetail((v) => !v)}
              onVerify={() => {
                haptic()
                onChange(verifyTag(tags, selected))
                setSelected(null)
                setTouched(true)
              }}
              onReject={() => {
                haptic()
                onChange(rejectTag(tags, selected))
                setSelected(null)
                setTouched(true)
              }}
              onUndo={() => {
                haptic()
                onChange(clearDecision(tags, selected))
              }}
            />
          )}

          {touched && (
            <p className="text-[11.5px] leading-relaxed text-inkfaint">
              이 수정은 다음 분석에도 참고할게요.
            </p>
          )}

          {picking ? (
            <TagSearch
              onPick={(tagId) => {
                haptic()
                onChange(addUserTag(tags, tagId))
                setPicking(false)
                setTouched(true)
              }}
              onCancel={() => setPicking(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                haptic()
                setPicking(true)
              }}
              className="press min-h-[44px] w-full rounded-px3 border-[1.5px] border-dashed border-skydeep bg-skysoft font-pixel text-[9.5px] uppercase text-skydeep"
            >
              + 다른 태그 추가
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────

function LifeTagChip({
  tag,
  active,
  onClick,
}: {
  tag: AppliedLifeTag
  active: boolean
  onClick: () => void
}) {
  const def = getTag(tag.tagId)
  const when = temporalLabel(tag.temporalContext)

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        // My Tag 는 동그라미다. 이건 네모로 둬서 한눈에 구분되게 한다
        'press flex min-h-[44px] shrink-0 items-center gap-1 rounded-px3 border-[1.5px] px-3 py-2 text-[12px]',
        tag.userRejected
          ? 'border-border bg-cream text-inkfaint line-through'
          : tag.userVerified
            ? 'border-mintdeep bg-mintsoft text-mintdeep'
            : 'border-skydeep bg-skysoft text-skydeep',
        active && 'ring-2 ring-inkfaint/30',
      )}
    >
      {tag.userVerified && !tag.userRejected && <span aria-hidden>✓</span>}
      {tag.source === 'rule' && !tag.userRejected && (
        <span aria-hidden title="내 표현에서 배운 규칙">
          ✎
        </span>
      )}
      <span className="max-w-[12ch] truncate">{def?.displayName ?? tag.tagId}</span>
      {when && <span className="text-[10px] opacity-70">· {when}</span>}
    </button>
  )
}

function TagActions({
  tag,
  detail,
  onDetail,
  onVerify,
  onReject,
  onUndo,
}: {
  tag: AppliedLifeTag
  detail: boolean
  onDetail: () => void
  onVerify: () => void
  onReject: () => void
  onUndo: () => void
}) {
  const def = getTag(tag.tagId)

  return (
    <div className="rounded-px3 border-[1.5px] border-border bg-cream p-2.5">
      <p className="ko mb-2 text-[13px]">
        <b>{def?.displayName ?? tag.tagId}</b>
        {tag.matchedText && (
          <span className="text-inkdim"> — “{tag.matchedText}” 때문에 붙었어요</span>
        )}
        {tag.source === 'rule' && (
          <span className="mt-1 block text-[11.5px] text-skydeep">
            전에 고쳐 주신 걸 보고 배운 거예요.
          </span>
        )}
      </p>

      <div className="flex gap-1.5">
        {tag.userRejected ? (
          <button
            type="button"
            onClick={onUndo}
            className="press min-h-[44px] flex-1 rounded-px3 border-[1.5px] border-border bg-ivory font-pixel text-[9.5px] uppercase text-inkdim"
          >
            되돌리기
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onVerify}
              className="press min-h-[44px] flex-1 rounded-px3 border-[1.5px] border-mintdeep bg-mint font-pixel text-[9.5px] uppercase text-ink"
            >
              맞아요
            </button>
            <button
              type="button"
              onClick={onReject}
              className="press min-h-[44px] flex-1 rounded-px3 border-[1.5px] border-border bg-ivory font-pixel text-[9.5px] uppercase text-inkdim"
            >
              이 태그 제외
            </button>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onDetail}
        aria-expanded={detail}
        className="press mt-2 min-h-[44px] w-full text-left text-[11.5px] text-inkfaint underline decoration-dotted"
      >
        {detail ? '자세히 숨기기' : '왜 붙었는지 자세히'}
      </button>

      {detail && (
        <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 font-pixel text-[9px] text-inkfaint">
          <dt>KEY</dt>
          <dd className="break-all">{tag.tagId}</dd>
          <dt>SOURCE</dt>
          <dd>{tag.source}</dd>
          <dt>SCORE</dt>
          <dd>{tag.confidence.toFixed(2)}</dd>
          {tag.matchedText && (
            <>
              <dt>MATCH</dt>
              <dd className="break-all">{tag.matchedText}</dd>
            </>
          )}
          {tag.ruleId && (
            <>
              <dt>RULE</dt>
              <dd className="break-all">{tag.ruleId}</dd>
            </>
          )}
          <dt>VER</dt>
          <dd>
            tax {tag.taxonomyVersion ?? '-'} / rule {tag.ruleVersion ?? '-'}
          </dd>
        </dl>
      )}
    </div>
  )
}

function TagSearch({
  onPick,
  onCancel,
}: {
  onPick: (tagId: string) => void
  onCancel: () => void
}) {
  const [query, setQuery] = useState('')
  const found = useMemo(() => searchTags(query), [query])

  return (
    <div>
      <div className="flex gap-1.5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="태그 이름으로 찾기"
          className="min-w-0 flex-1 rounded-px3 border-[1.5px] border-border bg-ivory px-3 py-2 text-[13px] outline-none placeholder:text-inkfaint focus:border-skydeep"
        />
        <button
          type="button"
          onClick={onCancel}
          className="press shrink-0 rounded-px3 border-[1.5px] border-border bg-ivory px-3 font-pixel text-[9.5px] uppercase text-inkdim"
        >
          닫기
        </button>
      </div>

      {found.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {found.map((def) => (
            <button
              key={def.id}
              type="button"
              onClick={() => onPick(def.id)}
              className="press min-h-[44px] shrink-0 rounded-px3 border-[1.5px] border-border bg-cream px-3 py-2 text-[12px] text-inkdim"
            >
              {def.displayName}
            </button>
          ))}
        </div>
      ) : (
        query.trim() && (
          <p className="mt-2 text-[12px] text-inkfaint">그런 이름의 태그는 없어요.</p>
        )
      )}
    </div>
  )
}
