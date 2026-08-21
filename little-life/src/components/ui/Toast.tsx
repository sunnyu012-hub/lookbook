interface ToastProps {
  message: string | null
  /** 토스트 안에 넣는 되돌리기 같은 버튼 */
  action?: { label: string; onClick: () => void } | null
}

/** 화면 위쪽에 잠깐 떴다 사라지는 안내. */
export function Toast({ message, action }: ToastProps) {
  if (!message) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+14px)] z-[65] flex justify-center px-5"
    >
      <span className="flex animate-toastin items-center gap-2 rounded-pill bg-ink py-1.5 pl-4 pr-1.5 text-[13px] text-surface shadow-lift">
        {message}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            // 토스트 전체는 클릭을 막아뒀으니 이 버튼만 다시 열어준다
            className="pointer-events-auto rounded-pill bg-surface/20 px-3 py-1.5 text-[12.5px] font-medium active:scale-95"
          >
            {action.label}
          </button>
        )}
      </span>
    </div>
  )
}
