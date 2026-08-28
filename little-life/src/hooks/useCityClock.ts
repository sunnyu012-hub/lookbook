import { useEffect, useRef, useState } from 'react'
import { todayKey } from '@/lib/date'

/**
 * 켜둔 채로 시간이 흐를 때 도시를 다시 그린다.
 *
 * ── 왜 필요한가 ─────────────────────────────────────────
 *
 * NPC 자리도 가게 영업도 전부 `new Date()` 에서 계산한다. 그런데 계산은
 * 그릴 때만 일어나서, 앱을 아침에 켜두고 점심에 다시 보면 아침 도시가
 * 그대로 떠 있다. 시간이 흐른 걸 아무도 알려주지 않기 때문이다.
 *
 * ── 왜 1분마다 안 도는가 ────────────────────────────────
 *
 * 도시가 달라지는 건 **정각**뿐이다 (시간대 경계도 가게 여닫는 시각도
 * 전부 정시). 그래서 다음 정각까지 한 번 기다렸다가 깨운다.
 * 하루에 스물네 번, 그때마다 문자열 하나 비교한다.
 *
 * 앱을 접어뒀다 다시 펼 때도 확인한다 — 접혀 있는 동안 타이머가
 * 밀리는 기기가 있어서, 돌아오면 시(hour)가 바뀌었는지 직접 본다.
 */

function hourKey(now: Date): string {
  return `${todayKey(now)}:${now.getHours()}`
}

function msUntilNextHour(now: Date): number {
  const next = new Date(now)
  next.setMinutes(0, 0, 0)
  next.setHours(next.getHours() + 1)
  // 기기 시간이 뒤로 튀어도 최소 1초는 기다린다 — 0 이면 타이머가 폭주한다.
  return Math.max(1000, next.getTime() - now.getTime())
}

export function useCityClock(): Date {
  const [now, setNow] = useState(() => new Date())
  const keyRef = useRef(hourKey(now))

  useEffect(() => {
    let timer = 0

    /** 시(hour)가 실제로 넘어갔을 때만 다시 그린다 */
    const sync = () => {
      const current = new Date()
      const key = hourKey(current)
      if (key !== keyRef.current) {
        keyRef.current = key
        setNow(current)
      }
      timer = window.setTimeout(sync, msUntilNextHour(current))
    }

    timer = window.setTimeout(sync, msUntilNextHour(new Date()))

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      window.clearTimeout(timer)
      sync()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return now
}
