import type { ReactNode } from 'react'
import { CharacterAvatar } from './CharacterAvatar'
import type { CharacterMood } from './types'

interface CharacterStageProps {
  mood: CharacterMood
  /** 캐릭터 위에 겹쳐 띄우는 것들 (+EXP, LEVEL UP 등) */
  overlay?: ReactNode
}

/**
 * 캐릭터가 서 있는 무대.
 *
 * 배경 / 소품 / 펫이 늘어날 자리를 여기로 몰아두고,
 * 캐릭터 자체(CharacterAvatar)는 순수하게 그림만 담당하게 나눴다.
 */
export function CharacterStage({ mood, overlay }: CharacterStageProps) {
  return (
    <div className="relative mx-auto flex h-[220px] w-full max-w-[280px] items-end justify-center">
      {/* 뒤에 깔리는 부드러운 원 — 캐릭터를 붕 뜨지 않게 잡아준다 */}
      <div className="absolute bottom-6 h-[180px] w-[180px] rounded-full bg-gradient-to-b from-ivorydeep/70 to-transparent" />
      <div className="relative h-[210px] w-[210px]">
        <CharacterAvatar mood={mood} />
      </div>
      {overlay}
    </div>
  )
}
