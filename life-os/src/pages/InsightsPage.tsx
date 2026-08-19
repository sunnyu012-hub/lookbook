import { useMemo } from 'react'
import type { Checkin } from '@/types'
import { Card, CardLabel } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Sparkline } from '@/components/ui/Sparkline'
import { ExerciseCompare } from '@/components/insights/ExerciseCompare'
import { ModeDaysBar } from '@/components/insights/ModeDaysBar'
import { StatRow } from '@/components/insights/StatRow'
import { buildInsights } from '@/lib/insights'
import { modeOf } from '@/lib/energy'

interface Props {
  checkins: Checkin[]
  onStartCheckin: () => void
  devAction?: React.ReactNode
}

export function InsightsPage({ checkins, onStartCheckin, devAction }: Props) {
  const insights = useMemo(() => buildInsights(checkins), [checkins])
  const hasTrend = insights.trend14.some((p) => p.score != null)
  const trendColor = modeOf(insights.avgScore7 ?? insights.avgScore30 ?? 50).hex

  // 계산할 수 있는 게 하나도 없으면 아무 카드도 띄우지 않는다
  const nothingToShow =
    insights.avgScore7 == null &&
    insights.avgScore30 == null &&
    insights.avgSleepHours == null &&
    insights.exercise == null

  return (
    <div>
      <header className="mb-7">
        <p className="label mb-2">INSIGHTS</p>
        <h1 className="font-display text-[30px] leading-none tracking-tight">기록이 말해주는 것</h1>
        <p className="mt-2 text-[13px] text-muted">
          지금까지 {insights.totalCount}일의 기록으로 계산했어요.
        </p>
      </header>

      {nothingToShow ? (
        <EmptyState
          title="아직 분석할 기록이 적어요"
          description="며칠만 더 기록하면 평균과 흐름을 보여드릴게요. 데이터가 모자란 분석은 억지로 만들지 않아요."
          action={
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={onStartCheckin}
                className="press rounded-full bg-paper px-6 py-3 text-[14px] font-medium text-ink"
              >
                오늘 기록하기
              </button>
              {devAction}
            </div>
          }
        />
      ) : (
        <div className="space-y-3">
          {hasTrend && (
            <Card>
              <CardLabel>LAST 14 DAYS</CardLabel>
              <Sparkline
                values={insights.trend14.map((p) => p.score)}
                color={trendColor}
                height={64}
              />
              <div className="mt-2 flex justify-between">
                <span className="text-[11px] text-faint">14일 전</span>
                <span className="text-[11px] text-faint">오늘</span>
              </div>
            </Card>
          )}

          <Card>
            <CardLabel>AVERAGES</CardLabel>
            <div>
              {insights.avgScore7 != null && (
                <StatRow
                  label="최근 7일 평균 에너지"
                  value={String(Math.round(insights.avgScore7))}
                  color={modeOf(insights.avgScore7).hex}
                />
              )}
              {insights.avgScore30 != null && (
                <StatRow
                  label="최근 30일 평균 에너지"
                  value={String(Math.round(insights.avgScore30))}
                  color={modeOf(insights.avgScore30).hex}
                />
              )}
              {insights.avgSleepHours != null && (
                <StatRow
                  label="평균 수면 시간"
                  value={insights.avgSleepHours.toFixed(1)}
                  unit="h"
                />
              )}
              {insights.avgFatigue != null && (
                <StatRow
                  label="평균 피로도"
                  value={insights.avgFatigue.toFixed(1)}
                  unit="/5"
                  caption="낮을수록 덜 피로해요"
                />
              )}
              {insights.avgMood != null && (
                <StatRow label="평균 기분" value={insights.avgMood.toFixed(1)} unit="/5" />
              )}
            </div>
          </Card>

          {insights.modeDaysTotal > 0 && (
            <Card>
              <CardLabel>MODE DAYS · 30D</CardLabel>
              <ModeDaysBar modeDays={insights.modeDays} total={insights.modeDaysTotal} />
            </Card>
          )}

          {insights.exercise && (
            <Card>
              <CardLabel>EXERCISE</CardLabel>
              <ExerciseCompare {...insights.exercise} />
            </Card>
          )}

          <p className="px-2 pt-2 text-center text-[11px] leading-relaxed text-faint">
            모든 수치는 직접 남긴 기록만으로 계산한 참고값이에요.
          </p>
          {devAction && <div className="flex justify-center pt-2">{devAction}</div>}
        </div>
      )}
    </div>
  )
}
