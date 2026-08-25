import { useMemo } from 'react'
import type { AppState, ClassId } from '@/types'
import { CATEGORIES } from '@/types'
import { Card } from '@/components/ui/Card'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { StatCard } from '@/components/profile/StatCard'
import { StatGrid } from '@/components/profile/StatGrid'
import { ClassCard } from '@/components/profile/ClassCard'
import { EquipSlotGrid } from '@/components/profile/EquipSlotGrid'
import { SkillTreeCard } from '@/components/profile/SkillTreeCard'
import { RecommendSettingsCard } from '@/components/profile/RecommendSettingsCard'
import { SyncCard } from '@/components/sync/SyncCard'
import { TransferCard } from '@/components/sync/TransferCard'
import { BackupNotice } from '@/components/sync/BackupNotice'
import { CategoryGrowthBar } from '@/components/profile/CategoryGrowthBar'
import { WeeklyInsightCard } from '@/components/profile/WeeklyInsightCard'
import { ScreenHeader, SectionHeader } from '@/components/layout/ScreenHeader'
import { weekCompletedCount } from '@/lib/stats'
import { weeklyInsight } from '@/lib/insights'
import { calculateEquipmentBonus } from '@/lib/rpg/rewards'
import { EFFECT, UI } from '@/lib/assets'
import type { SyncApi } from '@/hooks/useSync'

interface MeScreenProps {
  state: AppState
  onRename: (name: string) => void
  onSelectClass: (classId: ClassId) => void
  onOpenBag: () => void
  onUnlockSkill: (skillId: string) => void
  onTogglePersonalized: (on: boolean) => void
  onResetUsage: () => void
  /** 클라우드 백업. 환경변수가 없으면 configured 가 false 라 칸 자체가 안 나온다. */
  sync: SyncApi
  onOpenConflict: () => void
  onOpenGuide: () => void
}

export function MeScreen({
  state,
  onRename,
  onSelectClass,
  onOpenBag,
  onUnlockSkill,
  onTogglePersonalized,
  onResetUsage,
  sync,
  onOpenConflict,
  onOpenGuide,
}: MeScreenProps) {
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
      <ScreenHeader title="나" />

      <ProfileHeader user={user} onRename={onRename} />

      <section className="mt-4 grid grid-cols-4 gap-2">
        <StatCard icon={EFFECT.star} label="총 EXP" value={user.totalExp} />
        <StatCard icon={UI.check} label="끝낸 퀘스트" value={user.totalCompletedQuests} />
        <StatCard icon={EFFECT.sparkle} label="이번 주" value={weekCompleted} />
        <StatCard
          iconNode={
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-butter-soft text-[15px]">
              🪙
            </span>
          }
          label="코인"
          value={user.coins}
        />
      </section>

      <section className="mt-6">
        <SectionHeader title="직업" />
        <ClassCard classId={user.classId} onSelect={onSelectClass} />
      </section>

      <section className="mt-6">
        <SectionHeader title="능력치" />
        <StatGrid stats={user.stats} bonusLuck={gearLuck} />
      </section>

      <section className="mt-6">
        <SectionHeader
          title="장비"
          trailing={
            <button
              type="button"
              onClick={onOpenBag}
              className="rounded-pill bg-sunken px-2.5 py-1 text-[11px] font-medium text-inkdim"
            >
              가방 열기
            </button>
          }
        />
        <EquipSlotGrid equipped={user.equippedItems} onOpenBag={onOpenBag} />
      </section>

      <section className="mt-6">
        <SectionHeader title="스킬" />
        <SkillTreeCard user={user} onUnlock={onUnlockSkill} />
      </section>

      <section className="mt-6">
        <SectionHeader title="분야별 성장" />
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

      <section className="mt-6">
        <SectionHeader title="퀘스트 추천" />
        <RecommendSettingsCard
          settings={state.recommendSettings}
          profiles={state.usageProfiles}
          onToggle={onTogglePersonalized}
          onReset={onResetUsage}
        />
      </section>

      <section className="mt-6">
        <SectionHeader title="앱 사용법" />
        <button
          type="button"
          onClick={onOpenGuide}
          className="flex w-full items-center gap-3 rounded-card border border-line/70 bg-surface px-5 py-4 text-left shadow-soft active:scale-[0.99]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lavender-soft text-[16px]">
            📖
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-medium text-ink">처음 안내 다시 보기</span>
            <span className="mt-0.5 block truncate text-[12px] text-inkdim">
              퀘스트 · 도시 · 도감 · 방 · 동료 · 발견
            </span>
          </span>
          <span className="shrink-0 text-[11px] text-inkfaint">›</span>
        </button>
      </section>

      {/* 클라우드는 설정해둔 사람만, 파일은 누구나.
          되돌리기 안내는 둘 중 어느 쪽으로 덮였든 같은 자리에 뜬다. */}
      <section className="mt-6">
        <SectionHeader title="백업" />
        <div className="space-y-3">
          {sync.configured && <SyncCard sync={sync} onOpenConflict={onOpenConflict} />}
          <TransferCard state={state} onApply={sync.applyImport} />
          <BackupNotice
            backup={sync.backup}
            onRestore={sync.restoreBackup}
            onDismiss={sync.dismissBackup}
          />
        </div>
      </section>

      <p className="mt-6 text-center text-[12px] leading-relaxed text-inkfaint">
        쉬어간 날도 모험의 일부야.
        <br />
        언제 돌아와도 이어서 시작할 수 있어.
      </p>
    </div>
  )
}
