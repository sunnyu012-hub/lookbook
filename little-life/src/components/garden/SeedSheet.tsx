import type { AppState } from '@/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { seedStock } from '@/lib/garden/derive'
import { growthLabel } from '@/lib/garden/labels'
import { cn } from '@/components/ui/cn'

interface SeedSheetProps {
  open: boolean
  state: AppState
  /** 방금 거둔 것. 가지고 있으면 맨 위로 올려준다. */
  repeatCropId?: string | null
  onClose: () => void
  onPick: (cropId: string) => void
}

/**
 * 무엇을 심을까.
 *
 * 안 가진 씨앗은 아예 안 보여준다. 회색으로 눌러지지 않는 줄이
 * 열두 개 늘어서 있으면, 그건 목록이 아니라 못 가진 것의 목록이다.
 */
export function SeedSheet({ open, state, repeatCropId, onClose, onPick }: SeedSheetProps) {
  // 방금 거둔 것을 또 심는 일이 잦다. 목록을 다시 훑게 하지 않고 맨 위로 올린다.
  const stock = [...seedStock(state)].sort((a, b) => {
    if (a.crop.id === repeatCropId) return -1
    if (b.crop.id === repeatCropId) return 1
    return 0
  })

  return (
    <BottomSheet open={open} onClose={onClose} title="무엇을 심을까?">
      {/* BottomSheet 의 title 은 aria-label 로만 쓰인다.
          눈에 보이는 제목은 여기서 따로 둔다 — 시트가 갑자기 올라왔을 때
          이게 무엇을 고르는 자리인지 한 줄은 있어야 한다. */}
      <h2 className="mb-3 text-[17px] font-semibold text-ink">무엇을 심을까?</h2>
      {stock.length === 0 ? (
        <p className="rounded-card bg-canvas px-3.5 py-5 text-center text-[13px] leading-relaxed text-inkdim">
          씨앗이 없어.
          <br />
          <span className="text-inkfaint">퀘스트를 하다 보면 가끔 하나씩 생겨.</span>
        </p>
      ) : (
        <ul className="space-y-1.5">
          {stock.map(({ crop, count }) => (
            <li key={crop.id}>
              <button
                type="button"
                onClick={() => onPick(crop.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-card border border-line bg-surface px-3.5 py-3 text-left',
                  'transition-transform duration-150 ease-out active:scale-[0.98]',
                )}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn bg-sage-soft text-[22px]">
                  {crop.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-medium text-ink">
                    {crop.name} 씨앗
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] text-inkdim">
                    {growthLabel(crop.growthSeconds)}이면 다 자라
                  </span>
                </span>
                {crop.id === repeatCropId && (
                  <span className="shrink-0 rounded-pill bg-sage-soft px-2 py-0.5 text-[10.5px] text-sage-deep">
                    방금 그거
                  </span>
                )}
                <span className="shrink-0 font-game text-[12px] text-inkdim">×{count}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </BottomSheet>
  )
}
