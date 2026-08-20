import { useEffect, useState } from 'react'
import { RoomPlaceholder } from './RoomPlaceholder'
import type { TimeOfDay } from '@/lib/room/scene'

/**
 * 방의 배경 — 완성된 픽셀 일러스트 한 장.
 *
 * 그림을 넣는 곳:
 *   public/assets/pixel/room/room-base-day.png       (지금 쓰는 것)
 *   public/assets/pixel/room/room-base-morning.png   (나중에)
 *   public/assets/pixel/room/room-base-evening.png
 *   public/assets/pixel/room/room-base-night.png
 *
 * 시간대 그림이 없으면 낮 그림으로, 낮 그림도 없으면 빈 방을 그려서 무대만 세운다.
 * 가구를 코드로 조립하지 않는다.
 */
const src = (tod: TimeOfDay) => `/assets/pixel/room/room-base-${tod}.png`

type Stage = 'variant' | 'day' | 'placeholder'

export function RoomBase({ time }: { time: TimeOfDay }) {
  const [stage, setStage] = useState<Stage>(time === 'day' ? 'day' : 'variant')

  // 시간대가 바뀌면 다시 그 시간대 그림부터 시도한다
  useEffect(() => setStage(time === 'day' ? 'day' : 'variant'), [time])

  if (stage === 'placeholder') return <RoomPlaceholder />

  return (
    <img
      src={stage === 'variant' ? src(time) : src('day')}
      alt=""
      aria-hidden
      draggable={false}
      onError={() => setStage(stage === 'variant' ? 'day' : 'placeholder')}
      className="pixelated absolute inset-0 h-full w-full object-cover"
    />
  )
}
