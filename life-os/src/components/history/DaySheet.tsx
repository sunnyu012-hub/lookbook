import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Checkin } from '@/types'
import { DetailList } from '@/components/today/DetailList'
import { formatLong } from '@/lib/date'
import { modeMeta } from '@/lib/energy'

interface Props {
  date: string
  checkin: Checkin | null
  onClose: () => void
  onEdit: (date: string) => void
  onDelete: (date: string) => void
}

/** 날짜 상세 — 라이브러리 없이 만든 가벼운 바텀 시트 */
export function DaySheet({ date, checkin, onClose, onEdit, onDelete }: Props) {
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
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 animate-fade bg-black/70 backdrop-blur-sm"
      />

      <div
        className="animate-rise relative w-full rounded-t-[26px] border-t border-line bg-surface"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 24px)' }}
      >
        <div className="mx-auto mt-3 h-1 w-9 rounded-full bg-line" />

        <div className="page pt-5">
          <p className="label mb-2">{checkin ? meta!.label : 'NO RECORD'}</p>
          <div className="mb-6 flex items-end justify-between">
            <h2 className="font-display text-[26px] leading-none">{formatLong(date)}</h2>
            {checkin && (
              <p className="tnum font-display text-[46px] leading-none" style={{ color: meta!.hex }}>
                {checkin.energyScore}
                <span className="align-top text-base text-muted">%</span>
              </p>
            )}
          </div>

          {checkin ? (
            <>
              <div className="mb-5 grid grid-cols-5 gap-px overflow-hidden rounded-2xl border border-line bg-line">
                {[
                  ['Sleep', `${checkin.sleepHours}h`],
                  ['Fatigue', `${checkin.fatigue}`],
                  ['Focus', `${checkin.focus}`],
                  ['Mood', `${checkin.mood}`],
                  ['Body', `${checkin.bodyPain}`],
                ].map(([label, value]) => (
                  <div key={label} className="bg-surface py-3 text-center">
                    <p className="tnum font-display text-[19px] leading-none">{value}</p>
                    <p className="label mt-1.5">{label}</p>
                  </div>
                ))}
              </div>

              <DetailList checkin={checkin} />

              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(date)}
                  className="press flex-1 rounded-full bg-paper py-3.5 text-[14px] font-medium text-ink"
                >
                  기록 수정
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(date)}
                  className="press rounded-full border border-line px-5 py-3.5 text-[14px] text-muted"
                >
                  삭제
                </button>
              </div>
            </>
          ) : (
            <div className="pb-2">
              <p className="mb-6 text-[14px] leading-relaxed text-muted">
                이 날은 기록이 없어요. 지금 채워 넣을 수 있어요.
              </p>
              <button
                type="button"
                onClick={() => onEdit(date)}
                className="press w-full rounded-full bg-paper py-3.5 text-[14px] font-medium text-ink"
              >
                이 날 기록하기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
