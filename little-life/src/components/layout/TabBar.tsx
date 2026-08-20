import { cn } from '@/components/ui/cn'

export type TabKey = 'home' | 'quest' | 'me'

interface TabBarProps {
  active: TabKey
  onChange: (tab: TabKey) => void
}

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'home', label: 'HOME' },
  { key: 'quest', label: 'QUEST' },
  { key: 'me', label: 'ME' },
]

export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center">
      <div className="w-full max-w-[430px] border-t border-line/80 bg-milk/90 px-3 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <div className="flex">
          {TABS.map((tab) => {
            const isActive = tab.key === active
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onChange(tab.key)}
                aria-current={isActive ? 'page' : undefined}
                className="relative flex flex-1 flex-col items-center gap-1.5 py-3.5 active:scale-[0.97]"
              >
                <span
                  className={cn(
                    'font-game text-[12px] tracking-[0.14em] transition-colors duration-200',
                    isActive ? 'text-ink' : 'text-inkfaint',
                  )}
                >
                  {tab.label}
                </span>
                <span
                  className={cn(
                    'h-1 w-1 rounded-full transition-all duration-200',
                    isActive ? 'bg-ink' : 'bg-transparent',
                  )}
                />
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
