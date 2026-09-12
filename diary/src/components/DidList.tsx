import { useState } from 'react'

type Props = {
  items: string[]
  onChange: (items: string[]) => void
}

/**
 * 오늘 뭐 했는지 한 줄씩.
 *
 * 일기 한 덩어리로 쓰면 나중에 "그날 뭐 했었지" 를 못 찾는다.
 * 줄로 남겨두면 몇 달 뒤에 훑을 수 있다.
 */
export function DidList({ items, onChange }: Props) {
  const [draft, setDraft] = useState('')

  function add() {
    const text = draft.trim()
    if (!text) return
    onChange([...items, text.slice(0, 80)])
    setDraft('')
  }

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="flex items-start gap-2 rounded-btn bg-sunken/60 px-3 py-2"
            >
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-peach" />
              <span className="flex-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                {item}
              </span>
              <button
                type="button"
                aria-label={`${item} 지우기`}
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                className="-mr-1 px-1 text-[15px] leading-none text-inkfaint active:text-ink"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              add()
            }
          }}
          enterKeyHint="done"
          placeholder={items.length === 0 ? '점심에 국수 먹었다' : '한 줄 더'}
          className="field flex-1"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className="chip shrink-0 bg-peach-soft px-4 font-medium text-peach-deep disabled:bg-sunken/60 disabled:text-inkfaint"
        >
          담기
        </button>
      </div>
    </div>
  )
}
