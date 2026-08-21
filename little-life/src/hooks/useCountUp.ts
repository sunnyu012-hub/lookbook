import { useEffect, useRef, useState } from 'react'

/**
 * 숫자가 툭 바뀌지 않고 스르륵 올라가게 한다. EXP 표시에 쓴다.
 * 값이 줄어들 때(레벨업으로 currentExp 가 리셋될 때)는 애니메이션 없이 바로 맞춘다.
 */
export function useCountUp(target: number, duration = 600): number {
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const from = fromRef.current
    if (from === target) return

    if (target < from) {
      fromRef.current = target
      setValue(target)
      return
    }

    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const next = Math.round(from + (target - from) * eased)
      setValue(next)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
      }
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      fromRef.current = target
    }
  }, [target, duration])

  return value
}
