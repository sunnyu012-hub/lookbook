import { useEffect, useRef } from 'react'
import { lockScroll, popOverlay, pushOverlay, unlockScroll } from '@/lib/overlay'

/**
 * 화면 위에 뜬 것 하나를 등록한다.
 *
 * 열려 있는 동안 뒤 화면 스크롤을 잠그고, Esc 와 폰의 뒤로 가기로 닫히게 한다.
 * 시트마다 같은 코드를 따로 쓰면 겹쳐 열렸을 때 서로 어긋난다.
 */
export function useOverlay(open: boolean, onClose: () => void): void {
  // 닫기 함수는 렌더마다 바뀔 수 있다. 등록은 한 번만 하고 최신 것을 부른다.
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return

    lockScroll()
    const id = pushOverlay(() => closeRef.current())

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('keydown', onKey)
      popOverlay(id)
      unlockScroll()
    }
  }, [open])
}
