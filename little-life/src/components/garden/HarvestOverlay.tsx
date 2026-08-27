import type { CropDef } from '@/types'
import { Portal } from '@/components/ui/Portal'
import { Button } from '@/components/ui/Button'
import { useOverlay } from '@/hooks/useOverlay'

export interface HarvestNote {
  crop: CropDef
  count: number
  /** 처음 거둔 작물인지 */
  isNew: boolean
  /** 이번 수확으로 정원이 넓어졌으면 그 단계 */
  leveledUp: number | null
  /** 아주 가끔 섞여 나오는 것 (황금 딸기처럼). 없으면 null. */
  variant?: CropDef | null
  variantIsNew?: boolean
}

interface HarvestOverlayProps {
  note: HarvestNote | null
  onClose: () => void
  onOpenBook: () => void
}

/**
 * 거둔 것 한 장.
 *
 * 처음 거둔 작물이면 도감에 들어갔다고 알려준다.
 * 두 번째부터는 조용히 개수만 는다 — 같은 연출을 세 번 보면
 * 그때부터는 닫으려고 누르는 버튼이 된다.
 */
export function HarvestOverlay({ note, onClose, onOpenBook }: HarvestOverlayProps) {
  useOverlay(note !== null, onClose)
  if (!note) return null

  const { crop, count, isNew, leveledUp, variant, variantIsNew } = note

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
          <p className="font-game text-[10px] tracking-[0.16em] text-sage-deep">
            {isNew ? 'NEW CROP ✦' : 'HARVEST ✦'}
          </p>

          <span className="mt-3 block animate-bouncesm text-[48px] leading-none">{crop.icon}</span>

          <p className="mt-2 text-[17px] font-semibold text-ink">
            {crop.name} <span className="font-game text-[14px] text-inkdim">×{count}</span>
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-inkdim">{crop.description}</p>

          {isNew && (
            <p className="mt-3 rounded-btn bg-sage-soft px-3 py-2 text-[12.5px] text-sage-deep">
              도감에 들어갔어
            </p>
          )}

          {/* 섞여 나온 것. 따로 창을 하나 더 띄우지 않는다 —
              거둘 때마다 창이 두 장 뜨면 그건 선물이 아니라 절차가 된다. */}
          {variant && (
            <div className="mt-3 rounded-btn bg-butter-soft/70 px-3 py-2.5">
              <p className="font-game text-[10px] tracking-[0.14em] text-butter-deep">
                {variantIsNew ? 'RARE FIND ✦' : 'ALSO FOUND ✦'}
              </p>
              <p className="mt-1 text-[13.5px] text-ink">
                {variant.icon} {variant.name}도 하나 섞여 있었어
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-inkdim">
                {variant.description}
              </p>
            </div>
          )}

          {leveledUp !== null && (
            <div className="mt-3 rounded-btn bg-butter-soft px-3 py-2.5">
              <p className="font-game text-[10px] tracking-[0.14em] text-butter-deep">
                GARDEN LEVEL UP ✦
              </p>
              <p className="mt-1 text-[13.5px] text-ink">
                정원이 조금 더 넓어졌어 — Lv.{leveledUp}
              </p>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            {(isNew || variantIsNew) && (
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
