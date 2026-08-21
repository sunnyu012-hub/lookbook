import { useState } from 'react'
import type { Preferences } from '@/types'
import { PixelImage } from '@/components/pixel/PixelImage'
import { QuestRow } from '@/components/quests/QuestRow'
import type { QuestStore } from '@/hooks/useQuests'
import { COMBO_STEPS, questById } from '@/lib/quests/master'
import { icons } from '@/lib/pixelAssets'
import { haptic } from '@/hooks/useHaptic'
import { cn } from '@/lib/cn'
import { helpsFocus, type DailyFocus } from '@/lib/quests/dailyFocus'

/** 오늘의 퀘스트 — 추천 5개 + 더 보러 가기 */
export function QuestView({
  questStore,
  prefs,
  onOpenBoard,
  onFavorite,
  focus,
}: {
  questStore: QuestStore
  prefs: Preferences
  onOpenBoard: () => void
  onFavorite: (questId: string) => void
  /** 오늘의 목표 — 도움이 되는 퀘스트에 작은 표시를 붙인다 */
  focus?: DailyFocus | null
}) {
  const [justDone, setJustDone] = useState<string | null>(null)
  const { picks, doneCount, previewXp, countOf, complete, undo, customQuests } = questStore

  const quests = picks
    .map((id) => questById(id, customQuests))
    .filter((q): q is NonNullable<typeof q> => Boolean(q))

  const nextCombo = COMBO_STEPS.find((c) => c.at > doneCount)

  const toggle = (id: string) => {
    const count = countOf(id)
    const quest = questById(id, customQuests)
    if (!quest) return
    if (count > 0 && !quest.repeatable) {
      undo(id)
      return
    }
    complete(id)
    setJustDone(id)
    setTimeout(() => setJustDone((cur) => (cur === id ? null : cur)), 900)
  }

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <span className="plabel text-ink">오늘 {doneCount}개 완료</span>
        {nextCombo && (
          <span className="plabel text-peachdeep">
            {nextCombo.at - doneCount}개 더 하면 +{nextCombo.bonus}
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            haptic()
            questStore.reroll()
          }}
          className="press ml-auto rounded-px2 border-[1.5px] border-border bg-cream px-2 py-1 font-pixel text-[9px] uppercase text-inkdim"
        >
          Reroll
        </button>
      </div>

      <ul>
        {quests.map((quest) => (
          <QuestRow
            key={quest.id}
            quest={quest}
            count={countOf(quest.id)}
            gain={previewXp(quest)}
            prefs={prefs}
            justDone={justDone === quest.id}
            favorite={prefs.favoriteQuests?.includes(quest.id)}
            onToggle={() => toggle(quest.id)}
            onFavorite={() => onFavorite(quest.id)}
            focused={helpsFocus(quest, focus ?? null)}
          />
        ))}
      </ul>

      <button
        type="button"
        onClick={() => {
          haptic()
          onOpenBoard()
        }}
        className={cn(
          'press mt-2 flex w-full items-center justify-center gap-2 rounded-px3',
          'border-[1.5px] border-dashed border-borderdeep py-2.5 text-[12.5px] text-inkdim',
        )}
      >
        <PixelImage asset={icons.xp} height={15} />
        퀘스트 더 보기
        <span className="font-pixel text-[11px]">→</span>
      </button>
    </div>
  )
}
