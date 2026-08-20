import type { User } from '@/types'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { expToNextLevel, levelProgress } from '@/lib/level'
import { useCountUp } from '@/hooks/useCountUp'

interface LevelMeterProps {
  user: User
}

/** 캐릭터 아래에 붙는 LV / EXP 표시. */
export function LevelMeter({ user }: LevelMeterProps) {
  const need = expToNextLevel(user.level)
  const shownExp = useCountUp(user.currentExp)

  return (
    <div className="mt-1">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-game text-[22px] leading-none text-ink">LV.{user.level}</span>
        <span className="font-game text-[12px] tracking-[0.06em] text-inkdim">
          {shownExp} / {need} EXP
        </span>
      </div>
      <ProgressBar value={levelProgress(user.level, user.currentExp)} />
    </div>
  )
}
