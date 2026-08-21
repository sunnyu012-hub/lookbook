import type { Quest } from '@/types'
import { CategoryThumb } from '@/components/ui/CategoryBadge'
import { DifficultyBadge } from '@/components/ui/DifficultyBadge'
import { QuestCheckButton } from '@/components/quest/QuestCheckButton'
import { EFFECT } from '@/lib/assets'

interface CompactQuestCardProps {
  quest: Quest
  onComplete: (id: string) => void
}

/**
 * HOME 용 퀘스트 행.
 *
 * 캐릭터가 주인공이어야 해서 높이를 낮게 유지한다.
 * 완료하면 목록에서 빠지므로 완료 상태 표현은 넣지 않았다.
 */
export function CompactQuestCard({ quest, onComplete }: CompactQuestCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-btn border border-line bg-surface py-2.5 pl-3 pr-1">
      <CategoryThumb category={quest.category} className="h-11 w-11" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] text-ink">{quest.title}</p>
        <div className="mt-1 flex items-center gap-2">
          <DifficultyBadge difficulty={quest.difficulty} />
          <span className="inline-flex items-center gap-0.5">
            <img src={EFFECT.star} alt="" aria-hidden className="h-3.5 w-3.5 object-contain" />
            <span className="font-game text-[11px] leading-none text-inkdim">+{quest.exp}</span>
          </span>
        </div>
      </div>

      <QuestCheckButton
        completed={false}
        onClick={() => onComplete(quest.id)}
        label={`${quest.title} 완료하기`}
      />
    </div>
  )
}
