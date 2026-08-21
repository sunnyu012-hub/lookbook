import { useEffect, useRef, useState } from 'react'

export interface QuestMenuItem {
  label: string
  onSelect: () => void
  /** 삭제처럼 되돌리기 어려운 것 */
  danger?: boolean
}

interface QuestMenuProps {
  items: QuestMenuItem[]
  label: string
}

/** 퀘스트 카드 우측의 ⋯ 메뉴. 지금은 삭제 하나뿐이지만 나중에 항목이 늘어날 자리다. */
export function QuestMenu({ items, label }: QuestMenuProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-full text-inkfaint transition-colors duration-150 active:scale-90"
      >
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
          <circle cx="5" cy="12" r="1.8" fill="currentColor" />
          <circle cx="12" cy="12" r="1.8" fill="currentColor" />
          <circle cx="19" cy="12" r="1.8" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-1 top-10 z-20 min-w-[168px] animate-pop overflow-hidden rounded-2xl border border-line bg-surface py-1 shadow-lift">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
              className={
                'flex w-full items-center px-4 py-3 text-left text-[14px] ' +
                (item.danger ? 'text-coral-deep' : 'text-ink')
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
