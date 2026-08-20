interface StatCardProps {
  label: string
  value: number
}

/** ME 화면 2 x 2 통계 칸. */
export function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-card border border-line/70 bg-surface px-4 py-4 shadow-soft">
      <p className="font-game text-[10px] uppercase tracking-[0.14em] text-inkdim">{label}</p>
      <p className="mt-1.5 font-game text-[26px] leading-none text-ink">
        {value.toLocaleString('ko-KR')}
      </p>
    </div>
  )
}
