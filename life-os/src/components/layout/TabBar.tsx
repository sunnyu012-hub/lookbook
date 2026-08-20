import type { TabKey } from '@/types'
import { icons } from '@/lib/pixelAssets'
import { cn } from '@/lib/cn'
import { haptic } from '@/hooks/useHaptic'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelSparkle } from '@/components/pixel/PixelSparkle'

const TABS = [
  { key: 'today' as TabKey, label: 'Today', asset: icons.home },
  { key: 'checkin' as TabKey, label: 'Save', asset: icons.save },
  { key: 'history' as TabKey, label: 'Log', asset: icons.log },
  { key: 'insights' as TabKey, label: 'Stats', asset: icons.xp },
]

interface Props {
  active: TabKey
  onChange: (tab: TabKey) => void
}

export function TabBar({ active, onChange }: Props) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-cream/95 backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto flex h-[var(--tabbar-h)] w-full max-w-[460px] items-stretch px-2">
        {TABS.map((tab) => {
          const isActive = tab.key === active
          return (
            <button
              key={tab.key}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => {
                haptic()
                onChange(tab.key)
              }}
              className="relative flex flex-1 flex-col items-center justify-center gap-1"
            >
              {isActive && (
                <PixelSparkle size={9} variant={2} className="absolute right-[22%] top-[14%]" />
              )}
              <PixelImage
                asset={tab.asset}
                height={22}
                className={cn(
                  'transition-transform duration-150',
                  isActive ? '-translate-y-[1px]' : 'opacity-45 saturate-[0.7]',
                )}
              />
              <span
                className={cn(
                  'font-pixel text-[9px] uppercase leading-none tracking-[0.06em]',
                  isActive ? 'text-pinkdeep' : 'text-inkfaint',
                )}
              >
                {tab.label}
              </span>
              <span
                className={cn(
                  'h-[2px] w-5 rounded-full transition-colors duration-150',
                  isActive ? 'bg-pink' : 'bg-transparent',
                )}
              />
            </button>
          )
        })}
      </div>
    </nav>
  )
}
