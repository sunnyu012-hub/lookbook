import type { ReactNode } from 'react'
import { cn } from '@/components/ui/cn'

export type TabKey = 'home' | 'quest' | 'me'

interface BottomNavigationProps {
  active: TabKey
  onChange: (tab: TabKey) => void
}

const ICONS: Record<TabKey, ReactNode> = {
  home: <path d="M4 11 L12 4.5 L20 11 V19.5 H14.5 V14.5 H9.5 V19.5 H4 Z" />,
  quest: (
    <>
      <path d="M4.5 7 L6.5 9 L10 5.5" />
      <path d="M4.5 16 L6.5 18 L10 14.5" />
      <path d="M13 7.5 H20" />
      <path d="M13 16.5 H20" />
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
  { key: 'me', label: 'ME' },
]

/**
 * 바닥에 붙지 않고 살짝 떠 있는 내비게이션.
 *
 * 선택 상태를 색으로만 알리지 않고 배경 pill 과 굵기까지 같이 바꾼다.
 */
export function BottomNavigation({ active, onChange }: BottomNavigationProps) {
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <div className="pointer-events-auto flex w-[min(calc(100vw-40px),330px)] gap-1 rounded-pill border border-line/80 bg-surface/95 p-1.5 shadow-nav backdrop-blur-md">
        {TABS.map((tab) => {
          const isActive = tab.key === active
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-pill',
                'transition-[background-color,color] duration-200 ease-out active:scale-[0.97]',
                isActive ? 'bg-ink text-surface' : 'bg-transparent text-inkdim',
              )}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[17px] w-[17px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                {ICONS[tab.key]}
              </svg>
              <span
                className={cn(
                  'font-game text-[11px] tracking-[0.1em]',
                  isActive ? 'font-medium' : undefined,
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
