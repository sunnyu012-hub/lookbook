import type { CharacterSkin } from '@/types'
import { Portal } from '@/components/ui/Portal'
import { useOverlay } from '@/hooks/useOverlay'
import { Button } from '@/components/ui/Button'
import { RARITY_STYLE } from '@/components/rpg/RarityBadge'
import { RARITY_LABEL } from '@/lib/labels'
import { CharacterSkinRenderer } from './CharacterSkinRenderer'
import { cn } from '@/components/ui/cn'

interface NewSkinOverlayProps {
  /** 이번에 새로 얻은 것들. 한 번에 하나씩 보여준다. */
  skins: CharacterSkin[]
  onWear: (id: string) => void
  onClose: () => void
}

/**
 * 새 모습이 생겼을 때.
 *
 * ── 자동으로 갈아입히지 않는다 ─────────────────────────
 *
 * 여기서 "이 모습으로 지내기" 를 눌러야 바뀐다. 얻자마자 바꿔버리면
 * 아침에 열었더니 내가 고른 적 없는 모습이 서 있게 된다.
 * 그냥 닫아도 모습은 목록에 그대로 들어와 있다.
 */
export function NewSkinOverlay({ skins, onWear, onClose }: NewSkinOverlayProps) {
  useOverlay(skins.length > 0, onClose)

  if (skins.length === 0) return null

  const skin = skins[0]
  const rarity = RARITY_STYLE[skin.rarity]

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center px-7"
        role="status"
        aria-live="polite"
      >
        <div className="absolute inset-0 animate-fadein bg-ink/30 backdrop-blur-[2px]" onClick={onClose} />

        <div className="relative w-full max-w-[320px] animate-pop rounded-card border border-line bg-surface px-6 pb-6 pt-5 text-center shadow-lift">
          <p className="font-game text-[11px] tracking-[0.12em] text-coral-deep">NEW LOOK ✦</p>

          <div className="mx-auto mt-3 h-[176px] w-[132px]">
            <CharacterSkinRenderer skinId={skin.id} />
          </div>

          <div className="mt-3 flex items-center justify-center gap-1.5">
            <p className="text-[17px] font-semibold text-ink">{skin.name}</p>
            <span
              className={cn(
                'inline-flex h-[18px] items-center rounded-pill px-1.5 text-[9.5px] font-medium',
                rarity.chip,
                rarity.text,
              )}
            >
              {RARITY_LABEL[skin.rarity]}
            </span>
          </div>

          <p className="mt-1.5 text-[12.5px] leading-relaxed text-inkdim">{skin.description}</p>

          {skins.length > 1 && (
            <p className="mt-2 text-[11px] text-inkfaint">이번에 {skins.length}가지가 생겼어</p>
          )}

          <Button className="mt-4 w-full" onClick={() => onWear(skin.id)}>
            이 모습으로 지내기
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="mt-1.5 w-full py-2 text-[12px] text-inkfaint active:scale-[0.98]"
          >
            나중에 입을래
          </button>
        </div>
      </div>
    </Portal>
  )
}
