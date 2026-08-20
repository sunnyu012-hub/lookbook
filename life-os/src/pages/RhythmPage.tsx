/**
 * RECOVERY CURVE — 요즘 내 흐름.
 *
 * 의료 차트처럼 보이면 안 된다. 빨간 경고선도, 정상 범위도 없다.
 * 부드러운 선 하나와 작은 점들, 그리고 한 줄 설명이 전부다.
 */
import { useMemo, useState } from 'react'
import type { Checkin } from '@/types'
import { CURVE_METRIC_LABEL, recoveryCurve, type CurveMetric } from '@/lib/analytics/recoveryCurve'
import { LineChart } from '@/components/pixel/LineChart'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { PixelSparkle } from '@/components/pixel/PixelSparkle'
import { icons, type PixelAsset } from '@/lib/pixelAssets'
import { formatShort } from '@/lib/date'
import { haptic } from '@/hooks/useHaptic'
import { cn } from '@/lib/cn'

const METRICS: CurveMetric[] = ['overall', 'recovery', 'body', 'mind']
const RANGES = [7, 14, 30] as const

const METRIC_ICON: Record<CurveMetric, PixelAsset> = {
  overall: icons.energy,
  recovery: icons.sleep,
  body: icons.body,
  mind: icons.mood,
}

const METRIC_COLOR: Record<CurveMetric, string> = {
  overall: '#F19DB0',
  recovery: '#8B76C9',
  body: '#7DB994',
  mind: '#DE7E92',
}

export function RhythmPage({ checkins, onClose }: { checkins: Checkin[]; onClose: () => void }) {
  const [metric, setMetric] = useState<CurveMetric>('overall')
  const [days, setDays] = useState<number>(7)

  const curve = useMemo(() => recoveryCurve({ checkins, metric, days }), [checkins, metric, days])

  const points = curve.points
    .filter((p) => p.value != null)
    .map((p) => ({ date: p.date, value: p.value as number }))
  const smooth = curve.points
    .filter((p) => p.smooth != null)
    .map((p) => ({ date: p.date, value: p.smooth as number }))

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="돌아가기"
          className="press h-8 w-8 rounded-px3 border-[1.5px] border-border bg-ivory font-pixel text-[12px] shadow-hard"
        >
          ‹
        </button>
        <div className="flex-1">
          <h1 className="font-pixel text-[15px] uppercase leading-none tracking-[0.04em]">
            Current rhythm
          </h1>
          <p className="plabel mt-1.5">요즘 내 흐름</p>
        </div>
      </header>

      {/* 흐름 한 줄 */}
      <div className="rounded-px4 border-[1.5px] border-border bg-ivory px-3.5 py-3 shadow-hard">
        <div className="flex items-center gap-2">
          <PixelImage asset={METRIC_ICON[metric]} height={20} />
          <span
            className={cn(
              'font-pixel text-[15px] uppercase leading-none tracking-[0.03em]',
              curve.trend === 'LEARNING' && 'text-inkfaint',
            )}
            style={curve.trend === 'LEARNING' ? undefined : { color: METRIC_COLOR[metric] }}
          >
            {curve.arrow} {curve.title}
          </span>
          {curve.trend !== 'LEARNING' && <PixelSparkle size={10} />}
          <span className="ml-auto plabel">{curve.count}일 기록</span>
        </div>
        <p className="ko mt-2">{curve.message}</p>
      </div>

      {/* 지표 고르기 */}
      <div className="flex gap-1.5">
        {METRICS.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={m === metric}
            onClick={() => {
              haptic()
              setMetric(m)
            }}
            className={cn(
              'flex-1 rounded-px3 border-[1.5px] py-2 font-pixel text-[9.5px] uppercase tracking-[0.02em]',
              m === metric ? 'shadow-hard' : 'border-border bg-cream text-inkfaint',
            )}
            style={
              m === metric
                ? { borderColor: METRIC_COLOR[m], backgroundColor: `${METRIC_COLOR[m]}1F`, color: METRIC_COLOR[m] }
                : undefined
            }
          >
            {CURVE_METRIC_LABEL[m]}
          </button>
        ))}
      </div>

      <PixelPanel
        title={CURVE_METRIC_LABEL[metric]}
        icon={METRIC_ICON[metric]}
        right={
          <span className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDays(r)}
                className={cn(
                  'rounded-full px-2 py-[3px] font-pixel text-[9px]',
                  r === days ? 'bg-pinksoft text-pinkdeep' : 'text-inkfaint',
                )}
              >
                {r}D
              </button>
            ))}
          </span>
        }
      >
        <LineChart
          points={points}
          line={smooth}
          color={METRIC_COLOR[metric]}
          height={110}
          ariaLabel={`최근 ${days}일 ${CURVE_METRIC_LABEL[metric]} 흐름`}
        />

        <dl className="mt-2 grid grid-cols-3 gap-2 border-t border-dashed border-border pt-2.5">
          <Cell label="Latest" value={curve.latest != null ? String(curve.latest) : '—'} />
          <Cell label="Average" value={curve.average != null ? String(curve.average) : '—'} />
          <Cell
            label="Change"
            value={curve.delta == null ? '—' : `${curve.delta > 0 ? '+' : ''}${curve.delta}`}
          />
        </dl>
      </PixelPanel>

      {/* 요약 표 */}
      <PixelPanel title="Last days" icon={icons.log}>
        <ul className="divide-y divide-dashed divide-border">
          {[...curve.points].reverse().map((p) => (
            <li key={p.date} className="flex items-center gap-2 py-1.5">
              <span className="plabel w-[62px] shrink-0">{formatShort(p.date)}</span>
              <span className="h-[7px] flex-1 overflow-hidden rounded-full bg-border/40">
                {p.value != null && (
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${p.value}%`, backgroundColor: METRIC_COLOR[metric] }}
                  />
                )}
              </span>
              <span
                className={cn(
                  'w-[26px] shrink-0 text-right font-pixel text-[10px]',
                  p.value == null && 'text-inkfaint',
                )}
              >
                {p.value ?? '·'}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2.5 text-[11px] leading-relaxed text-inkdim">
          기록이 없는 날은 0 이 아니라 빈칸이에요. 없는 날을 낮은 점수로 세지 않아요.
        </p>
      </PixelPanel>

      <p className="px-2 pb-2 text-center text-[11px] leading-relaxed text-inkdim">
        이 앱은 의료 앱이 아니에요. 진단이나 치료 판단에는 쓰지 마세요.
      </p>
    </div>
  )
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="plabel">{label}</dt>
      <dd className="mt-1 font-pixel text-[14px] leading-none">{value}</dd>
    </div>
  )
}
