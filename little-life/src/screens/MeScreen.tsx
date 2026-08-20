import { useMemo, useState } from 'react'
import type { Quest, User } from '@/types'
import { CATEGORIES } from '@/types'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { CharacterAvatar } from '@/components/character/CharacterAvatar'
import { categoryStyle } from '@/lib/categories'
import { expToNextLevel } from '@/lib/level'
import { categoryExp, questStats } from '@/lib/stats'

interface MeScreenProps {
  user: User
  quests: Quest[]
  onRename: (name: string) => void
}

export function MeScreen({ user, quests, onRename }: MeScreenProps) {
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(user.name)

  const stats = useMemo(() => questStats(quests), [quests])
  const byCategory = useMemo(() => categoryExp(quests), [quests])
  const maxCategoryExp = Math.max(1, ...CATEGORIES.map((c) => byCategory[c]))

  const commitName = () => {
    onRename(draftName)
    setEditing(false)
  }

  return (
    <div className="animate-risein">
      <header className="flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 rounded-full bg-milk p-1 ring-1 ring-line">
          <CharacterAvatar mood="happy" />
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              value={draftName}
              autoFocus
              maxLength={20}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitName()
                if (e.key === 'Escape') {
                  setDraftName(user.name)
                  setEditing(false)
                }
              }}
              className="h-9 w-full rounded-xl border border-line bg-milk px-3 text-[20px] font-semibold text-ink outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraftName(user.name)
                setEditing(true)
              }}
              className="block truncate text-left text-[22px] font-semibold tracking-[-0.01em] text-ink"
            >
              {user.name}
            </button>
          )}
          <p className="mt-0.5 font-game text-[12px] tracking-[0.08em] text-inkdim">
            LV.{user.level} · {user.currentExp} / {expToNextLevel(user.level)} EXP
          </p>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-2.5">
        <StatTile label="TOTAL EXP" value={user.totalExp} />
        <StatTile label="LEVEL" value={user.level} />
        <StatTile label="QUEST CLEAR" value={stats.totalCompleted} />
        <StatTile label="THIS WEEK" value={stats.weekCompleted} />
      </section>

      <section className="mt-6">
        <h2 className="mb-3 font-game text-[12px] tracking-[0.18em] text-inkdim">CATEGORY EXP</h2>
        <Card className="space-y-3.5 py-5">
          {CATEGORIES.map((c) => {
            const exp = byCategory[c]
            const style = categoryStyle(c)
            return (
              <div key={c}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className={`font-game text-[11px] tracking-[0.12em] ${style.text}`}>{c}</span>
                  <span className="font-game text-[11px] tracking-[0.06em] text-inkdim">{exp}</span>
                </div>
                <ProgressBar
                  value={exp / maxCategoryExp}
                  thickness="sm"
                  barClassName={style.bar}
                />
              </div>
            )
          })}
        </Card>
      </section>

      <p className="mt-6 text-center text-[12px] leading-relaxed text-inkfaint">
        쉬어간 날도 모험의 일부예요.
        <br />
        언제 돌아와도 이어서 시작할 수 있어요.
      </p>
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Card className="px-4 py-3.5">
      <p className="font-game text-[10px] tracking-[0.14em] text-inkfaint">{label}</p>
      <p className="mt-1 font-game text-[24px] leading-none text-ink">{value}</p>
    </Card>
  )
}
