import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Checkin } from '@/types'
import { EnergyBar } from './EnergyBar'
import { PipRow } from './PipRow'
import { PixelImage } from './PixelImage'
import { formatShort, formatSleep } from '@/lib/date'
import { modeMeta } from '@/lib/energy'
import { MODE_CHARACTER, icons } from '@/lib/pixelAssets'

interface Props {
  date: string
  dayNumber: number | null
  checkin: Checkin | null
  onClose: () => void
  onEdit: (date: string) => void
  onDelete: (date: string) => void
}

/** 그날의 기록을 작은 RPG 일지처럼 */
export function DaySheet({ date, dayNumber, checkin, onClose, onEdit, onDelete }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const meta = checkin ? modeMeta(checkin.mode) : null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-ink/30" />

      <div
        className="relative w-full max-w-[460px] animate-risein rounded-t-px5 border-[1.5px] border-border bg-ivory px-4 pt-4"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 18px)' }}
      >
        <header className="mb-3 flex items-center gap-3">
          {meta && <PixelImage asset={MODE_CHARACTER[checkin!.mode]} height={54} />}
          <div className="flex-1">
            <p className="font-pixel text-[14px] uppercase leading-none">
              {dayNumber ? `Day ${String(dayNumber).padStart(3, '0')}` : formatShort(date)}
            </p>
            <p className="plabel mt-1.5">{formatShort(date)}</p>
          </div>
          {meta && <PixelImage asset={meta.pill} height={22} />}
        </header>

        {checkin && meta ? (
          <>
            <div className="mb-3">
              <div className="mb-1.5 flex items-center gap-1.5">
                <PixelImage asset={icons.energy} height={16} />
                <span className="plabel text-ink">Energy</span>
                <span className="ml-auto font-pixel text-[14px]">
                  {checkin.energyScore}
                  <span className="text-[10px] text-inkdim"> / 100</span>
                </span>
              </div>
              <EnergyBar score={checkin.energyScore} color={meta.hex} height={12} />
            </div>

            <dl className="divide-y divide-dashed divide-border border-y border-dashed border-border">
              <Row label="Sleep" icon={icons.sleep}>
                <span className="font-pixel text-[12px]">{formatSleep(checkin.sleepHours)}</span>
              </Row>
              <Row label="Mood" icon={icons.mood}>
                <PipRow asset={icons.mood} value={checkin.mood} size={15} label="Mood" />
              </Row>
              <Row label="Focus" icon={icons.focus}>
                <PipRow asset={icons.focus} value={checkin.focus} size={15} label="Focus" />
              </Row>
              <Row label="Body" icon={icons.body}>
                <PipRow asset={icons.body} value={5 - checkin.bodyPain} size={15} label="Body" />
              </Row>
              <Row label="Items" icon={icons.caffeine}>
                <span className="flex items-center gap-2 text-[12px] text-inkdim">
                  {checkin.caffeineConsumed && (
                    <span className="flex items-center gap-1">
                      <PixelImage asset={icons.caffeine} height={16} />
                      {checkin.caffeineTime ?? ''}
                    </span>
                  )}
                  {checkin.exercise && (
                    <span className="flex items-center gap-1">
                      <PixelImage asset={icons.exercise} height={16} />
                      {checkin.exerciseType ?? ''}
                    </span>
                  )}
                  {!checkin.caffeineConsumed && !checkin.exercise && '없음'}
                </span>
              </Row>
            </dl>

            {checkin.memo && (
              <p className="mt-3 rounded-px3 border border-dashed border-border bg-cream px-3 py-2 text-[13px] leading-relaxed">
                “{checkin.memo}”
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => onEdit(date)}
                className="press flex-1 rounded-px4 border-[1.5px] border-pinkdeep bg-pink py-3 font-pixel text-[11px] uppercase text-white"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(date)}
                className="press rounded-px4 border-[1.5px] border-border bg-ivory px-4 py-3 font-pixel text-[11px] uppercase text-inkdim"
              >
                Delete
              </button>
            </div>
          </>
        ) : (
          <div className="pb-2">
            <p className="body-ko mb-4">이 날은 기록이 없어요. 지금 채워 넣을 수 있어요.</p>
            <button
              type="button"
              onClick={() => onEdit(date)}
              className="press w-full rounded-px4 border-[1.5px] border-pinkdeep bg-pink py-3 font-pixel text-[11px] uppercase text-white"
            >
              Save this day
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

function Row({
  label,
  icon,
  children,
}: {
  label: string
  icon: import('@/lib/pixelAssets').PixelAsset
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 py-2.5">
      <PixelImage asset={icon} height={16} />
      <dt className="plabel text-ink">{label}</dt>
      <dd className="ml-auto">{children}</dd>
    </div>
  )
}
