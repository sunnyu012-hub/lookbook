import type { TabKey } from '@/types'
import { cn } from '@/lib/cn'
import { haptic } from '@/hooks/useHaptic'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'checkin', label: 'Check-in' },
  { key: 'history', label: 'History' },
  { key: 'insights', label: 'Insights' },
]

interface Props {
  active: TabKey
  onChange: (tab: TabKey) => void
}

export function TabBar({ active, onChange }: Props) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/85 backdrop-blur-xl"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <div className="page flex h-[var(--tabbar-h)] items-stretch">
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
              className="relative flex flex-1 flex-col items-center justify-center gap-2"
            >
              <span
                className={cn(
                  'h-1 w-1 rounded-full transition-all duration-300 ease-soft',
                  isActive ? 'w-5 bg-paper' : 'bg-transparent',
                )}
              />
              <span
                className={cn(
                  'font-mono text-[10px] uppercase tracking-label transition-colors duration-200',
                  isActive ? 'text-paper' : 'text-faint',
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
