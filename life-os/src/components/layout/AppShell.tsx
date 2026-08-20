import { useEffect, type ReactNode } from 'react'
import type { TabKey } from '@/types'
import { TabBar } from './TabBar'

interface Props {
  active: TabKey
  onTabChange: (tab: TabKey) => void
  children: ReactNode
}

export function AppShell({ active, onTabChange, children }: Props) {
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [active])

  return (
    <div className="min-h-[100dvh]">
      <main
        key={active}
        className="mx-auto w-full max-w-[460px] animate-rise px-4"
        style={{
          // 상태바(시간·배터리) 아래에서 시작하게 한다
          paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)',
          paddingBottom: 'calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0px) + 24px)',
        }}
      >
        {children}
      </main>
      <TabBar active={active} onChange={onTabChange} />
    </div>
  )
}
