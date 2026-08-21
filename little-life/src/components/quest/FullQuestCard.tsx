import type { Quest } from '@/types'
import { CategoryThumb } from '@/components/ui/CategoryBadge'
import { DifficultyBadge } from '@/components/ui/DifficultyBadge'
import { Button } from '@/components/ui/Button'
import { formatTime } from '@/lib/date'
import { categoryStyle } from '@/lib/categories'
import { EFFECT, UI } from '@/lib/assets'
import { QuestMenu } from './QuestMenu'

interface FullQuestCardProps {
  quest: Quest
  onComplete: (id: string) => void
  onRequestDelete: (quest: Quest) => void
}

/** QUEST 화면용 카드. 난이도와 완료 시각까지 다 보여준다. */
export function FullQuestCard({ quest, onComplete, onRequestDelete }: FullQuestCardProps) {
  const style = categoryStyle(quest.category)

  if (quest.completed) {
    return (
      <div className="flex items-center gap-3 rounded-card border border-leaf-soft bg-leaf-soft/50 py-2.5 pl-3 pr-1">
        <img src={UI.check} alt="" aria-hidden className="h-8 w-8 shrink-0 object-contain" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] text-inkdim line-through">{quest.title}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11.5px] text-inkfaint">
            <span className={`font-game text-[10px] tracking-[0.08em] ${style.text}`}>
              {quest.category}
            </span>
            <span className="font-game text-[10px]">+{quest.exp} EXP</span>
            {quest.completedAt && <span>Done at {formatTime(quest.completedAt)}</span>}
          </div>
        </div>
        <QuestMenu onDelete={() => onRequestDelete(quest)} label={`${quest.title} 메뉴`} />
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 rounded-card border border-line bg-surface p-3 shadow-soft">
      <CategoryThumb category={quest.category} />

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1">
          <p className="min-w-0 flex-1 break-words pt-1.5 text-[14.5px] font-medium leading-snug text-ink">
            {quest.title}
          </p>
          <QuestMenu onDelete={() => onRequestDelete(quest)} label={`${quest.title} 메뉴`} />
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className={`font-game text-[10px] tracking-[0.08em] ${style.text}`}>
            {quest.category}
          </span>
          <DifficultyBadge difficulty={quest.difficulty} />
          <span className="inline-flex items-center gap-0.5">
            <img src={EFFECT.star} alt="" aria-hidden className="h-4 w-4 object-contain" />
            <span className="font-game text-[11px] leading-none text-inkdim">+{quest.exp}</span>
          </span>

          <Button
            size="sm"
            className="ml-auto min-h-[38px] px-5 text-[13px]"
            onClick={() => onComplete(quest.id)}
          >
            Complete
          </Button>
        </div>
      </div>
    </div>
  )
}
