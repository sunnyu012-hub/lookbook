import { ProgressBar } from '@/components/ui/ProgressBar'
import { levelProgress, requiredExp } from '@/lib/level'
import { useCountUp } from '@/hooks/useCountUp'

interface ExpProgressProps {
  level: number
  currentExp: number
}

/** EXP 바 + 숫자. 바는 즉시 점프하지 않고 부드럽게 찬다. */
export function ExpProgress({ level, currentExp }: ExpProgressProps) {
  const need = requiredExp(level)
  const shown = useCountUp(currentExp)

  return (
    <div className="flex items-center gap-2.5">
      <span className="font-game text-[11px] tracking-[0.08em] text-inkdim">EXP</span>
      <ProgressBar
        className="flex-1"
        value={levelProgress(level, currentExp)}
        barClassName="bg-coral"
        aria-label={`${need} EXP 중 ${currentExp} EXP`}
      />
      <span className="shrink-0 font-game text-[11px] tracking-[0.02em] text-inkdim">
        {shown} / {need}
      </span>
    </div>
  )
}
