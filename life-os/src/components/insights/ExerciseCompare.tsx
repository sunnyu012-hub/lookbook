interface Props {
  withAvg: number
  withoutAvg: number
  withDays: number
  withoutDays: number
}

export function ExerciseCompare({ withAvg, withoutAvg, withDays, withoutDays }: Props) {
  const diff = Math.round(withAvg - withoutAvg)
  const rows = [
    { label: '운동한 날', value: Math.round(withAvg), days: withDays, accent: '#C8F04A' },
    { label: '운동 안 한 날', value: Math.round(withoutAvg), days: withoutDays, accent: '#8B8B93' },
  ]
  const max = Math.max(withAvg, withoutAvg, 1)

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[13px] text-muted">
              {row.label} <span className="tnum text-faint">· {row.days}일</span>
            </span>
            <span className="tnum font-display text-[24px] leading-none" style={{ color: row.accent }}>
              {row.value}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-elevated">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-soft"
              style={{ width: `${(row.value / max) * 100}%`, backgroundColor: row.accent }}
            />
          </div>
        </div>
      ))}

      <p className="pt-1 text-[12px] leading-relaxed text-faint">
        {diff === 0
          ? '아직은 차이가 거의 없어요.'
          : diff > 0
            ? `운동한 날의 평균 에너지가 ${diff}점 더 높아요.`
            : `운동한 날의 평균 에너지가 ${Math.abs(diff)}점 더 낮아요.`}
      </p>
    </div>
  )
}
