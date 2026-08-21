import { useMemo, useState } from 'react'
import type { Checkin, EnergyMode, LifeEvent, MounjaroLog, Preferences, WeightLog } from '@/types'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { PixelButton } from '@/components/pixel/PixelButton'
import { PixelSparkle } from '@/components/pixel/PixelSparkle'
import { EnergyBar } from '@/components/pixel/EnergyBar'
import { LineChart } from '@/components/pixel/LineChart'
import { LevelCard } from '@/components/pixel/LevelCard'
import { ManualPreview } from './ManualPage'
import { loggingStreak } from '@/lib/xp'
import { todayKey } from '@/lib/date'
import { buildInsights } from '@/lib/insights'
import { buildStory } from '@/lib/story'
import {
  baseline,
  conditionTrend,
  goodDayTraits,
  lowScoreDrivers,
  scorePoints,
  scoreTrendLine,
} from '@/lib/analytics'
import {
  DIMENSION_LABEL,
  METRIC_BY_KEY,
  type MetricKey,
  type ScoreContext,
} from '@/lib/scoring'
import { formatSleep } from '@/lib/date'
import { MODE_META, modeOf } from '@/lib/energy'
import { MODE_CHARACTER, icons, pets } from '@/lib/pixelAssets'
import { LifeBalanceCard } from '@/components/life/LifeBalanceCard'
import { LifeTreePreview } from './LifeTreePage'
import { NextUnlockCard } from '@/components/life/NextUnlockCard'
import type { NextUnlock } from '@/lib/analytics/nextUnlock'
import type { LifeBalance } from '@/lib/analytics/lifeBalance'
import type { LifeTree } from '@/lib/analytics/lifeTree'
import type { RecoveryCurve } from '@/lib/analytics/recoveryCurve'
import {
  INSIGHT_CATEGORY_META,
  settledInsights,
  type Insight,
} from '@/lib/analytics/insightEntity'
import type { LevelState } from '@/lib/level'
import type { XpBreakdown } from '@/lib/xp'
import { cn } from '@/lib/cn'
import { haptic } from '@/hooks/useHaptic'

const ORDER: EnergyMode[] = ['RECOVERY', 'EASY', 'NORMAL', 'POWER']

/** 지표가 어느 축에 속하는지 (baseline 표시에 쓴다) */
const DIM_OF = Object.fromEntries(
  (Object.keys(METRIC_BY_KEY) as MetricKey[]).map((k) => [k, METRIC_BY_KEY[k].dim]),
) as Record<MetricKey, string>

interface Props {
  checkins: Checkin[]
  weights: WeightLog[]
  mounjaro: MounjaroLog[]
  lifeEvents: LifeEvent[]
  prefs: Preferences
  scoreContext?: ScoreContext
  level: LevelState
  xp: XpBreakdown
  onStartCheckin: () => void
  onOpenSettings: () => void
  onOpenCollection: () => void
  onOpenManual: () => void
  badgesEarned: number
  badgesTotal: number
  manualChapters: import('@/lib/manual').Chapter[]
  devAction?: React.ReactNode
  /** 최근 기록이 어느 영역에 쌓였는지 */
  balance: LifeBalance
  onOpenBalance: () => void
  tree: LifeTree
  onOpenTree: () => void
  /** 요즘 흐름 */
  curve: RecoveryCurve
  onOpenRhythm: () => void
  /** 한 번만 만든 관찰 목록 — Patterns 섹션이 이걸 쓴다 */
  insightList: Insight[]
  /** 곧 열릴 것들 */
  unlocks: NextUnlock[]
  weeklyResets: number
  onOpenWeekly: () => void
}

export function MePage({
  checkins,
  weights,
  mounjaro,
  lifeEvents,
  prefs,
  scoreContext,
  level,
  xp,
  onStartCheckin,
  onOpenSettings,
  onOpenCollection,
  onOpenManual,
  badgesEarned,
  badgesTotal,
  manualChapters,
  devAction,
  balance,
  onOpenBalance,
  tree,
  onOpenTree,
  curve,
  onOpenRhythm,
  insightList,
  unlocks,
  weeklyResets,
  onOpenWeekly,
}: Props) {
  const insights = useMemo(() => buildInsights(checkins), [checkins])
  const story = useMemo(
    () => buildStory({ checkins, weights, mounjaro, lifeEvents, prefs }),
    [checkins, weights, mounjaro, lifeEvents, prefs],
  )
  const week = useMemo(
    () => buildStory({ checkins, weights, mounjaro, lifeEvents, prefs, days: 7 }),
    [checkins, weights, mounjaro, lifeEvents, prefs],
  )
  const trend = useMemo(() => conditionTrend(checkins), [checkins])
  const base = useMemo(() => baseline(checkins, scoreContext), [checkins, scoreContext])
  const good = useMemo(() => goodDayTraits(checkins, prefs, lifeEvents), [checkins, prefs, lifeEvents])
  const drivers = useMemo(() => lowScoreDrivers(checkins), [checkins])
  const [numbersOpen, setNumbersOpen] = useState(false)
  const streak = useMemo(
    () => loggingStreak(checkins.map((c) => c.date), todayKey()),
    [checkins],
  )

  const nothingToShow =
    insights.avgScore7 == null && insights.avgScore30 == null && insights.avgSleepHours == null

  return (
    <div className="space-y-3">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-pixel text-[16px] uppercase leading-none tracking-[0.04em]">Me</h1>
          <p className="ko mt-2">지금까지의 나를 모아 둔 곳이에요.</p>
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          className="press flex items-center gap-1.5 rounded-px3 border-[1.5px] border-border bg-ivory px-2.5 py-1.5 font-pixel text-[9px] uppercase text-inkdim shadow-hard"
        >
          <PixelImage asset={icons.work} height={14} />
          Settings
        </button>
      </header>

      <LevelCard
        level={level}
        character={MODE_CHARACTER[modeOf(insights.avgScore30 ?? 60).key]}
        name={prefs.displayName ?? undefined}
      />

      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Streak" value={`${streak}일`} />
        <MiniStat label="Saves" value={String(insights.totalCount)} />
        <MiniStat label="Total XP" value={String(xp.total)} />
      </div>

      {/* ── 요즘 흐름 ── */}
      <button
        type="button"
        onClick={onOpenRhythm}
        className="press flex w-full items-center gap-2.5 rounded-px4 border-[1.5px] border-border bg-ivory px-3.5 py-3 text-left shadow-hard"
      >
        <PixelImage asset={icons.energy} height={20} />
        <span className="flex-1">
          <span className="plabel block">CURRENT RHYTHM</span>
          <span
            className={cn(
              'mt-1 block font-pixel text-[12.5px] uppercase leading-none',
              curve.trend === 'LEARNING' && 'text-inkfaint',
            )}
          >
            {curve.arrow} {curve.title}
          </span>
        </span>
        <span className="text-[11px] text-inkfaint">›</span>
      </button>

      {/* ── 삶의 분포 ── */}
      <LifeBalanceCard balance={balance} onOpen={onOpenBalance} compact />

      {/* ── 삶의 지도 ── */}
      <LifeTreePreview tree={tree} onOpen={onOpenTree} />

      {/* ── 곧 열릴 것 ── */}
      <NextUnlockCard unlocks={unlocks} />

      {/* ── 발견한 것 ── */}
      {insightList.length > 0 && (
        <PixelPanel
          title="My patterns"
          icon={icons.focus}
          right={<span className="plabel">{settledInsights(insightList).length}개</span>}
        >
          <ul className="space-y-2.5">
            {insightList.slice(0, 4).map((i) => (
              <li key={i.id} className="flex items-start gap-2">
                <PixelImage asset={i.icon} height={15} className="mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="font-pixel text-[9.5px] uppercase tracking-[0.02em]">
                      {i.title}
                    </span>
                    <span
                      className="rounded-full px-1.5 py-[2px] font-pixel text-[8px] uppercase"
                      style={{
                        backgroundColor: INSIGHT_CATEGORY_META[i.category].tint,
                        color: INSIGHT_CATEGORY_META[i.category].accent,
                      }}
                    >
                      {INSIGHT_CATEGORY_META[i.category].label}
                    </span>
                  </span>
                  <span className="mt-1 block text-[12.5px] leading-relaxed">{i.body}</span>
                  {i.progress && (
                    <span className="plabel mt-1 block">
                      {i.progress.have} / {i.progress.need} records
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 border-t border-dashed border-border pt-2 text-[11px] leading-relaxed text-inkdim">
            같이 나타난 것들을 모아 둔 거예요. 원인을 말해 주는 값은 아니에요.
          </p>
        </PixelPanel>
      )}

      {/* ── 주간 돌아보기 ── */}
      <button
        type="button"
        onClick={onOpenWeekly}
        className="press flex w-full items-center gap-2.5 rounded-px4 border-[1.5px] border-border bg-ivory px-3.5 py-3 text-left shadow-hard"
      >
        <PixelImage asset={pets.catSit} height={20} />
        <span className="flex-1">
          <span className="ptitle block">Weekly reset</span>
          <span className="mt-1 block text-[11.5px] text-inkdim">
            {weeklyResets > 0 ? `${weeklyResets}주를 돌아봤어요` : '한 주를 잠깐 돌아보기'}
          </span>
        </span>
        <span className="text-[11px] text-inkfaint">›</span>
      </button>

      <button
        type="button"
        onClick={onOpenCollection}
        className="press flex w-full items-center gap-2.5 rounded-px4 border-[1.5px] border-border bg-ivory px-3.5 py-3 text-left shadow-hard"
      >
        <PixelImage asset={icons.xp} height={22} />
        <span className="flex-1">
          <span className="ptitle block">Collection</span>
          <span className="mt-1 block text-[11.5px] text-inkdim">배지 · 발견 · 순간</span>
        </span>
        <span className="font-pixel text-[12px] text-peachdeep">
          {badgesEarned}/{badgesTotal}
        </span>
        <span className="text-[11px] text-inkfaint">›</span>
      </button>

      <ManualPreview chapters={manualChapters} onOpen={onOpenManual} />

      <PixelPanel title="XP sources" icon={icons.xp}>
        <ul className="space-y-1.5">
          {[
            { label: '아침 기록', value: xp.checkin },
            { label: '밤 마무리', value: xp.night },
            { label: '퀘스트', value: xp.quest },
            { label: '오늘 태그', value: xp.events },
            { label: '체중 기록', value: xp.weight },
            { label: '투약 기록', value: xp.mounjaro },
            { label: '있었던 일 기록', value: xp.lifeEvent },
            { label: '패턴 발견', value: xp.discovery },
            { label: '주간 돌아보기', value: xp.weekly },
            { label: '오늘의 목표', value: xp.focus },
            { label: '새 배지', value: xp.badge },
          ]
            .filter((row) => row.value > 0)
            .map((row) => (
              <li key={row.label} className="flex items-center gap-2 text-[12.5px]">
                <span className="flex-1">{row.label}</span>
                <span className="font-pixel text-[11px] text-peachdeep">+{row.value}</span>
              </li>
            ))}
        </ul>
        <p className="mt-2 text-[11px] leading-relaxed text-inkfaint">
          XP 는 적어 둔 것에만 붙어요. 체중이 얼마나 줄었는지, 얼마나 적게 먹었는지 같은 결과에는
          점수를 주지 않아요.
        </p>
      </PixelPanel>

      {nothingToShow ? (
        <PixelPanel title="Not Enough Data" icon={icons.work}>
          <p className="body-ko">
            아직 계산할 기록이 적어요. 며칠만 더 저장하면 평균과 패턴이 열려요.
          </p>
          <PixelButton icon={icons.save} full className="mt-3" onClick={onStartCheckin}>
            Save Today
          </PixelButton>
          {devAction && <div className="mt-3 flex justify-center">{devAction}</div>}
        </PixelPanel>
      ) : (
        <>
          {/*
            숫자 패널들은 접어 둔다.
            ME 는 프로필이지 대시보드가 아니다 — 요약을 먼저 보고, 필요할 때만 펼친다.
          */}
          <button
            type="button"
            onClick={() => {
              haptic()
              setNumbersOpen((v) => !v)
            }}
            aria-expanded={numbersOpen}
            className="press flex w-full items-center gap-2.5 rounded-px4 border-[1.5px] border-border bg-ivory px-3.5 py-3 text-left shadow-hard"
          >
            <PixelImage asset={icons.focus} height={20} />
            <span className="flex-1">
              <span className="ptitle block">My numbers</span>
              <span className="mt-1 block text-[11.5px] text-inkdim">
                평균 · 흐름 · 좋았던 날의 공통점
              </span>
            </span>
            <span className="text-[11px] text-inkfaint">{numbersOpen ? '⌄' : '›'}</span>
          </button>

          {numbersOpen && (
            <div className="space-y-3">
          {/* 이번 주 */}
          {week.length > 0 && (
            <PixelPanel title="This week" icon={icons.energy}>
              <ul className="space-y-2">
                {week.map((line) => (
                  <li key={line.key} className="flex gap-2 text-[13px] leading-relaxed">
                    <PixelSparkle size={10} className="mt-1 shrink-0" />
                    <span>{line.text}</span>
                  </li>
                ))}
              </ul>
            </PixelPanel>
          )}

          {/* 지난 한 달의 이야기 */}
          {story.length > 0 && (
            <PixelPanel title="Monthly review" icon={icons.log} sparkle>
              <ul className="space-y-2">
                {story.map((line) => (
                  <li key={line.key} className="flex gap-2 text-[13px] leading-relaxed">
                    <PixelSparkle size={10} className="mt-1 shrink-0" />
                    <span>{line.text}</span>
                  </li>
                ))}
              </ul>
            </PixelPanel>
          )}

          {/* 점수 흐름 */}
          <PixelPanel title="Condition flow" icon={icons.energy}>
            <LineChart
              points={scorePoints(checkins).slice(-60)}
              line={scoreTrendLine(checkins).slice(-60)}
              color="#F19DB0"
              ariaLabel="컨디션 점수 흐름"
              format={(v) => String(Math.round(v))}
            />
            {trend.enough && trend.delta !== null && (
              <p className="mt-1 text-[12px] text-inkdim">
                최근 7일 평균 {trend.recent}점 · 그 앞 7일보다 {trend.delta > 0 ? '+' : ''}
                {trend.delta}
              </p>
            )}
          </PixelPanel>

          <div className="grid grid-cols-2 gap-2">
            <StatCard
              label="Avg Energy 7d"
              value={insights.avgScore7 == null ? '--' : String(Math.round(insights.avgScore7))}
              color={insights.avgScore7 == null ? undefined : modeOf(insights.avgScore7).hex}
            />
            <StatCard
              label="Avg Energy 30d"
              value={insights.avgScore30 == null ? '--' : String(Math.round(insights.avgScore30))}
              color={insights.avgScore30 == null ? undefined : modeOf(insights.avgScore30).hex}
            />
            <StatCard
              label="Avg Sleep"
              value={
                insights.avgSleepHours == null
                  ? '--'
                  : formatSleep(Math.round(insights.avgSleepHours * 2) / 2)
              }
            />
            <StatCard
              label="Avg Mood"
              value={insights.avgMood == null ? '--' : insights.avgMood.toFixed(1)}
            />
          </div>

          {/* 네 축 */}
          {base.enough && (
            <PixelPanel title="My usual" icon={icons.xp}>
              <ul className="space-y-2">
                {(['recovery', 'body', 'mind', 'fuel'] as const).map((dim) => {
                  const list = base.metrics.filter((m) => DIM_OF[m.key] === dim)
                  if (list.length === 0) return null
                  const avg = Math.round(
                    list.reduce((s, m) => s + m.avg, 0) / list.length,
                  )
                  return (
                    <li key={dim} className="flex items-center gap-2">
                      <span className="w-[46px] shrink-0 text-[12.5px]">{DIMENSION_LABEL[dim]}</span>
                      <span className="h-[10px] flex-1 overflow-hidden rounded-full bg-border/35">
                        <span
                          className="block h-full rounded-full bg-pink"
                          style={{ width: `${avg}%` }}
                        />
                      </span>
                      <span className="w-[30px] text-right font-pixel text-[11px]">{avg}</span>
                    </li>
                  )
                })}
              </ul>
              <p className="plabel mt-2">
                {base.days}일 평균 {base.avgScore}점 · 하루하루 ±{base.sdScore}점쯤 흔들려요
              </p>
            </PixelPanel>
          )}

          {insights.modeDaysTotal > 0 && (
            <PixelPanel title="Mode Days" icon={icons.sleep}>
              <div className="grid grid-cols-4 gap-2">
                {ORDER.map((mode) => (
                  <div key={mode} className="text-center">
                    <PixelImage asset={MODE_META[mode].icon} height={26} className="mx-auto" />
                    <p
                      className="mt-1.5 font-pixel text-[18px] leading-none"
                      style={{ color: MODE_META[mode].hex }}
                    >
                      {String(insights.modeDays[mode]).padStart(2, '0')}
                    </p>
                    <p className="plabel mt-1.5">{mode}</p>
                  </div>
                ))}
              </div>
            </PixelPanel>
          )}

          {insights.avgFatigue != null && (
            <PixelPanel title="Fatigue Level" icon={icons.fatigue}>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-[12px] text-inkdim">평균 피로도 (낮을수록 가벼움)</span>
                <span className="font-pixel text-[14px]">{insights.avgFatigue.toFixed(1)} / 5</span>
              </div>
              <EnergyBar score={(insights.avgFatigue / 5) * 100} color="#DE7E92" segments={5} />
            </PixelPanel>
          )}

          {/* 좋았던 날의 공통점 */}
          {good.traits.length > 0 && (
            <PixelPanel title="Good days" icon={icons.mood} sparkle>
              <p className="plabel mb-2">
                점수가 높았던 {good.nGood}일에 더 자주 있던 것
              </p>
              <ul className="space-y-1.5">
                {good.traits.map((t) => (
                  <li key={t.label} className="flex items-center gap-2 text-[12.5px]">
                    <span className="flex-1">{t.label}</span>
                    <span className="font-pixel text-[11px] text-mintdeep">{t.goodRate}%</span>
                    <span className="text-[11px] text-inkfaint">↔ {t.otherRate}%</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] leading-relaxed text-inkfaint">
                같이 나타난 비율이에요. 이것 때문에 좋았다는 뜻은 아니에요.
              </p>
            </PixelPanel>
          )}

          {/* 점수가 낮던 날 */}
          {drivers.length > 0 && (
            <PixelPanel title="On low days" icon={icons.fatigue}>
              <ul className="space-y-1.5">
                {drivers.map((d) => (
                  <li key={d.labelA} className="flex items-center gap-2 text-[12.5px]">
                    <span className="flex-1">{d.labelA.replace(' (낮은 날)', '')}</span>
                    <span className="font-pixel text-[11px]">{d.meanA}</span>
                    <span className="text-[11px] text-inkfaint">↔ {d.meanB}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] leading-relaxed text-inkfaint">
                점수가 낮았던 날과 나머지 날의 평균 비교예요. 무엇이 원인인지는 이 숫자로 알 수 없어요.
              </p>
            </PixelPanel>
          )}


            </div>
          )}

          {devAction && <div className="flex justify-center pt-1">{devAction}</div>}
        </>
      )}

      <p className="px-2 pb-2 text-center text-[11px] leading-relaxed text-inkdim">
        여기 숫자는 내가 적은 기록에서 나온 값이에요. 진단이나 치료 판단에는 쓰지 마세요.
      </p>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-px4 bg-ivory/90 px-2.5 py-2.5 text-center">
      <p className="plabel">{label}</p>
      <p className="mt-1.5 font-pixel text-[15px] leading-none tabular-nums">{value}</p>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-px4 bg-ivory/90 px-3 py-3">
      <p className="plabel">{label}</p>
      <p className="mt-2 font-pixel text-[22px] leading-none" style={color ? { color } : undefined}>
        {value}
      </p>
    </div>
  )
}
