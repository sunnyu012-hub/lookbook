import type { ReactNode } from 'react'

interface AppShellProps {
  children: ReactNode
  tabBar: ReactNode
}

/**
 * 모바일 폭(최대 430px)으로 화면을 잡아둔다.
 * 데스크톱에서 열어도 아이폰처럼 가운데 정렬로 보인다.
 */
export function AppShell({ children, tabBar }: AppShellProps) {
  return (
    <div className="min-h-[100dvh] bg-canvas">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col">
        {/* 아래 여백은 떠 있는 내비게이션에 가려지지 않을 만큼 준다 */}
        <main className="flex-1 px-5 pb-[calc(env(safe-area-inset-bottom)+108px)] pt-[calc(env(safe-area-inset-top)+22px)]">
          {children}
        </main>
      </div>
      {tabBar}
    </div>
  )
}
