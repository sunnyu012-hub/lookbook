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
    <div className="min-h-[100dvh] bg-ivory">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col bg-ivory">
        <main className="flex-1 px-5 pb-[104px] pt-[calc(env(safe-area-inset-top)+20px)]">
          {children}
        </main>
      </div>
      {tabBar}
    </div>
  )
}
