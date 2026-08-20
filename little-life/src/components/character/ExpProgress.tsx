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
    <div>
      <ProgressBar
        value={levelProgress(level, currentExp)}
        aria-label={`${need} EXP 중 ${currentExp} EXP`}
      />
      <p className="mt-1.5 text-right font-game text-[12px] tracking-[0.04em] text-inkdim">
        {shown} / {need} EXP
      </p>
    </div>
  )
}
