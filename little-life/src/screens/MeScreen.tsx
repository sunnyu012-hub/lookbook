import { useMemo, useState } from 'react'
import type { AppState, ClassId } from '@/types'
import { CATEGORIES } from '@/types'
import { Card } from '@/components/ui/Card'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { StatCard } from '@/components/profile/StatCard'
import { StatGrid } from '@/components/profile/StatGrid'
import { ClassCard } from '@/components/profile/ClassCard'
import { EquipSlotGrid } from '@/components/profile/EquipSlotGrid'
import { SkillTreeCard } from '@/components/profile/SkillTreeCard'
import { SkillSummaryCard } from '@/components/profile/SkillSummaryCard'
import { RecommendSettingsCard } from '@/components/profile/RecommendSettingsCard'
import { SyncCard } from '@/components/sync/SyncCard'
import { TransferCard } from '@/components/sync/TransferCard'
import { BackupNotice } from '@/components/sync/BackupNotice'
import { CategoryGrowthBar } from '@/components/profile/CategoryGrowthBar'
import { WeeklyInsightCard } from '@/components/profile/WeeklyInsightCard'
import { WeeklyGoalsCard } from '@/components/home/WeeklyGoalsCard'
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

/**
 * 나.
 *
 * 시스템 관리 화면이 아니라 **내 캐릭터의 성장 프로필**이다.
 *
 * 예전에는 능력치 여섯 칸과 스킬트리 전체가 위쪽을 차지하고, 정작 "내가 어느
 * 분야로 자라고 있는지" 는 한참 아래에 있었다. 여기서 제일 보고 싶은 건
 * 관리할 것들이 아니라 내가 얼마나 왔는지다. 그래서 순서를 뒤집었다.
 *
 * 능력치 · 스킬트리 전체 · 설정은 눌러서 여는 시트로 내려보냈다.
 * 자주 안 여는 것이 첫 화면을 차지하고 있을 이유가 없다.
 */
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
  const [sheet, setSheet] = useState<'STATS' | 'SKILLS' | 'SETTINGS' | null>(null)

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

      <section className="mt-7">
        <SectionHeader title="직업" />
        <ClassCard classId={user.classId} onSelect={onSelectClass} />
      </section>

      {/* 이 화면의 핵심. 예전에는 스킬트리 아래에 있어서 잘 안 보였다. */}
      <section className="mt-7">
        <SectionHeader title="나의 성장" />
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

      {/* 주간 이야기는 홈에서 여기로 옮겼다 — 그건 오늘의 얘기가 아니다. */}
      <section className="mt-7 space-y-3">
        <SectionHeader title="이번 주" />
        <WeeklyInsightCard message={insight} />
        <WeeklyGoalsCard state={state} />
      </section>

      <section className="mt-7">
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

      <section className="mt-7">
        <SectionHeader
          title="스킬"
          trailing={
            <button
              type="button"
              onClick={() => setSheet('SKILLS')}
              className="rounded-pill bg-sunken px-2.5 py-1 text-[11px] font-medium text-inkdim"
            >
              전체 보기
            </button>
          }
        />
        <SkillSummaryCard user={user} onOpenAll={() => setSheet('SKILLS')} />
      </section>

      {/* 자주 안 여는 것들. 줄 하나씩만 두고 안은 시트에서 본다. */}
      <section className="mt-7">
        <ul className="divide-y divide-line/70 overflow-hidden rounded-card border border-line/70 bg-surface shadow-soft">
          <SettingRow
            icon="📊"
            title="능력치 자세히 보기"
            sub="기운 · 집중 · 체력 · 재미 · 마음 · 행운"
            onClick={() => setSheet('STATS')}
          />
          <SettingRow
            icon="⚙️"
            title="설정"
            sub="퀘스트 추천 · 처음 안내 · 백업"
            onClick={() => setSheet('SETTINGS')}
          />
        </ul>
      </section>

      <p className="mt-7 text-center text-[12px] leading-relaxed text-inkfaint">
        쉬어간 날도 모험의 일부야.
        <br />
        언제 돌아와도 이어서 시작할 수 있어.
      </p>

      <BottomSheet open={sheet === 'STATS'} onClose={() => setSheet(null)} title="능력치">
        <h2 className="text-[19px] font-bold text-ink">능력치</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-inkdim">
          퀘스트를 분야별로 끝낼 때마다 하나씩 올라.
        </p>
        <div className="mt-4">
          <StatGrid stats={user.stats} bonusLuck={gearLuck} />
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === 'SKILLS'} onClose={() => setSheet(null)} title="스킬" fill>
        <h2 className="text-[19px] font-bold text-ink">스킬</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-inkdim">
          잘못 찍어도 손해는 아니야. 레벨이 오르면 포인트는 계속 생겨.
        </p>
        <div className="mt-4">
          <SkillTreeCard user={user} onUnlock={onUnlockSkill} />
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === 'SETTINGS'} onClose={() => setSheet(null)} title="설정" fill>
        <h2 className="text-[19px] font-bold text-ink">설정</h2>

        <div className="mt-5">
          <SectionHeader title="퀘스트 추천" />
          <RecommendSettingsCard
            settings={state.recommendSettings}
            profiles={state.usageProfiles}
            onToggle={onTogglePersonalized}
            onReset={onResetUsage}
          />
        </div>

        <div className="mt-6">
          <SectionHeader title="앱 사용법" />
          <button
            type="button"
            onClick={() => {
              setSheet(null)
              onOpenGuide()
            }}
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
        </div>

        {/* 클라우드는 설정해둔 사람만, 파일은 누구나.
            되돌리기 안내는 둘 중 어느 쪽으로 덮였든 같은 자리에 뜬다. */}
        <div className="mt-6">
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
        </div>
      </BottomSheet>
    </div>
  )
}

function SettingRow({
  icon,
  title,
  sub,
  onClick,
}: {
  icon: string
  title: string
  sub: string
  onClick: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 px-4 py-4 text-left transition-transform duration-150 ease-out active:scale-[0.99]"
      >
        <span className="w-7 shrink-0 text-center text-[17px] leading-none">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-medium text-ink">{title}</span>
          <span className="mt-0.5 block truncate text-[12px] text-inkdim">{sub}</span>
        </span>
        <span className="shrink-0 text-[11px] text-inkfaint">›</span>
      </button>
    </li>
  )
}
