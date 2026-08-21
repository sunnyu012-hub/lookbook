import type { ReactNode } from 'react'
import { cn } from '@/components/ui/cn'

export type TabKey = 'home' | 'quest' | 'map' | 'bag' | 'me'

interface BottomNavigationProps {
  active: TabKey
  onChange: (tab: TabKey) => void
}

const ICONS: Record<TabKey, ReactNode> = {
  home: <path d="M4 11 L12 4.5 L20 11 V19.5 H14.5 V14.5 H9.5 V19.5 H4 Z" />,
  quest: (
    <>
      <rect x="5" y="4" width="14" height="16.5" rx="2.5" />
      <path d="M8.8 10 L10.6 11.8 L14.6 7.8" />
      <path d="M9 15.5 H15" />
    </>
  ),
  map: (
    <>
      <path d="M12 21 C12 21 19 14.6 19 9.8 A7 7 0 0 0 5 9.8 C5 14.6 12 21 12 21 Z" />
      <circle cx="12" cy="9.8" r="2.4" />
    </>
  ),
  bag: (
    <>
      <path d="M4.5 8.5 H19.5 L18.4 20 H5.6 Z" />
      <path d="M9 8.5 V6.5 A3 3 0 0 1 15 6.5 V8.5" />
    </>
  ),
  me: (
    <>
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M5.5 20 C5.5 16.2 8.4 14 12 14 C15.6 14 18.5 16.2 18.5 20" />
    </>
  ),
}

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'home', label: 'HOME' },
  { key: 'quest', label: 'QUEST' },
  { key: 'map', label: 'MAP' },
  { key: 'bag', label: 'BAG' },
  { key: 'me', label: 'ME' },
]

/**
 * 바닥에 붙지 않고 살짝 떠 있는 내비게이션.
 * 선택 상태를 색으로만 알리지 않고 배경 pill 까지 같이 바꾼다.
 */
export function BottomNavigation({ active, onChange }: BottomNavigationProps) {
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <div className="pointer-events-auto flex w-[min(calc(100vw-24px),392px)] gap-0.5 rounded-pill border border-line bg-surface/95 p-1.5 shadow-nav backdrop-blur-md">
        {TABS.map((tab) => {
          const isActive = tab.key === active
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex min-h-[50px] flex-1 flex-col items-center justify-center gap-0.5 rounded-pill px-0.5',
                'transition-[background-color,color] duration-200 ease-out active:scale-[0.97]',
                isActive ? 'bg-coral text-surface' : 'bg-transparent text-inkdim',
              )}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[18px] w-[18px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                {ICONS[tab.key]}
              </svg>
              <span className="font-game text-[9px] tracking-[0.04em]">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
