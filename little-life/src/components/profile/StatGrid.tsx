import type { StatKey, Stats } from '@/types'
import { STAT_KEYS } from '@/types'

export const STAT_META: Record<StatKey, { icon: string; label: string; from: string }> = {
  ENERGY: { icon: '🔋', label: '기운', from: 'LIFE' },
  FOCUS: { icon: '🎯', label: '집중', from: 'WORK · MIND' },
  VITALITY: { icon: '💪', label: '체력', from: 'BODY' },
  CREATIVITY: { icon: '🎨', label: '재미', from: 'PLAY' },
  CONNECTION: { icon: '💛', label: '마음', from: 'HEART' },
  LUCK: { icon: '🍀', label: '행운', from: '장비' },
}

interface StatGridProps {
  stats: Stats
  /** 장비에서 붙는 행운. 따로 보여준다 — 퀘스트로는 안 오르는 값이라 헷갈린다. */
  bonusLuck?: number
}

/**
 * 여섯 가지 스탯.
 *
 * 줄어들지 않는다. 퀘스트를 하나 끝낼 때마다 해당하는 칸이 1 오른다.
 */
export function StatGrid({ stats, bonusLuck = 0 }: StatGridProps) {
  return (
    <ul className="grid grid-cols-3 gap-2">
      {STAT_KEYS.map((key) => {
        const extra = key === 'LUCK' ? bonusLuck : 0
        return (
          <li
            key={key}
            className="flex flex-col items-center rounded-card border border-line/70 bg-surface px-2 py-3 shadow-soft"
          >
            <span className="text-[20px] leading-none">{STAT_META[key].icon}</span>
            <span className="mt-1.5 font-game text-[16px] leading-none text-ink">
              {stats[key] + extra}
              {extra > 0 && <span className="text-[11px] text-coral-deep"> +{extra}</span>}
            </span>
            <span className="mt-1 text-[12px] font-medium text-inkdim">{STAT_META[key].label}</span>
            <span className="mt-0.5 text-[10px] text-inkfaint">{STAT_META[key].from}</span>
          </li>
        )
      })}
    </ul>
  )
}
