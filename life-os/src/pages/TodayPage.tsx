import type { Checkin } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card, CardLabel } from '@/components/ui/Card'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { DetailList } from '@/components/today/DetailList'
import { MetricStrip } from '@/components/today/MetricStrip'
import { ModeBlock } from '@/components/today/ModeBlock'
import { useCountUp } from '@/hooks/useCountUp'
import { formatLong, todayKey } from '@/lib/date'
import { modeMeta } from '@/lib/energy'

interface Props {
  today: Checkin | null
  loading: boolean
  onStartCheckin: () => void
}

export function TodayPage({ today, loading, onStartCheckin }: Props) {
  const score = today?.energyScore ?? 0
  const animated = useCountUp(score)
  const meta = today ? modeMeta(today.mode) : null

  return (
    <div>
      <header className="mb-9">
        <p className="label mb-2">TODAY</p>
        <h1 className="font-display text-[30px] leading-none tracking-tight">
          {formatLong(todayKey())}
        </h1>
      </header>

      {loading ? (
        <div className="flex h-[320px] items-center justify-center">
          <p className="label animate-pulse">LOADING</p>
        </div>
      ) : today && meta ? (
        <>
          <div className="animate-rise flex justify-center">
            <ScoreRing score={animated} color={meta.hex}>
              <p className="tnum text-giant font-light">
                {animated}
                <span className="align-top text-3xl font-normal text-muted">%</span>
              </p>
              <p className="label-strong mt-3">ENERGY</p>
            </ScoreRing>
          </div>

          <div className="animate-rise mb-10 mt-8">
            <ModeBlock mode={today.mode} />
          </div>

          <div className="mb-4">
            <MetricStrip checkin={today} />
          </div>

          <Card>
            <CardLabel>TODAY&apos;S LOG</CardLabel>
            <DetailList checkin={today} />
          </Card>

          <button
            type="button"
            onClick={onStartCheckin}
            className="press mt-4 w-full rounded-card border border-line py-4 text-[13px] text-muted"
          >
            오늘 기록 수정하기
          </button>
        </>
      ) : (
        <div className="animate-rise">
          <div className="flex justify-center">
            <ScoreRing score={0} color="#26262C">
              <p className="tnum text-giant font-light text-line">--</p>
              <p className="label-strong mt-3">ENERGY</p>
            </ScoreRing>
          </div>

          <div className="mb-10 mt-8 text-center">
            <p className="font-display text-[22px] leading-snug">아직 오늘 기록이 없어요.</p>
            <p className="mt-1 text-[14px] leading-relaxed text-muted">
              10초면 충분해요. 지금 상태를 남겨보세요.
            </p>
          </div>

          <Button full onClick={onStartCheckin}>
            오늘 상태 기록하기
          </Button>
        </div>
      )}
    </div>
  )
}
