import { useEffect } from 'react'
import { usePhotoUrl } from '../hooks/usePhotoUrl'
import { formatDay } from '../lib/date'

type Props = {
  /** 넘겨볼 수 있게 지금 보고 있는 묶음을 다 받는다 */
  photos: { id: string; date: string }[]
  index: number
  onIndex: (index: number) => void
  onClose: () => void
  onOpenDay?: (date: string) => void
}

/** 사진 한 장 크게. 좌우로 넘기고, 그날 기록으로 바로 갈 수 있다. */
export function PhotoViewer({ photos, index, onIndex, onClose, onOpenDay }: Props) {
  const current = photos[index]
  const url = usePhotoUrl(current?.id ?? null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft' && index > 0) onIndex(index - 1)
      if (event.key === 'ArrowRight' && index < photos.length - 1) onIndex(index + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, photos.length, onIndex, onClose])

  if (!current) return null

  return (
    <div className="fixed inset-0 z-50 flex animate-fadein flex-col bg-ink">
      <div className="flex items-center justify-between px-4 pb-2 pt-[max(14px,env(safe-area-inset-top))]">
        <span className="text-[13px] text-white/70">{formatDay(current.date)}</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-pill bg-white/15 px-3 py-1.5 text-[13px] text-white"
        >
          닫기
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-3">
        {url ? (
          <img src={url} alt="사진" className="max-h-full max-w-full rounded-card object-contain" />
        ) : (
          <span className="text-[13px] text-white/60">사진을 찾을 수 없어요</span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 px-4 pb-[max(18px,env(safe-area-inset-bottom))] pt-3">
        <button
          type="button"
          onClick={() => onIndex(index - 1)}
          disabled={index === 0}
          className="rounded-pill bg-white/15 px-4 py-2 text-[13px] text-white disabled:opacity-30"
        >
          이전
        </button>

        {onOpenDay && (
          <button
            type="button"
            onClick={() => onOpenDay(current.date)}
            className="rounded-pill bg-white px-4 py-2 text-[13px] font-medium text-ink"
          >
            이날 기록 보기
          </button>
        )}

        <button
          type="button"
          onClick={() => onIndex(index + 1)}
          disabled={index >= photos.length - 1}
          className="rounded-pill bg-white/15 px-4 py-2 text-[13px] text-white disabled:opacity-30"
        >
          다음
        </button>
      </div>
    </div>
  )
}
