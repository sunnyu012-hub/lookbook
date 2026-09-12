import { useState } from 'react'
import { DayEditor } from './DayEditor'
import { Sheet } from './Sheet'
import { formatDay, relativeDay } from '../lib/date'
import { isBlank } from '../lib/types'
import { deletePhoto } from '../lib/photos'
import type { Diary } from '../hooks/useDiary'

type Props = {
  date: string | null
  diary: Diary
  onClose: () => void
  onOpenPhoto: (photos: { id: string; date: string }[], index: number) => void
}

/**
 * 지난 하루를 열어 읽고 고치는 판.
 *
 * 목록에서 눌렀을 때 화면을 갈아치우지 않고 판으로 올리는 이유는,
 * 닫으면 보고 있던 자리로 그대로 돌아오게 하려는 것이다.
 */
export function DaySheet({ date, diary, onClose, onOpenPhoto }: Props) {
  const [confirming, setConfirming] = useState(false)
  const entry = date ? diary.entryOf(date) : null

  function close() {
    setConfirming(false)
    onClose()
  }

  function remove() {
    if (!entry) return
    // 기록을 지우면 그날 사진도 같이 보낸다 — 주인 없는 그림만 남으면
    // 저장 공간만 차지하고 어디서도 안 보인다.
    for (const id of entry.photos) void deletePhoto(id)
    diary.remove(entry.date)
    close()
  }

  return (
    <Sheet
      open={Boolean(date && entry)}
      onClose={close}
      title={date ? `${formatDay(date)} · ${relativeDay(date)}` : ''}
    >
      {date && entry && (
        <div className="space-y-3 pb-6">
          <DayEditor
            entry={entry}
            entries={diary.entries}
            onPatch={(change) => diary.patch(date, change)}
            onOpenPhoto={(id) =>
              onOpenPhoto(
                entry.photos.map((photoId) => ({ id: photoId, date })),
                entry.photos.indexOf(id),
              )
            }
          />

          {!isBlank(entry) &&
            (confirming ? (
              <div className="flex items-center gap-2 rounded-card bg-peach-soft p-3">
                <span className="flex-1 text-[13px] text-peach-deep">
                  이 하루를 지울까요? 되돌릴 수 없어요.
                </span>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="chip bg-surface text-inkdim"
                >
                  그대로 두기
                </button>
                <button
                  type="button"
                  onClick={remove}
                  className="chip bg-peach-deep font-medium text-white"
                >
                  지우기
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="w-full rounded-card py-3 text-center text-[13px] text-inkfaint active:bg-sunken/50"
              >
                이 하루 지우기
              </button>
            ))}
        </div>
      )}
    </Sheet>
  )
}
