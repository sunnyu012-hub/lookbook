import { UI, EFFECT } from '@/lib/assets'

interface DailySummaryProps {
  completed: number
  earnedExp: number
}

/** 오늘의 성취를 딱 두 칸으로. 못 한 것은 세지 않는다. */
export function DailySummary({ completed, earnedExp }: DailySummaryProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <SummaryTile icon={UI.check} label="끝낸 퀘스트" value={`${completed}`} unit="개" />
      <SummaryTile icon={EFFECT.star} label="받은 EXP" value={`+${earnedExp}`} unit="EXP" />
    </div>
  )
}

function SummaryTile({
  icon,
  label,
  value,
  unit,
}: {
  icon: string
  label: string
  value: string
  unit: string
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-card border border-line bg-surface px-3.5 py-3">
      <img src={icon} alt="" aria-hidden className="h-8 w-8 shrink-0 object-contain" />
      <div className="min-w-0">
        <p className="truncate text-[11.5px] text-inkdim">{label}</p>
        <p className="mt-0.5 font-game text-[18px] leading-none text-ink">
          {value}
          <span className="ml-1 text-[11px] text-inkdim">{unit}</span>
        </p>
      </div>
    </div>
  )
}
