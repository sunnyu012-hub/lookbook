import { useMemo } from 'react'
import type { Checkin, EnergyMode } from '@/types'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { PixelButton } from '@/components/pixel/PixelButton'
import { EnergyBar } from '@/components/pixel/EnergyBar'
import { buildInsights } from '@/lib/insights'
import { findPatterns } from '@/lib/patterns'
import { formatSleep } from '@/lib/date'
import { MODE_META, modeOf } from '@/lib/energy'
import { MODE_CHARACTER, icons } from '@/lib/pixelAssets'
import { PixelSparkle } from '@/components/pixel/PixelSparkle'
import { LevelCard } from '@/components/pixel/LevelCard'
import { PasswordSetup } from '@/components/PasswordSetup'
import type { LevelState } from '@/lib/level'
import { cn } from '@/lib/cn'

const ORDER: EnergyMode[] = ['RECOVERY', 'EASY', 'NORMAL', 'POWER']

interface Props {
  checkins: Checkin[]
  onStartCheckin: () => void
  devAction?: React.ReactNode
  /** Supabase 로그인 중일 때만 들어온다 */
  account?: string | null
  onSignOut?: () => void
  level: LevelState
}

export function InsightsPage({
  checkins,
  onStartCheckin,
  devAction,
  account,
  onSignOut,
  level,
}: Props) {
  const insights = useMemo(() => buildInsights(checkins), [checkins])
  const patterns = useMemo(() => findPatterns(checkins), [checkins])

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
        <p className="plabel">{insights.totalCount} saves</p>
      </header>

      <LevelCard level={level} character={MODE_CHARACTER[modeOf(insights.avgScore30 ?? 60).key]} />

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
              value={insights.avgSleepHours == null ? '--' : formatSleep(
                Math.round(insights.avgSleepHours * 2) / 2,
              )}
            />
            <StatCard
              label="Avg Mood"
              value={insights.avgMood == null ? '--' : insights.avgMood.toFixed(1)}
            />
          </div>

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
                      : 'border-pinkdeep/40 bg-pinksoft',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <PixelSparkle size={13} />
                    <p className="font-pixel text-[12px] uppercase">{pattern.title}</p>
                    <span className="ml-auto plabel">{pattern.sample}</span>
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

      {account && (
        <>
          <PasswordSetup />
          <div className="flex items-center gap-2 px-1 pt-1">
            <span className="truncate text-[11px] text-inkfaint">{account}</span>
            <button
              type="button"
              onClick={onSignOut}
              className="press ml-auto rounded-px3 border-[1.5px] border-border bg-ivory px-3 py-1.5 font-pixel text-[9px] uppercase text-inkdim"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="panel px-3 py-3">
      <p className="plabel">{label}</p>
      <p
        className="mt-2 font-pixel text-[22px] leading-none"
        style={color ? { color } : undefined}
      >
        {value}
      </p>
    </div>
  )
}
