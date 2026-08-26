import type { DungeonFind } from '@/types'
import { Portal } from '@/components/ui/Portal'
import { Button } from '@/components/ui/Button'
import { useOverlay } from '@/hooks/useOverlay'
import { TRACE_ID } from '@/lib/dungeon/derive'

interface FoundOverlayProps {
  find: DungeonFind | null
  onClose: () => void
  onOpenBook: () => void
}

/**
 * 들여다본 결과 한 장.
 *
 * 작은 흔적만 다르게 말한다. 정체는 밝히지 않는다 —
 * 무엇인지 보여주는 순간 다음에 올 것이 김이 샌다.
 * 실루엣도 안 그리고, 소리가 났다는 말까지만 한다.
 */
export function FoundOverlay({ find, onClose, onOpenBook }: FoundOverlayProps) {
  useOverlay(find !== null, onClose)
  if (!find) return null

  const { isNew, name, icon, text, coins } = find
  const trace = find.itemId === TRACE_ID && isNew

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
            {isNew ? 'NEW ✦' : 'FOUND ✦'}
          </p>

          <span className="mt-3 block animate-bouncesm text-[48px] leading-none">{icon}</span>

          <p className="mt-2 text-[17px] font-semibold text-ink">{name}</p>

          {trace ? (
            <div className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-inkdim">
              <p>{text}</p>
              <p className="pt-1 text-ink">문 너머에서 아주 작은 소리가 났다.</p>
            </div>
          ) : (
            <p className="mt-1 text-[13px] leading-relaxed text-inkdim">{text}</p>
          )}

          {isNew && !trace && (
            <p className="mt-3 rounded-btn bg-sunken px-3 py-2 text-[12.5px] text-inkdim">
              도감에 들어갔어
            </p>
          )}

          {coins > 0 && <p className="mt-2 text-[12px] text-inkfaint">동전도 {coins}개 나왔다</p>}

          <div className="mt-4 flex gap-2">
            {isNew && !trace && (
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
