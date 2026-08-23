import type { ReactNode } from 'react'
import { Portal } from './Portal'
import { useOverlay } from '@/hooks/useOverlay'
import { cn } from './cn'

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
  /**
   * 내용이 줄어도 시트 높이를 붙잡아둔다.
   *
   * 시트는 아래에 붙어 있어서 내용이 짧아지면 윗변이 내려온다.
   * 검색처럼 글자를 칠 때마다 내용이 바뀌는 화면에서는 그때마다 시트가
   * 손가락 밑에서 움직인다. 그런 화면은 높이를 고정해두는 게 맞다.
   */
  fill?: boolean
  children: ReactNode
}

/** 모바일에서 아래에서 올라오는 시트. */
export function BottomSheet({
  open,
  onClose,
  title,
  onBack,
  backLabel = '뒤로',
  fill = false,
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
          className={cn(
            'relative flex w-full max-w-[430px] animate-sheetup flex-col rounded-t-[28px] bg-surface shadow-sheet',
            fill ? 'h-[92dvh]' : 'max-h-[92dvh]',
          )}
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

          <div
            className={cn(
              'overflow-y-auto px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-1',
              // 높이를 고정한 시트에서만 본문이 남은 자리를 채운다.
              // 높이가 내용에 따라 정해지는 시트에 flex-1 을 주면
              // 기준 크기가 0 이 되어 짧은 시트가 머리말만 남고 접힌다.
              fill && 'min-h-0 flex-1',
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </Portal>
  )
}
