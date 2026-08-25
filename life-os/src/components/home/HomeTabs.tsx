import { PixelImage } from '@/components/pixel/PixelImage'
import { haptic } from '@/hooks/useHaptic'
import { icons, type PixelAsset } from '@/lib/pixelAssets'
import { cn } from '@/lib/cn'

export type HomeTab = 'status' | 'effects'

const TABS: { key: HomeTab; label: string; ko: string; icon: PixelAsset; tint: string }[] = [
  { key: 'status', label: 'Status', ko: '오늘의 컨디션', icon: icons.mood, tint: '#FDE7EC' },
  { key: 'effects', label: 'Effects', ko: '현재 상태 효과', icon: icons.energy, tint: '#FDF4D6' },
]

/** 셋을 세로로 다 펼치지 않는다 — 하나만 골라서 본다 */
export function HomeTabs({
  active,
  onChange,
}: {
  active: HomeTab
  onChange: (tab: HomeTab) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5" role="tablist" aria-label="오늘 보기">
      {TABS.map((tab) => {
        const on = tab.key === active
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => {
              haptic()
              onChange(tab.key)
            }}
            className={cn(
              'press rounded-px4 border-[1.5px] px-2 py-2 text-center transition-colors duration-150',
              on ? 'border-pinkdeep shadow-hardpink' : 'border-border',
            )}
            style={{ backgroundColor: on ? tab.tint : '#FFFCF7' }}
          >
            <span className="flex items-center justify-center gap-1">
              <PixelImage asset={tab.icon} height={14} className={cn(!on && 'opacity-45')} />
              <span
                className={cn(
                  'font-pixel text-[10.5px] uppercase leading-none tracking-[0.05em]',
                  on ? 'text-ink' : 'text-inkfaint',
                )}
              >
                {tab.label}
              </span>
            </span>
            <span
              className={cn(
                'mt-1 block text-[10.5px] leading-none',
                on ? 'text-inkdim' : 'text-inkfaint',
              )}
            >
              {tab.ko}
            </span>
          </button>
        )
      })}
    </div>
  )
}
