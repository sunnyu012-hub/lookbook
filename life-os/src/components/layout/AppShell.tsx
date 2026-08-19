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
        className="mx-auto w-full max-w-[460px] animate-rise px-4 pb-[calc(var(--tabbar-h)+var(--safe-bottom)+24px)] pt-[calc(var(--safe-top)+16px)]"
      >
        {children}
      </main>
      <TabBar active={active} onChange={onTabChange} />
    </div>
  )
}
