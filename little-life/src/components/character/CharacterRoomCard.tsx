import type { ReactNode } from 'react'
import type { User } from '@/types'
import { CharacterAvatar } from './CharacterAvatar'
import { RoomBackground } from './RoomBackground'
import { LevelBadge } from './LevelBadge'
import { ExpProgress } from './ExpProgress'
import type { CharacterMood } from './types'

interface CharacterRoomCardProps {
  user: User
  mood: CharacterMood
  /** 캐릭터 위에 겹쳐 띄우는 것들 (+EXP 등) */
  overlay?: ReactNode
}

/**
 * HOME 의 주인공 카드.
 *
 * 방 배경 · 캐릭터 · 레벨 · EXP 를 한 덩어리로 묶는다.
 * 나중에 방 꾸미기나 펫이 붙으면 전부 이 카드 안에서 해결된다.
 */
export function CharacterRoomCard({ user, mood, overlay }: CharacterRoomCardProps) {
  return (
    <section className="overflow-hidden rounded-card border border-line/70 bg-surface shadow-soft">
      <div className="relative h-[248px]">
        <div className="absolute inset-0">
          <RoomBackground />
        </div>

        {/* 캐릭터는 러그 위에 서 있다 */}
        <div className="absolute bottom-[18px] left-1/2 h-[196px] w-[158px] -translate-x-1/2">
          <CharacterAvatar mood={mood} />
        </div>

        <div className="absolute left-4 top-4">
          <LevelBadge level={user.level} />
        </div>

        {overlay}
      </div>

      <div className="border-t border-line/60 px-5 py-4">
        <ExpProgress level={user.level} currentExp={user.currentExp} />
      </div>
    </section>
  )
}
