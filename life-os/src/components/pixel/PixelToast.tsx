import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { icons } from '@/lib/pixelAssets'
import { PixelImage } from './PixelImage'
import { PixelSparkle } from './PixelSparkle'

interface Props {
  title: string
  detail?: string
  onDone: () => void
}

/** 저장 완료 같은 짧은 피드백 */
export function PixelToast({ title, detail, onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, 1900)
    return () => clearTimeout(t)
  }, [title, detail, onDone])

  return createPortal(
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
      style={{ bottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 14px)' }}
    >
      <div className="panel flex animate-pop items-center gap-2 border-pink px-3 py-2">
        <PixelImage asset={icons.save} height={20} />
        <div>
          <p className="ptitle text-pinkdeep">{title}</p>
          {detail && <p className="mt-1 text-[11px] text-inkdim">{detail}</p>}
        </div>
        <PixelSparkle size={12} className="ml-1" />
      </div>
    </div>,
    document.body,
  )
}
