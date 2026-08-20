import type { Checkin } from '@/types'
import { PixelImage } from '@/components/pixel/PixelImage'
import { StatMeter, type MeterShape } from '@/components/pixel/StatMeter'
import { formatSleep } from '@/lib/date'
import { scoreCheckin, type Dimension, type ScoreContext } from '@/lib/scoring'
import { icons, type PixelAsset } from '@/lib/pixelAssets'
import { cn } from '@/lib/cn'
import { RadarLegend, StatRadar } from './StatRadar'

/** 오늘의 컨디션 — 왼쪽은 내가 적은 값, 오른쪽은 그게 만든 상태 구조 */
export function StatusView({
  today,
  scoreContext,
  onEdit,
}: {
  today: Checkin | null
  scoreContext?: ScoreContext
  onEdit: () => void
}) {
  if (!today) {
    return (
      <p className="py-8 text-center text-[13px] leading-relaxed text-inkdim">
        아직 오늘 기록이 없어요.
        <br />
        하나만 적어도 상태가 보여요.
      </p>
    )
  }

  const result = scoreCheckin(today, scoreContext)
  const dimensions = result.dimensions as Record<Dimension, number | null>

  return (
    <div>
      <div className="flex gap-3">
        <ul className="min-w-0 flex-1 space-y-2.5">
          <Row icon={icons.mood} label="Mood" value={today.mood} shape="heart" color="#F19DB0" />
          <Row
            icon={icons.body}
            label="Body"
            value={today.bodyPain == null ? null : 5 - today.bodyPain}
            shape="bar"
            color="#EFC15F"
          />
          <Row icon={icons.focus} label="Focus" value={today.focus} shape="diamond" color="#7FB8DC" />
          <Row
            icon={icons.appetite}
            label="Appetite"
            value={today.appetite}
            shape="dot"
            color="#EFA477"
          />
          <li className="flex items-center gap-2 border-t border-dashed border-border pt-2.5">
            <PixelImage
              asset={icons.sleep}
              height={17}
              className={cn(today.sleepHours == null && 'opacity-40')}
            />
            <span className="plabel w-[52px] shrink-0">Sleep</span>
            <span className="ml-auto font-pixel text-[12.5px] tabular-nums">
              {today.sleepHours == null ? '—' : formatSleep(today.sleepHours)}
            </span>
          </li>
        </ul>

        <div className="flex w-[46%] shrink-0 flex-col items-center gap-1">
          <StatRadar dimensions={dimensions} />
          <RadarLegend dimensions={dimensions} overall={result.overall} />
        </div>
      </div>

      {today.highlight && (
        <p className="ko mt-3 border-l-[2px] border-pink/70 pl-2.5">{today.highlight}</p>
      )}

      <button
        type="button"
        onClick={onEdit}
        className="press mt-3 flex w-full items-center gap-2 border-t border-dashed border-border pt-2.5 text-[12.5px] text-inkdim"
      >
        <PixelImage asset={icons.save} height={15} />
        오늘 기록 고치기
        <span className="ml-auto font-pixel text-[11px]">›</span>
      </button>
    </div>
  )
}

function Row({
  icon,
  label,
  value,
  shape,
  color,
}: {
  icon: PixelAsset
  label: string
  value: number | null | undefined
  shape: MeterShape
  color: string
}) {
  return (
    <li className="flex items-center gap-2">
      <PixelImage asset={icon} height={17} className={cn(value == null && 'opacity-40')} />
      <span className="plabel w-[52px] shrink-0">{label}</span>
      {value == null ? (
        <span className="text-[12px] text-inkfaint">—</span>
      ) : (
        <StatMeter value={value} shape={shape} color={color} />
      )}
    </li>
  )
}
