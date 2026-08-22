import type { FriendshipLevel } from '@/types'
import { ProgressBar } from '@/components/ui/ProgressBar'
import {
  FRIENDSHIP_KO,
  friendshipLevel,
  friendshipLevelIndex,
  friendshipProgress,
} from '@/lib/city/npcs'
import {
  reputationLevel,
  reputationLevelNumber,
  reputationProgress,
} from '@/lib/city/reputation'
import { FRIENDSHIP_SHORT, REPUTATION_SHORT } from '@/lib/labels'
import { cn } from '@/components/ui/cn'

/** 친밀도 단계를 하트 개수로도 보여준다 — 색만으로 구분하지 않으려는 것이다. */
export function FriendshipHearts({ friendship }: { friendship: number }) {
  const filled = friendshipLevelIndex(friendshipLevel(friendship)) + 1
  return (
    <span className="inline-flex items-center gap-[1px]" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className={cn('text-[11px] leading-none', i < filled ? '' : 'opacity-25')}>
          {i < filled ? '💗' : '🤍'}
        </span>
      ))}
    </span>
  )
}

export function FriendshipBadge({ friendship }: { friendship: number }) {
  const level: FriendshipLevel = friendshipLevel(friendship)
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill bg-rose-soft px-2 py-0.5">
      <FriendshipHearts friendship={friendship} />
      <span className="text-[11px] font-medium text-rose-deep">{FRIENDSHIP_SHORT[level]}</span>
    </span>
  )
}

/** NPC 상세에서 쓰는 큰 친밀도 표시 */
export function FriendshipMeter({ friendship }: { friendship: number }) {
  const level = friendshipLevel(friendship)
  const maxed = friendshipLevelIndex(level) === 4

  return (
    <div className="rounded-card bg-rose-soft/60 px-4 py-3.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <FriendshipHearts friendship={friendship} />
          <span className="text-[12px] font-medium text-rose-deep">{FRIENDSHIP_SHORT[level]}</span>
        </span>
        <span className="font-game text-[11px] text-rose-deep">{friendship}</span>
      </div>
      <div className="mt-2">
        <ProgressBar
          value={friendshipProgress(friendship)}
          barClassName="bg-rose"
          thickness="sm"
          aria-label="친밀도"
        />
      </div>
      <p className="mt-1.5 text-[12px] text-inkdim">
        {maxed ? '더 가까워질 수는 없어. 그래도 계속 봐.' : FRIENDSHIP_KO[level]}
      </p>
    </div>
  )
}

/** 지역 평판 */
export function ReputationBadge({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-pill bg-sage-soft px-2 py-0.5">
      <span className="text-[11px] font-medium text-sage-deep">
        Lv.{reputationLevelNumber(value)} {REPUTATION_SHORT[reputationLevel(value)]}
      </span>
    </span>
  )
}

export function ReputationMeter({ value }: { value: number }) {
  return (
    <div className="rounded-card bg-sage-soft/60 px-4 py-3.5">
      <div className="flex items-center justify-between">
        <span className="font-game text-[10px] tracking-[0.1em] text-sage-deep">
          평판 Lv.{reputationLevelNumber(value)}
        </span>
        <span className="font-game text-[11px] text-sage-deep">{value}</span>
      </div>
      <div className="mt-2">
        <ProgressBar
          value={reputationProgress(value)}
          barClassName="bg-sage"
          thickness="sm"
          aria-label="지역 평판"
        />
      </div>
      <p className="mt-1.5 text-[12px] text-inkdim">
        {REPUTATION_SHORT[reputationLevel(value)]} · 여기서 뭔가 할수록 쌓여.
      </p>
    </div>
  )
}
