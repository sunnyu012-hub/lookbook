interface ToastProps {
  message: string | null
}

/** 화면 위쪽에 잠깐 떴다 사라지는 안내. "Quest added ✦" 정도에만 쓴다. */
export function Toast({ message }: ToastProps) {
  if (!message) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+14px)] z-[65] flex justify-center"
    >
      <span className="animate-toastin rounded-pill bg-ink px-4 py-2 text-[13px] text-surface shadow-lift">
        {message}
      </span>
    </div>
  )
}
