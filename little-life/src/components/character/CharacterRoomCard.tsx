import type { ReactNode } from 'react'
import type { CollectionState, User, WardrobeState } from '@/types'
import { AvatarRenderer } from './AvatarRenderer'
import { RoomScene } from './RoomScene'
import { RoomCanvas } from '@/components/room/RoomCanvas'
import { LevelBadge } from './LevelBadge'
import { ExpProgress } from './ExpProgress'
import type { CharacterMood } from './types'
import { titleForLevel } from '@/lib/titles'
import { findRoom } from '@/lib/collection/rooms'
import { EFFECT } from '@/lib/assets'

interface CharacterRoomCardProps {
  user: User
  mood: CharacterMood
  /** 지금 꾸며둔 방 */
  collection: CollectionState
  /** 지금 입고 있는 옷 */
  wardrobe: WardrobeState
  /** 캐릭터 위에 겹쳐 띄우는 것들 (+EXP 등) */
  overlay?: ReactNode
  onDecorate: () => void
  onOpenCollection: () => void
  onOpenWardrobe: () => void
}

/**
 * 캐릭터가 서는 자리.
 *
 * 예전에는 기분마다 그림이 달라서(앉은 그림은 옆으로 넓었다) 자리도 달랐다.
 * 지금은 옷을 겹쳐 입히느라 한 포즈로 그리고, 기분은 움직임으로만 낸다.
 * 그래서 자리는 하나면 된다.
 */
const PLACEMENT = { width: '40%', bottom: '7%' }

/**
 * HOME 의 주인공 카드.
 *
 * 방·캐릭터·레벨·EXP 를 한 덩어리로 묶는다.
 * 아무것도 안 놓은 방은 원래 있던 그림 그대로 두고,
 * 하나라도 놓은 순간부터 내가 놓은 것들이 보인다 —
 * 첫날부터 텅 빈 방을 보여주면 그건 시작이 아니라 숙제다.
 */
export function CharacterRoomCard({
  user,
  mood,
  collection,
  wardrobe,
  overlay,
  onDecorate,
  onOpenCollection,
  onOpenWardrobe,
}: CharacterRoomCardProps) {
  const roomId = collection.currentRoomId
  const room = findRoom(roomId)
  const placed = collection.rooms[roomId] ?? []
  const effect = collection.roomEffects[roomId] ?? null
  const decorated = placed.length > 0 || effect !== null || roomId !== 'MY_ROOM'

  return (
    <section className="overflow-hidden rounded-card border border-line bg-surface shadow-soft">
      <div className="relative aspect-[16/12] w-full">
        {decorated && room ? (
          // RoomCanvas 는 스스로 relative 라서 여기서 absolute 를 덧씌우면 서로 부딪힌다.
          // (같은 property 라 CSS 순서가 이기고, 그러면 카드 안에서 높이가 0 이 된다)
          // 자리는 바깥 div 가 잡고, 캔버스는 그 안을 채운다.
          <div className="absolute inset-0">
            <RoomCanvas room={room} placed={placed} effect={effect} className="h-full w-full" />
          </div>
        ) : (
          <RoomScene hideBeanbag={mood === 'resting'} />
        )}

        {/* 캐릭터는 바닥 가운데에 선다 */}
        <div
          className="absolute left-1/2 h-[62%] -translate-x-1/2"
          style={{ width: PLACEMENT.width, bottom: PLACEMENT.bottom }}
        >
          <AvatarRenderer outfit={wardrobe.outfit} mood={mood} />
        </div>

        {(mood === 'questClear' || mood === 'levelUp') && (
          <img
            src={EFFECT.sparkle}
            alt=""
            aria-hidden
            className="absolute bottom-[52%] left-[24%] w-[13%] animate-sparkle select-none"
          />
        )}

        <div className="absolute right-2.5 top-2.5 flex gap-1.5">
          <button
            type="button"
            onClick={onOpenCollection}
            className="rounded-pill bg-surface/90 px-3 py-1.5 text-[11.5px] font-medium text-inkdim shadow-soft backdrop-blur-sm active:scale-[0.96]"
          >
            도감
          </button>
          <button
            type="button"
            onClick={onDecorate}
            className="rounded-pill bg-surface/90 px-3 py-1.5 text-[11.5px] font-medium text-inkdim shadow-soft backdrop-blur-sm active:scale-[0.96]"
          >
            꾸미기
          </button>
        </div>

        {/* 옷장은 캐릭터 옆에 둔다 — 방을 꾸미는 것과 옷을 갈아입는 건 다른 일이다 */}
        <button
          type="button"
          onClick={onOpenWardrobe}
          aria-label="옷장 열기"
          className="absolute bottom-3 right-2.5 flex items-center gap-1 rounded-pill bg-surface/90 px-3 py-1.5 text-[11.5px] font-medium text-inkdim shadow-soft backdrop-blur-sm active:scale-[0.96]"
        >
          <span aria-hidden>🧺</span>
          옷장
        </button>

        {overlay}
      </div>

      <div className="relative px-4 pb-4 pt-1">
        {/* 레벨 배지는 방 그림 위로 살짝 걸친다 */}
        <div className="absolute -top-7 left-4">
          <LevelBadge level={user.level} />
        </div>

        <div className="ml-[74px] min-h-[34px]">
          <p className="truncate text-[15px] font-semibold text-ink">{user.name}</p>
          <p className="text-[12px] text-inkdim">{titleForLevel(user.level)}</p>
        </div>

        <div className="mt-3">
          <ExpProgress level={user.level} currentExp={user.currentExp} />
        </div>
      </div>
    </section>
  )
}
