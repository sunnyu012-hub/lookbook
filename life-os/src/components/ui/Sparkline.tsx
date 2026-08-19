interface Props {
  values: (number | null)[]
  color: string
  height?: number
}

/** 기록이 없는 날은 선을 끊는다 — 없는 데이터를 있는 것처럼 잇지 않기 위해. */
export function Sparkline({ values, color, height = 56 }: Props) {
  const width = 300
  const step = values.length > 1 ? width / (values.length - 1) : width

  const segments: string[] = []
  let current: string[] = []

  values.forEach((v, i) => {
    if (v == null) {
      if (current.length > 1) segments.push(current.join(' '))
      current = []
      return
    }
    const x = i * step
    const y = height - (Math.min(100, Math.max(0, v)) / 100) * (height - 6) - 3
    current.push(`${current.length === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
  })
  if (current.length > 1) segments.push(current.join(' '))

  const dots = values
    .map((v, i) => (v == null ? null : { x: i * step, y: height - (v / 100) * (height - 6) - 3 }))
    .filter(Boolean) as { x: number; y: number }[]

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} aria-hidden>
      {segments.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      ))}
      {dots.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.8} fill={color} opacity={0.7} />
      ))}
    </svg>
  )
}
