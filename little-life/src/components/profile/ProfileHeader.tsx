import { useState } from 'react'
import type { User } from '@/types'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { LevelBadge } from '@/components/character/LevelBadge'
import { levelProgress, requiredExp } from '@/lib/level'
import { titleForLevel } from '@/lib/titles'
import { CHARACTER_FACE, EFFECT } from '@/lib/assets'

interface ProfileHeaderProps {
  user: User
  onRename: (name: string) => void
}

/** 목업의 분홍 원형 프로필 카드. */
export function ProfileHeader({ user, onRename }: ProfileHeaderProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(user.name)

  const commit = () => {
    onRename(draft)
    setEditing(false)
  }

  return (
    <div className="rounded-card border border-line bg-surface px-5 pb-5 pt-6 text-center shadow-soft">
      <div className="relative mx-auto w-[124px]">
        <img
          src={EFFECT.sparkle}
          alt=""
          aria-hidden
          className="absolute -left-4 top-1 w-8 select-none"
        />
        <div className="flex h-[124px] w-[124px] items-end justify-center overflow-hidden rounded-full bg-coral-soft">
          <img
            src={CHARACTER_FACE.happy}
            alt="내 캐릭터"
            className="w-[104px] select-none object-contain"
            draggable={false}
          />
        </div>
        <LevelBadge level={user.level} size="sm" className="absolute -bottom-1 -right-2" />
      </div>

      <div className="mt-4">
        {editing ? (
          <input
            value={draft}
            autoFocus
            maxLength={20}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') {
                setDraft(user.name)
                setEditing(false)
              }
            }}
            aria-label="이름"
            className="min-h-[44px] w-full rounded-btn border border-line bg-canvas px-3 text-center text-[18px] font-semibold text-ink outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(user.name)
              setEditing(true)
            }}
            className="mx-auto flex max-w-full items-center gap-1.5"
          >
            <span className="truncate text-[19px] font-bold text-ink">{user.name}</span>
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-inkfaint" fill="none" aria-hidden>
              <path
                d="M4 20h4L19 9l-4-4L4 16v4Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        <p className="mt-1 text-[12.5px] text-inkdim">{titleForLevel(user.level)}</p>
      </div>

      <div className="mt-4 flex items-center gap-2.5">
        <span className="font-game text-[11px] tracking-[0.08em] text-inkdim">EXP</span>
        <ProgressBar
          className="flex-1"
          value={levelProgress(user.level, user.currentExp)}
          barClassName="bg-coral"
          aria-label={`${requiredExp(user.level)} EXP 중 ${user.currentExp} EXP`}
        />
        <span className="font-game text-[11px] text-inkdim">
          {user.currentExp} / {requiredExp(user.level)}
        </span>
      </div>
    </div>
  )
}
