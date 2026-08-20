import type { Difficulty } from '@/types'
import { DIFFICULTY_LABEL } from '@/lib/difficulty'
import { DIFFICULTY_BADGE } from '@/lib/assets'
import { cn } from './cn'

interface DifficultyBadgeProps {
  difficulty: Difficulty
  /**
   * 배지 그림을 같이 보여줄지.
   *
   * 그림이 촘촘해서 20px 아래로 줄이면 뭉개진다.
   * 목록에서는 글자만 쓰고, 크게 보여줄 수 있는 곳(퀘스트 만들기)에서만 켠다.
   */
  withIcon?: boolean
  className?: string
}

/** 난이도는 색이나 그림만으로 구분하지 않고 항상 글자를 함께 보여준다. */
export function DifficultyBadge({
  difficulty,
  withIcon = false,
  className,
}: DifficultyBadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {withIcon && (
        <img
          src={DIFFICULTY_BADGE[difficulty]}
          alt=""
          aria-hidden
          className="h-9 w-9 object-contain"
        />
      )}
      <span className="text-[12px] text-inkdim">{DIFFICULTY_LABEL[difficulty]}</span>
    </span>
  )
}
