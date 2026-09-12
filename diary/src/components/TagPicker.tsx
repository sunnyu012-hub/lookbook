import { useMemo, useState } from 'react'
import { normalizeTag, tagPalette } from '../lib/tags'
import type { Entries } from '../lib/types'

type Props = {
  entries: Entries
  selected: string[]
  onChange: (tags: string[]) => void
}

const COLLAPSED = 14

/** 눌러서 남기는 태그. 글 쓰기 싫은 날의 기록 방법이다. */
export function TagPicker({ entries, selected, onChange }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState('')

  // 자주 쓴 태그가 앞에 오도록 기록에서 세어 정렬한다
  const palette = useMemo(() => tagPalette(entries, selected), [entries, selected])
  const shown = expanded ? palette : palette.slice(0, COLLAPSED)

  function toggle(tag: string) {
    onChange(selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag])
  }

  function addCustom() {
    const tag = normalizeTag(draft)
    if (!tag) return
    if (!selected.includes(tag)) onChange([...selected, tag])
    setDraft('')
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        {shown.map((tag) => {
          const on = selected.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(tag)}
              className={`chip ${
                on ? 'bg-peach text-white' : 'bg-sunken/70 text-inkdim active:bg-sunken'
              }`}
            >
              {tag}
            </button>
          )
        })}
        {palette.length > COLLAPSED && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="chip bg-transparent text-inkfaint underline decoration-line underline-offset-4"
          >
            {expanded ? '접기' : `더 보기 ${palette.length - COLLAPSED}`}
          </button>
        )}
      </div>

      {expanded && (
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addCustom()
              }
            }}
            placeholder="내 태그 만들기"
            className="field flex-1 py-2"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!normalizeTag(draft)}
            className="chip shrink-0 bg-peach-soft px-4 font-medium text-peach-deep disabled:bg-sunken/60 disabled:text-inkfaint"
          >
            추가
          </button>
        </div>
      )}
    </div>
  )
}
