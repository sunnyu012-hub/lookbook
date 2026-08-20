/**
 * LIFE BALANCE — 최근 기록이 어느 영역에 쌓였는지.
 *
 * 대시보드가 아니라 RPG 상태창 느낌으로 만든다.
 * 낮은 영역을 빨갛게 칠하거나 "부족" 이라고 쓰지 않는다. 그냥 짧은 막대일 뿐이다.
 */
import type { LifeBalance } from '@/lib/analytics/lifeBalance'
import { DOMAIN_META } from '@/lib/domains'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { icons } from '@/lib/pixelAssets'
import { cn } from '@/lib/cn'
import { haptic } from '@/hooks/useHaptic'

export function LifeBalanceCard({
  balance,
  onOpen,
  compact = false,
}: {
  balance: LifeBalance
  onOpen?: () => void
  /** ME 요약용 — 위 4개만 보여 준다 */
  compact?: boolean
}) {
  const slices = compact ? balance.slices.slice(0, 4) : balance.slices

  return (
    <PixelPanel
      title="Life balance"
      icon={icons.energy}
      right={<span className="plabel">{onOpen ? '›' : `최근 ${balance.days}일`}</span>}
    >
      {/*
        요약은 통째로 눌린다. 작은 화살표만 눌리게 두면 손가락으로 못 맞춘다.
        (Summary First, Detail on Tap)
      */}
      {onOpen ? (
        <button
          type="button"
          onClick={() => {
            haptic()
            onOpen()
          }}
          className="press mb-3 block w-full text-left"
        >
          <span className="ko block text-inkdim">{balance.headline}</span>
        </button>
      ) : (
        <p className="ko mb-3 text-inkdim">{balance.headline}</p>
      )}

      <ul className="space-y-2">
        {slices.map((slice) => {
          const meta = DOMAIN_META[slice.key]
          const empty = slice.value === 0
          return (
            <li key={slice.key} className="flex items-center gap-2">
              <PixelImage
                asset={meta.icon}
                height={16}
                className={cn('shrink-0', empty && 'opacity-30 saturate-0')}
              />
              <span
                className={cn(
                  'w-[68px] shrink-0 font-pixel text-[9px] uppercase tracking-[0.02em]',
                  empty ? 'text-inkfaint' : 'text-ink',
                )}
              >
                {meta.label}
              </span>
              <span className="h-[9px] flex-1 overflow-hidden rounded-full bg-border/40">
                <span
                  className="block h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${Math.max(slice.relative * 100, empty ? 0 : 6)}%`,
                    backgroundColor: meta.accent,
                  }}
                />
              </span>
              <span className="w-[26px] shrink-0 text-right font-pixel text-[10px] text-inkdim">
                {empty ? '·' : slice.value}
              </span>
            </li>
          )
        })}
      </ul>

      {!compact && (
        <p className="mt-3 border-t border-dashed border-border pt-2.5 text-[11.5px] leading-relaxed text-inkdim">
          이건 잘했다 못했다가 아니에요. 삶은 늘 고르게 나뉘지 않고, 조용한 영역이 있는 것도
          자연스러운 일이에요.
        </p>
      )}
    </PixelPanel>
  )
}

/** 하루 상세에서 쓰는 아주 작은 표시 */
export function DomainChips({
  domains,
  limit = 4,
}: {
  domains: { key: keyof typeof DOMAIN_META; value: number }[]
  limit?: number
}) {
  if (domains.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {domains.slice(0, limit).map(({ key, value }) => {
        const meta = DOMAIN_META[key]
        return (
          <span
            key={key}
            className="flex items-center gap-1 rounded-full px-2 py-[3px] font-pixel text-[9px] uppercase"
            style={{ backgroundColor: meta.tint, color: meta.accent }}
          >
            <PixelImage asset={meta.icon} height={11} />
            {meta.label} +{Math.round(value * 10) / 10}
          </span>
        )
      })}
    </div>
  )
}
