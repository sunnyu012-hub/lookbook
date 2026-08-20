import type { Quest } from '@/types'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { Button } from '@/components/ui/Button'
import { DIFFICULTY_LABEL } from '@/lib/difficulty'
import { formatTime } from '@/lib/date'
import { QuestMenu } from './QuestMenu'
import { QuestCheckButton } from './QuestCheckButton'

interface FullQuestCardProps {
  quest: Quest
  onComplete: (id: string) => void
  onRequestDelete: (quest: Quest) => void
}

/** QUEST 화면용 카드. 난이도와 완료 시각까지 다 보여준다. */
export function FullQuestCard({ quest, onComplete, onRequestDelete }: FullQuestCardProps) {
  if (quest.completed) {
    return (
      <div className="flex items-center gap-2 rounded-card border border-transparent bg-sunken/60 py-2 pl-1 pr-1">
        <QuestCheckButton completed label={`${quest.title} 완료됨`} />
        <div className="min-w-0 flex-1 py-1">
          <p className="truncate text-[15px] text-inkdim line-through">{quest.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <CategoryBadge category={quest.category} className="opacity-60" />
            <span className="font-game text-[11px] tracking-[0.04em] text-inkfaint">
              +{quest.exp} EXP
            </span>
            {quest.completedAt && (
              <span className="text-[12px] text-inkfaint">
                Done at {formatTime(quest.completedAt)}
              </span>
            )}
          </div>
        </div>
        <QuestMenu onDelete={() => onRequestDelete(quest)} label={`${quest.title} 메뉴`} />
      </div>
    )
  }

  return (
    <div className="rounded-card border border-line/70 bg-surface px-4 py-3.5 shadow-soft">
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 break-words pt-2.5 text-[15px] leading-snug text-ink">
          {quest.title}
        </p>
        <QuestMenu onDelete={() => onRequestDelete(quest)} label={`${quest.title} 메뉴`} />
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <CategoryBadge category={quest.category} />
        <span className="text-[12px] text-inkdim">{DIFFICULTY_LABEL[quest.difficulty]}</span>
        <span className="text-[12px] text-inkfaint">·</span>
        <span className="font-game text-[11px] tracking-[0.04em] text-inkdim">+{quest.exp} EXP</span>
      </div>

      <Button
        variant="soft"
        size="sm"
        className="mt-3 w-full"
        onClick={() => onComplete(quest.id)}
      >
        Complete
      </Button>
    </div>
  )
}
