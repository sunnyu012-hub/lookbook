import type { Quest } from '@/types'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { cn } from '@/components/ui/cn'
import { QuestCheckButton } from './QuestCheckButton'

interface QuestCardProps {
  quest: Quest
  onComplete: (id: string) => void
  onDelete?: (id: string) => void
}

export function QuestCard({ quest, onComplete, onDelete }: QuestCardProps) {
  const { completed } = quest

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-card border px-4 py-3.5 transition-all duration-300 ease-out',
        completed
          ? 'border-transparent bg-ivorydeep/50'
          : 'border-line/70 bg-milk shadow-soft',
      )}
    >
      <QuestCheckButton
        completed={completed}
        onClick={() => onComplete(quest.id)}
        label={completed ? `${quest.title} 완료됨` : `${quest.title} 완료하기`}
      />

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-[15px] transition-colors duration-300',
            completed ? 'text-inkfaint line-through' : 'text-ink',
          )}
        >
          {quest.title}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <CategoryBadge category={quest.category} className={completed ? 'opacity-50' : undefined} />
          <span
            className={cn(
              'font-game text-[11px] tracking-[0.06em]',
              completed ? 'text-inkfaint' : 'text-inkdim',
            )}
          >
            {completed ? 'CLEAR' : `+${quest.exp} EXP`}
          </span>
        </div>
      </div>

      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(quest.id)}
          aria-label={`${quest.title} 삭제`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-inkfaint transition-colors duration-150 hover:bg-ivorydeep hover:text-inkdim active:scale-90"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
            <path
              d="M6.5 6.5 L17.5 17.5 M17.5 6.5 L6.5 17.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  )
}
