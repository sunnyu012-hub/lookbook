import { useEffect } from 'react'

interface Props {
  message: string
  onDone: () => void
}

export function Toast({ message, onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200)
    return () => clearTimeout(t)
  }, [message, onDone])

  return (
    <div
      role="status"
      className="animate-rise pointer-events-none fixed inset-x-0 z-50 flex justify-center"
      style={{ bottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 16px)' }}
    >
      <p className="rounded-full border border-line bg-elevated/95 px-5 py-3 text-[13px] backdrop-blur-xl">
        {message}
      </p>
    </div>
  )
}
