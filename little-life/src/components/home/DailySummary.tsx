interface DailySummaryProps {
  completed: number
  earnedExp: number
}

/** 오늘의 성취를 딱 두 칸으로. 못 한 것은 세지 않는다. */
export function DailySummary({ completed, earnedExp }: DailySummaryProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <SummaryTile label="Completed today" value={`${completed}`} unit="quests" />
      <SummaryTile label="Earned today" value={`+${earnedExp}`} unit="EXP" />
    </div>
  )
}

function SummaryTile({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-card border border-line/70 bg-surface px-4 py-3.5 shadow-soft">
      <p className="text-[12px] text-inkdim">{label}</p>
      <p className="mt-1 font-game text-[22px] leading-none text-ink">
        {value}
        <span className="ml-1 text-[12px] text-inkdim">{unit}</span>
      </p>
    </div>
  )
}
