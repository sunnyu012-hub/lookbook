import type { ReactNode } from 'react'
import { Portal } from './Portal'
import { useOverlay } from '@/hooks/useOverlay'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  /**
   * 앞 화면으로 돌아갈 수 있으면 넘긴다.
   * 잘못 골라 들어왔을 때 닫았다가 처음부터 다시 하지 않아도 된다.
   */
  onBack?: () => void
  backLabel?: string
  children: ReactNode
}

/** 모바일에서 아래에서 올라오는 시트. */
export function BottomSheet({
  open,
  onClose,
  title,
  onBack,
  backLabel = '뒤로',
  children,
}: BottomSheetProps) {
  // 스크롤 잠금·Esc·폰 뒤로 가기를 한곳에서 다룬다 (lib/overlay.ts)
  // 앞 화면이 있으면 뒤로 가기는 거기로 돌아간다 — 한 번에 다 닫으면
  // 세트를 잘못 골랐을 때 처음부터 다시 열어야 한다.
  useOverlay(open, onBack ?? onClose)

  if (!open) return null

  return (
    <Portal>
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
          // 키보드가 올라와도 내용이 잘리지 않게 최대 높이를 두고 안에서 스크롤한다.
          className="relative flex max-h-[92dvh] w-full max-w-[430px] animate-sheetup flex-col rounded-t-[28px] bg-surface shadow-sheet"
        >
          <div className="shrink-0 px-3 pt-3">
            <div className="mx-auto h-1 w-9 rounded-pill bg-line" />

            {/* 손잡이만 있으면 어떻게 닫는지 모르는 사람이 있다. 버튼을 늘 둔다. */}
            <div className="mt-1 flex h-9 items-center justify-between">
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex h-9 items-center gap-1 rounded-pill px-2.5 text-[13px] font-medium text-inkdim active:scale-[0.96]"
                >
                  <span className="text-[15px] leading-none">←</span>
                  {backLabel}
                </button>
              ) : (
                <span className="h-9 w-9" aria-hidden />
              )}

              <button
                type="button"
                onClick={onClose}
                aria-label="닫기"
                className="flex h-9 w-9 items-center justify-center rounded-full text-[16px] leading-none text-inkfaint active:scale-[0.94]"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="overflow-y-auto px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-1">
            {children}
          </div>
        </div>
      </div>
    </Portal>
  )
}
