import { useRef, useState } from 'react'
import { deletePhoto, newPhotoId, putPhoto, shrinkImage } from '../lib/photos'
import { PhotoThumb } from './PhotoThumb'

type Props = {
  photos: string[]
  onChange: (photos: string[]) => void
  onOpen?: (id: string) => void
}

const LIMIT = 6

/**
 * 그날 사진 몇 장.
 *
 * 앨범을 만들려는 게 아니라 "그날이 어땠는지" 를 떠올리게 하는 자리라
 * 하루 여섯 장까지만 받는다. 폰 사진은 넣을 때 작게 줄인다.
 */
export function PhotoRow({ photos, onChange, onOpen }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function pick(files: FileList | null) {
    if (!files || files.length === 0) return
    setBusy(true)
    setFailed(false)

    const room = LIMIT - photos.length
    const added: string[] = []
    for (const file of Array.from(files).slice(0, Math.max(0, room))) {
      try {
        const id = newPhotoId()
        await putPhoto(id, await shrinkImage(file))
        added.push(id)
      } catch {
        setFailed(true)
      }
    }

    if (added.length > 0) onChange([...photos, ...added])
    setBusy(false)
    if (input.current) input.current.value = ''
  }

  function remove(id: string) {
    onChange(photos.filter((photoId) => photoId !== id))
    void deletePhoto(id)
  }

  return (
    <div className="space-y-2">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {photos.map((id) => (
          <div key={id} className="relative shrink-0">
            <PhotoThumb
              id={id}
              onClick={onOpen ? () => onOpen(id) : undefined}
              className="h-24 w-24 rounded-btn"
            />
            <button
              type="button"
              aria-label="사진 빼기"
              onClick={() => remove(id)}
              className="absolute -right-1.5 -top-1.5 h-6 w-6 rounded-full bg-surface text-[13px] leading-none text-inkdim shadow-soft"
            >
              ×
            </button>
          </div>
        ))}

        {photos.length < LIMIT && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-btn bg-sunken/60 text-inkfaint active:bg-sunken"
          >
            <span className="text-[20px] leading-none">{busy ? '⏳' : '＋'}</span>
            <span className="text-[11px]">{busy ? '넣는 중' : '사진'}</span>
          </button>
        )}
      </div>

      {failed && (
        <p className="text-[12px] text-inkdim">
          사진을 못 넣었어요. 저장 공간이 부족할 수 있어요.
        </p>
      )}

      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => void pick(event.target.files)}
      />
    </div>
  )
}
