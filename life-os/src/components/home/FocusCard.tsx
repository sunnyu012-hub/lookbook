/**
 * TODAY'S FOCUS — 오늘의 작은 목표 한 줄.
 *
 * 못 해도 아무 일 없다. 그래서 실패나 남은 시간 같은 걸 쓰지 않는다.
 */
import type { DailyFocus } from '@/lib/quests/dailyFocus'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelSparkle } from '@/components/pixel/PixelSparkle'
import { cn } from '@/lib/cn'

export function FocusCard({ focus }: { focus: DailyFocus }) {
  const ratio = focus.target > 0 ? focus.progress / focus.target : 0

  return (
    <div
      className={cn(
        'rounded-px4 border-[1.5px] px-3.5 py-3 shadow-hard transition-colors duration-300',
        focus.done && 'border-mintdeep',
      )}
      style={
        focus.done
          ? { backgroundColor: '#E6F4EA', borderColor: '#7DB994' }
          : { borderColor: `${focus.accent}66`, backgroundColor: focus.tint }
      }
    >
      <div className="flex items-center gap-2">
        <PixelImage asset={focus.icon} height={20} />
        <span className="flex-1">
          <span className="plabel block">TODAY&apos;S FOCUS</span>
          <span
            className="mt-1 block font-pixel text-[13px] uppercase leading-none tracking-[0.03em]"
            style={{ color: focus.done ? '#4F8A66' : focus.accent }}
          >
            {focus.title}
          </span>
        </span>
        {focus.done ? (
          <span className="font-pixel text-[10px] uppercase text-mintdeep">DONE</span>
        ) : (
          <span className="font-pixel text-[11px] tabular-nums text-inkdim">
            {focus.progress} / {focus.target}
          </span>
        )}
        {focus.done && <PixelSparkle size={11} />}
      </div>

      <p className="ko mt-2">{focus.done ? focus.cheer : focus.detail}</p>

      <div className="mt-2.5 flex items-center gap-2">
        <span className="h-[7px] flex-1 overflow-hidden rounded-full bg-white/60">
          <span
            className="block h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${Math.min(1, ratio) * 100}%`,
              backgroundColor: focus.done ? '#7DB994' : focus.accent,
            }}
          />
        </span>
        <span className="shrink-0 font-pixel text-[10px] text-peachdeep">
          +{focus.bonusXp} XP
        </span>
      </div>
    </div>
  )
}
