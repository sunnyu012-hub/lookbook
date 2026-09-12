import { useEffect, type ReactNode } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

/**
 * 아래에서 올라오는 판. 화면 이동 대신 이걸 쓰면 쓰던 자리가 그대로 남는다.
 */
export function Sheet({ open, onClose, title, children }: Props) {
  // 열려 있는 동안 뒤 화면이 따라 스크롤되면 내용이 어디까지인지 헷갈린다
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      {/* 뒤를 눌러도 닫힌다. 화면 낭독기에는 아래 '닫기' 버튼 하나만 읽히게 숨긴다 */}
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 animate-fadein bg-ink/25"
      />
      <div className="relative max-h-[88vh] animate-sheetup overflow-y-auto rounded-t-[26px] bg-canvas pb-[max(24px,env(safe-area-inset-bottom))]">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-canvas/95 px-5 pb-3 pt-4 backdrop-blur">
          <h2 className="text-[17px] font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-pill bg-sunken px-3 py-1.5 text-[13px] text-inkdim"
          >
            닫기
          </button>
        </div>
        <div className="px-5">{children}</div>
      </div>
    </div>
  )
}
