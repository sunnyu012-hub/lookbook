import { useEffect, type ReactNode } from 'react'
import type { TabKey } from '@/types'
import { TabBar } from './TabBar'

interface Props {
  active: TabKey
  onTabChange: (tab: TabKey) => void
  children: ReactNode
}

export function AppShell({ active, onTabChange, children }: Props) {
  // 탭을 옮기면 항상 화면 맨 위에서 시작한다
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [active])

  return (
    <div className="min-h-[100dvh] bg-ink">
      <main
        key={active}
        className="page animate-fade pb-[calc(var(--tabbar-h)+var(--safe-bottom)+28px)] pt-[calc(var(--safe-top)+20px)]"
      >
        {children}
      </main>
      <TabBar active={active} onChange={onTabChange} />
    </div>
  )
}
