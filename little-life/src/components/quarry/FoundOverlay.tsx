import type { QuarryFind } from '@/types'
import { Portal } from '@/components/ui/Portal'
import { Button } from '@/components/ui/Button'
import { useOverlay } from '@/hooks/useOverlay'
import { STRANGE_FRAGMENT_ID } from '@/lib/quarry/derive'

interface FoundOverlayProps {
  find: QuarryFind | null
  onClose: () => void
  onOpenBook: () => void
}

/**
 * 캔 것 한 장.
 *
 * 처음 만난 것이면 도감에 들어갔다고 알려준다.
 * 두 번째부터는 조용히 개수만 는다 — 같은 연출을 세 번 보면
 * 그때부터는 닫으려고 누르는 버튼이 된다.
 */
export function FoundOverlay({ find, onClose, onOpenBook }: FoundOverlayProps) {
  useOverlay(find !== null, onClose)
  if (!find) return null

  const { mineral, isNew, flavor } = find
  if (!mineral) return null

  // 이상한 돌조각만 다르게 말한다. 정체는 밝히지 않는다 —
  // 무엇인지 알려주는 순간 궁금함이 끝난다.
  const strange = mineral.id === STRANGE_FRAGMENT_ID && isNew

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
          <p className="font-game text-[10px] tracking-[0.16em] text-inkdim">
            {isNew ? 'NEW MINERAL ✦' : 'FOUND ✦'}
          </p>

          <span className="mt-3 block animate-bouncesm text-[48px] leading-none">
            {mineral.icon}
          </span>

          <p className="mt-2 text-[17px] font-semibold text-ink">{mineral.name}</p>

          {strange ? (
            <div className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-inkdim">
              <p>돌처럼 보였는데,</p>
              <p>가장자리가 이상할 만큼 반듯하다.</p>
              <p>흙을 조금 털어내자 작은 홈 하나가 보였다.</p>
              <p className="pt-1 text-ink">이게 뭐지?</p>
            </div>
          ) : (
            <p className="mt-1 text-[13px] leading-relaxed text-inkdim">{mineral.description}</p>
          )}

          {isNew && !strange && (
            <p className="mt-3 rounded-btn bg-sunken px-3 py-2 text-[12.5px] text-inkdim">
              도감에 들어갔어
            </p>
          )}

          {flavor && !strange && (
            <p className="mt-2 text-[12px] text-inkfaint">{flavor}</p>
          )}

          <div className="mt-4 flex gap-2">
            {isNew && !strange && (
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
