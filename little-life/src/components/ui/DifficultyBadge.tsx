import type { Difficulty } from '@/types'
import { DIFFICULTY_LABEL } from '@/lib/difficulty'
import { cn } from './cn'

interface DifficultyBadgeProps {
  difficulty: Difficulty
  className?: string
}

/**
 * 난이도는 색만으로 구분하지 않고 항상 글자를 함께 보여준다.
 * (색각 이상이 있어도 읽을 수 있어야 한다)
 */
export function DifficultyBadge({ difficulty, className }: DifficultyBadgeProps) {
  return (
    <span className={cn('text-[12px] text-inkdim', className)}>{DIFFICULTY_LABEL[difficulty]}</span>
  )
}
