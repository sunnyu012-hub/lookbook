/**
 * My Tag 고르기.
 *
 * 태그 때문에 Quick Log 가 무거워지면 안 된다. 그래서 기본은 닫혀 있고,
 * 열어도 자주 쓰는 것 몇 개가 먼저 보이게 둔다.
 */
import { useMemo, useState } from 'react'
import type { MyTag } from '@/lib/os2/types'
import type { MyTagStore } from '@/hooks/useMyTags'
import { haptic } from '@/hooks/useHaptic'
import { cn } from '@/lib/cn'

export function TagPicker({
  store,
  selected,
  onChange,
}: {
  store: MyTagStore
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)

  const found = useMemo(() => store.search(query), [store, query])
  const trimmed = query.trim()

  /** 검색어와 똑같은 이름이 이미 있으면 "만들기" 를 띄우지 않는다 */
  const canCreate =
    trimmed.length > 0 &&
    !found.some((t) => t.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase())

  const toggle = (id: string) => {
    haptic()
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }

  const create = async () => {
    if (!trimmed || busy) return
    setBusy(true)
    try {
      const tag = await store.create(trimmed)
      if (tag) {
        onChange(selected.includes(tag.id) ? selected : [...selected, tag.id])
        setQuery('')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="flex gap-1.5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canCreate) {
              e.preventDefault()
              void create()
            }
          }}
          placeholder="태그 찾거나 만들기"
          className="min-w-0 flex-1 rounded-px3 border-[1.5px] border-border bg-ivory px-3 py-2 text-[13px] outline-none placeholder:text-inkfaint focus:border-pinkdeep"
        />
        {canCreate && (
          <button
            type="button"
            onClick={() => void create()}
            disabled={busy}
            className="press shrink-0 rounded-px3 border-[1.5px] border-pinkdeep bg-pink px-3 font-pixel text-[9.5px] uppercase text-white disabled:opacity-60"
          >
            + 만들기
          </button>
        )}
      </div>

      {found.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {found.slice(0, 24).map((tag) => (
            <TagChip
              key={tag.id}
              tag={tag}
              selected={selected.includes(tag.id)}
              onClick={() => toggle(tag.id)}
            />
          ))}
        </div>
      ) : (
        !canCreate && (
          <p className="mt-2 text-[12px] text-inkfaint">
            아직 만든 태그가 없어요. 위에 이름을 적으면 만들 수 있어요.
          </p>
        )
      )}
    </div>
  )
}

export function TagChip({
  tag,
  selected,
  onClick,
  onRemove,
}: {
  tag: MyTag
  selected?: boolean
  onClick?: () => void
  onRemove?: () => void
}) {
  const content = (
    <>
      {tag.emoji && <span aria-hidden>{tag.emoji}</span>}
      <span className="max-w-[10ch] truncate">{tag.name}</span>
      {onRemove && (
        <span aria-hidden className="text-[13px] leading-none opacity-70">
          ×
        </span>
      )}
    </>
  )

  const className = cn(
    'press flex shrink-0 items-center gap-1 rounded-full border-[1.5px] px-2.5 py-1.5 text-[12px]',
    selected
      ? 'border-pinkdeep bg-pinksoft text-pinkdeep'
      : 'border-border bg-cream text-inkdim',
  )

  if (onRemove) {
    return (
      <button type="button" onClick={onRemove} aria-label={`${tag.name} 빼기`} className={className}>
        {content}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={className}
    >
      {content}
    </button>
  )
}
