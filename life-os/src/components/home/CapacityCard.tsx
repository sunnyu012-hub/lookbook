/**
 * TODAY'S CAPACITY + CURRENT RHYTHM — Home 위쪽에 붙는 작은 두 줄.
 *
 * 여기서 하루 일정을 짜 주지 않는다. 오늘이 어떤 결인지만 말한다.
 * Rhythm 도 그래프를 통째로 넣지 않는다. 화살표 하나와 한 줄이면 충분하고,
 * 자세히 보고 싶으면 눌러서 들어간다.
 */
import type { Capacity } from '@/lib/wellness/capacity'
import { CAPACITY_EMPTY } from '@/lib/wellness/capacity'
import type { RecoveryCurve } from '@/lib/analytics/recoveryCurve'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelSparkle } from '@/components/pixel/PixelSparkle'
import { haptic } from '@/hooks/useHaptic'
import { cn } from '@/lib/cn'

export function CapacityCard({
  capacity,
  curve,
  onOpenCurve,
}: {
  capacity: Capacity | null
  curve: RecoveryCurve
  onOpenCurve: () => void
}) {
  if (!capacity) {
    return (
      <div className="rounded-px4 border-[1.5px] border-dashed border-border bg-cream px-3.5 py-3">
        <p className="plabel">TODAY&apos;S CAPACITY</p>
        <p className="ko mt-1.5 text-inkdim">{CAPACITY_EMPTY}</p>
      </div>
    )
  }

  return (
    <div
      className="rounded-px4 border-[1.5px] px-3.5 py-3 shadow-hard"
      style={{ borderColor: `${capacity.accent}66`, backgroundColor: capacity.tint }}
    >
      <div className="flex items-center gap-2">
        <PixelImage asset={capacity.icon} height={22} />
        <span className="flex-1">
          <span className="plabel block">TODAY&apos;S CAPACITY</span>
          <span
            className="mt-1 block font-pixel text-[14px] uppercase leading-none tracking-[0.03em]"
            style={{ color: capacity.accent }}
          >
            {capacity.label}
          </span>
        </span>
        <PixelSparkle size={10} />
      </div>

      <p className="ko mt-2.5">{capacity.message}</p>

      <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-dashed border-border/70 pt-2.5">
        <div>
          <p className="plabel">GOOD FOR</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-inkdim">
            {capacity.goodFor.join(' · ')}
          </p>
        </div>
        <div>
          <p className="plabel">GO EASY ON</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-inkdim">
            {capacity.goEasyOn.join(' · ')}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          haptic()
          onOpenCurve()
        }}
        className="press mt-2.5 flex w-full items-center gap-2 border-t border-dashed border-border/70 pt-2.5 text-left"
      >
        <span className="plabel">CURRENT RHYTHM</span>
        <span
          className={cn(
            'font-pixel text-[12px] uppercase tracking-[0.03em]',
            curve.trend === 'LEARNING' ? 'text-inkfaint' : 'text-ink',
          )}
        >
          {curve.arrow} {curve.title}
        </span>
        <span className="ml-auto text-[11px] text-inkfaint">›</span>
      </button>
    </div>
  )
}
