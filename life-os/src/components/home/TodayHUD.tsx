import type { Checkin } from '@/types'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelSparkle } from '@/components/pixel/PixelSparkle'
import { useCountUp } from '@/hooks/useCountUp'
import { modeMetaOrNull } from '@/lib/energy'
import { icons, pets } from '@/lib/pixelAssets'
import { cn } from '@/lib/cn'

/**
 * 오늘의 HUD — 게임 상태창 한 덩어리.
 * Energy / Mode / Streak 를 각각 카드로 쪼개지 않는다. 셋이 한 눈에 읽혀야 한다.
 */
export function TodayHUD({
  today,
  streak,
  onStartCheckin,
}: {
  today: Checkin | null
  streak: number
  onStartCheckin: () => void
}) {
  const meta = modeMetaOrNull(today?.mode)
  const score = today?.energyScore ?? null
  const shown = useCountUp(score ?? 0, 700)

  return (
    <section
      className="rounded-px5 border-[1.5px] border-border px-4 py-3.5 shadow-hard"
      style={{ backgroundColor: meta?.band ?? '#FFFCF7' }}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <PixelImage asset={icons.energy} height={15} />
            <span className="plabel text-ink">Energy</span>
          </div>

          <div className="mt-1.5 flex items-end gap-2">
            <span
              className="font-pixel text-[34px] leading-none tabular-nums"
              style={{ color: meta?.hex ?? '#C2A493' }}
            >
              {score === null ? '--' : shown}
            </span>
            <span className="pb-1 font-pixel text-[12px] text-inkdim">/100</span>

            {meta && (
              <span className="ml-1 pb-1">
                <PixelImage asset={meta.pill} height={21} />
              </span>
            )}
          </div>

          <p className="ko mt-2">
            {meta ? meta.message : '아직 오늘 기록이 없어요. 하나만 적어도 방이 오늘 모습이 돼요.'}
          </p>
        </div>

        {/* 연속 기록 */}
        <div className="shrink-0 text-center">
          <div className="relative">
            <PixelImage asset={pets.catSit} height={38} className="animate-breathe" />
            <PixelSparkle size={9} className="absolute -right-1 top-0" />
          </div>
          <p className="mt-1 font-pixel text-[19px] leading-none tabular-nums text-peachdeep">
            {streak}
          </p>
          <p className="plabel mt-1">Day streak</p>
        </div>
      </div>

      {/* 눈금 바 */}
      <div className="mt-3 flex gap-[3px]" aria-hidden>
        {Array.from({ length: 16 }, (_, i) => (
          <span
            key={i}
            className="h-[11px] flex-1 rounded-[2px] transition-colors duration-300"
            style={{
              backgroundColor:
                score !== null && i < Math.round((score / 100) * 16)
                  ? meta!.hex
                  : 'rgba(107, 74, 61, 0.11)',
            }}
          />
        ))}
      </div>

      {!today && (
        <button
          type="button"
          onClick={onStartCheckin}
          className={cn(
            'press mt-3 flex w-full items-center justify-center gap-2 rounded-px4',
            'border-[1.5px] border-pinkdeep bg-pink py-2.5 font-pixel text-[11px] uppercase',
            'tracking-[0.04em] text-white shadow-hardpink',
          )}
        >
          <PixelImage asset={icons.save} height={15} /> 오늘 적기
        </button>
      )}
    </section>
  )
}
