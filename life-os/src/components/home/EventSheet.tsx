import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { PixelImage } from '@/components/pixel/PixelImage'
import { EVENT_GROUPS } from '@/lib/events'
import { icons } from '@/lib/pixelAssets'
import { haptic } from '@/hooks/useHaptic'
import { cn } from '@/lib/cn'

/** 오늘 있었던 일을 빠르게 고르는 시트. 여러 개 선택 가능. */
export function EventSheet({
  tags,
  onSave,
  onClose,
}: {
  tags: string[]
  onSave: (tags: string[]) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState<string[]>(tags)
  const [custom, setCustom] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const toggle = (tag: string) => {
    haptic()
    setSelected((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const addCustom = () => {
    const t = custom.trim()
    if (!t || selected.includes(t)) return
    setSelected((prev) => [...prev, t])
    setCustom('')
  }

  /** 기본 목록에 없는, 사용자가 만든 태그 */
  const known = new Set(EVENT_GROUPS.flatMap((g) => g.tags))
  const mine = selected.filter((t) => !known.has(t))

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-ink/30" />

      <div
        className="relative flex max-h-[86dvh] w-full max-w-[460px] animate-risein flex-col rounded-t-px5 border-[1.5px] border-border bg-ivory"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 14px)' }}
      >
        <header className="flex items-center gap-2 border-b border-dashed border-border px-4 py-3">
          <PixelImage asset={icons.camera} height={18} />
          <h2 className="ptitle flex-1">오늘 있었던 일</h2>
          <span className="plabel">{selected.length}개</span>
        </header>

        <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-3">
          {EVENT_GROUPS.map((group) => (
            <section key={group.key} className="mb-3">
              <p className="plabel mb-1.5 flex items-center gap-1.5">
                <PixelImage asset={group.icon} height={14} />
                {group.ko}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.tags.map((tag) => {
                  const on = selected.includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(tag)}
                      className={cn(
                        'rounded-px3 border-[1.5px] px-2.5 py-1.5 text-[12.5px] transition-transform duration-150',
                        on
                          ? '-translate-y-[1px] border-pinkdeep bg-pinksoft'
                          : 'border-border text-inkdim',
                      )}
                      style={{ backgroundColor: on ? undefined : group.tint }}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            </section>
          ))}

          <section className="mb-2 border-t border-dashed border-border pt-3">
            <p className="plabel mb-1.5">직접 추가</p>
            {mine.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {mine.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggle(tag)}
                    className="rounded-px3 border-[1.5px] border-pinkdeep bg-pinksoft px-2.5 py-1.5 text-[12.5px]"
                  >
                    {tag} ×
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustom()}
                maxLength={20}
                placeholder="새 태그"
                aria-label="새 태그"
                className="min-w-0 flex-1 rounded-px2 border-[1.5px] border-border bg-cream px-2.5 py-2 text-[13px] placeholder:text-inkfaint"
              />
              <button
                type="button"
                onClick={addCustom}
                className="press rounded-px3 border-[1.5px] border-border bg-cream px-3 py-2 font-pixel text-[10px] uppercase text-inkdim"
              >
                Add
              </button>
            </div>
          </section>
        </div>

        <div className="border-t border-dashed border-border px-4 pt-3">
          <button
            type="button"
            onClick={() => {
              haptic()
              onSave(selected)
            }}
            className="press w-full rounded-px4 border-[1.5px] border-pinkdeep bg-pink py-3 font-pixel text-[12px] uppercase tracking-[0.04em] text-white shadow-hardpink"
          >
            저장
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
