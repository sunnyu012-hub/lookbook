import type { Quest } from '@/types'
import { Button } from '@/components/ui/Button'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { DifficultyBadge } from '@/components/ui/DifficultyBadge'
import { DIFFICULTY_COINS } from '@/lib/rpg/rewards'
import { EFFECT } from '@/lib/assets'

interface NextQuestCardProps {
  /** 지금 눌러서 끝낼 수 있는 것 하나. 없으면 null. */
  quest: Quest | null
  onComplete: (id: string) => void
  onSeeAll: () => void
}

/**
 * 지금 하나 해볼까?
 *
 * 홈의 주 행동이다. 목록을 만들지 않는다 — 다섯 개를 늘어놓으면 그중에
 * 뭘 할지 고르는 일이 또 하나의 미룰 거리가 된다. 하나만 내밀고,
 * 나머지는 아래 "오늘 퀘스트 전체 보기" 에 있다.
 *
 * 코인은 난이도 기본값이라 실제로 받을 때는 보너스가 더 붙는다.
 * 덜 적어두고 더 주는 쪽이 반대보다 낫다.
 */
export function NextQuestCard({ quest, onComplete, onSeeAll }: NextQuestCardProps) {
  if (!quest) {
    return (
      <section className="rounded-card border border-dashed border-line bg-surface/70 px-5 py-6 text-center">
        <p className="text-[14.5px] text-ink">오늘은 천천히 골라도 괜찮아.</p>
        <Button variant="soft" size="md" className="mt-4" onClick={onSeeAll}>
          퀘스트 보러 가기
        </Button>
      </section>
    )
  }

  return (
    <section className="rounded-card border border-line/70 bg-surface px-5 py-5 shadow-soft">
      <h2 className="text-[13px] font-medium text-inkdim">지금 하나 해볼까?</h2>

      <p className="mt-2.5 break-words text-[17px] font-semibold leading-snug text-ink">
        {quest.title}
      </p>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <CategoryBadge category={quest.category} />
        <DifficultyBadge difficulty={quest.difficulty} />
        <span className="inline-flex items-center gap-0.5">
          <img src={EFFECT.star} alt="" aria-hidden className="h-4 w-4 object-contain" />
          <span className="font-game text-[11px] leading-none text-inkdim">+{quest.exp}</span>
        </span>
        <span className="font-game text-[11px] leading-none text-inkdim">
          🪙 +{DIFFICULTY_COINS[quest.difficulty]}
        </span>
      </div>

      <Button size="lg" className="mt-4 w-full" onClick={() => onComplete(quest.id)}>
        완료
      </Button>
    </section>
  )
}
