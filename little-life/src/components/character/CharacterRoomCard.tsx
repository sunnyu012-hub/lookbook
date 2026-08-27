import type { ReactNode } from 'react'
import type { CollectionState, User } from '@/types'
import { CharacterSkinRenderer } from './CharacterSkinRenderer'
import { RoomScene } from './RoomScene'
import { RoomCanvas } from '@/components/room/RoomCanvas'
import { LevelBadge } from './LevelBadge'
import { ExpProgress } from './ExpProgress'
import type { CharacterMood } from './types'
import { titleForLevel } from '@/lib/titles'
import { findRoom } from '@/lib/collection/rooms'
import { EFFECT } from '@/lib/assets'
import { findSkin, hasPose } from '@/lib/character/skins'

interface CharacterRoomCardProps {
  user: User
  mood: CharacterMood
  /** 지금 꾸며둔 방 */
  collection: CollectionState
  /** 캐릭터 위에 겹쳐 띄우는 것들 (+EXP 등) */
  overlay?: ReactNode
  onDecorate: () => void
  onOpenCollection: () => void
  /** 부엌을 열었을 때만 방 안에 자리가 생긴다 */
  kitchenOpen?: boolean
  onOpenKitchen?: () => void
  /** 내 모습 고르기 */
  onOpenLook: () => void
}

/**
 * 자세마다 그림 비율이 달라서 자리를 따로 잡아준다.
 * 앉은 그림은 옆으로 넓고, 서 있는 그림은 세로로 길다.
 *
 * 자세 그림이 따로 없는 모습(대부분)은 늘 서 있는 한 장이라 idle 자리를 쓴다.
 *
 * ── idle 만 넉넉하게 잡는 이유 ─────────────────────────
 *
 * 나머지 셋은 처음부터 있던 그림 파일이라 크기가 안 변한다. idle 은
 * 옷 캔버스를 쓰는데, 그 캔버스는 제일 넓은 한 벌에 맞춰져 있다 —
 * 머리가 긴 옷이 새로 들어오면 캔버스가 옆으로 넓어진다.
 * 폭이 빠듯하면 그때마다 캐릭터가 조금씩 작아진다(실제로 38% 에서
 * 162px 이 156px 이 됐다). 넉넉히 두면 늘 높이로 재서 62% 그대로다.
 * 얼마나 넉넉한지는 테스트가 붙잡는다.
 */
const PLACEMENT: Record<CharacterMood, { width: string; bottom: string }> = {
  idle: { width: '45%', bottom: '7%' },
  questClear: { width: '40%', bottom: '7%' },
  levelUp: { width: '46%', bottom: '7%' },
  resting: { width: '56%', bottom: '9%' },
}

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
  overlay,
  onDecorate,
  onOpenCollection,
  kitchenOpen = false,
  onOpenKitchen,
  onOpenLook,
}: CharacterRoomCardProps) {
  const skin = findSkin(user.selectedSkinId)
  // 이 자세의 그림이 실제로 따로 있을 때만 그 자세의 자리를 쓴다.
  // 없으면 서 있는 그림이 나오는데, 앉은 자세 자리에 세우면 너무 커진다.
  const pose = skin && hasPose(skin, mood) ? mood : 'idle'
  const place = PLACEMENT[pose]
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
          <RoomScene hideBeanbag={pose === 'resting'} />
        )}

        {/* 캐릭터는 바닥 가운데에 선다 */}
        <div
          className="absolute left-1/2 h-[62%] -translate-x-1/2 transition-[width,bottom] duration-300 ease-out"
          style={{ width: place.width, bottom: place.bottom }}
        >
          <CharacterSkinRenderer skinId={user.selectedSkinId} mood={mood} />
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
            onClick={onOpenLook}
            className="rounded-pill bg-surface/90 px-3 py-1.5 text-[11.5px] font-medium text-inkdim shadow-soft backdrop-blur-sm active:scale-[0.96]"
          >
            모습
          </button>
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

        {/*
          방 안의 작은 자리.

          아래 내비게이션에 버튼을 하나 더 다는 대신 방 안에 둔다 —
          부엌은 매일 들르는 곳이 아니라 생각났을 때 들르는 곳이다.
          아직 못 열었으면 아무것도 안 보인다.
        */}
        {kitchenOpen && onOpenKitchen && (
          <button
            type="button"
            onClick={onOpenKitchen}
            aria-label="작은 부엌"
            className="absolute bottom-2.5 left-2.5 flex h-11 w-11 items-center justify-center rounded-full bg-surface/90 text-[20px] shadow-soft backdrop-blur-sm active:scale-[0.94]"
          >
            🍳
          </button>
        )}

        {overlay}
      </div>

      {/*
        장면 아래 정보 한 줄.

        예전에는 큰 레벨 배지가 방 그림 위로 반쯤 걸쳐 있어서, 방을 꾸며놓고
        봐도 제일 먼저 눈에 들어오는 게 분홍 동그라미였다. 홈에서 제일 큰
        시각 요소는 방과 캐릭터여야 한다. 배지는 작게 줄이고 한 줄로 붙였다.
      */}
      <div className="px-4 pb-4 pt-3.5">
        <div className="flex items-center gap-2">
          <LevelBadge level={user.level} size="xs" className="shadow-none ring-0" />
          <p className="min-w-0 truncate text-[15px] font-semibold text-ink">{user.name}</p>
          <span className="shrink-0 text-[11px] text-inkfaint">·</span>
          <p className="shrink-0 text-[12px] text-inkdim">{titleForLevel(user.level)}</p>
        </div>

        <div className="mt-3">
          <ExpProgress level={user.level} currentExp={user.currentExp} />
        </div>
      </div>
    </section>
  )
}
