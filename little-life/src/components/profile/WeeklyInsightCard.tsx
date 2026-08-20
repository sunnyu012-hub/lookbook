import { Card } from '@/components/ui/Card'

interface WeeklyInsightCardProps {
  message: string
}

/** 이번 주 한 줄. 규칙 기반이고 AI 는 쓰지 않는다. */
export function WeeklyInsightCard({ message }: WeeklyInsightCardProps) {
  return (
    <Card className="bg-butter-soft/70 py-5">
      <p className="font-game text-[10px] uppercase tracking-[0.16em] text-butter-deep">This week</p>
      <p className="mt-2 text-[14px] leading-relaxed text-ink">{message}</p>
    </Card>
  )
}
