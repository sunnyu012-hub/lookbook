import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * 시트·다이얼로그를 body 바로 아래로 옮겨 그린다.
 *
 * `position: fixed` 는 조상에 transform 이 걸려 있으면 뷰포트가 아니라 그 조상을 기준으로 붙는다.
 * 화면 진입 애니메이션(`animate-risein`)이 fill-mode 때문에 끝난 뒤에도 `translateY(0)` 을
 * 남겨두기 때문에, 화면 안에서 연 시트가 페이지 맨 아래 — 스크롤해도 안 보이는 자리 — 에 열렸다.
 *
 * 어디서 열든 늘 화면 기준이 되도록 여기서 한 번에 막는다.
 */
export function Portal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}
