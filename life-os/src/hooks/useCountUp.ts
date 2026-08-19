import { useEffect, useRef, useState } from 'react'

/** 큰 숫자를 0에서 목표값까지 부드럽게 올린다. 값이 바뀌면 현재 값에서 이어서 움직인다. */
export function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    const from = fromRef.current
    const start = performance.now()
    let frame = 0

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const next = from + (target - from) * eased
      setValue(next)
      fromRef.current = next
      if (t < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return Math.round(value)
}
