import type { Checkin } from '@/types'

const row = 'flex items-center justify-between py-3 text-[14px]'

/** 오늘/특정 날짜의 부가 기록 (수면 질, 식욕, 카페인, 운동, 메모) */
export function DetailList({ checkin }: { checkin: Checkin }) {
  const items: [string, string][] = [
    ['수면 질', `${checkin.sleepQuality} / 5`],
    ['식욕', `${checkin.appetite} / 5`],
    [
      '카페인',
      checkin.caffeineConsumed ? (checkin.caffeineTime ? `${checkin.caffeineTime}` : '마심') : '없음',
    ],
    ['운동', checkin.exercise ? checkin.exerciseType || '했음' : '안 함'],
  ]

  return (
    <div>
      <div className="divide-y divide-line">
        {items.map(([label, value]) => (
          <div key={label} className={row}>
            <span className="text-muted">{label}</span>
            <span className="tnum">{value}</span>
          </div>
        ))}
      </div>
      {checkin.memo && (
        <p className="mt-4 border-l-2 border-line pl-4 font-display text-[17px] leading-relaxed text-paper/90">
          {checkin.memo}
        </p>
      )}
    </div>
  )
}
