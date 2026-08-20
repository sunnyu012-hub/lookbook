import type { ReactNode } from 'react'
import type { User } from '@/types'
import { CharacterAvatar } from './CharacterAvatar'
import { RoomScene } from './RoomScene'
import { LevelBadge } from './LevelBadge'
import { ExpProgress } from './ExpProgress'
import type { CharacterMood } from './types'
import { titleForLevel } from '@/lib/titles'
import { EFFECT } from '@/lib/assets'

interface CharacterRoomCardProps {
  user: User
  mood: CharacterMood
  /** 캐릭터 위에 겹쳐 띄우는 것들 (+EXP 등) */
  overlay?: ReactNode
}

/**
 * HOME 의 주인공 카드.
 *
 * 방 · 캐릭터 · 레벨 · EXP 를 한 덩어리로 묶는다.
 * 나중에 방 꾸미기나 펫이 붙으면 전부 이 카드 안에서 해결된다.
 */
export function CharacterRoomCard({ user, mood, overlay }: CharacterRoomCardProps) {
  return (
    <section className="overflow-hidden rounded-card border border-line bg-surface shadow-soft">
      <div className="relative aspect-[16/12] w-full">
        <RoomScene />

        {/* 캐릭터는 러그 위에 선다 */}
        <div className="absolute bottom-[7%] left-1/2 h-[62%] w-[38%] -translate-x-1/2">
          <CharacterAvatar mood={mood} />
        </div>

        {mood !== 'idle' && (
          <img
            src={EFFECT.sparkle}
            alt=""
            aria-hidden
            className="absolute bottom-[52%] left-[26%] w-[13%] animate-sparkle select-none"
          />
        )}

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
