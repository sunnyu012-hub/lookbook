import type { Checkin } from '@/types'
import { PixelImage } from '@/components/pixel/PixelImage'
import { buildEffects } from '@/lib/scoring/effects'
import type { ScoreContext } from '@/lib/scoring'
import { cn } from '@/lib/cn'

/** 현재 상태 효과 — 게임 버프/디버프 목록처럼 얇게 */
export function EffectsView({
  today,
  scoreContext,
}: {
  today: Checkin | null
  scoreContext?: ScoreContext
}) {
  const effects = today ? buildEffects(today, 6, scoreContext) : []

  if (effects.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] leading-relaxed text-inkdim">
        {today
          ? '오늘은 눈에 띄는 효과가 없어요. 잔잔한 하루네요.'
          : '오늘 기록을 적으면 지금 걸려 있는 효과가 보여요.'}
      </p>
    )
  }

  return (
    <ul className="divide-y divide-dashed divide-border/70">
      {effects.map((effect) => (
        <li key={effect.key} className="flex items-center gap-2.5 py-2">
          <PixelImage asset={effect.icon} height={21} />
          <span className="min-w-0 flex-1">
            <span className="block font-pixel text-[10.5px] uppercase leading-none tracking-[0.05em] text-inkdim">
              {effect.label}
            </span>
            <span className="mt-1 block truncate text-[12.5px] leading-tight">{effect.note}</span>
          </span>
          {effect.delta !== 0 && (
            <span
              className={cn(
                'font-pixel text-[13px] tabular-nums',
                effect.delta > 0 ? 'text-mintdeep' : 'text-pinkdeep',
              )}
            >
              {effect.delta > 0 ? '+' : ''}
              {effect.delta}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
