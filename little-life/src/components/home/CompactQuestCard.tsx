import type { Quest } from '@/types'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { QuestCheckButton } from '@/components/quest/QuestCheckButton'
import { DIFFICULTY_LABEL } from '@/lib/difficulty'

interface CompactQuestCardProps {
  quest: Quest
  onComplete: (id: string) => void
}

/**
 * HOME 용 간단한 퀘스트 카드.
 *
 * 캐릭터가 주인공이어야 해서 카드 높이를 낮게 유지한다.
 * 완료하면 목록에서 빠지므로 완료 상태 표현은 넣지 않았다.
 */
export function CompactQuestCard({ quest, onComplete }: CompactQuestCardProps) {
  return (
    <div className="flex items-center gap-2 rounded-btn border border-line/70 bg-surface py-2 pl-1 pr-4 shadow-soft">
      <QuestCheckButton
        completed={false}
        onClick={() => onComplete(quest.id)}
        label={`${quest.title} 완료하기`}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] text-ink">{quest.title}</p>
        <div className="mt-1 flex items-center gap-1.5">
          <CategoryBadge category={quest.category} />
          <span className="truncate text-[12px] text-inkdim">
            {DIFFICULTY_LABEL[quest.difficulty]}
          </span>
          <span className="font-game text-[11px] tracking-[0.04em] text-inkdim">
            +{quest.exp} EXP
          </span>
        </div>
      </div>
    </div>
  )
}
