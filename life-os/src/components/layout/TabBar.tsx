import type { TabKey } from '@/types'
import type { IconName } from '@/lib/sprites.generated'
import { cn } from '@/lib/cn'
import { haptic } from '@/hooks/useHaptic'
import { PixelIcon } from '@/components/pixel/PixelIcon'

const TABS: { key: TabKey; label: string; icon: IconName }[] = [
  { key: 'today', label: 'Today', icon: 'home' },
  { key: 'checkin', label: 'Save', icon: 'floppy' },
  { key: 'history', label: 'Log', icon: 'book' },
  { key: 'insights', label: 'Stats', icon: 'star' },
]

interface Props {
  active: TabKey
  onChange: (tab: TabKey) => void
}

export function TabBar({ active, onChange }: Props) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-ivory"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <div className="mx-auto flex h-[var(--tabbar-h)] w-full max-w-[460px] items-stretch gap-1 px-2 py-1.5">
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
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 rounded-px2 border-2 transition-colors duration-150',
                isActive ? 'border-ink bg-butter' : 'border-transparent',
              )}
            >
              <PixelIcon name={tab.icon} size={16} className={isActive ? 'animate-bob' : ''} />
              <span
                className={cn(
                  'font-pixel text-[9px] uppercase leading-none tracking-[0.06em]',
                  isActive ? 'text-ink' : 'text-inkdim',
                )}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
