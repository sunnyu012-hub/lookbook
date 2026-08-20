import type { Point } from '@/lib/analytics'

interface Props {
  /** 실제 기록 (점으로 찍는다) */
  points: Point[]
  /** 이동평균 같은 부드러운 선 */
  line?: Point[]
  color?: string
  height?: number
  /** 가로선을 하나 그어 둔다 (목표치 등) */
  guide?: { value: number; label: string } | null
  ariaLabel: string
  format?: (v: number) => string
}

/**
 * 아주 작은 꺾은선. 라이브러리를 쓰지 않고 SVG 로 직접 그린다.
 * 눈금은 최소한만 — 숫자를 읽는 그래프가 아니라 흐름을 보는 그래프다.
 */
export function LineChart({
  points,
  line = [],
  color = '#F19DB0',
  height = 96,
  guide = null,
  ariaLabel,
  format = (v) => String(Math.round(v * 10) / 10),
}: Props) {
  const all = [...points, ...line]
  if (all.length < 2) {
    return (
      <p className="py-6 text-center text-[12px] text-inkfaint">
        선을 그리려면 기록이 조금 더 필요해요.
      </p>
    )
  }

  const W = 300
  const H = height
  const PAD = 6

  const values = all.map((p) => p.value).concat(guide ? [guide.value] : [])
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1

  const dates = all.map((p) => p.date).sort()
  const t0 = new Date(dates[0]).getTime()
  const t1 = new Date(dates[dates.length - 1]).getTime()
  const tSpan = t1 - t0 || 1

  const x = (date: string) => PAD + ((new Date(date).getTime() - t0) / tSpan) * (W - PAD * 2)
  const y = (v: number) => PAD + (1 - (v - min) / span) * (H - PAD * 2)

  const path = line
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`)
    .join(' ')

  return (
    <figure aria-label={ariaLabel}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} role="img">
        {guide && (
          <>
            <line
              x1={PAD}
              x2={W - PAD}
              y1={y(guide.value)}
              y2={y(guide.value)}
              stroke="rgba(107, 74, 61, 0.28)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <text
              x={W - PAD}
              y={y(guide.value) - 4}
              textAnchor="end"
              fontSize="9"
              fill="rgba(107, 74, 61, 0.55)"
            >
              {guide.label}
            </text>
          </>
        )}

        {points.map((p) => (
          <circle
            key={p.date}
            cx={x(p.date)}
            cy={y(p.value)}
            r="1.8"
            fill={color}
            opacity="0.42"
          />
        ))}

        {path && <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />}
      </svg>
      <figcaption className="px-1 text-center">
        <span className="plabel">
          {format(min)} – {format(max)}
        </span>
      </figcaption>
    </figure>
  )
}
