import { useState } from 'react'
import type { User } from '@/types'
import { CharacterAvatar } from '@/components/character/CharacterAvatar'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { levelProgress, requiredExp } from '@/lib/level'
import { titleForLevel } from '@/lib/titles'

interface ProfileHeaderProps {
  user: User
  onRename: (name: string) => void
}

export function ProfileHeader({ user, onRename }: ProfileHeaderProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(user.name)

  const commit = () => {
    onRename(draft)
    setEditing(false)
  }

  return (
    <header>
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-sunken ring-1 ring-line">
          {/* 얼굴만 보이도록 아래쪽으로 밀어 확대한다 */}
          <div className="h-[128px] w-[102px] translate-x-[-19px] translate-y-[-6px]">
            <CharacterAvatar mood="questClear" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
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
              className="min-h-[44px] w-full rounded-btn border border-line bg-surface px-3 text-[20px] font-semibold text-ink outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(user.name)
                setEditing(true)
              }}
              className="block max-w-full truncate text-left text-[22px] font-semibold tracking-[-0.01em] text-ink"
            >
              {user.name}
            </button>
          )}
          <p className="mt-0.5 font-game text-[12px] tracking-[0.06em] text-inkdim">
            LV. {user.level} · {titleForLevel(user.level)}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <ProgressBar
          value={levelProgress(user.level, user.currentExp)}
          thickness="sm"
          aria-label={`${requiredExp(user.level)} EXP 중 ${user.currentExp} EXP`}
        />
        <p className="mt-1.5 text-right font-game text-[11px] tracking-[0.04em] text-inkdim">
          {user.currentExp} / {requiredExp(user.level)} EXP
        </p>
      </div>
    </header>
  )
}
