import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { PixelIcon } from './PixelIcon'

interface Props {
  title: string
  detail?: string
  onDone: () => void
}

/** 게임 저장 알림처럼 뜨는 작은 창 */
export function PixelToast({ title, detail, onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000)
    return () => clearTimeout(t)
  }, [title, detail, onDone])

  // main 의 등장 애니메이션이 만드는 쌓임 맥락에 갇히지 않도록 body 로 띄운다
  return createPortal(
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
      style={{ bottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 14px)' }}
    >
      <div className="panel animate-pop flex items-center gap-2 px-3 py-2">
        <PixelIcon name="check" size={16} className="animate-blinkfade" />
        <div>
          <p className="ptitle">{title}</p>
          {detail && <p className="mt-1 text-[11px] text-inkdim">{detail}</p>}
        </div>
      </div>
    </div>,
    document.body,
  )
}
