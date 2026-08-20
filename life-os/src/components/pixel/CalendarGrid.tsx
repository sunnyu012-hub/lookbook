import type { Checkin } from '@/types'
import { modeMetaOrNull } from '@/lib/energy'
import { PixelImage } from './PixelImage'
import { cn } from '@/lib/cn'

/** 달력에 얹는 아주 작은 표시들 — 날짜마다 모든 데이터를 넣지 않는다 */
export interface DayMarkers {
  weight?: boolean
  mounjaro?: boolean
  exercise?: boolean
  memory?: boolean
}

/** 색 세기로 보여 줄 값. 'mode' 는 기존 모드 아이콘 방식 */
export type CalendarMetric = 'mode' | 'energy' | 'body' | 'mind' | 'recovery' | 'sleep' | 'mood'

export const CALENDAR_METRICS: { key: CalendarMetric; label: string }[] = [
  { key: 'mode', label: 'MODE' },
  { key: 'energy', label: 'ENERGY' },
  { key: 'body', label: 'BODY' },
  { key: 'mind', label: 'MIND' },
  { key: 'recovery', label: 'RECOVERY' },
  { key: 'sleep', label: 'SLEEP' },
  { key: 'mood', label: 'MOOD' },
]

/**
 * 지표별 색 — 경고용 빨강을 쓰지 않는다.
 * 낮은 날이 위험해 보이면 안 되기 때문에, 세기만 옅어지는 파스텔 하나로 간다.
 */
const METRIC_COLOR: Record<Exclude<CalendarMetric, 'mode'>, string> = {
  energy: '#F19DB0',
  body: '#7DB994',
  mind: '#DE7E92',
  recovery: '#8B76C9',
  sleep: '#8B76C9',
  mood: '#DE7E92',
}

interface Props {
  year: number
  month: number
  byDate: Map<string, Checkin>
  selected: string | null
  onSelect: (date: string) => void
  metric?: CalendarMetric
  markers?: Map<string, DayMarkers>
  /** 잠 목표 시간 — sleep 지표를 0~100 으로 바꿀 때 쓴다 */
  sleepGoalHours?: number
}

const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/** 지표 값을 0~1 로. 기록이 없으면 null (0 으로 만들지 않는다) */
function ratioOf(
  c: Checkin | undefined,
  metric: CalendarMetric,
  sleepGoal: number,
): number | null {
  if (!c) return null
  switch (metric) {
    case 'energy':
      return c.energyScore == null ? null : c.energyScore / 100
    case 'body':
      return c.bodyScore == null ? null : c.bodyScore / 100
    case 'mind':
      return c.mindScore == null ? null : c.mindScore / 100
    case 'recovery':
      return c.recoveryScore == null ? null : c.recoveryScore / 100
    case 'sleep':
      return c.sleepHours == null ? null : Math.min(1, c.sleepHours / sleepGoal)
    case 'mood':
      return c.mood == null ? null : (c.mood - 1) / 4
    default:
      return null
  }
}

export function CalendarGrid({
  year,
  month,
  byDate,
  selected,
  onSelect,
  metric = 'mode',
  markers,
  sleepGoalHours = 7,
}: Props) {
  const cells = monthGrid(year, month)
  const color = metric === 'mode' ? null : METRIC_COLOR[metric]

  return (
    <div>
      <div className="mb-1.5 grid grid-cols-7 gap-1">
        {WEEK.map((label, i) => (
          <p key={i} className="plabel text-center">
            {label}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell.key) return <div key={`pad-${i}`} />
          const checkin = byDate.get(cell.key)
          const meta = modeMetaOrNull(checkin?.mode)
          const ratio = ratioOf(checkin, metric, sleepGoalHours)
          const mark = markers?.get(cell.key)

          // 0.14 부터 시작해서 아주 옅은 날도 보이게 한다
          const background =
            color && ratio != null
              ? `${color}${toHexAlpha(0.14 + ratio * 0.66)}`
              : metric === 'mode' && meta
                ? meta.soft
                : 'transparent'

          return (
            <button
              key={cell.key}
              type="button"
              disabled={cell.isFuture}
              onClick={() => onSelect(cell.key as string)}
              className={cn(
                'relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-px3 border transition-colors duration-150',
                selected === cell.key ? 'border-pinkdeep shadow-hardpink' : 'border-border',
                cell.isToday && selected !== cell.key && 'border-dashed border-pinkdeep',
                cell.isFuture && 'opacity-35',
              )}
              style={{ backgroundColor: background }}
            >
              <span className="font-pixel text-[9px] leading-none text-inkdim">{cell.day}</span>

              {metric === 'mode' ? (
                meta ? (
                  <>
                    <PixelImage asset={meta.icon} height={17} />
                    <span
                      className="font-pixel text-[9px] leading-none"
                      style={{ color: meta.hex }}
                    >
                      {checkin?.energyScore ?? '·'}
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] leading-none text-inkfaint">·</span>
                )
              ) : (
                <span
                  className={cn(
                    'font-pixel text-[10px] leading-none',
                    ratio == null && 'text-inkfaint',
                  )}
                  style={ratio == null ? undefined : { color: color ?? undefined }}
                >
                  {ratio == null ? '·' : Math.round(ratio * 100)}
                </span>
              )}

              {mark && (
                <span className="absolute inset-x-0 bottom-[3px] flex justify-center gap-[2px]">
                  {mark.weight && <Dot color="#7DB994" />}
                  {mark.mounjaro && <Dot color="#6FA8CE" />}
                  {mark.exercise && <Dot color="#DFB63F" />}
                  {mark.memory && <Dot color="#DE7E92" star />}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Dot({ color, star }: { color: string; star?: boolean }) {
  if (star) {
    return (
      <span className="text-[6px] leading-none" style={{ color }}>
        ✦
      </span>
    )
  }
  return (
    <span
      className="block h-[3px] w-[3px] rounded-full"
      style={{ backgroundColor: color }}
    />
  )
}

const toHexAlpha = (a: number) =>
  Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, '0')

interface Cell {
  key: string | null
  day: number
  isToday: boolean
  isFuture: boolean
}

function monthGrid(year: number, month: number): Cell[] {
  const first = new Date(year, month, 1)
  const days = new Date(year, month + 1, 0).getDate()
  const pad = first.getDay()
  const now = new Date()
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`

  const cells: Cell[] = Array.from({ length: pad }, () => ({
    key: null,
    day: 0,
    isToday: false,
    isFuture: false,
  }))

  for (let day = 1; day <= days; day += 1) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({ key, day, isToday: key === todayKey, isFuture: key > todayKey })
  }
  return cells
}
