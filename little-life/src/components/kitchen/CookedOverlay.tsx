import type { KitchenRecipeDef } from '@/types'
import { Portal } from '@/components/ui/Portal'
import { Button } from '@/components/ui/Button'
import { useOverlay } from '@/hooks/useOverlay'

export interface CookedNote {
  def: KitchenRecipeDef
  /** 처음 만들어본 것인지 */
  firstTime: boolean
}

interface CookedOverlayProps {
  note: CookedNote | null
  onClose: () => void
  onOpenBook: () => void
}

/**
 * 만든 것 한 장.
 *
 * 처음 만든 것이면 도감에 들어갔다고 알려준다.
 * 두 번째부터는 조용히 개수만 는다 — 같은 연출을 세 번 보면
 * 그때부터는 닫으려고 누르는 버튼이 된다.
 */
export function CookedOverlay({ note, onClose, onOpenBook }: CookedOverlayProps) {
  useOverlay(note !== null, onClose)
  if (!note) return null

  const { def, firstTime } = note

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-center justify-center px-6">
        <div
          className="absolute inset-0 animate-fadein bg-ink/30 backdrop-blur-[2px]"
          onClick={onClose}
          aria-hidden
        />

        <div
          role="dialog"
          aria-modal="true"
          className="relative w-full max-w-[320px] animate-pop rounded-card bg-surface px-5 pb-5 pt-6 text-center shadow-lift"
        >
          <p className="font-game text-[10px] tracking-[0.16em] text-coral-deep">
            {firstTime ? 'NEW RECIPE ✦' : 'COOKED ✦'}
          </p>

          <span className="mt-3 block animate-bouncesm text-[48px] leading-none">{def.icon}</span>

          <p className="mt-2 text-[17px] font-semibold text-ink">{def.name}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-inkdim">{def.description}</p>

          {firstTime && (
            <p className="mt-3 rounded-btn bg-coral-soft/60 px-3 py-2 text-[12.5px] text-coral-deep">
              도감에 들어갔어
            </p>
          )}

          {def.buff && (
            <p className="mt-2 text-[12px] text-inkfaint">먹으면 {def.buff.label}</p>
          )}

          <div className="mt-4 flex gap-2">
            {firstTime && (
              <Button variant="soft" size="lg" className="flex-1" onClick={onOpenBook}>
                도감 보기
              </Button>
            )}
            <Button size="lg" className="flex-1" onClick={onClose}>
              계속하기
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
