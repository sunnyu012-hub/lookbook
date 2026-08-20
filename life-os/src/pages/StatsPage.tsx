import { useMemo } from 'react'
import type { Checkin, EnergyMode, LifeEvent, MounjaroLog, Preferences, WeightLog } from '@/types'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { PixelButton } from '@/components/pixel/PixelButton'
import { PixelSparkle } from '@/components/pixel/PixelSparkle'
import { EnergyBar } from '@/components/pixel/EnergyBar'
import { LineChart } from '@/components/pixel/LineChart'
import { LevelCard } from '@/components/pixel/LevelCard'
import { buildInsights } from '@/lib/insights'
import { buildStory } from '@/lib/story'
import {
  baseline,
  conditionTrend,
  discoverPatterns,
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
import { MODE_CHARACTER, icons } from '@/lib/pixelAssets'
import type { LevelState } from '@/lib/level'
import type { XpBreakdown } from '@/lib/xp'
import { cn } from '@/lib/cn'

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
  devAction?: React.ReactNode
}

export function StatsPage({
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
  devAction,
}: Props) {
  const insights = useMemo(() => buildInsights(checkins), [checkins])
  const patterns = useMemo(
    () => discoverPatterns({ checkins, prefs, lifeEvents, mounjaroLogs: mounjaro }),
    [checkins, prefs, lifeEvents, mounjaro],
  )
  const story = useMemo(
    () => buildStory({ checkins, weights, mounjaro, lifeEvents, prefs }),
    [checkins, weights, mounjaro, lifeEvents, prefs],
  )
  const trend = useMemo(() => conditionTrend(checkins), [checkins])
  const base = useMemo(() => baseline(checkins, scoreContext), [checkins, scoreContext])
  const good = useMemo(() => goodDayTraits(checkins, prefs, lifeEvents), [checkins, prefs, lifeEvents])
  const drivers = useMemo(() => lowScoreDrivers(checkins), [checkins])

  const nothingToShow =
    insights.avgScore7 == null && insights.avgScore30 == null && insights.avgSleepHours == null

  return (
    <div className="space-y-3">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-pixel text-[16px] uppercase leading-none tracking-[0.04em]">
            Player Stats
          </h1>
          <p className="plabel mt-2">Last 30 days</p>
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

      <LevelCard level={level} character={MODE_CHARACTER[modeOf(insights.avgScore30 ?? 60).key]} />

      <PixelPanel title="XP sources" icon={icons.xp}>
        <ul className="space-y-1.5">
          {[
            { label: '오늘 상태 기록', value: xp.checkin },
            { label: '퀘스트', value: xp.quest },
            { label: '체중 기록', value: xp.weight },
            { label: '투약 기록', value: xp.mounjaro },
            { label: '있었던 일 기록', value: xp.lifeEvent },
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
          {/* 지난 한 달의 이야기 */}
          {story.length > 0 && (
            <PixelPanel title="Last 30 days" icon={icons.log} sparkle>
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

          {patterns.length > 0 && (
            <div className="space-y-2">
              <p className="plabel px-1">Discovered</p>
              {patterns.map((pattern) => (
                <div
                  key={pattern.id}
                  className={cn(
                    'rounded-px4 border-[1.5px] p-3 shadow-hard',
                    pattern.kind === 'buff'
                      ? 'border-mintdeep/40 bg-mintsoft'
                      : pattern.kind === 'debuff'
                        ? 'border-pinkdeep/40 bg-pinksoft'
                        : 'border-border bg-ivory',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <PixelSparkle size={13} />
                    <p className="font-pixel text-[12px] uppercase">{pattern.title}</p>
                    <span className="plabel ml-auto">{pattern.sample}</span>
                  </div>
                  <p className="mt-2 flex items-start gap-2 text-[13px] leading-relaxed">
                    <PixelImage asset={pattern.icon} height={20} className="mt-0.5" />
                    {pattern.body}
                  </p>
                </div>
              ))}
              <p className="px-1 text-[11px] leading-relaxed text-inkdim">
                기록 사이에서 보이는 관계일 뿐, 원인이라고 단정할 수는 없어요.
              </p>
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
