import { useMemo } from 'react'
import type { AppState, ClassId } from '@/types'
import { CATEGORIES } from '@/types'
import { Card } from '@/components/ui/Card'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { StatCard } from '@/components/profile/StatCard'
import { StatGrid } from '@/components/profile/StatGrid'
import { ClassCard } from '@/components/profile/ClassCard'
import { EquipSlotGrid } from '@/components/profile/EquipSlotGrid'
import { CategoryGrowthBar } from '@/components/profile/CategoryGrowthBar'
import { WeeklyInsightCard } from '@/components/profile/WeeklyInsightCard'
import { ScreenHeader, SectionHeader } from '@/components/layout/ScreenHeader'
import { weekCompletedCount } from '@/lib/stats'
import { weeklyInsight } from '@/lib/insights'
import { calculateEquipmentBonus } from '@/lib/rpg/rewards'
import { EFFECT, UI } from '@/lib/assets'

interface MeScreenProps {
  state: AppState
  onRename: (name: string) => void
  onSelectClass: (classId: ClassId) => void
  onOpenBag: () => void
}

export function MeScreen({ state, onRename, onSelectClass, onOpenBag }: MeScreenProps) {
  const { user, categoryStats, dailyLog } = state

  const weekCompleted = useMemo(() => weekCompletedCount(dailyLog), [dailyLog])
  const insight = useMemo(() => weeklyInsight(dailyLog), [dailyLog])
  const maxCategoryExp = Math.max(...CATEGORIES.map((c) => categoryStats[c]))
  const gearLuck = useMemo(
    () => calculateEquipmentBonus(user.equippedItems).luck,
    [user.equippedItems],
  )

  return (
    <div className="animate-risein">
      <ScreenHeader title="ME" />

      <ProfileHeader user={user} onRename={onRename} />

      <section className="mt-4 grid grid-cols-4 gap-2">
        <StatCard icon={EFFECT.star} label="Total EXP" value={user.totalExp} />
        <StatCard icon={UI.check} label="Cleared" value={user.totalCompletedQuests} />
        <StatCard icon={EFFECT.sparkle} label="This week" value={weekCompleted} />
        <StatCard
          iconNode={
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-butter-soft text-[15px]">
              🪙
            </span>
          }
          label="Coins"
          value={user.coins}
        />
      </section>

      <section className="mt-6">
        <SectionHeader title="Class" />
        <ClassCard classId={user.classId} onSelect={onSelectClass} />
      </section>

      <section className="mt-6">
        <SectionHeader title="Stats" />
        <StatGrid stats={user.stats} bonusLuck={gearLuck} />
      </section>

      <section className="mt-6">
        <SectionHeader
          title="Equipment"
          trailing={
            <button
              type="button"
              onClick={onOpenBag}
              className="rounded-pill bg-sunken px-2.5 py-1 font-game text-[9px] tracking-[0.08em] text-inkdim"
            >
              OPEN BAG
            </button>
          }
        />
        <EquipSlotGrid equipped={user.equippedItems} onOpenBag={onOpenBag} />
      </section>

      <section className="mt-6">
        <SectionHeader title="Growth by Category" />
        <Card className="space-y-3.5 py-5">
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

      <section className="mt-4">
        <WeeklyInsightCard message={insight} />
      </section>

      <p className="mt-6 text-center text-[12px] leading-relaxed text-inkfaint">
        쉬어간 날도 모험의 일부야.
        <br />
        언제 돌아와도 이어서 시작할 수 있어.
      </p>
    </div>
  )
}
