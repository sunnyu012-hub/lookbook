import { GREETING, daypart, subcopyForDay } from '@/lib/date'
import { EFFECT } from '@/lib/assets'

interface GreetingHeaderProps {
  name: string
}

/** 목업의 점선 테두리 인사 카드. */
export function GreetingHeader({ name }: GreetingHeaderProps) {
  const now = new Date()

  return (
    <div className="relative rounded-card border border-dashed border-coral/50 bg-surface px-4 py-3.5">
      <img
        src={EFFECT.hearts}
        alt=""
        aria-hidden
        className="absolute -left-1 -top-3 w-9 -rotate-12 select-none"
      />
      <p className="text-[15px] font-semibold text-ink">
        {GREETING[daypart(now)]}, {name}
      </p>
      <p className="mt-0.5 text-[12.5px] text-inkdim">{subcopyForDay(now)}</p>
    </div>
  )
}
