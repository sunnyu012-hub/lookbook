import type { User } from '@/types'
import { availableSkillPoints, findSkill } from '@/lib/city/skills'
import { CATEGORY_BADGE } from '@/lib/assets'
import { cn } from '@/components/ui/cn'

interface SkillSummaryCardProps {
  user: User
  onOpenAll: () => void
}

/**
 * 스킬 한 줄.
 *
 * 여섯 갈래 트리를 나 화면 첫 장부터 펼쳐두면 그건 벽이다.
 * 여기서는 **지금 뭘 찍어뒀는지**와 **쓸 포인트가 있는지**만 말하고,
 * 고르는 일은 전체 보기로 넘긴다.
 */
export function SkillSummaryCard({ user, onOpenAll }: SkillSummaryCardProps) {
  const points = availableSkillPoints(user.level, user.unlockedSkills)
  // 마지막에 찍은 것을 보여준다. 목록 순서가 아니라 내가 방금 고른 것이 궁금하다.
  const latest = findSkill(user.unlockedSkills[user.unlockedSkills.length - 1] ?? '')

  return (
    <button
      type="button"
      onClick={onOpenAll}
      className="flex w-full items-center gap-3 rounded-card border border-line/70 bg-surface px-5 py-4 text-left shadow-soft transition-transform duration-150 ease-out active:scale-[0.99]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-canvas">
        {latest ? (
          <img
            src={CATEGORY_BADGE[latest.tree]}
            alt=""
            aria-hidden
            className="h-7 w-7 object-contain"
          />
        ) : (
          <span className="text-[18px] leading-none">🎯</span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        {latest ? (
          <>
            <span className="block truncate text-[14px] font-medium text-ink">{latest.name}</span>
            <span className="mt-0.5 block truncate text-[12px] text-inkdim">
              {latest.effectLabel}
            </span>
          </>
        ) : (
          <>
            <span className="block text-[14px] font-medium text-ink">아직 찍은 게 없어</span>
            <span className="mt-0.5 block text-[12px] text-inkdim">급할 것 없어</span>
          </>
        )}
      </span>

      <span
        className={cn(
          'shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-medium',
          points > 0 ? 'bg-coral text-surface' : 'bg-sunken text-inkdim',
        )}
      >
        {points > 0 ? `포인트 ${points}` : `Lv.${user.level + 1}에서 +1`}
      </span>
    </button>
  )
}
