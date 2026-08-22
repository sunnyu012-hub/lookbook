import { useMemo } from 'react'
import type { AppState } from '@/types'
import { SectionHeader } from '@/components/layout/ScreenHeader'
import { weeklyProgress } from '@/lib/goals'
import { cn } from '@/components/ui/cn'

interface WeeklyGoalsCardProps {
  state: AppState
}

/**
 * 이번 주에 뭘 향해 가고 있는지.
 *
 * 도감 240개는 목표로 쓰기엔 너무 멀다. 그래서 이번 주치 세 개만 보여준다.
 * 채우면 그 자리에서 코인이 들어오고, 못 채워도 아무 말 없이 다음 주가 온다.
 *
 * **못 한 것을 세지 않는다.** "3/8" 은 여덟 개 중 다섯을 못 했다는 뜻이 아니라
 * 세 개를 했다는 뜻이다. 남은 수를 크게 쓰지 않는 이유가 그거다.
 */
export function WeeklyGoalsCard({ state }: WeeklyGoalsCardProps) {
  const goals = useMemo(() => weeklyProgress(state), [state])
  const done = goals.filter((g) => g.done).length

  return (
    <section>
      <SectionHeader
        title="이번 주"
        trailing={
          <span className="font-game text-[11px] text-inkdim">
            {done}/{goals.length}
          </span>
        }
      />
      <ul className="space-y-2">
        {goals.map(({ goal, now, done: finished }) => {
          const pct = Math.round((now / goal.target) * 100)
          return (
            <li
              key={goal.id}
              className={cn(
                'rounded-card px-3 py-2.5',
                finished ? 'bg-sage-soft' : 'bg-surface',
              )}
            >
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">
                  {goal.label}
                </span>
                {finished ? (
                  <span className="shrink-0 font-game text-[10.5px] text-sage-deep">받았어</span>
                ) : (
                  <span className="shrink-0 font-game text-[10.5px] text-inkdim">
                    {now}/{goal.target}
                  </span>
                )}
                <span className="shrink-0 font-game text-[10.5px] text-butter-deep">
                  🪙 {goal.coins}
                </span>
              </div>
              {!finished && (
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-sunken">
                  <div
                    className="h-full rounded-pill bg-coral/70 transition-[width] duration-500 ease-out"
                    style={{ width: `${Math.max(pct, now > 0 ? 6 : 0)}%` }}
                  />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
