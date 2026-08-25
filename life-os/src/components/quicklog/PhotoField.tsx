/**
 * 사진 한 장 고르기 + 미리보기.
 *
 * 올리기는 여기서 하지 않는다. 파일만 들고 있다가 저장할 때 훅이 올린다 —
 * 사진 올리다 실패해도 기록은 저장되게 하려면 순서가 그래야 한다.
 */
import { useEffect, useRef, useState } from 'react'
import { checkFile } from '@/lib/os2/photo'
import { usePhotoUrl } from '@/hooks/usePhotoUrl'
import { PixelImage } from '@/components/pixel/PixelImage'
import { icons } from '@/lib/pixelAssets'
import { haptic } from '@/hooks/useHaptic'

export function PhotoField({
  file,
  existingPath,
  onPick,
}: {
  file: File | null
  /** 이미 올려 둔 사진 (고칠 때) */
  existingPath?: string | null
  onPick: (file: File | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const existingUrl = usePhotoUrl(file ? null : (existingPath ?? null))

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const shown = preview ?? existingUrl

  const pick = (next: File | null) => {
    if (!next) {
      onPick(null)
      setError(null)
      return
    }
    const problem = checkFile(next)
    if (problem) {
      setError(problem.userMessage)
      return
    }
    setError(null)
    onPick(next)
  }

  return (
    <div>
      <p className="plabel mb-1.5">PHOTO</p>

      {shown ? (
        <div className="relative overflow-hidden rounded-px3 border-[1.5px] border-border">
          <img
            src={shown}
            alt="고른 사진 미리보기"
            className="block max-h-[200px] w-full object-cover"
          />
          <button
            type="button"
            onClick={() => {
              haptic()
              pick(null)
              if (inputRef.current) inputRef.current.value = ''
            }}
            aria-label="사진 빼기"
            className="press absolute right-2 top-2 rounded-full border-[1.5px] border-border bg-cream px-2 py-1 font-pixel text-[10px] text-inkdim"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            haptic()
            inputRef.current?.click()
          }}
          className="press flex w-full items-center justify-center gap-2 rounded-px3 border-[1.5px] border-dashed border-borderdeep bg-ivory/60 py-4 text-[12.5px] text-inkdim"
        >
          <PixelImage asset={icons.camera} height={16} />
          사진 고르기
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />

      {error && <p className="mt-1.5 text-[12px] text-pinkdeep">{error}</p>}

      {file && !error && (
        <p className="mt-1.5 text-[11px] text-inkfaint">
          올릴 때 크기를 줄여서 저장해요. 위치정보는 지워져요.
        </p>
      )}
    </div>
  )
}
