import { DIMENSION_EN, type Dimension } from '@/lib/scoring'

/**
 * 네 축 상태 그래프 — RPG 스탯창처럼.
 * 축은 회복 / 마음 / 연료 / 몸 네 개고, 아직 안 적은 축은 흐리게 둔다.
 */
const AXES: { dim: Dimension; angle: number; anchor: 'middle' | 'start' | 'end'; dy: number }[] = [
  { dim: 'recovery', angle: -90, anchor: 'middle', dy: -6 },
  { dim: 'mind', angle: 0, anchor: 'start', dy: 4 },
  { dim: 'fuel', angle: 90, anchor: 'middle', dy: 14 },
  { dim: 'body', angle: 180, anchor: 'end', dy: 4 },
]

const SIZE = 128
const C = SIZE / 2
const R = 40

const point = (angle: number, radius: number) => {
  const rad = (angle * Math.PI) / 180
  return [C + Math.cos(rad) * radius, C + Math.sin(rad) * radius] as const
}

export function StatRadar({
  dimensions,
  color = '#F19DB0',
}: {
  dimensions: Record<Dimension, number | null>
  color?: string
}) {
  const ring = (t: number) =>
    AXES.map(({ angle }) => point(angle, R * t).join(',')).join(' ')

  const shape = AXES.map(({ dim, angle }) =>
    point(angle, (R * (dimensions[dim] ?? 0)) / 100).join(','),
  ).join(' ')

  const label = AXES.map(({ dim }) => `${DIMENSION_EN[dim]} ${dimensions[dim] ?? '없음'}`).join(', ')

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full"
      style={{ maxWidth: 168 }}
      role="img"
      aria-label={`상태 그래프 — ${label}`}
    >
      {[0.34, 0.67, 1].map((t) => (
        <polygon
          key={t}
          points={ring(t)}
          fill="none"
          stroke="rgba(217, 182, 148, 0.75)"
          strokeWidth="1"
          strokeDasharray={t === 1 ? undefined : '2 3'}
        />
      ))}

      {AXES.map(({ dim, angle }) => {
        const [x, y] = point(angle, R)
        return <line key={dim} x1={C} y1={C} x2={x} y2={y} stroke="rgba(217, 182, 148, 0.55)" strokeWidth="1" />
      })}

      <polygon points={shape} fill={color} fillOpacity="0.42" stroke={color} strokeWidth="2" strokeLinejoin="round" />

      {AXES.map(({ dim, angle }) => {
        const [x, y] = point(angle, (R * (dimensions[dim] ?? 0)) / 100)
        return dimensions[dim] === null ? null : (
          <circle key={dim} cx={x} cy={y} r="2.6" fill={color} />
        )
      })}
    </svg>
  )
}

/** 그래프 둘레에 붙는 축 이름과 값 */
export function RadarLegend({
  dimensions,
  overall,
}: {
  dimensions: Record<Dimension, number | null>
  overall: number | null
}) {
  const cell = (dim: Dimension) => (
    <div key={dim} className="text-center">
      <p className="plabel">{DIMENSION_EN[dim]}</p>
      <p className="mt-1 font-pixel text-[14px] leading-none tabular-nums">
        {dimensions[dim] ?? '—'}
      </p>
    </div>
  )

  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-2.5">
      {cell('recovery')}
      {cell('mind')}
      {cell('body')}
      {cell('fuel')}
      <div className="col-span-2 border-t border-dashed border-border pt-2 text-center">
        <p className="plabel">Overall</p>
        <p className="mt-1 font-pixel text-[18px] leading-none tabular-nums text-pinkdeep">
          {overall ?? '—'}
        </p>
      </div>
    </div>
  )
}
