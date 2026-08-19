import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Checkin } from '@/types'
import { PipRow } from './PipRow'
import { PixelIcon } from './PixelIcon'
import { EnergyBar } from './EnergyBar'
import { formatSleep, formatShort } from '@/lib/date'
import { modeMeta } from '@/lib/energy'

interface Props {
  date: string
  dayNumber: number | null
  checkin: Checkin | null
  onClose: () => void
  onEdit: (date: string) => void
  onDelete: (date: string) => void
}

/** 게임 일지 한 페이지처럼 열리는 상세 창 */
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
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40"
      />

      <div
        className="animate-rise relative w-full max-w-[460px] rounded-t-px4 border-2 border-ink bg-ivory px-4 pt-4"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 20px)' }}
      >
        <header className="mb-3 flex items-start justify-between">
          <div>
            <p className="font-pixel text-[15px] uppercase leading-none">
              {dayNumber ? `Day ${String(dayNumber).padStart(3, '0')}` : formatShort(date)}
            </p>
            <p className="plabel mt-1.5">{formatShort(date)}</p>
          </div>
          {meta && (
            <div className="flex items-center gap-1.5">
              <PixelIcon name={meta.icon} size={16} />
              <span className="font-pixel text-[12px] uppercase" style={{ color: meta.hex }}>
                {meta.label}
              </span>
            </div>
          )}
        </header>

        {checkin && meta ? (
          <>
            <div className="mb-3">
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="plabel text-ink">Energy</span>
                <span className="font-pixel text-[15px]">
                  {checkin.energyScore}
                  <span className="text-[10px] text-inkdim"> / 100</span>
                </span>
              </div>
              <EnergyBar score={checkin.energyScore} color={meta.hex} />
            </div>

            <dl className="divide-y-2 divide-dashed divide-ink/15 border-y-2 border-dashed border-ink/15">
              <Row label="Sleep">
                <span className="font-pixel text-[12px]">{formatSleep(checkin.sleepHours)}</span>
              </Row>
              <Row label="Mood">
                <PipRow on="heart" off="heart_off" value={checkin.mood} label="Mood" />
              </Row>
              <Row label="Focus">
                <PipRow on="gem" off="gem_off" value={checkin.focus} label="Focus" />
              </Row>
              <Row label="Body">
                <PipRow on="star" off="star_off" value={5 - checkin.bodyPain} label="Body" />
              </Row>
              <Row label="Items">
                <span className="flex items-center gap-2 text-[12px] text-inkdim">
                  {checkin.caffeineConsumed && (
                    <span className="flex items-center gap-1">
                      <PixelIcon name="coffee" size={16} />
                      {checkin.caffeineTime ?? ''}
                    </span>
                  )}
                  {checkin.exercise && (
                    <span className="flex items-center gap-1">
                      <PixelIcon name="dumbbell" size={16} />
                      {checkin.exerciseType ?? ''}
                    </span>
                  )}
                  {!checkin.caffeineConsumed && !checkin.exercise && '없음'}
                </span>
              </Row>
            </dl>

            {checkin.memo && (
              <p className="mt-3 rounded-px2 border-2 border-dashed border-ink/20 bg-cream px-3 py-2 text-[13px] leading-relaxed">
                “{checkin.memo}”
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => onEdit(date)}
                className="press flex-1 rounded-px3 border-2 border-ink bg-butter py-3 font-pixel text-[11px] uppercase"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(date)}
                className="press rounded-px3 border-2 border-ink bg-ivory px-4 py-3 font-pixel text-[11px] uppercase text-inkdim"
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
              className="press w-full rounded-px3 border-2 border-ink bg-butter py-3 font-pixel text-[11px] uppercase"
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className="plabel text-ink">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
