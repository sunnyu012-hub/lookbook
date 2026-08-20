import { useMemo } from 'react'
import type { AppState } from '@/types'
import { CATEGORIES } from '@/types'
import { Card } from '@/components/ui/Card'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { StatCard } from '@/components/profile/StatCard'
import { CategoryGrowthBar } from '@/components/profile/CategoryGrowthBar'
import { WeeklyInsightCard } from '@/components/profile/WeeklyInsightCard'
import { weekCompletedCount } from '@/lib/stats'
import { weeklyInsight } from '@/lib/insights'

interface MeScreenProps {
  state: AppState
  onRename: (name: string) => void
}

export function MeScreen({ state, onRename }: MeScreenProps) {
  const { user, categoryStats, dailyLog } = state

  const weekCompleted = useMemo(() => weekCompletedCount(dailyLog), [dailyLog])
  const insight = useMemo(() => weeklyInsight(dailyLog), [dailyLog])
  const maxCategoryExp = Math.max(...CATEGORIES.map((c) => categoryStats[c]))

  return (
    <div className="animate-risein">
      <ProfileHeader user={user} onRename={onRename} />

      <section className="mt-7 grid grid-cols-2 gap-2.5">
        <StatCard label="Total EXP" value={user.totalExp} />
        <StatCard label="Quests Completed" value={user.totalCompletedQuests} />
        <StatCard label="This Week" value={weekCompleted} />
        <StatCard label="Current Level" value={user.level} />
      </section>

      <section className="mt-7">
        <h2 className="mb-3 text-[16px] font-semibold text-ink">Growth by Category</h2>
        <Card className="space-y-4 py-5">
          {CATEGORIES.map((category) => (
            <CategoryGrowthBar
              key={category}
              category={category}
              exp={categoryStats[category]}
              max={maxCategoryExp}
            />
          ))}
        </Card>
      </section>

      <section className="mt-5">
        <WeeklyInsightCard message={insight} />
      </section>

      <p className="mt-7 text-center text-[12px] leading-relaxed text-inkfaint">
        쉬어간 날도 모험의 일부야.
        <br />
        언제 돌아와도 이어서 시작할 수 있어.
      </p>
    </div>
  )
}
