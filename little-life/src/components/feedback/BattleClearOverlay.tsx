import type { BattleKind } from '@/types'
import { EFFECT } from '@/lib/assets'

export interface BattleClearBanner {
  kind: BattleKind
  name: string
  icon: string
  exp: number
  coins: number
}

/**
 * 몬스터·보스를 잡았을 때.
 * 레벨업 연출과 같은 결로 카드 하나만 떴다가 사라진다.
 */
export function BattleClearOverlay({ banner }: { banner: BattleClearBanner | null }) {
  if (!banner) return null

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center px-8"
      role="status"
      aria-live="polite"
    >
      <div className="animate-pop rounded-card border border-line bg-surface px-9 py-6 text-center shadow-lift">
        <span className="block animate-bouncelg text-[52px] leading-none">{banner.icon}</span>

        <p className="mt-3 text-[17px] font-bold text-coral-deep">
          {banner.kind === 'BOSS' ? '보스 클리어!' : '클리어!'}
        </p>
        <p className="mt-1.5 text-[15px] font-semibold text-ink">{banner.name}</p>

        <div className="mt-3 flex items-center justify-center gap-3">
          <span className="inline-flex items-center gap-1 font-game text-[13px] text-ink">
            <img src={EFFECT.star} alt="" aria-hidden className="h-4 w-4 object-contain" />
            +{banner.exp}
          </span>
          <span className="font-game text-[13px] text-ink">🪙 +{banner.coins}</span>
        </div>
      </div>
    </div>
  )
}
