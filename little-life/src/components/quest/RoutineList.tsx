import type { Routine } from '@/types'
import { CategoryThumb } from '@/components/ui/CategoryBadge'
import { describeRule } from '@/lib/routines'
import { cn } from '@/components/ui/cn'
import { SectionHeader } from '@/components/layout/ScreenHeader'

interface RoutineListProps {
  routines: Routine[]
  onTogglePause: (id: string) => void
  onDelete: (routine: Routine) => void
}

/** QUEST 화면 아래에 두는 반복 목록. 멈추거나 지울 수 있다. */
export function RoutineList({ routines, onTogglePause, onDelete }: RoutineListProps) {
  if (routines.length === 0) return null

  return (
    <section className="mt-8">
      <SectionHeader title="반복" />
      <ul className="space-y-2">
        {routines.map((routine) => (
          <li key={routine.id}>
            <div
              className={cn(
                'flex items-center gap-3 rounded-card border border-line bg-surface py-2.5 pl-3 pr-2',
                routine.paused && 'opacity-55',
              )}
            >
              <CategoryThumb category={routine.category} className="h-10 w-10" />

              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] text-ink">{routine.title}</p>
                <p className="mt-0.5 text-[12px] text-inkdim">
                  {describeRule(routine.rule)}
                  {routine.paused && ' · 멈춤'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onTogglePause(routine.id)}
                aria-label={routine.paused ? `${routine.title} 다시 시작` : `${routine.title} 잠시 멈추기`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-inkdim active:scale-90"
              >
                {routine.paused ? (
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
                    <path d="M8 5.5 L18 12 L8 18.5 Z" fill="currentColor" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
                    <rect x="7.5" y="5.5" width="3.5" height="13" rx="1.2" fill="currentColor" />
                    <rect x="13" y="5.5" width="3.5" height="13" rx="1.2" fill="currentColor" />
                  </svg>
                )}
              </button>

              <button
                type="button"
                onClick={() => onDelete(routine)}
                aria-label={`${routine.title} 반복 삭제`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-inkfaint active:scale-90"
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
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
