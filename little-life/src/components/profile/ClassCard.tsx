import { useState } from 'react'
import type { ClassId } from '@/types'
import { CLASSES, findClass } from '@/lib/rpg/content'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Card } from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'

interface ClassCardProps {
  classId: ClassId | null
  onSelect: (classId: ClassId) => void
}

/**
 * 직업.
 *
 * 한 번 고르면 끝이 아니라 언제든 바꿀 수 있다.
 * 잘못 골랐다고 손해 보는 구조를 두지 않는다.
 */
export function ClassCard({ classId, onSelect }: ClassCardProps) {
  const [open, setOpen] = useState(false)
  const current = findClass(classId)

  return (
    <>
      <Card className="py-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 text-left transition-transform duration-150 ease-out active:scale-[0.98]"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-canvas text-[24px]">
            {current?.icon ?? '🌱'}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold text-ink">
              {current?.name ?? '아직 직업이 없어'}
            </span>
            <span className="mt-0.5 block truncate text-[12.5px] text-inkdim">
              {current ? `${current.passiveName} · ${current.passiveLabel}` : '눌러서 하나 골라봐'}
            </span>
          </span>
          <span className="shrink-0 rounded-pill bg-sunken px-2.5 py-1 font-game text-[9px] tracking-[0.08em] text-inkdim">
            {current ? 'CHANGE' : 'PICK'}
          </span>
        </button>
      </Card>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="직업 고르기">
        <h2 className="text-[19px] font-semibold text-ink">어떤 사람으로 지낼까?</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-inkdim">
          언제든 바꿀 수 있어. 바꿔도 지금까지 쌓은 건 그대로야.
        </p>

        <ul className="mt-4 space-y-2">
          {CLASSES.map((def) => {
            const active = def.id === classId
            return (
              <li key={def.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(def.id)
                    setOpen(false)
                  }}
                  aria-pressed={active}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-card border px-3.5 py-3.5 text-left',
                    'transition-transform duration-150 ease-out active:scale-[0.98]',
                    active
                      ? 'border-coral bg-coral-soft/40 ring-[1.5px] ring-inset ring-coral'
                      : 'border-line bg-surface',
                  )}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-canvas text-[22px]">
                    {def.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[15px] font-semibold text-ink">{def.name}</span>
                      {active && (
                        <span className="shrink-0 rounded-pill bg-coral px-2 py-0.5 font-game text-[9px] tracking-[0.06em] text-surface">
                          NOW
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-inkdim">
                      {def.description}
                    </span>
                    <span className="mt-1 block truncate font-game text-[10px] tracking-[0.06em] text-coral-deep">
                      {def.passiveLabel}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </BottomSheet>
    </>
  )
}
