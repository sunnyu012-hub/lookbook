import type { Checkin } from '@/types'

interface Props {
  checkin: Checkin
}

/** 오늘 기록 요약 — 숫자를 크게, 라벨은 작게. */
export function MetricStrip({ checkin }: Props) {
  const items = [
    { label: 'Sleep', value: String(checkin.sleepHours), unit: 'h' },
    { label: 'Fatigue', value: String(checkin.fatigue), unit: '/5' },
    { label: 'Focus', value: String(checkin.focus), unit: '/5' },
    { label: 'Mood', value: String(checkin.mood), unit: '/5' },
    { label: 'Body', value: String(checkin.bodyPain), unit: '/5' },
  ]

  return (
    <div className="grid grid-cols-5 gap-px overflow-hidden rounded-card border border-line bg-line">
      {items.map((item) => (
        <div key={item.label} className="bg-surface px-1 py-4 text-center">
          <p className="tnum font-display text-[26px] leading-none">
            {item.value}
            <span className="ml-0.5 font-sans text-[10px] text-faint">{item.unit}</span>
          </p>
          <p className="label mt-2">{item.label}</p>
        </div>
      ))}
    </div>
  )
}
