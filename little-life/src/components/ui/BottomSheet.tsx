import { useEffect, type ReactNode } from 'react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

/** 모바일에서 아래에서 올라오는 시트. 퀘스트 만들기에 쓴다. */
export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  // 시트가 떠 있는 동안 뒤 화면이 같이 스크롤되면 어색하다.
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = original
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 animate-fadein bg-ink/25 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-[430px] animate-sheetup rounded-t-[28px] bg-milk px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3 shadow-sheet"
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-pill bg-line" />
        {title && <h2 className="mb-5 text-[19px] font-semibold text-ink">{title}</h2>}
        {children}
      </div>
    </div>
  )
}
