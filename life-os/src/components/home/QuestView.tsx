import { useState } from 'react'
import type { EnergyMode } from '@/types'
import { PixelImage } from '@/components/pixel/PixelImage'
import { SparkleBurst } from '@/components/pixel/PixelSparkle'
import type { QuestStore } from '@/hooks/useQuests'
import { todayKey } from '@/lib/date'
import { questsFor, totalXp } from '@/lib/quests'
import { cn } from '@/lib/cn'

/** 오늘의 퀘스트 — 체크 · 아이콘 · 이름 · XP */
export function QuestView({ mode, questStore }: { mode: EnergyMode | null; questStore: QuestStore }) {
  const quests = questsFor(mode ?? 'NORMAL')
  const done = questStore.doneFor(todayKey())
  const [justDone, setJustDone] = useState<string | null>(null)

  const toggle = (id: string) => {
    questStore.toggle(todayKey(), id)
    if (!done.includes(id)) {
      setJustDone(id)
      setTimeout(() => setJustDone((cur) => (cur === id ? null : cur)), 900)
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center">
        <span className="plabel text-ink">
          {done.length}/{quests.length} 완료
        </span>
        <span className="ml-auto font-pixel text-[11px] text-peachdeep">
          {totalXp(quests, done)} XP
        </span>
      </div>

      <ul>
        {quests.map((quest) => {
          const checked = done.includes(quest.id)
          return (
            <li key={quest.id}>
              <button
                type="button"
                onClick={() => toggle(quest.id)}
                aria-pressed={checked}
                className="press relative flex w-full items-center gap-2.5 py-2 text-left"
              >
                <span
                  className={cn(
                    'relative flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-[5px]',
                    'border-[1.5px] transition-all duration-150',
                    checked ? 'border-pinkdeep bg-pink' : 'border-borderdeep bg-ivory',
                  )}
                >
                  {checked && <Check />}
                  <SparkleBurst show={justDone === quest.id} />
                </span>
                <PixelImage asset={quest.icon} height={19} className={cn(checked && 'opacity-55')} />
                <span
                  className={cn(
                    'flex-1 text-[13px] leading-tight transition-colors duration-150',
                    checked ? 'text-inkdim line-through' : 'text-ink',
                  )}
                >
                  {quest.label}
                </span>
                <span
                  className={cn(
                    'font-pixel text-[10px] tabular-nums',
                    checked ? 'text-inkfaint' : 'text-peachdeep',
                  )}
                >
                  +{quest.xp}
                </span>
                {justDone === quest.id && (
                  <span className="pointer-events-none absolute right-1 top-0 animate-xpfloat font-pixel text-[11px] text-pinkdeep">
                    +{quest.xp} XP
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** 체크 표시 — 시트에 체크 아이콘이 없어 도형으로 그린다 */
function Check() {
  return (
    <span
      aria-hidden
      className="block h-[8px] w-[4px] rotate-45 border-b-[2px] border-r-[2px] border-white"
      style={{ marginTop: -2 }}
    />
  )
}
