import type { User } from '@/types'
import type { TodayResults } from '@/lib/stats'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { levelProgress, requiredExp } from '@/lib/level'
import { EFFECT, UI } from '@/lib/assets'

interface TodayGrowthCardProps {
  user: User
  today: TodayResults
}

/**
 * 오늘 얼마나 자랐는지.
 *
 * 홈에서 제일 중요한 정보다. 예전에는 완료 수와 EXP 가 화면 맨 아래
 * 작은 줄로 있었고, 코인은 아예 없었다. 그래서 하루를 다 살고 홈을 열어도
 * 오늘이 어땠는지 한눈에 알 수 없었다.
 *
 * 카드를 세 장 만들지 않는다. 한 칸 안에 세 열로 둔다 —
 * 숫자 세 개를 나란히 놓는 게 카드 세 장보다 훨씬 빨리 읽힌다.
 *
 * "받은 EXP" 가 아니라 "퀘스트 EXP" 다. 몬스터를 넘기거나 주간 목표를 채워서
 * 들어온 몫은 여기 안 잡힌다 — 그건 오늘 것인지 알 방법이 세이브에 없고,
 * 이 화면 하나 때문에 누적 필드를 새로 만들 이유는 없다.
 * 못 세는 걸 센 척하는 것보다 무엇을 센 건지 적어두는 쪽이 낫다.
 */
export function TodayGrowthCard({ user, today }: TodayGrowthCardProps) {
  const need = requiredExp(user.level)
  const left = Math.max(0, need - user.currentExp)

  return (
    <section className="rounded-card border border-line/70 bg-surface px-5 py-5 shadow-soft">
      <h2 className="text-[13px] font-medium text-inkdim">오늘의 성장</h2>

      <div className="mt-3 flex items-start">
        <Figure
          icon={<img src={UI.check} alt="" aria-hidden className="h-4 w-4 object-contain" />}
          value={`${today.completed}개`}
          label="완료한 퀘스트"
        />
        <Figure
          icon={<img src={EFFECT.star} alt="" aria-hidden className="h-4 w-4 object-contain" />}
          value={`+${today.exp}`}
          label="퀘스트 EXP"
        />
        <Figure icon={<span className="text-[13px] leading-none">🪙</span>} value={`+${today.coins}`} label="퀘스트 코인" />
      </div>

      <div className="mt-5">
        {/* 정확한 숫자(128 / 200)는 바로 위 캐릭터 칸에 이미 있다.
            같은 걸 두 번 적으면 둘 다 안 읽힌다. 여기는 남은 만큼만. */}
        <p className="text-[12.5px] text-inkdim">
          {left > 0 ? `다음 레벨까지 ${left} EXP` : '다음 레벨이 눈앞이야'}
        </p>
        <ProgressBar
          className="mt-2"
          value={levelProgress(user.level, user.currentExp)}
          barClassName="bg-coral"
          aria-label={`${need} EXP 중 ${user.currentExp} EXP`}
        />
      </div>
    </section>
  )
}

function Figure({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: string
  label: string
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1">
        {icon}
        <span className="truncate font-game text-[17px] leading-none text-ink">{value}</span>
      </div>
      <p className="mt-1.5 truncate text-[11.5px] text-inkfaint">{label}</p>
    </div>
  )
}
