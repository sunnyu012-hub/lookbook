import { useEffect, useRef, useState } from 'react'
import type { HomeEffectId, PlacedItem, RoomDef } from '@/types'
import { findCollectionItem } from '@/lib/collection/catalog'
import { RoomEffectLayer } from './RoomEffectLayer'
import { cn } from '@/components/ui/cn'

/**
 * 방 하나를 그린다.
 *
 * 격자에 딱딱 맞추지 않는다. 자유 좌표(방 크기 대비 %)로 두면
 * 화면 크기가 달라져도 배치가 그대로고, 조금 삐뚤어도 그게 더 사람 방 같다.
 *
 * 앞뒤는 따로 저장하지 않고 y 좌표로 정한다 — 아래에 있는 것이 앞에 온다.
 * 실제 방도 그렇게 보인다.
 */

interface RoomCanvasProps {
  room: RoomDef
  placed: PlacedItem[]
  effect: HomeEffectId | null
  /** 꾸미기 중이면 집을 수 있다 */
  editing?: boolean
  selectedUid?: string | null
  onSelect?: (uid: string | null) => void
  onMove?: (uid: string, x: number, y: number) => void
  className?: string
  children?: React.ReactNode
}

export function RoomCanvas({
  room,
  placed,
  effect,
  editing = false,
  selectedUid = null,
  onSelect,
  onMove,
  className,
  children,
}: RoomCanvasProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  /** 끄는 동안에는 여기 값을 쓰고, 손을 떼면 저장한다 */
  const [drag, setDrag] = useState<{ uid: string; x: number; y: number } | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setWidth(el.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const sorted = [...placed].sort((a, b) => a.y - b.y)

  const pointerPercent = (event: React.PointerEvent) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return null
    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    }
  }

  return (
    // 끄는 동안의 움직임은 물건이 아니라 방 전체에서 받는다.
    // 물건 위에서만 받으면 손가락이 물건 밖으로 나가는 순간 끊긴다.
    <div
      ref={ref}
      className={cn('relative overflow-hidden', className)}
      onPointerDown={editing ? () => onSelect?.(null) : undefined}
      onPointerMove={
        editing && drag
          ? (event) => {
              const next = pointerPercent(event)
              if (next) setDrag({ uid: drag.uid, ...next })
            }
          : undefined
      }
      onPointerUp={
        editing && drag
          ? () => {
              onMove?.(drag.uid, drag.x, drag.y)
              setDrag(null)
            }
          : undefined
      }
      onPointerLeave={editing && drag ? () => setDrag(null) : undefined}
    >
      {/* 벽과 바닥 */}
      <div className="absolute inset-0" style={{ background: room.wall }} aria-hidden />
      <div
        className="absolute inset-x-0 bottom-0 h-[26%]"
        style={{ background: room.floor }}
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-[26%] h-px bg-[#E3C6A5]" aria-hidden />

      <RoomEffectLayer effect={effect} />

      {children}

      {sorted.map((item) => {
        const def = findCollectionItem(item.itemId)
        if (!def) return null

        const live = drag?.uid === item.uid ? drag : item
        const boxWidth = ((def.footprint?.width ?? 12) / 100) * width * item.scale
        const selected = selectedUid === item.uid

        return (
          <button
            key={item.uid}
            type="button"
            disabled={!editing}
            aria-label={def.nameKo}
            data-uid={item.uid}
            onPointerDown={(event) => {
              if (!editing) return
              event.stopPropagation()
              onSelect?.(item.uid)
              setDrag({ uid: item.uid, x: item.x, y: item.y })
            }}
            className={cn(
              'absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center',
              'leading-none disabled:cursor-default',
              editing && 'touch-none rounded-card',
              selected && 'ring-2 ring-coral ring-offset-1 ring-offset-transparent',
            )}
            style={{
              left: `${live.x}%`,
              top: `${live.y}%`,
              width: `${boxWidth}px`,
              height: `${boxWidth}px`,
              fontSize: `${Math.max(10, boxWidth * 0.82)}px`,
              transform: `translate(-50%, -50%) scaleX(${item.flipped ? -1 : 1})`,
            }}
          >
            <span aria-hidden>{def.icon}</span>
          </button>
        )
      })}
    </div>
  )
}
