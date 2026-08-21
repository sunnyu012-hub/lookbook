import type { ReactNode } from 'react'
import { cn } from '@/components/ui/cn'

interface AppShellProps {
  children: ReactNode
  tabBar: ReactNode
  /**
   * 시간대에 따른 아주 옅은 색. `from-*` 하나만 받는다.
   * 크림색 바탕 위에 위쪽으로만 한 겹 얹어서, 어두워지지 않고 공기만 바뀐다.
   */
  tint?: string
}

/**
 * 모바일 폭(최대 430px)으로 화면을 잡아둔다.
 * 데스크톱에서 열어도 아이폰처럼 가운데 정렬로 보인다.
 */
export function AppShell({ children, tabBar, tint }: AppShellProps) {
  return (
    <div className="relative min-h-[100dvh] bg-canvas">
      {tint && (
        <div
          aria-hidden
          className={cn(
            'pointer-events-none fixed inset-x-0 top-0 h-[45vh] bg-gradient-to-b to-transparent',
            tint,
          )}
        />
      )}
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col">
        {/* 아래 여백은 떠 있는 내비게이션에 가려지지 않을 만큼 준다 */}
        <main className="flex-1 px-5 pb-[calc(env(safe-area-inset-bottom)+108px)] pt-[calc(env(safe-area-inset-top)+22px)]">
          {children}
        </main>
      </div>
      {tabBar}
    </div>
  )
}
